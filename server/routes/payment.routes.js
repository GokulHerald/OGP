const express = require('express');

const { protect, restrictTo } = require('../middleware/auth.middleware');
const {
  initiateEsewaPayment,
  esewaSuccess,
  esewaFailure,
  initiateKhaltiPayment,
  khaltiCallback,
  getMyPayments,
  getMyWallet,
  requestWithdrawal,
  processWithdrawal,
} = require('../controllers/payment.controller');

const router = express.Router();

// eSewa routes
router.post('/esewa/initiate', protect, initiateEsewaPayment);
router.get('/esewa/success', esewaSuccess);
router.get('/esewa/failure', esewaFailure);

// Khalti routes
router.post('/khalti/initiate', protect, initiateKhaltiPayment);
router.get('/khalti/callback', khaltiCallback);

// Player payments & wallet
router.get('/my-payments', protect, getMyPayments);
router.get('/wallet', protect, getMyWallet);
router.post('/withdraw', protect, requestWithdrawal);

// Admin / organizer-only withdrawal processing
router.post(
  '/admin/process-withdrawal',
  protect,
  restrictTo('organizer'),
  processWithdrawal
);

module.exports = router;

