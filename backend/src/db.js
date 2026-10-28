const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'chatapp';

let pool = null;

async function ensureDatabase() {
  const conn = await mysql.createConnection(config);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

async function initPool() {
  await ensureDatabase();
  pool = mysql.createPool({
    ...config,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });
  await migrate();
  return pool;
}

async function migrate() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      avatar_url VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(36) PRIMARY KEY,
      type ENUM('direct','group') NOT NULL DEFAULT 'direct',
      name VARCHAR(255) NULL,
      created_by VARCHAR(36) NULL,
      last_message_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_last_message (last_message_at)
    )`,
    `CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      role ENUM('admin','member') DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_read_seq INT NOT NULL DEFAULT 0,
      PRIMARY KEY (conversation_id, user_id),
      INDEX idx_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL,
      message_id VARCHAR(36) NOT NULL,
      sender_id VARCHAR(36) NOT NULL,
      seq INT NOT NULL,
      text TEXT NULL,
      media_url VARCHAR(500) NULL,
      media_type VARCHAR(50) NULL,
      status ENUM('sent','delivered','read') DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_msg (conversation_id, message_id),
      INDEX idx_conv_ts (conversation_id, created_at),
      INDEX idx_conv_seq (conversation_id, seq)
    )`,
    `CREATE TABLE IF NOT EXISTS message_receipts (
      message_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      delivered_at TIMESTAMP NULL,
      read_at TIMESTAMP NULL,
      PRIMARY KEY (message_id, user_id)
    )`,
  ];
  for (const s of statements) {
    await pool.query(s);
  }
}

function getPool() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

module.exports = { initPool, getPool, DB_NAME };