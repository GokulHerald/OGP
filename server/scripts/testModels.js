/**
 * Run with: node scripts/testModels.js — delete this file before production.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Leaderboard = require('../models/Leaderboard');

async function main() {
  await connectDB();

  let user = null;
  let tournament = null;
  let leaderboard = null;

  try {
    user = await User.create({
      role: 'organizer',
      phoneNumber: '+9779800000001',
      username: 'testadmin',
      password: 'Test@1234',
      isVerified: true,
    });

    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    tournament = await Tournament.create({
      organizer: user._id,
      game: 'PUBG',
      name: 'Test Cup',
      prizePool: 5000,
      entryFee: 100,
      maxPlayers: 8,
      startDate: oneWeekFromNow,
    });

    leaderboard = await Leaderboard.create({
      tournament: tournament._id,
    });

    console.log('Created User:', user);
    console.log('Created Tournament:', tournament);
    console.log('Created Leaderboard:', leaderboard);
  } finally {
    const deletes = [];
    if (leaderboard?._id) deletes.push(Leaderboard.deleteOne({ _id: leaderboard._id }));
    if (tournament?._id) deletes.push(Tournament.deleteOne({ _id: tournament._id }));
    if (user?._id) deletes.push(User.deleteOne({ _id: user._id }));
    await Promise.allSettled(deletes);

    await mongoose.disconnect();
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});
