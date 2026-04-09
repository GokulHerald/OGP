const express = require('express');
const { body, validationResult } = require('express-validator');

const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  createTournament,
  getAllTournaments,
  getTournamentById,
  registerForTournament,
  registerSquad,
  startTournament,
  setBrWinner,
  getAdminPlayerStats,
} = require('../controllers/tournament.controller');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

router.get('/', getAllTournaments);
router.get('/:id', getTournamentById);
router.get('/:id/admin/player-stats', protect, restrictTo('organizer'), getAdminPlayerStats);

router.post(
  '/',
  protect,
  restrictTo('organizer'),
  [
    body('name').notEmpty().isLength({ min: 3, max: 100 }),
    body('game').isIn(['PUBG', 'FreeFire']),
    body('format').optional().isIn(['single-elimination', 'battle_royale_squad']),
    body('prizePool').isNumeric().isFloat({ min: 0 }),
    body('startDate').isISO8601(),
    body('maxPlayers').optional().isIn([8, 16, 32]),
    body('maxTeams').optional().isInt({ min: 2, max: 32 }),
    body('squadSize').optional().isInt({ min: 2, max: 8 }),
  ],
  validate,
  createTournament
);

router.post('/:id/register', protect, restrictTo('player'), registerForTournament);
router.post('/:id/squads', protect, restrictTo('player'), registerSquad);
router.post('/:id/start', protect, restrictTo('organizer'), startTournament);
router.post('/:id/br-winner', protect, restrictTo('organizer'), setBrWinner);

module.exports = router;
