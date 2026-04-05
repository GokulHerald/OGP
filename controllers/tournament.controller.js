const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const User = require('../models/User');
const Bracket = require('../models/Bracket');
const Match = require('../models/Match');
const Leaderboard = require('../models/Leaderboard');
const { generateBracket } = require('../utils/bracket.utils');

async function addSquadPlayersToLeaderboard(team, tournamentId) {
  const leaderboard = await Leaderboard.findOne({ tournament: tournamentId });
  if (!leaderboard) return;

  const playerIds = [team.captain, ...(team.members || [])].map((id) => String(id));
  for (const pid of playerIds) {
    const exists = leaderboard.entries.some((e) => String(e.player) === pid);
    if (!exists) {
      leaderboard.entries.push({ player: pid, points: 0, wins: 0, matchesPlayed: 0 });
    }
  }
  leaderboard.lastUpdated = new Date();
  await leaderboard.save();
}

async function getUsedPlayerIdsForTournament(tournamentId) {
  const teams = await Team.find({ tournament: tournamentId }).select('captain members');
  const set = new Set();
  for (const t of teams) {
    set.add(String(t.captain));
    (t.members || []).forEach((m) => set.add(String(m)));
  }
  return set;
}

async function createTournament(req, res) {
  try {
    const {
      name,
      game,
      entryFee,
      prizePool,
      maxPlayers,
      startDate,
      rules,
      format = 'single-elimination',
      maxTeams,
      squadSize,
    } = req.body;

    const payload = {
      name,
      game,
      entryFee,
      prizePool,
      startDate,
      rules,
      organizer: req.user._id,
      format,
    };

    if (format === 'battle_royale_squad') {
      const mt = Number(maxTeams);
      const ss = Number(squadSize) || 4;
      if (!Number.isFinite(mt) || mt < 2 || mt > 32) {
        return res.status(400).json({ message: 'maxTeams must be between 2 and 32' });
      }
      if (ss < 2 || ss > 8) {
        return res.status(400).json({ message: 'squadSize must be between 2 and 8' });
      }
      if (mt * ss > 128) {
        return res.status(400).json({ message: 'maxTeams × squadSize cannot exceed 128' });
      }
      payload.maxTeams = mt;
      payload.squadSize = ss;
      payload.maxPlayers = mt * ss;
    } else {
      if (![8, 16, 32].includes(Number(maxPlayers))) {
        return res.status(400).json({ message: 'maxPlayers must be 8, 16, or 32' });
      }
      payload.maxPlayers = Number(maxPlayers);
    }

    const tournament = await Tournament.create(payload);

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
      .populate({
        path: 'registeredTeams',
        populate: [
          { path: 'captain', select: 'username profilePicture' },
          { path: 'members', select: 'username profilePicture' },
        ],
      })
      .populate('bracket')
      .populate('winnerTeam', 'name captain');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    return res.status(200).json({ tournament });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch tournament' });
  }
}

