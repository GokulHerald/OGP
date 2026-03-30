const Leaderboard = require('../models/Leaderboard');

async function getLeaderboard(req, res) {
  try {
    const { tournamentId } = req.params;

    const leaderboard = await Leaderboard.findOne({ tournament: tournamentId }).populate(
      'entries.player',
      'username profilePicture stats'
    );

    if (!leaderboard) {
      return res.status(404).json({ message: 'Leaderboard not found' });
    }

    const leaderboardObj = leaderboard.toObject();
    const sortedEntries = [...leaderboardObj.entries].sort(
      (a, b) => (b.points || 0) - (a.points || 0)
    );
    leaderboardObj.entries = sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return res.status(200).json({ leaderboard: leaderboardObj });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch leaderboard' });
  }
}

module.exports = { getLeaderboard };

