const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

/**
 * Service account JSON is secret — do not commit it.
 * Provide credentials in one of these ways:
 * 1) Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (use \n in private key)
 * 2) Env: FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/or/relative/path/to/serviceAccount.json
 * 3) Place server/firebase-service-account.json (gitignored)
 * 4) Legacy: project-root JSON filename matching gaming-ops-* (if present)
 */
function normalizePrivateKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.replace(/\\n/g, '\n').trim();
}

/** Firebase expects PEM text: -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY----- */
function looksLikeFirebasePrivateKey(key) {
  return key.includes('BEGIN PRIVATE KEY');
}

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKeyRaw) {
    const privateKey = normalizePrivateKey(privateKeyRaw);
    if (!looksLikeFirebasePrivateKey(privateKey)) {
      console.warn(
        '[firebase] FIREBASE_PRIVATE_KEY must be the full PEM from your service account JSON (field "private_key"), ' +
          'including -----BEGIN PRIVATE KEY----- lines — not a short hex ID. ' +
          'Download JSON: Firebase Console → Project settings → Service accounts → Generate new private key. ' +
          'Or set FIREBASE_SERVICE_ACCOUNT_PATH to that .json file. Skipping Firebase init; phone OTP disabled.'
      );
    } else {
      return {
        projectId,
        clientEmail,
        privateKey,
      };
    }
  }

  const fromEnvPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [
    fromEnvPath,
    path.join(__dirname, '..', 'firebase-service-account.json'),
    path.join(__dirname, '..', '..', 'gaming-ops-firebase-adminsdk-fbsvc-1077efea52.json'),
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (filePath && fs.existsSync(filePath)) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require(filePath);
    }
  }

  return null;
}

const serviceAccount = loadServiceAccount();
let firebaseReady = false;

if (serviceAccount && !admin.apps.length) {
  const credential =
    serviceAccount.private_key && serviceAccount.client_email
      ? admin.credential.cert(serviceAccount)
      : admin.credential.cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        });
  admin.initializeApp({ credential });
  firebaseReady = true;
}

async function verifyFirebaseToken(idToken) {
  if (!firebaseReady) {
    const err = new Error(
      'Firebase Admin is not configured. Add FIREBASE_* to .env or place a service account JSON (see server/config/firebase.js). Phone OTP requires this; password login still works.'
    );
    err.statusCode = 503;
    throw err;
  }
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
module.exports.isFirebaseReady = () => firebaseReady;