async function registerSquad(req, res) {
  try {
    const { id } = req.params;
    const { name = '', memberIds = [] } = req.body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.format !== 'battle_royale_squad') {
      return res.status(400).json({ message: 'This tournament does not use squad registration' });
    }

    if (tournament.status !== 'registration') {
      return res.status(400).json({ message: 'Registration is closed for this tournament' });
    }

    if (tournament.isFull) {
      return res.status(400).json({ message: 'Tournament is full' });
    }

    if (req.user.role === 'organizer') {
      return res.status(400).json({ message: 'Organizers cannot register as players' });
    }

    const squadSize = tournament.squadSize || 4;
    const maxMembers = squadSize - 1;
    if (!Array.isArray(memberIds) || memberIds.length !== maxMembers) {
      return res.status(400).json({
        message: `Squad must have exactly ${squadSize} players (you + ${maxMembers} members).`,
      });
    }

    const uniq = new Set(memberIds.map(String));
    if (uniq.size !== memberIds.length) {
      return res.status(400).json({ message: 'Duplicate member IDs' });
    }
    if (memberIds.some((mid) => String(mid) === String(req.user._id))) {
      return res.status(400).json({ message: 'Captain cannot be listed in memberIds' });
    }

    const existingCaptainTeam = await Team.findOne({
      tournament: tournament._id,
      captain: req.user._id,
    });
    if (existingCaptainTeam) {
      return res.status(400).json({ message: 'You already have a squad for this tournament' });
    }

    const memberUsers = await User.find({ _id: { $in: memberIds } });
    if (memberUsers.length !== memberIds.length) {
      return res.status(400).json({ message: 'One or more members not found' });
    }
    if (memberUsers.some((u) => u.role === 'organizer')) {
      return res.status(400).json({ message: 'Organizers cannot join as squad members' });
    }

    const used = await getUsedPlayerIdsForTournament(tournament._id);
    const squadPlayerIds = [String(req.user._id), ...memberIds.map(String)];
    for (const pid of squadPlayerIds) {
      if (used.has(pid)) {
        return res.status(400).json({
          message: 'One or more players are already registered in another squad',
        });
      }
    }

    const team = await Team.create({
      tournament: tournament._id,
      name: String(name).trim(),
      captain: req.user._id,
      members: memberIds,
    });

    if (tournament.entryFee > 0) {
      return res.status(201).json({
        team,
        requiresPayment: true,
        entryFee: tournament.entryFee,
        message: 'Complete payment to confirm squad registration',
      });
    }

    tournament.registeredTeams.push(team._id);
    await tournament.save();
    await addSquadPlayersToLeaderboard(team, tournament._id);

    const populated = await Team.findById(team._id)
      .populate('captain', 'username profilePicture')
      .populate('members', 'username profilePicture');

    return res.status(201).json({
      message: 'Squad registered',
      team: populated,
      tournament,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to register squad' });
  }
}

async function registerForTournament(req, res) {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.format === 'battle_royale_squad') {
      return res.status(400).json({
        message: 'This tournament uses squad registration. Create a squad with your captain account.',
        requiresSquad: true,
      });
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

    if (tournament.entryFee > 0) {
      return res.status(400).json({
        message: 'This tournament requires payment',
        requiresPayment: true,
        entryFee: tournament.entryFee,
      });
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

    if (tournament.format === 'battle_royale_squad') {
      const teamCount = tournament.registeredTeams.length;
      if (teamCount < 2) {
        return res.status(400).json({ message: 'Need at least 2 squads to start' });
      }

      const teams = await Team.find({ _id: { $in: tournament.registeredTeams } });

      const brTeams = teams.map((t) => ({
        team: t._id,
        players: [t.captain, ...(t.members || [])],
      }));

      const lobbyMatch = await Match.create({
        tournament: tournament._id,
        kind: 'br_lobby',
        round: 1,
        matchNumber: 1,
        brTeams,
        status: 'pending',
        proof: { squadStreams: [] },
      });

      const bracket = await Bracket.create({
        tournament: tournament._id,
        totalRounds: 1,
        matches: [lobbyMatch._id],
        currentRound: 1,
        isComplete: false,
        champion: null,
        championTeam: null,
      });

      tournament.status = 'ongoing';
      tournament.bracket = bracket._id;
      await tournament.save();

      return res.status(200).json({
        message: 'Tournament started',
        bracket,
        match: lobbyMatch,
      });
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

async function setBrWinner(req, res) {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (String(tournament.organizer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the organizer can set the winner' });
    }

    if (tournament.format !== 'battle_royale_squad') {
      return res.status(400).json({ message: 'Not a squad battle royale tournament' });
    }

    if (tournament.status !== 'ongoing') {
      return res.status(400).json({ message: 'Tournament is not ongoing' });
    }

    const team = await Team.findOne({
      _id: teamId,
      tournament: tournament._id,
    });
    if (!team) {
      return res.status(404).json({ message: 'Team not found in this tournament' });
    }

    const lobby = await Match.findOne({
      tournament: tournament._id,
      kind: 'br_lobby',
    });
    if (!lobby) {
      return res.status(404).json({ message: 'Lobby match not found' });
    }

    lobby.winnerTeam = team._id;
    lobby.status = 'completed';
    await lobby.save();

    tournament.status = 'completed';
    tournament.winnerTeam = team._id;
    await tournament.save();

    const bracket = await Bracket.findOne({ tournament: tournament._id });
    if (bracket) {
      bracket.isComplete = true;
      bracket.championTeam = team._id;
      bracket.champion = team.captain;
      await bracket.save();
    }

    const Wallet = require('../models/Wallet');
    const Payment = require('../models/Payment');

    const captainId = team.captain;
    let wallet = await Wallet.findOne({ user: captainId });
    if (!wallet) {
      wallet = await Wallet.create({ user: captainId });
    }

    const prizeAmount = Number(tournament.prizePool) || 0;
    if (prizeAmount > 0) {
      wallet.balance += prizeAmount;
      wallet.totalEarned += prizeAmount;
      await wallet.save();

      await Payment.create({
        player: captainId,
        tournament: tournament._id,
        amount: prizeAmount,
        amountInPaisa: Math.round(prizeAmount * 100),
        gateway: 'esewa',
        type: 'prize_payout',
        status: 'completed',
        transactionUuid: `PRIZE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        paidAt: new Date(),
        metadata: {
          note: 'Prize credited to captain wallet; squad distribution is manual.',
          teamId: String(team._id),
        },
      });
    }

    const lb = await Leaderboard.findOne({ tournament: tournament._id });
    if (lb) {
      const capStr = String(captainId);
      const entry = lb.entries.find((e) => String(e.player) === capStr);
      if (entry) {
        entry.wins += 1;
        entry.points += Number(lb.scoringConfig?.winPoints || 10);
      }
      lb.lastUpdated = new Date();
      await lb.save();
    }

    return res.status(200).json({
      message: 'Winner recorded; prize credited to captain wallet',
      tournament,
      team,
      wallet,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to set BR winner' });
  }
}

module.exports = {
  createTournament,
  getAllTournaments,
  getTournamentById,
  registerForTournament,
  registerSquad,
  startTournament,
  setBrWinner,
};
