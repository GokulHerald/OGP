const mongoose = require('mongoose');

const { Schema } = mongoose;

const BracketSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, unique: true },
    totalRounds: { type: Number, required: true },
    matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
    currentRound: { type: Number, default: 1 },
    isComplete: { type: Boolean, default: false },
    champion: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bracket', BracketSchema);
