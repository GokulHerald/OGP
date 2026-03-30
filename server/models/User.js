const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const SALT_ROUNDS = 12;

const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: false },

    username: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      minLength: 3,
      maxLength: 20,
    },
    role: { type: String, enum: ['player', 'organizer'], default: 'player' },

    profilePicture: { type: String, default: '' }, // Cloudinary URL

    stats: {
      gamesPlayed: { type: Number, default: 0 },
      totalWins: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
    },

    isVerified: { type: Boolean, default: false },

    // Even though we enable `timestamps`, this explicit field is required by the spec.
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before persisting (only when it's newly set/changed).
UserSchema.pre('save', async function () {
  if (!this.password || !this.isModified('password')) return;
  this.password = await bcryptjs.hash(this.password, SALT_ROUNDS);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};

UserSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
