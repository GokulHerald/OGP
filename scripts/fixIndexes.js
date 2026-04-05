require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function main() {
  await connectDB();

  try {
    try {
      await mongoose.connection.collection('users').dropIndex('username_1');
      console.log('Old username index dropped');
    } catch (error) {
      console.log('Index not found, skipping');
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error('Failed to fix indexes:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exitCode = 1;
});

