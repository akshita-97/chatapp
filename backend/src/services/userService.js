const { getPool } = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { signToken } = require('../middleware/auth');

async function createUser(email, password, name) {
  const pool = getPool();
  const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (existing.length) throw new Error('Email already registered');
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO users (id,email,password_hash,name) VALUES (?,?,?,?)', [id, email, hash, name]);
  return { id, email, name };
}
async function authenticate(email, password) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!rows.length) throw new Error('Invalid credentials');
  const u = rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) throw new Error('Invalid credentials');
  return { id: u.id, email: u.email, name: u.name, avatar_url: u.avatar_url };
}
async function getUserById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id,email,name,avatar_url,created_at FROM users WHERE id=?', [id]);
  return rows[0] || null;
}
async function searchUsers(q, excludeId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id,email,name,avatar_url FROM users WHERE (name LIKE ? OR email LIKE ?) AND id <> ? LIMIT 20',
    [`%${q}%`, `%${q}%`, excludeId]
  );
  return rows;
}
async function listUsers(excludeId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id,email,name,avatar_url FROM users WHERE id <> ? LIMIT 50', [excludeId]);
  return rows;
}

module.exports = { createUser, authenticate, getUserById, searchUsers, listUsers, signToken };