const Match = require('../models/Match');
const Leaderboard = require('../models/Leaderboard');
const { advanceWinner } = require('../utils/bracket.utils');

async function getMatchesByTournament(req, res) {
  try {
    const { tournamentId } = req.params;
    const { round } = req.query;

    const filters = { tournament: tournamentId };
    if (round) {
      filters.round = Number(round);
    }

    const matches = await Match.find(filters)
      .populate('player1', 'username profilePicture')
      .populate('player2', 'username profilePicture')
      .populate('winner', 'username profilePicture')
      .populate({
        path: 'brTeams.team',
        select: 'name captain members',
        populate: [
          { path: 'captain', select: 'username profilePicture' },
          { path: 'members', select: 'username profilePicture' },
        ],
      })
      .populate('brTeams.players', 'username profilePicture')
      .populate('winnerTeam', 'name captain')
      .sort({ round: 1, matchNumber: 1 });

    return res.status(200).json({ matches });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch matches' });
  }
}

function findBrSlot(match, userId) {
  if (match.kind !== 'br_lobby' || !Array.isArray(match.brTeams)) return null;
  for (const slot of match.brTeams) {
    const teamId = slot.team?._id || slot.team;
    const players = slot.players || [];
    if (players.some((p) => String(p) === userId || String(p?._id) === userId)) {
      return { teamId: String(teamId) };
    }
  }
  return null;
}

async function submitStreamLink(req, res) {
  try {
    const { matchId } = req.params;
    const { streamUrl } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const userId = String(req.user._id);

    const allowedPrefixes = [
      'https://youtube.com',
      'https://youtu.be',
      'https://www.youtube.com',
      'https://twitch.tv',
      'https://www.twitch.tv',
      'https://fb.gg',
      'https://www.facebook.com/gaming',
    ];
    const normalized =
      typeof streamUrl === 'string' ? streamUrl.trim().toLowerCase() : '';
    const validUrl = allowedPrefixes.some((p) => normalized.startsWith(p));
    if (!validUrl) {
      return res.status(400).json({
        message: 'Only YouTube, Twitch, or Facebook Gaming links accepted',
      });
    }

    if (match.kind === 'br_lobby') {
      const slot = findBrSlot(match, userId);
      if (!slot) {
        return res.status(403).json({ message: 'You are not a participant in this match' });
      }
      if (!match.proof.squadStreams) {
        match.proof.squadStreams = [];
      }
      const idx = match.proof.squadStreams.findIndex((s) => String(s.user) === userId);
      if (idx >= 0) {
        match.proof.squadStreams[idx].streamUrl = streamUrl;
        match.proof.squadStreams[idx].team = slot.teamId;
      } else {
        match.proof.squadStreams.push({
          user: req.user._id,
          team: slot.teamId,
          streamUrl,
          screenshot: '',
        });
      }
    } else {
      const isPlayer1 = match.player1 && String(match.player1) === userId;
      const isPlayer2 = match.player2 && String(match.player2) === userId;
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ message: 'You are not a participant in this match' });
      }

      if (isPlayer1) {
        match.proof.player1StreamUrl = streamUrl;
      }
      if (isPlayer2) {
        match.proof.player2StreamUrl = streamUrl;
      }
    }

    if (match.status === 'pending') {
      match.status = 'live';
    }

    await match.save();
    const updated = await Match.findById(matchId)
      .populate('player1', 'username profilePicture')
      .populate('player2', 'username profilePicture')
      .populate({
        path: 'brTeams.team',
        select: 'name captain members',
        populate: [
          { path: 'captain', select: 'username profilePicture' },
          { path: 'members', select: 'username profilePicture' },
        ],
      })
      .populate('brTeams.players', 'username profilePicture');

    return res.status(200).json({ message: 'Stream link submitted', match: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to submit stream link' });
  }
}

async function submitMatchProof(req, res) {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const userId = String(req.user._id);

    if (match.status === 'completed') {
      return res.status(400).json({ message: 'Match is already completed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a screenshot' });
    }

    if (match.kind === 'br_lobby') {
      const slot = findBrSlot(match, userId);
      if (!slot) {
        return res.status(403).json({ message: 'You are not a participant in this match' });
      }
      if (!match.proof.squadStreams) {
        match.proof.squadStreams = [];
      }
      const idx = match.proof.squadStreams.findIndex((s) => String(s.user) === userId);
      if (idx >= 0) {
        match.proof.squadStreams[idx].screenshot = req.file.path;
        match.proof.squadStreams[idx].team = slot.teamId;
      } else {
        match.proof.squadStreams.push({
          user: req.user._id,
          team: slot.teamId,
          streamUrl: '',
          screenshot: req.file.path,
        });
      }
    } else {
      const isPlayer1 = match.player1 && String(match.player1) === userId;
      const isPlayer2 = match.player2 && String(match.player2) === userId;
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ message: 'You are not a participant in this match' });
      }

      if (isPlayer1) {
        match.proof.player1Screenshot = req.file.path;
      }
      if (isPlayer2) {
        match.proof.player2Screenshot = req.file.path;
      }
    }

    await match.save();
    const updated = await Match.findById(matchId)
      .populate('player1', 'username profilePicture')
      .populate('player2', 'username profilePicture')
      .populate({
        path: 'brTeams.team',
        select: 'name captain members',
        populate: [
          { path: 'captain', select: 'username profilePicture' },
          { path: 'members', select: 'username profilePicture' },
        ],
      })
      .populate('brTeams.players', 'username profilePicture');

    return res.status(200).json({
      message: 'Screenshot uploaded successfully',
      screenshotUrl: req.file.path,
      match: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to submit screenshot' });
  }
}

async function setMatchResult(req, res) {
  try {
    const { matchId } = req.params;
    const {
      winnerId,
      player1Kills,
      player2Kills,
      player1Placement,
      player2Placement,
      player1Score,
      player2Score,
      notes,
    } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ message: 'Match result already set' });
    }

    match.result.player1Kills = player1Kills;
    match.result.player2Kills = player2Kills;
    match.result.player1Placement = player1Placement;
    match.result.player2Placement = player2Placement;
    match.result.player1Score = player1Score;
    match.result.player2Score = player2Score;
    match.result.notes = notes || '';
    match.result.verifiedBy = req.user._id;
    match.result.verifiedAt = Date.now();
    await match.save();

    if (typeof advanceWinner !== 'function') {
      return res.status(500).json({ message: 'Bracket advancement is not configured' });
    }

    const bracketUpdate = await advanceWinner(matchId, winnerId);

    const leaderboard = await Leaderboard.findOne({ tournament: match.tournament });
    if (leaderboard) {
      const winnerEntry = leaderboard.entries.find(
        (entry) => String(entry.player) === String(winnerId)
      );
      if (winnerEntry) {
        const winnerScore =
          String(winnerId) === String(match.player1) ? Number(player1Score || 0) : Number(player2Score || 0);
        winnerEntry.wins += 1;
        winnerEntry.points += Number(leaderboard.scoringConfig.winPoints || 0) + winnerScore;
        await leaderboard.save();
      }
    }

    const updatedMatch = await Match.findById(matchId);

    return res.status(200).json({
      message: 'Result recorded',
      match: updatedMatch,
      bracketUpdate,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to set match result' });
  }
}

module.exports = {
  getMatchesByTournament,
  submitStreamLink,
  submitMatchProof,
  setMatchResult,
};

