const { EventEmitter } = require('events');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL;

let redis = null;       // command client
let subscriber = null;  // pub/sub subscriber
let useRedis = false;
const memory = new Map(); // key -> {value, expires}
const channels = new Map(); // channel -> Set of callbacks
const memEmitter = new EventEmitter();

function now() { return Date.now(); }

function memGet(key) {
  const e = memory.get(key);
  if (!e) return null;
  if (e.expires && e.expires < now()) { memory.delete(key); return null; }
  return e.value;
}
function memSet(key, value, ttlMs) {
  memory.set(key, { value, expires: ttlMs ? now() + ttlMs : null });
}
function memDel(key) { memory.delete(key); }

// Presence: keys presence:<userId> with TTL
async function setPresence(userId, socketId) {
  const val = JSON.stringify({ socketId, ts: now() });
  if (useRedis) {
    await redis.set(`presence:${userId}`, val, 'EX', 60);
    await redis.set(`session:${userId}`, socketId);
  } else {
    memSet(`presence:${userId}`, val, 60000);
    memSet(`session:${userId}`, socketId, null);
  }
}
async function getPresence(userId) {
  let raw;
  if (useRedis) raw = await redis.get(`presence:${userId}`);
  else raw = memGet(`presence:${userId}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function getSession(userId) {
  if (useRedis) return await redis.get(`session:${userId}`);
  return memGet(`session:${userId}`);
}
async function removeSession(userId) {
  if (useRedis) { await redis.del(`session:${userId}`); await redis.del(`presence:${userId}`); }
  else { memDel(`session:${userId}`); memDel(`presence:${userId}`); }
}
async function getAllOnlineUserIds() {
  // best-effort: not fully implemented for redis; scan
  if (useRedis) {
    const keys = await redis.keys('presence:*');
    return keys.map(k => k.split(':')[1]);
  }
  const out = [];
  for (const k of memory.keys()) {
    if (k.startsWith('presence:')) {
      const v = memGet(k);
      if (v) out.push(k.split(':')[1]);
    }
  }
  return out;
}

async function publish(channel, message) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  if (useRedis) {
    await redis.publish(channel, payload);
  } else {
    const cbs = channels.get(channel);
    if (cbs) for (const cb of cbs) cb(payload);
  }
}
function subscribe(channel, cb) {
  if (useRedis) {
    if (!subscriber) throw new Error('no subscriber');
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) cb(msg);
    });
  } else {
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel).add(cb);
  }
}
function unsubscribe(channel, cb) {
  if (useRedis) {
    // leave subscribed; harmless
  } else {
    const cbs = channels.get(channel);
    if (cbs) cbs.delete(cb);
  }
}

async function initRedis() {
  if (!REDIS_URL) {
    useRedis = false;
    console.log('[redis] using in-memory fallback');
    return;
  }
  try {
    const IORedis = require('ioredis');
    redis = new IORedis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await redis.connect();
    subscriber = new IORedis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await subscriber.connect();
    useRedis = true;
    console.log('[redis] connected', REDIS_URL);
  } catch (e) {
    console.warn('[redis] failed, falling back to in-memory:', e.message);
    useRedis = false;
    redis = null; subscriber = null;
  }
}

// Cache last 50 messages per conversation (list)
async function cachePush(convId, msg) {
  const key = `cache:msgs:${convId}`;
  if (useRedis) {
    await redis.lpush(key, JSON.stringify(msg));
    await redis.ltrim(key, 0, 49);
  } else {
    if (!memory.has(key)) memory.set(key, { value: [], expires: null });
    const arr = memory.get(key).value;
    arr.unshift(msg);
    if (arr.length > 50) arr.length = 50;
  }
}
async function cacheGet(convId) {
  const key = `cache:msgs:${convId}`;
  if (useRedis) {
    const items = await redis.lrange(key, 0, 49);
    return items.map(i => { try { return JSON.parse(i); } catch { return null; } }).filter(Boolean).reverse();
  }
  const e = memory.get(key);
  if (!e) return [];
  return [...e.value].reverse();
}
async function cacheInvalidate(convId) {
  const key = `cache:msgs:${convId}`;
  if (useRedis) await redis.del(key);
  else memory.delete(key);
}

module.exports = {
  initRedis, useRedis: () => useRedis,
  setPresence, getPresence, getSession, removeSession, getAllOnlineUserIds,
  publish, subscribe, unsubscribe,
  cachePush, cacheGet, cacheInvalidate,
};