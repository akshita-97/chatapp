const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const convService = require('../services/conversationService');
const msgService = require('../services/messageService');
const redis = require('../redis');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const convs = await convService.listConversations(req.user.id);
  // attach online status for direct
  for (const c of convs) {
    if (c.type === 'direct' && c.otherUser) {
      const p = await redis.getPresence(c.otherUser.id);
      c.online = !!p;
    } else {
      c.online = false;
    }
  }
  res.json(convs);
});

router.post('/direct', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const id = await convService.createDirectConversation(req.user.id, userId);
  res.json({ id });
});

router.post('/group', async (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || !Array.isArray(memberIds)) return res.status(400).json({ error: 'name and memberIds required' });
  const id = await convService.createGroup(name, req.user.id, memberIds);
  res.json({ id });
});

router.get('/:id', async (req, res) => {
  const conv = await convService.getConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  if (!await convService.isMember(req.params.id, req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  const members = await convService.listMembers(req.params.id);
  res.json({ ...conv, members });
});

router.get('/:id/messages', async (req, res) => {
  if (!await convService.isMember(req.params.id, req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  const limit = parseInt(req.query.limit || '50', 10);
  const beforeSeq = req.query.beforeSeq ? parseInt(req.query.beforeSeq, 10) : null;
  let msgs;
  if (req.query.afterSeq) {
    msgs = await msgService.getMessages(req.params.id, { afterSeq: parseInt(req.query.afterSeq, 10), limit });
  } else {
    msgs = await msgService.getAllMessages(req.params.id, { limit, beforeSeq });
  }
  res.json(msgs);
});

router.post('/:id/read', async (req, res) => {
  if (!await convService.isMember(req.params.id, req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  const { upToSeq } = req.body || {};
  const ids = await msgService.markRead(req.params.id, req.user.id, upToSeq || 0);
  res.json({ read: ids });
});

module.exports = router;