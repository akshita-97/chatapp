const { verifyToken } = require('../middleware/auth');
const redis = require('../redis');
const convService = require('../services/conversationService');
const msgService = require('../services/messageService');
const userService = require('../services/userService');

// in-memory socket registry: userId -> Set of socketIds
const userSockets = new Map(); // userId -> Set(socketId)
const socketUser = new Map(); // socketId -> userId

function getSocketsForUser(userId) {
  return userSockets.get(userId) || new Set();
}

function broadcastPresence(io, userId, online) {
  io.emit('presence:update', { userId, online });
}

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    const user = verifyToken(token);
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user.id;
    // register
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socketUser.set(socket.id, userId);
    await redis.setPresence(userId, socket.id);
    broadcastPresence(io, userId, true);

    // join user's conversation rooms
    try {
      const convs = await convService.listConversations(userId);
      for (const c of convs) socket.join(`conv:${c.id}`);
    } catch (e) { console.error(e); }

    // heartbeat
    socket.on('presence:heartbeat', async () => {
      await redis.setPresence(userId, socket.id);
    });
    // auto heartbeat every 30s server-side? client sends; server also refresh on any event
    const hb = setInterval(async () => {
      if (socket.connected) await redis.setPresence(userId, socket.id);
    }, 30000);
    socket.data.hb = hb;

    socket.on('conversation:join', async (convId) => {
      if (await convService.isMember(convId, userId)) {
        socket.join(`conv:${convId}`);
        await redis.setPresence(userId, socket.id);
      }
    });

    socket.on('message:send', async (data, ack) => {
      try {
        const { conversationId, messageId, text, mediaUrl, mediaType } = data;
        if (!await convService.isMember(conversationId, userId)) {
          if (typeof ack === 'function') ack({ error: 'Not a member' });
          return;
        }
        const res = await msgService.insertMessage({ conversationId, messageId, senderId: userId, text, mediaUrl, mediaType });
        const msg = res.duplicate ? null : res.message;
        const payload = res.duplicate
          ? { duplicate: true, conversationId, messageId, seq: res.seq }
          : { ...msg, conversationId };
        // broadcast to all members in the conversation room (includes sender for sync)
        io.to(`conv:${conversationId}`).emit('message:new', payload);
        if (typeof ack === 'function') ack({ ok: true, seq: res.seq, serverTimestamp: res.serverTimestamp, status: res.status, duplicate: res.duplicate });
        // cache already done
        await redis.cachePush(conversationId, payload);
      } catch (e) {
        console.error('message:send', e);
        if (typeof ack === 'function') ack({ error: e.message });
      }
    });

    socket.on('message:delivered', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        if (!await convService.isMember(conversationId, userId)) return;
        for (const mid of messageIds) {
          await msgService.markDelivered(conversationId, mid, userId);
          // notify sender
          const [mrows] = await require('../db').getPool().query('SELECT sender_id FROM messages WHERE message_id=?', [mid]);
          if (mrows.length) {
            const senderId = mrows[0].sender_id;
            if (senderId !== userId) {
              const sockets = getSocketsForUser(senderId);
              for (const sid of sockets) io.to(sid).emit('message:status', { conversationId, messageId: mid, status: 'delivered' });
            }
          }
        }
      } catch (e) { console.error(e); }
    });

    socket.on('message:read', async (data) => {
      try {
        const { conversationId, upToSeq } = data;
        if (!await convService.isMember(conversationId, userId)) return;
        const seq = upToSeq || 0;
        // if upToSeq not provided, get max seq in conv
        let targetSeq = seq;
        if (!targetSeq) {
          const [r] = await require('../db').getPool().query('SELECT COALESCE(MAX(seq),0) AS m FROM messages WHERE conversation_id=?', [conversationId]);
          targetSeq = r[0].m;
        }
        const ids = await msgService.markRead(conversationId, userId, targetSeq);
        // notify senders
        const pool = require('../db').getPool();
        for (const mid of ids) {
          const [mrows] = await pool.query('SELECT sender_id FROM messages WHERE message_id=?', [mid]);
          if (mrows.length) {
            const senderId = mrows[0].sender_id;
            if (senderId !== userId) {
              const sockets = getSocketsForUser(senderId);
              for (const sid of sockets) io.to(sid).emit('message:status', { conversationId, messageId: mid, status: 'read' });
            }
          }
        }
        // update aggregate status in db possibly read; recompute
      } catch (e) { console.error(e); }
    });

    socket.on('typing:start', async (data) => {
      const { conversationId } = data;
      if (!await convService.isMember(conversationId, userId)) return;
      socket.to(`conv:${conversationId}`).emit('typing:update', { conversationId, userId, typing: true });
    });
    socket.on('typing:stop', async (data) => {
      const { conversationId } = data;
      if (!await convService.isMember(conversationId, userId)) return;
      socket.to(`conv:${conversationId}`).emit('typing:update', { conversationId, userId, typing: false });
    });

    socket.on('sync:request', async (data, ack) => {
      try {
        const { cursors } = data || {}; // [{conversationId, lastSeq}]
        const result = {};
        for (const c of (cursors || [])) {
          const missed = await msgService.getMessages(c.conversationId, { afterSeq: c.lastSeq || 0, limit: 200 });
          result[c.conversationId] = missed;
        }
        if (typeof ack === 'function') ack({ ok: true, messages: result });
      } catch (e) {
        if (typeof ack === 'function') ack({ error: e.message });
      }
    });

    socket.on('disconnect', async () => {
      clearInterval(socket.data.hb);
      const uid = socketUser.get(socket.id);
      socketUser.delete(socket.id);
      if (uid) {
        const set = userSockets.get(uid);
        if (set) { set.delete(socket.id); if (set.size === 0) userSockets.delete(uid); }
        // only mark offline if no other sockets
        if (!userSockets.has(uid)) {
          await redis.removeSession(uid);
          broadcastPresence(io, uid, false);
        }
      }
    });
  });
}

module.exports = { initSocket, userSockets, socketUser, getSocketsForUser };