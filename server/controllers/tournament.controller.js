const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Bracket = require('../models/Bracket');
const Match = require('../models/Match');
const Leaderboard = require('../models/Leaderboard');
const { generateBracket } = require('../utils/bracket.utils');

void User;
void Bracket;
void Match;

async function createTournament(req, res) {
  try {
    const { name, game, entryFee, prizePool, maxPlayers, startDate, rules } = req.body;

    const tournament = await Tournament.create({
      name,
      game,
      entryFee,
      prizePool,
      maxPlayers,
      startDate,
      rules,
      organizer: req.user._id,
    });

    const leaderboard = await Leaderboard.create({
      tournament: tournament._id,
    });

    return res.status(201).json({ tournament, leaderboard });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create tournament' });
  }
}

async function getAllTournaments(req, res) {
  try {
    const { game, status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const filters = {};
    if (game) filters.game = game;
    if (status) filters.status = status;

    const [tournaments, totalCount] = await Promise.all([
      Tournament.find(filters)
        .populate('organizer', 'username phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(filters),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return res.status(200).json({
      tournaments,
      totalCount,
      page,
      totalPages,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch tournaments' });
  }
}

async function getTournamentById(req, res) {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id)
      .populate('organizer', 'username')
      .populate('registeredPlayers', 'username stats profilePicture')
      .populate('bracket');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    return res.status(200).json({ tournament });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch tournament' });
  }
}

async function registerForTournament(req, res) {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.status !== 'registration') {
      return res
        .status(400)
        .json({ message: 'Registration is closed for this tournament' });
    }

    if (tournament.isFull) {
      return res.status(400).json({ message: 'Tournament is full' });
    }

    const isAlreadyRegistered = tournament.registeredPlayers.some(
      (playerId) => String(playerId) === String(req.user._id)
    );
    if (isAlreadyRegistered) {
      return res.status(400).json({ message: 'You are already registered' });
    }

    if (req.user.role === 'organizer') {
      return res.status(400).json({ message: 'Organizers cannot register as players' });
    }

    tournament.registeredPlayers.push(req.user._id);

    const leaderboard = await Leaderboard.findOne({ tournament: tournament._id });
    if (leaderboard) {
      leaderboard.entries.push({ player: req.user._id });
      await Promise.all([tournament.save(), leaderboard.save()]);
    } else {
      await tournament.save();
    }

    return res.status(200).json({
      message: 'Successfully registered',
      tournament,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to register for tournament' });
  }
}

async function startTournament(req, res) {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (String(tournament.organizer) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: 'Only the tournament organizer can start it' });
    }

    if (tournament.status !== 'registration') {
      return res
        .status(400)
        .json({ message: 'Tournament has already started or is completed' });
    }

    const playerCount = tournament.registeredPlayers.length;
    if (playerCount < 2) {
      return res.status(400).json({ message: 'Need at least 2 players to start' });
    }

    const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;
    if (!isPowerOfTwo(playerCount)) {
      return res.status(400).json({
        message: 'Player count must be a power of 2 (2, 4, 8, 16, 32)',
      });
    }

    if (typeof generateBracket !== 'function') {
      return res.status(500).json({ message: 'Bracket generator is not configured' });
    }

    const bracket = await generateBracket(tournament);

    tournament.status = 'ongoing';
    tournament.bracket = bracket._id;
    await tournament.save();

    return res.status(200).json({
      message: 'Tournament started',
      bracket,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to start tournament' });
  }
}

module.exports = {
  createTournament,
  getAllTournaments,
  getTournamentById,
  registerForTournament,
  startTournament,
};

