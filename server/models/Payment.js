const mongoose = require('mongoose');

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    player: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },

    // Amounts (in NPR and paisa for gateways that need integer amounts)
    amount: { type: Number, required: true },
    amountInPaisa: { type: Number, required: true },

    gateway: {
      type: String,
      enum: ['esewa', 'khalti'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['entry_fee', 'prize_payout'],
      required: true,
    },

    // eSewa-specific metadata
    esewaRefId: { type: String, default: '' },
    esewaTransactionUuid: { type: String, default: '' },

    // Khalti-specific metadata
    khaltiPidx: { type: String, default: '' },
    khaltiTransactionId: { type: String, default: '' },

    // Our own tracking identifiers
    transactionUuid: { type: String, required: true, unique: true },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: '' },

    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);

