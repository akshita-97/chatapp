const express = require('express');
const router = express.Router();
const { createUser, authenticate, signToken } = require('../services/userService');

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
    const user = await createUser(email, password, name);
    const token = signToken(user);
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticate(email, password);
    const token = signToken(user);
    res.json({ user, token });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

module.exports = router;