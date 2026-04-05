/**
 * Creates org1, player1, player2 in MongoDB with known passwords.
 * Does not require the HTTP server to be running.
 *
 * Usage (from repo root or server/):
 *   cd server && node scripts/seedTestUsers.js
 *
 * Requires MONGODB_URI in server/.env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const TEST_USERS = [
  { phoneNumber: '+9779800000010', username: 'org1', password: 'Test@1234', role: 'organizer' },
  { phoneNumber: '+9779800000011', username: 'player1', password: 'Test@1234', role: 'player' },
  { phoneNumber: '+9779800000012', username: 'player2', password: 'Test@1234', role: 'player' },
];

async function main() {
  await connectDB();
  for (const u of TEST_USERS) {
    await User.deleteOne({ phoneNumber: u.phoneNumber });
    await User.create({
      phoneNumber: u.phoneNumber,
      username: u.username,
      password: u.password,
      role: u.role,
      isVerified: true,
    });
    console.log('Seeded:', u.username, u.phoneNumber);
  }
  console.log('\nLogin with phone + password (include the + sign):');
  console.log('  player1 → +9779800000011 / Test@1234');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
