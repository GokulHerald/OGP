const mongoose = require('mongoose');

const { Schema } = mongoose;

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minLength: 3, maxLength: 100 },
    game: { type: String, required: true, enum: ['PUBG', 'FreeFire'] },
    format: {
      type: String,
      required: true,
      enum: ['single-elimination'],
      default: 'single-elimination',
    },

    entryFee: { type: Number, required: true, min: 0, default: 0 },
    prizePool: { type: Number, required: true, min: 0 },

    maxPlayers: { type: Number, required: true, enum: [8, 16, 32], default: 8 },

    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registeredPlayers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],

    status: {
      type: String,
      enum: ['registration', 'ongoing', 'completed', 'cancelled'],
      default: 'registration',
    },

    startDate: { type: Date, required: true },
    rules: { type: String, maxLength: 1000 },
    streamingRequirement: { type: Boolean, default: true },

    bracket: { type: Schema.Types.ObjectId, ref: 'Bracket' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TournamentSchema.virtual('spotsRemaining').get(function () {
  const maxPlayers = this.maxPlayers ?? 0;
  const current = Array.isArray(this.registeredPlayers) ? this.registeredPlayers.length : 0;
  return maxPlayers - current;
});

TournamentSchema.virtual('isFull').get(function () {
  const maxPlayers = this.maxPlayers ?? 0;
  const current = Array.isArray(this.registeredPlayers) ? this.registeredPlayers.length : 0;
  return current >= maxPlayers;
});

module.exports = mongoose.model('Tournament', TournamentSchema);
