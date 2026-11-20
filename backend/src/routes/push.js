const express = require('express');
const { requireAuth } = require('../middleware/auth');
const push = require('../services/push');

const router = express.Router();

// Public: the browser needs the key before it can subscribe.
router.get('/public-key', (_req, res) => {
  const enabled = push.isEnabled();
  res.json({ enabled, publicKey: enabled ? process.env.VAPID_PUBLIC_KEY : null });
});

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    await push.saveSubscription(req.user.id, req.body?.subscription);
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.message === 'Invalid push subscription.') return res.status(422).json({ error: error.message });
    next(error);
  }
});

router.delete('/subscribe', requireAuth, async (req, res, next) => {
  try {
    await push.removeSubscription(req.user.id, req.body?.endpoint);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

module.exports = router;
