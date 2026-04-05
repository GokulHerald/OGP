const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not set');
    if (process.env.NODE_ENV !== 'production') process.exit(1);
    throw new Error('MONGODB_URI is not set');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      // Helps on some networks where IPv6 to Atlas is flaky (try removing if you need IPv6)
      family: 4,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message || err);
    if (err.reason) console.error('Topology / reason:', err.reason);
    console.error(
      '\nChecklist: Atlas → Network Access (IP allowlist active), cluster not paused, ' +
        'Database user + password in MONGODB_URI (URL-encode special chars in password), ' +
        'URI from Atlas → Connect → Drivers. See: https://www.mongodb.com/docs/atlas/troubleshoot-connection/'
    );
    process.exit(1);
  }
}

module.exports = connectDB;
