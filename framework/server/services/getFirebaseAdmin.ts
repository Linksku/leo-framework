import type AdminType from 'firebase-admin';

import { FIREBASE_PROJECT_ID } from 'config';
import { FIREBASE_CLIENT_EMAIL } from 'config/serverConfig';

let admin: typeof AdminType | null = null;
let adminPromise: Promise<typeof AdminType> | null;

export default async function getFirebaseAdmin(): Promise<typeof AdminType> {
  if (!admin) {
    adminPromise ??= import('firebase-admin')
      .then(module => {
        module.default.initializeApp({
          credential: module.default.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
          }),
        });
        return module.default;
      });
    admin = await adminPromise;
  }

  return admin;
}
