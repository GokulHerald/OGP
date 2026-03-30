const admin = require('firebase-admin');
const serviceAccount = require('../../gaming-ops-firebase-adminsdk-fbsvc-1077efea52.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function verifyFirebaseToken(idToken) {
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    const error = new Error('Invalid or expired OTP token');
    error.cause = err;
    throw error;
  }
}

module.exports = admin;
module.exports.verifyFirebaseToken = verifyFirebaseToken;

