const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const config = require('./index');

let isFirebaseConfigured = false;
let bucket = null;

try {
  const { projectId, clientEmail, privateKey, storageBucket, serviceAccountPath } = config.firebase;

  if (serviceAccountPath) {
    const fullPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);

    if (fs.existsSync(fullPath)) {
      const serviceAccount = require(fullPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: storageBucket || serviceAccount.project_id ? `${serviceAccount.project_id}.appspot.com` : undefined,
      });
      bucket = admin.storage().bucket();
      isFirebaseConfigured = true;
      console.log('[Firebase] Initialized using service account file at:', serviceAccountPath);
    }
  } else if (projectId && clientEmail && privateKey && storageBucket) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    bucket = admin.storage().bucket();
    isFirebaseConfigured = true;
    console.log('[Firebase] Initialized using environment variables for bucket:', storageBucket);
  }
} catch (error) {
  console.warn('[Firebase] Initialization error:', error.message);
  isFirebaseConfigured = false;
}

if (!isFirebaseConfigured) {
  console.log('[Firebase] Not configured. Using local disk storage fallback.');
}

module.exports = {
  admin,
  bucket,
  isFirebaseConfigured,
};
