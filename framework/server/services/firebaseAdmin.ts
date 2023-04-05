import admin from 'firebase-admin';

import serviceAccount from '../../../firebaseAdminKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
});

// eslint-disable-next-line unicorn/prefer-export-from
export default admin;
