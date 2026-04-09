const express = require('express');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ ok: true, service: 'ogp-api' });
});

router.use('/auth', require('./auth.routes'));
router.use('/tournaments', require('./tournament.routes'));
router.use('/matches', require('./match.routes'));
router.use('/leaderboard', require('./leaderboard.routes'));
router.use('/payments', require('./payment.routes'));

module.exports = router;
