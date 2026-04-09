const mongoose = require('mongoose');

const { Schema } = mongoose;

const SquadStreamSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    streamUrl: { type: String, default: '' },
    screenshot: { type: String, default: '' },
  },
  { _id: true }
);

const BrTeamSlotSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const MatchSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },

    kind: {
      type: String,
      enum: ['duel', 'br_lobby'],
      default: 'duel',
    },

    round: { type: Number, required: true },
    matchNumber: { type: Number, required: true },

    player1: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    player2: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    winnerTeam: { type: Schema.Types.ObjectId, ref: 'Team', default: null },

    /** Snapshot of squads for BR lobby (captain + members per team). */
    brTeams: [BrTeamSlotSchema],

    status: {
      type: String,
      enum: ['pending', 'live', 'completed', 'walkover'],
      default: 'pending',
    },

    scheduledTime: { type: Date },

    proof: {
      player1StreamUrl: { type: String, default: '' },
      player2StreamUrl: { type: String, default: '' },
      player1Screenshot: { type: String, default: '' },
      player2Screenshot: { type: String, default: '' },
      squadStreams: { type: [SquadStreamSchema], default: [] },
    },

    result: {
      player1Placement: { type: Number, default: null },
      player2Placement: { type: Number, default: null },
      player1Kills: { type: Number, default: null },
      player2Kills: { type: Number, default: null },
      player1Score: { type: Number, default: null },
      player2Score: { type: Number, default: null },

      /** BR per-player results (organizer entered). */
      squadStats: {
        type: [
          {
            user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
            kills: { type: Number, default: 0 },
            placement: { type: Number, default: null },
            score: { type: Number, default: 0 },
          },
        ],
        default: [],
      },

      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      notes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

MatchSchema.index({ tournament: 1, round: 1, matchNumber: 1 });

module.exports = mongoose.model('Match', MatchSchema);
