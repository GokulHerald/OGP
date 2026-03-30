require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const FormData = require('form-data');
const connectDB = require('../config/db');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Bracket = require('../models/Bracket');
const Leaderboard = require('../models/Leaderboard');

const BASE_URL = 'http://localhost:5001';

const UPLOAD_TEST_USER = {
  phoneNumber: '+9779800000020',
  username: 'uploadtester',
  password: 'Test@1234',
  role: 'player',
};

/** Organizer + second player so the tournament can start (≥2 players, power of 2). */
const SUPPORT_USERS = [
  {
    phoneNumber: '+9779800000021',
    username: 'phase4org',
    password: 'Test@1234',
    role: 'organizer',
  },
  {
    phoneNumber: '+9779800000022',
    username: 'phase4p2',
    password: 'Test@1234',
    role: 'player',
  },
];

const ALL_TEST_PHONES = [
  UPLOAD_TEST_USER.phoneNumber,
  ...SUPPORT_USERS.map((u) => u.phoneNumber),
];

const pngPath = path.join(__dirname, 'test-screenshot.png');

async function callApi(apiPath, options = {}) {
  const response = await fetch(`${BASE_URL}${apiPath}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function uploadMultipart(apiPath, token, fieldName, filePath) {
  const form = new FormData();
  const basename = path.basename(filePath);
  form.append(fieldName, fs.createReadStream(filePath), basename);
  const response = await fetch(`${BASE_URL}${apiPath}`, {
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function seedPreVerifiedUsers(User) {
  for (const user of [UPLOAD_TEST_USER, ...SUPPORT_USERS]) {
    await User.deleteOne({ phoneNumber: user.phoneNumber });
    await User.create({
      phoneNumber: user.phoneNumber,
      isVerified: true,
    });
  }
}

async function completeRegistrations() {
  const tokenMap = {};
  for (const user of [UPLOAD_TEST_USER, ...SUPPORT_USERS]) {
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
    console.log(
      `Registration (${user.username}):`,
      result.status,
      result.data.message || 'ok',
    );
    tokenMap[user.username] = result.data.token;
  }
  return tokenMap;
}

function findMatchForUser(matches, userId) {
  const uid = String(userId);
  return matches.find((m) => {
    const p1 = m.player1 && (m.player1._id ?? m.player1);
    const p2 = m.player2 && (m.player2._id ?? m.player2);
    return String(p1) === uid || String(p2) === uid;
  });
}

async function main() {
  let tournamentId = null;

  await connectDB();

  try {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    fs.writeFileSync(pngPath, pngBuffer);

    await seedPreVerifiedUsers(User);
    const tokens = await completeRegistrations();

    const loginRes = await callApi('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: UPLOAD_TEST_USER.phoneNumber,
        password: UPLOAD_TEST_USER.password,
      }),
    });
    const uploadToken = loginRes.data.token;
    if (!uploadToken) {
      throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.data)}`);
    }

    // Step 1 — profile picture
    const profileRes = await uploadMultipart(
      '/api/v1/auth/profile-picture',
      uploadToken,
      'profilePicture',
      pngPath,
    );
    console.log(
      'Step 1 - Profile picture:',
      profileRes.status,
      profileRes.data.profilePicture || profileRes.data.message,
    );

    const organizerToken = tokens.phase4org;
    const player2Token = tokens.phase4p2;

    const createRes = await callApi('/api/v1/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        name: 'Test Cup Phase4 Uploads',
        game: 'PUBG',
        entryFee: 0,
        prizePool: 1000,
        maxPlayers: 8,
        startDate: '2026-12-01',
      }),
    });
    tournamentId = createRes.data?.tournament?._id;
    console.log('Step 2a - Create tournament:', createRes.status, tournamentId);
    if (!tournamentId) {
      throw new Error(`Create tournament failed: ${JSON.stringify(createRes.data)}`);
    }

    const reg1 = await callApi(`/api/v1/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${uploadToken}` },
    });
    console.log('Step 2b - Register uploadtester:', reg1.status, reg1.data.message);

    const reg2 = await callApi(`/api/v1/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${player2Token}` },
    });
    console.log('Step 2c - Register second player:', reg2.status, reg2.data.message);

    const startRes = await callApi(`/api/v1/tournaments/${tournamentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    console.log('Step 2d - Start tournament:', startRes.status, startRes.data.message || 'ok');

    const matchesRes = await callApi(`/api/v1/matches/tournament/${tournamentId}`);
    const matches = Array.isArray(matchesRes.data?.matches) ? matchesRes.data.matches : [];
    const uploadTesterId = loginRes.data.user._id;
    const match = findMatchForUser(matches, uploadTesterId);
    if (!match) {
      throw new Error('No match found for uploadtester');
    }
    const matchId = match._id;

    const streamRes = await callApi(`/api/v1/matches/${matchId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${uploadToken}`,
      },
      body: JSON.stringify({ streamUrl: 'https://youtube.com/live/test123' }),
    });
    console.log('Step 3 - Stream:', streamRes.status, streamRes.data.message);

    const proofRes = await uploadMultipart(
      `/api/v1/matches/${matchId}/proof`,
      uploadToken,
      'screenshot',
      pngPath,
    );
    console.log(
      'Step 4 - Proof:',
      proofRes.status,
      proofRes.data.screenshotUrl || proofRes.data.message,
    );

    const verifyRes = await callApi(`/api/v1/matches/tournament/${tournamentId}`);
    const verifyMatches = Array.isArray(verifyRes.data?.matches)
      ? verifyRes.data.matches
      : [];
    const verifyMatch = verifyMatches.find((m) => String(m._id) === String(matchId));
    console.log('Step 5 - Match proof on tournament:', verifyMatch?.proof);
  } finally {
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

    await User.deleteMany({ phoneNumber: { $in: ALL_TEST_PHONES } });

    try {
      if (fs.existsSync(pngPath)) {
        fs.unlinkSync(pngPath);
      }
    } catch {
      // ignore
    }

    await mongoose.disconnect();
    console.log('=== PHASE 4 TEST COMPLETE ===');
  }
}

main().catch(async (error) => {
  console.error('Phase 4 test failed:', error);
  try {
    if (fs.existsSync(pngPath)) {
      fs.unlinkSync(pngPath);
    }
  } catch {
    // ignore
  }
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});
