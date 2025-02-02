import { initializeApp } from 'firebase/app';
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_KEY,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from 'config';

export default FIREBASE_PROJECT_ID
  && FIREBASE_APP_ID
  && FIREBASE_KEY
  && FIREBASE_MESSAGING_SENDER_ID
  ? initializeApp({
    apiKey: FIREBASE_KEY,
    authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: `${FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
  })
  : null;
