/**
 * Run with: node scripts/testAuth.js (server must be running)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const BASE_URL = 'http://localhost:5001';
const TEST_PHONE = '+9779800000099';

async function callApi(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function main() {
  await connectDB();

  try {
    // Step 1: Insert pre-verified user directly in MongoDB.
    await User.deleteOne({ phoneNumber: TEST_PHONE });
    const seedUser = await User.create({
      phoneNumber: TEST_PHONE,
      isVerified: true,
    });
    console.log('Step 1 - Seeded user:', seedUser.toPublicJSON());

    // Step 2: Complete registration
    const completeRegistrationRes = await callApi('/api/v1/auth/complete-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: TEST_PHONE,
        username: 'testplayer',
        password: 'Test@1234',
        role: 'player',
      }),
    });
    console.log('Step 2 - Complete Registration:', completeRegistrationRes);

    // Step 3: Login
    const loginRes = await callApi('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: TEST_PHONE,
        password: 'Test@1234',
      }),
    });
    console.log('Step 3 - Login:', loginRes);

    const token = loginRes?.data?.token;

    // Step 4: Access /me with valid token
    const meRes = await callApi('/api/v1/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Step 4 - Get Me (valid token):', meRes);

    // Step 5: Access /me with fake token
    const fakeTokenRes = await callApi('/api/v1/auth/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer faketoken123' },
    });
    console.log('Step 5 - Get Me (fake token):', fakeTokenRes);
  } finally {
    // Step 6: Cleanup
    await User.deleteOne({ phoneNumber: TEST_PHONE });
    await mongoose.disconnect();
    console.log('Step 6 - Cleanup done.');
  }
}

main().catch(async (err) => {
  console.error('testAuth failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exitCode = 1;
});

