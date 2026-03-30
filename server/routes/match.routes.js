const express = require('express');

const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  uploadMatchProof,
  handleUploadError,
} = require('../middleware/upload.middleware');
const {
  getMatchesByTournament,
  submitStreamLink,
  submitMatchProof,
  setMatchResult,
} = require('../controllers/match.controller');

const router = express.Router();

router.get('/tournament/:tournamentId', getMatchesByTournament);
router.post('/:matchId/stream', protect, submitStreamLink);
router.post(
  '/:matchId/proof',
  protect,
  uploadMatchProof.single('screenshot'),
  handleUploadError,
  submitMatchProof,
);
router.post('/:matchId/result', protect, restrictTo('organizer'), setMatchResult);

module.exports = router;

