const mongoose = require('mongoose');

const { Schema } = mongoose;

const MatchSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },

    round: { type: Number, required: true }, // 1=QF, 2=SF, 3=Final
    matchNumber: { type: Number, required: true }, // position within round starting at 1

    player1: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    player2: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },

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
    },

    result: {
      player1Placement: { type: Number, default: null },
      player2Placement: { type: Number, default: null },
      player1Kills: { type: Number, default: null },
      player2Kills: { type: Number, default: null },
      player1Score: { type: Number, default: null },
      player2Score: { type: Number, default: null },

      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      notes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

MatchSchema.index({ tournament: 1, round: 1, matchNumber: 1 });

module.exports = mongoose.model('Match', MatchSchema);
