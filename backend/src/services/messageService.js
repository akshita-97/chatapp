const { getPool } = require('../db');
const redis = require('../redis');

async function nextSeq(conn, convId) {
  const [rows] = await conn.query('SELECT COALESCE(MAX(seq),0) AS m FROM messages WHERE conversation_id=? FOR UPDATE', [convId]);
  return (rows[0].m || 0) + 1;
}

async function insertMessage({ conversationId, messageId, senderId, text, mediaUrl, mediaType }) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // dedup
    const [existing] = await conn.query(
      'SELECT id,seq,created_at,status FROM messages WHERE conversation_id=? AND message_id=?',
      [conversationId, messageId]
    );
    if (existing.length) {
      await conn.commit();
      return { duplicate: true, seq: existing[0].seq, serverTimestamp: existing[0].created_at, status: existing[0].status };
    }
    const seq = await nextSeq(conn, conversationId);
    const [res] = await conn.query(
      `INSERT INTO messages (conversation_id,message_id,sender_id,seq,text,media_url,media_type,status)
       VALUES (?,?,?,?,?,?,?,'sent')`,
      [conversationId, messageId, senderId, seq, text || null, mediaUrl || null, mediaType || null]
    );
    const [rows] = await conn.query('SELECT created_at FROM messages WHERE id=?', [res.insertId]);
    const ts = rows[0].created_at;
    await conn.query('UPDATE conversations SET last_message_at=? WHERE id=?', [ts, conversationId]);
    await conn.commit();

    const msg = {
      id: messageId, conversationId, senderId, seq, text: text || null,
      mediaUrl: mediaUrl || null, mediaType: mediaType || null, status: 'sent',
      createdAt: ts,
    };
    // cache
    await redis.cachePush(conversationId, msg);
    return { duplicate: false, seq, serverTimestamp: ts, status: 'sent', message: msg };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getMessages(convId, { afterSeq = 0, limit = 50 } = {}) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT message_id AS id, conversation_id AS conversationId, sender_id AS senderId, seq, text,
            media_url AS mediaUrl, media_type AS mediaType, status, created_at AS createdAt
     FROM messages WHERE conversation_id=? AND seq > ?
     ORDER BY seq ASC LIMIT ?`,
    [convId, afterSeq, limit]
  );
  return rows;
}

async function getAllMessages(convId, { limit = 100, beforeSeq } = {}) {
  const pool = getPool();
  let sql = `SELECT message_id AS id, conversation_id AS conversationId, sender_id AS senderId, seq, text,
            media_url AS mediaUrl, media_type AS mediaType, status, created_at AS createdAt
     FROM messages WHERE conversation_id=?`;
  const params = [convId];
  if (beforeSeq) { sql += ' AND seq < ?'; params.push(beforeSeq); }
  sql += ' ORDER BY seq DESC LIMIT ?';
  params.push(limit);
  const [rows] = await pool.query(sql, params);
  return rows.reverse();
}

async function updateStatus(messageId, status) {
  const pool = getPool();
  await pool.query('UPDATE messages SET status=? WHERE message_id=?', [status, messageId]);
}

async function markDelivered(convId, messageId, userId) {
  const pool = getPool();
  // insert receipt
  await pool.query(
    `INSERT INTO message_receipts (message_id,user_id,delivered_at) VALUES (?,?,NOW())
     ON DUPLICATE KEY UPDATE delivered_at=COALESCE(delivered_at,NOW())`,
    [messageId, userId]
  );
  // check if all non-sender members delivered
  await maybeUpdateAggregate(convId, messageId);
}

async function markRead(convId, userId, upToSeq) {
  const pool = getPool();
  // mark receipts read for messages up to seq for this user (excluding own)
  const [msgs] = await pool.query(
    'SELECT message_id FROM messages WHERE conversation_id=? AND seq<=? AND sender_id<>?',
    [convId, upToSeq, userId]
  );
  for (const m of msgs) {
    await pool.query(
      `INSERT INTO message_receipts (message_id,user_id,delivered_at,read_at) VALUES (?,?,NOW(),NOW())
       ON DUPLICATE KEY UPDATE delivered_at=COALESCE(delivered_at,NOW()), read_at=COALESCE(read_at,NOW())`,
      [m.message_id, userId]
    );
  }
  // update member read seq
  const { updateReadSeq } = require('./conversationService');
  await updateReadSeq(convId, userId, upToSeq);
  // update aggregates
  for (const m of msgs) await maybeUpdateAggregate(convId, m.message_id);
  return msgs.map(m => m.message_id);
}

async function maybeUpdateAggregate(convId, messageId) {
  const pool = getPool();
  const [mrows] = await pool.query('SELECT sender_id FROM messages WHERE message_id=?', [messageId]);
  if (!mrows.length) return;
  const senderId = mrows[0].sender_id;
  // members excluding sender
  const [members] = await pool.query(
    'SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>?',
    [convId, senderId]
  );
  const memberIds = members.map(m => m.user_id);
  if (memberIds.length === 0) {
    await updateStatus(messageId, 'read');
    return;
  }
  // delivered: all members have delivered_at
  const [del] = await pool.query(
    `SELECT COUNT(*) AS c FROM message_receipts WHERE message_id=? AND user_id IN (${memberIds.map(()=>'?').join(',')}) AND delivered_at IS NOT NULL`,
    [messageId, ...memberIds]
  );
  const [rd] = await pool.query(
    `SELECT COUNT(*) AS c FROM message_receipts WHERE message_id=? AND user_id IN (${memberIds.map(()=>'?').join(',')}) AND read_at IS NOT NULL`,
    [messageId, ...memberIds]
  );
  if (rd[0].c >= memberIds.length) {
    await updateStatus(messageId, 'read');
  } else if (del[0].c >= memberIds.length) {
    await updateStatus(messageId, 'delivered');
  }
}

module.exports = {
  insertMessage, getMessages, getAllMessages, markDelivered, markRead, updateStatus,
};