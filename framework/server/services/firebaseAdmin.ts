import admin from 'firebase-admin';

import { FIREBASE_PROJECT_ID } from 'config';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  }),
});

// eslint-disable-next-line unicorn/prefer-export-from
export default admin;
