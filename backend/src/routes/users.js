const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const userService = require('../services/userService');
const convService = require('../services/conversationService');

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  const u = await userService.getUserById(req.user.id);
  res.json(u);
});

router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json(await userService.listUsers(req.user.id));
  res.json(await userService.searchUsers(q, req.user.id));
});

router.get('/', async (req, res) => {
  res.json(await userService.listUsers(req.user.id));
});

module.exports = router;