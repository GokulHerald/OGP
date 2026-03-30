require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Bracket = require('../models/Bracket');
const Leaderboard = require('../models/Leaderboard');

const BASE_URL = 'http://localhost:5001';

const TEST_USERS = [
  { phoneNumber: '+9779800000010', username: 'org1', password: 'Test@1234', role: 'organizer' },
  { phoneNumber: '+9779800000011', username: 'player1', password: 'Test@1234', role: 'player' },
  { phoneNumber: '+9779800000012', username: 'player2', password: 'Test@1234', role: 'player' },
];

async function callApi(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function seedPreVerifiedUsers(User) {
  for (const user of TEST_USERS) {
    await User.deleteOne({ phoneNumber: user.phoneNumber });
    await User.create({
      phoneNumber: user.phoneNumber,
      isVerified: true,
    });
  }
}

async function completeRegistrations() {
  const tokenMap = {};

  for (const user of TEST_USERS) {
    const result = await callApi('/api/v1/auth/complete-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: user.phoneNumber,
        username: user.username,
        password: user.password,
        role: user.role,
      }),
    });
    console.log(`Registration (${user.username}):`, result.status, result.data.message || 'ok');
    tokenMap[user.username] = result.data.token;
  }

  return tokenMap;
}

async function main() {
  let tournamentId = null;

  await connectDB();

  try {
    // Setup
    await seedPreVerifiedUsers(User);
    const tokens = await completeRegistrations();
    const organizerToken = tokens.org1;
    const player1Token = tokens.player1;
    const player2Token = tokens.player2;

    // Step 1
    const createRes = await callApi('/api/v1/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        name: 'Test Cup Phase3',
        game: 'PUBG',
        entryFee: 0,
        prizePool: 1000,
        maxPlayers: 8,
        startDate: '2026-12-01',
      }),
    });
    tournamentId = createRes.data?.tournament?._id;
    console.log('Step 1 - Create Tournament:', createRes.status, tournamentId);

    // Step 2
    const register1Res = await callApi(`/api/v1/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${player1Token}` },
    });
    console.log('Step 2 - Player1 Register:', register1Res.status, register1Res.data.message);

    // Step 3
    const register2Res = await callApi(`/api/v1/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${player2Token}` },
    });
    console.log('Step 3 - Player2 Register:', register2Res.status, register2Res.data.message);

    // Step 4
    const startRes = await callApi(`/api/v1/tournaments/${tournamentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    console.log('Step 4 - Start Tournament:', startRes.status, startRes.data);

    // Step 5
    const matchesRes = await callApi(`/api/v1/matches/tournament/${tournamentId}`);
    const matches = Array.isArray(matchesRes.data?.matches) ? matchesRes.data.matches : [];
    console.log('Step 5 - Matches Count:', matches.length);
    matches.forEach((match) => {
      console.log(`  round=${match.round} matchNumber=${match.matchNumber}`);
    });

    // Step 6
    const leaderboardRes = await callApi(`/api/v1/leaderboard/tournament/${tournamentId}`);
    console.log('Step 6 - Leaderboard Entries:', leaderboardRes.data?.leaderboard?.entries || []);
  } finally {
    // Step 7 cleanup
    if (tournamentId) {
      const tournament = await Tournament.findById(tournamentId);
      const bracketId = tournament?.bracket || null;

      await Promise.allSettled([
        Match.deleteMany({ tournament: tournamentId }),
        Leaderboard.deleteMany({ tournament: tournamentId }),
        Tournament.deleteOne({ _id: tournamentId }),
      ]);

      if (bracketId) {
        await Bracket.deleteOne({ _id: bracketId });
      } else {
        await Bracket.deleteMany({ tournament: tournamentId });
      }
    }

    await User.deleteMany({
      phoneNumber: { $in: TEST_USERS.map((u) => u.phoneNumber) },
    });

    await mongoose.disconnect();
    console.log('=== PHASE 3 TEST COMPLETE ===');
  }
}

main().catch(async (error) => {
  console.error('Phase 3 test failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exitCode = 1;
});

