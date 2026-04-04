const mongoose = require('mongoose');

const { Schema } = mongoose;

const WithdrawalRequestSchema = new Schema(
  {
    amount: { type: Number, required: true },
    gateway: {
      type: String,
      enum: ['esewa', 'khalti'],
      required: true,
    },
    walletId: { type: String, required: true }, // Player's eSewa / Khalti identifier (e.g. phone)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, default: '' },
  },
  { _id: false }
);

const WalletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // All monetary amounts are in NPR.
    balance: { type: Number, default: 0 }, // Available to withdraw
    pendingBalance: { type: Number, default: 0 }, // Awaiting approval / lock
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    withdrawalRequests: {
      type: [WithdrawalRequestSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', WalletSchema);

