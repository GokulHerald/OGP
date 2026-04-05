const mongoose = require('mongoose');

const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    name: { type: String, trim: true, default: '' },
    captain: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    entryPayment: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true }
);

TeamSchema.index({ tournament: 1, captain: 1 }, { unique: true });

module.exports = mongoose.model('Team', TeamSchema);
