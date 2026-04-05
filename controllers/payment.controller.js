const axios = require('axios');
const crypto = require('crypto');

const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const Tournament = require('../models/Tournament');
const Leaderboard = require('../models/Leaderboard');
const Team = require('../models/Team');

function generateTransactionUuid() {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

// --- Helpers ---

async function registerPlayerAfterPayment(payment, tournament) {
  const t = tournament || (await Tournament.findById(payment.tournament));
  if (!t) return;

  const playerId = payment.player;

  const alreadyRegistered = t.registeredPlayers?.some((p) => String(p) === String(playerId));
  if (!alreadyRegistered) {
    t.registeredPlayers.push(playerId);
  }

  let leaderboard = await Leaderboard.findOne({ tournament: t._id });
  if (!leaderboard) {
    leaderboard = await Leaderboard.create({
      tournament: t._id,
      entries: [],
    });
  }

  const existingEntry = leaderboard.entries.find((e) => String(e.player) === String(playerId));
  if (!existingEntry) {
    leaderboard.entries.push({ player: playerId, points: 0, wins: 0, matchesPlayed: 0 });
  }

  leaderboard.lastUpdated = new Date();

  await Promise.all([t.save(), leaderboard.save()]);
}

async function registerTeamAfterPayment(payment, tournament) {
  const t = tournament || (await Tournament.findById(payment.tournament));
  if (!t) return;

  const teamId = payment.metadata?.teamId;
  if (!teamId) return;

  const team = await Team.findById(teamId);
  if (!team || String(team.tournament) !== String(t._id)) return;

  const already = t.registeredTeams?.some((id) => String(id) === String(teamId));
  if (!already) {
    t.registeredTeams.push(team._id);
  }
  team.entryPayment = payment._id;
  await team.save();

  let leaderboard = await Leaderboard.findOne({ tournament: t._id });
  if (!leaderboard) {
    leaderboard = await Leaderboard.create({ tournament: t._id, entries: [] });
  }

  const playerIds = [team.captain, ...(team.members || [])];
  for (const pid of playerIds) {
    const exists = leaderboard.entries.some((e) => String(e.player) === String(pid));
    if (!exists) {
      leaderboard.entries.push({ player: pid, points: 0, wins: 0, matchesPlayed: 0 });
    }
  }
  leaderboard.lastUpdated = new Date();

  await Promise.all([t.save(), leaderboard.save()]);
}

async function registerAfterPayment(payment) {
  const tournament = await Tournament.findById(payment.tournament);
  if (!tournament) return;
  if (tournament.format === 'battle_royale_squad') {
    await registerTeamAfterPayment(payment, tournament);
  } else {
    await registerPlayerAfterPayment(payment, tournament);
  }
}

// --- eSewa: initiate payment ---

async function initiateEsewaPayment(req, res) {
  try {
    const { tournamentId, teamId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.entryFee === 0) {
      return res
        .status(400)
        .json({ message: 'This tournament is free, no payment needed' });
    }

    let metadata = {};

    if (tournament.format === 'battle_royale_squad') {
      if (!teamId) {
        return res.status(400).json({ message: 'teamId is required for squad tournaments' });
      }
      const team = await Team.findById(teamId);
      if (!team || String(team.tournament) !== String(tournament._id)) {
        return res.status(404).json({ message: 'Team not found for this tournament' });
      }
      if (String(team.captain) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Only the squad captain can pay' });
      }
      const teamInList = tournament.registeredTeams?.some((id) => String(id) === String(teamId));
      if (teamInList) {
        return res.status(400).json({ message: 'Squad is already registered' });
      }
      metadata = { teamId: String(team._id) };
    } else {
      const alreadyRegistered =
        tournament.registeredPlayers?.some((p) => String(p) === String(req.user._id)) ?? false;
      if (alreadyRegistered) {
        return res.status(400).json({ message: 'Already registered for this tournament' });
      }
    }

    const transactionUuid = generateTransactionUuid();
    const amount = tournament.entryFee;
    const amountInPaisa = amount * 100;

    const payment = await Payment.create({
      player: req.user._id,
      tournament: tournament._id,
      amount,
      amountInPaisa,
      gateway: 'esewa',
      type: 'entry_fee',
      status: 'pending',
      transactionUuid,
      metadata,
    });

    const merchantId = process.env.ESEWA_MERCHANT_ID;
    const secret = process.env.ESEWA_SECRET;
    const serverUrl = process.env.SERVER_URL;

    const message = `total_amount=${amount},transaction_uuid=${payment.transactionUuid},product_code=${merchantId}`;
    const signature = crypto.createHmac('sha256', secret).update(message).digest('base64');

    return res.status(200).json({
      payment_id: payment._id,
      amount,
      tax_amount: 0,
      total_amount: amount,
      transaction_uuid: payment.transactionUuid,
      product_code: merchantId,
      product_service_charge: 0,
      product_delivery_charge: 0,
      success_url: `${serverUrl}/api/v1/payments/esewa/success`,
      failure_url: `${serverUrl}/api/v1/payments/esewa/failure`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
      esewa_payment_url: process.env.ESEWA_PAYMENT_URL,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('initiateEsewaPayment error', err);
    return res.status(500).json({ message: 'Failed to initiate eSewa payment' });
  }
}

// --- eSewa: success callback ---

async function esewaSuccess(req, res) {
  try {
    const { data } = req.query;
    const clientUrl = process.env.CLIENT_URL;

    if (!data) {
      return res.redirect(`${clientUrl}/payment/failed`);
    }

    const decoded = JSON.parse(Buffer.from(String(data), 'base64').toString());
    const { transaction_uuid, total_amount, transaction_code } = decoded || {};

    if (!transaction_uuid) {
      return res.redirect(`${clientUrl}/payment/failed`);
    }

    const payment = await Payment.findOne({ transactionUuid: transaction_uuid });
    if (!payment) {
      return res.redirect(`${clientUrl}/payment/failed`);
    }

    try {
      const statusUrl = process.env.ESEWA_STATUS_URL;
      const merchantId = process.env.ESEWA_MERCHANT_ID;
      const verifyRes = await axios.get(statusUrl, {
        params: {
          product_code: merchantId,
          total_amount,
          transaction_uuid,
        },
      });

      if (verifyRes.data?.status === 'COMPLETE') {
        payment.status = 'completed';
        payment.esewaRefId = transaction_code || '';
        payment.esewaTransactionUuid = transaction_uuid;
        payment.paidAt = new Date();
        await payment.save();

        await registerAfterPayment(payment);

        return res.redirect(
          `${clientUrl}/payment/success?tournament=${payment.tournament}`
        );
      }

      payment.status = 'failed';
      payment.failureReason = 'Verification failed';
      await payment.save();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('eSewa verify error', err);
      payment.status = 'failed';
      payment.failureReason = 'Verification error';
      await payment.save();
    }

    return res.redirect(`${clientUrl}/payment/failed`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('esewaSuccess error', err);
    return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
  }
}

// --- eSewa: failure callback ---

async function esewaFailure(req, res) {
  try {
    const { data } = req.query;
    const clientUrl = process.env.CLIENT_URL;

    if (data) {
      try {
        const decoded = JSON.parse(Buffer.from(String(data), 'base64').toString());
        const { transaction_uuid } = decoded || {};
        if (transaction_uuid) {
          const payment = await Payment.findOne({ transactionUuid: transaction_uuid });
          if (payment) {
            payment.status = 'failed';
            payment.failureReason = 'eSewa failure callback';
            await payment.save();
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('esewaFailure decode error', err);
      }
    }

    return res.redirect(`${clientUrl}/payment/failed`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('esewaFailure error', err);
    return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
  }
}

// --- Khalti: initiate payment ---

async function initiateKhaltiPayment(req, res) {
  try {
    const { tournamentId, teamId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.entryFee === 0) {
      return res
        .status(400)
        .json({ message: 'This tournament is free, no payment needed' });
    }

    let metadata = {};

    if (tournament.format === 'battle_royale_squad') {
      if (!teamId) {
        return res.status(400).json({ message: 'teamId is required for squad tournaments' });
      }
      const team = await Team.findById(teamId);
      if (!team || String(team.tournament) !== String(tournament._id)) {
        return res.status(404).json({ message: 'Team not found for this tournament' });
      }
      if (String(team.captain) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Only the squad captain can pay' });
      }
      const teamInList = tournament.registeredTeams?.some((id) => String(id) === String(teamId));
      if (teamInList) {
        return res.status(400).json({ message: 'Squad is already registered' });
      }
      metadata = { teamId: String(team._id) };
    } else {
      const alreadyRegistered =
        tournament.registeredPlayers?.some((p) => String(p) === String(req.user._id)) ?? false;
      if (alreadyRegistered) {
        return res.status(400).json({ message: 'Already registered for this tournament' });
      }
    }

    const transactionUuid = generateTransactionUuid();
    const amount = tournament.entryFee;
    const amountInPaisa = amount * 100;

    const payment = await Payment.create({
      player: req.user._id,
      tournament: tournament._id,
      amount,
      amountInPaisa,
      gateway: 'khalti',
      type: 'entry_fee',
      status: 'pending',
      transactionUuid,
      metadata,
    });

    const serverUrl = process.env.SERVER_URL;
    const clientUrl = process.env.CLIENT_URL;
    const secretKey = process.env.KHALTI_SECRET_KEY;

    const initiateBody = {
      return_url: `${serverUrl}/api/v1/payments/khalti/callback`,
      website_url: clientUrl,
      amount: amountInPaisa,
      purchase_order_id: payment.transactionUuid,
      purchase_order_name: `Entry fee - ${tournament.name}`,
      customer_info: {
        name: req.user.username,
        phone: req.user.phoneNumber,
      },
    };

    const response = await axios.post(
      'https://a.khalti.com/api/v2/epayment/initiate/',
      initiateBody,
      {
        headers: {
          Authorization: `Key ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    payment.khaltiPidx = response.data?.pidx || '';
    await payment.save();

    return res.status(200).json({
      payment_url: response.data?.payment_url,
      pidx: response.data?.pidx,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('initiateKhaltiPayment error', err.response?.data || err);
    return res.status(500).json({ message: 'Failed to initiate Khalti payment' });
  }
}

// --- Khalti: callback ---

async function khaltiCallback(req, res) {
  try {
    const { pidx, status, purchase_order_id } = req.query;
    const clientUrl = process.env.CLIENT_URL;

    if (!pidx || !purchase_order_id) {
      return res.redirect(`${clientUrl}/payment/failed`);
    }

    if (status !== 'Completed') {
      return res.redirect(`${clientUrl}/payment/failed`);
    }

    const payment = await Payment.findOne({
      transactionUuid: purchase_order_id,
    });
    if (!payment) {
      return res.redirect(`${clientUrl}/payment/failed`);
    }

    try {
      const secretKey = process.env.KHALTI_SECRET_KEY;
      const lookupRes = await axios.post(
        'https://a.khalti.com/api/v2/epayment/lookup/',
        { pidx },
        {
          headers: {
            Authorization: `Key ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (lookupRes.data?.status === 'Completed') {
        payment.status = 'completed';
        payment.khaltiTransactionId = lookupRes.data?.transaction_id || '';
        payment.khaltiPidx = pidx;
        payment.paidAt = new Date();
        await payment.save();

        await registerAfterPayment(payment);

        return res.redirect(
          `${clientUrl}/payment/success?tournament=${payment.tournament}`
        );
      }

      payment.status = 'failed';
      payment.failureReason = 'Khalti lookup not completed';
      await payment.save();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('khaltiCallback lookup error', err.response?.data || err);
      payment.status = 'failed';
      payment.failureReason = 'Khalti lookup error';
      await payment.save();
    }

    return res.redirect(`${clientUrl}/payment/failed`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('khaltiCallback error', err);
    return res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
  }
}

// --- Queries: player payments / wallet ---

async function getMyPayments(req, res) {
  try {
    const payments = await Payment.find({ player: req.user._id })
      .populate('tournament', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({ payments });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('getMyPayments error', err);
    return res.status(500).json({ message: 'Failed to load payments' });
  }
}

async function getMyWallet(req, res) {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }
    return res.status(200).json({ wallet });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('getMyWallet error', err);
    return res.status(500).json({ message: 'Failed to load wallet' });
  }
}

// --- Withdrawals ---

async function requestWithdrawal(req, res) {
  try {
    const { amount, gateway, walletId } = req.body;

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (numericAmount > wallet.balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (numericAmount < 100) {
      return res.status(400).json({ message: 'Minimum withdrawal is Rs. 100' });
    }

    wallet.balance -= numericAmount;
    wallet.pendingBalance += numericAmount;

    wallet.withdrawalRequests.push({
      amount: numericAmount,
      gateway,
      walletId,
      status: 'pending',
    });

    await wallet.save();

    return res.status(200).json({
      message: 'Withdrawal request submitted',
      wallet,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('requestWithdrawal error', err);
    return res.status(500).json({ message: 'Failed to submit withdrawal request' });
  }
}

async function processWithdrawal(req, res) {
  try {
    const { userId, withdrawalId, action, rejectionReason } = req.body;

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const request = wallet.withdrawalRequests.id(withdrawalId);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    const amount = Number(request.amount) || 0;

    if (action === 'reject') {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason || '';
      wallet.pendingBalance -= amount;
      wallet.balance += amount;
      request.processedAt = new Date();
      request.processedBy = req.user._id;

      await wallet.save();

      return res.status(200).json({
        message: 'Withdrawal rejected',
        wallet,
      });
    }

    if (action === 'approve') {
      request.status = 'paid';
      request.processedAt = new Date();
      request.processedBy = req.user._id;

      wallet.pendingBalance -= amount;
      wallet.totalWithdrawn += amount;

      await wallet.save();

      // NOTE: Actual transfer to eSewa / Khalti is handled manually by admin.

      return res.status(200).json({
        message: 'Withdrawal processed',
        wallet,
      });
    }

    return res.status(400).json({ message: 'Invalid action' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('processWithdrawal error', err);
    return res.status(500).json({ message: 'Failed to process withdrawal' });
  }
}

module.exports = {
  initiateEsewaPayment,
  esewaSuccess,
  esewaFailure,
  initiateKhaltiPayment,
  khaltiCallback,
  getMyPayments,
  getMyWallet,
  requestWithdrawal,
  processWithdrawal,
};

