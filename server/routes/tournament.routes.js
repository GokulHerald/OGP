const express = require('express');
const { body, validationResult } = require('express-validator');

const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  createTournament,
  getAllTournaments,
  getTournamentById,
  registerForTournament,
  startTournament,
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

router.post(
  '/',
  protect,
  restrictTo('organizer'),
  [
    body('name').notEmpty().isLength({ min: 3, max: 100 }),
    body('game').isIn(['PUBG', 'FreeFire']),
    body('prizePool').isNumeric().isFloat({ min: 0 }),
    body('maxPlayers').isIn([8, 16, 32]),
    body('startDate').isISO8601(),
  ],
  validate,
  createTournament
);

router.post('/:id/register', protect, restrictTo('player'), registerForTournament);
router.post('/:id/start', protect, restrictTo('organizer'), startTournament);

module.exports = router;

