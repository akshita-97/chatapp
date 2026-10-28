require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const { initPool } = require('./db');
const redis = require('./redis');
const { initSocket } = require('./socket/handlers');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const convRoutes = require('./routes/conversations');
const mediaRoutes = require('./routes/media');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET','POST'], credentials: true },
  transports: ['websocket','polling'],
});
initSocket(io);

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', convRoutes);
app.use('/api/media', mediaRoutes);

const PORT = process.env.PORT || 4000;

(async () => {
  await initPool();
  await redis.initRedis();
  server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
})();