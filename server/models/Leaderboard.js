const mongoose = require('mongoose');

const { Schema } = mongoose;

const LeaderboardSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },

    entries: [
      {
        player: { type: Schema.Types.ObjectId, ref: 'User' },
        points: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        matchesPlayed: { type: Number, default: 0 },
        eliminatedInRound: { type: Number, default: null },
        rank: { type: Number, default: null },
      },
    ],

    scoringConfig: {
      winPoints: { type: Number, default: 10 },
      killPoints: { type: Number, default: 2 },
      placementBonus: { type: Number, default: 5 },
    },

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LeaderboardSchema.index({ tournament: 1 });

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
