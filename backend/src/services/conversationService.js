const { getPool } = require('../db');
const { v4: uuidv4 } = require('uuid');

async function findDirectConversation(a, b) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id=c.id AND m1.user_id=?
     JOIN conversation_members m2 ON m2.conversation_id=c.id AND m2.user_id=?
     WHERE c.type='direct'`,
    [a, b]
  );
  return rows.length ? rows[0].id : null;
}

async function createDirectConversation(a, b) {
  const existing = await findDirectConversation(a, b);
  if (existing) return existing;
  const pool = getPool();
  const id = uuidv4();
  await pool.query('INSERT INTO conversations (id,type,created_by) VALUES (?,?,?)', [id, 'direct', a]);
  await pool.query('INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?),(?,?)', [id, a, id, b]);
  return id;
}

async function createGroup(name, creatorId, memberIds) {
  const pool = getPool();
  const id = uuidv4();
  await pool.query('INSERT INTO conversations (id,type,name,created_by) VALUES (?,?,?,?)', [id, 'group', name, creatorId]);
  const all = [...new Set([creatorId, ...memberIds])];
  for (const uid of all) {
    await pool.query('INSERT INTO conversation_members (conversation_id,user_id,role) VALUES (?,?,?)',
      [id, uid, uid === creatorId ? 'admin' : 'member']);
  }
  return id;
}

async function getConversation(convId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM conversations WHERE id=?', [convId]);
  return rows[0] || null;
}

async function isMember(convId, userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?', [convId, userId]);
  return rows.length > 0;
}

async function listMembers(convId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.id,u.name,u.email,u.avatar_url,cm.role,cm.last_read_seq
     FROM conversation_members cm JOIN users u ON u.id=cm.user_id
     WHERE cm.conversation_id=?`, [convId]);
  return rows;
}

async function listConversations(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.id,c.type,c.name,c.last_message_at,
       (SELECT text FROM messages WHERE conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS last_text,
       (SELECT media_type FROM messages WHERE conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS last_media_type,
       (SELECT sender_id FROM messages WHERE conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS last_sender_id,
       (SELECT seq FROM messages WHERE conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS last_seq,
       cm.last_read_seq
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id=c.id
     WHERE cm.user_id=?
     ORDER BY COALESCE(c.last_message_at,c.created_at) DESC`,
    [userId]
  );
  // unread count
  const out = [];
  for (const r of rows) {
    const lastSeq = r.last_seq || 0;
    const readSeq = r.last_read_seq || 0;
    const unread = Math.max(0, lastSeq - readSeq);
    // For direct, set name to other user's name
    let name = r.name;
    let otherUser = null;
    if (r.type === 'direct') {
      const members = await listMembers(r.id);
      otherUser = members.find(m => m.id !== userId);
      if (otherUser) name = otherUser.name;
    }
    out.push({
      id: r.id, type: r.type, name, lastMessage: r.last_text, lastMediaType: r.last_media_type,
      lastSenderId: r.last_sender_id, lastSeq, unread, lastMessageAt: r.last_message_at,
      otherUser,
    });
  }
  return out;
}

async function updateLastMessage(convId, ts) {
  const pool = getPool();
  await pool.query('UPDATE conversations SET last_message_at=? WHERE id=?', [ts, convId]);
}

async function updateReadSeq(convId, userId, seq) {
  const pool = getPool();
  await pool.query('UPDATE conversation_members SET last_read_seq=GREATEST(last_read_seq,?) WHERE conversation_id=? AND user_id=?', [seq, convId, userId]);
}

module.exports = {
  findDirectConversation, createDirectConversation, createGroup, getConversation, isMember,
  listMembers, listConversations, updateLastMessage, updateReadSeq,
};