import { initializeApp } from 'firebase/app';

export default initializeApp({
  apiKey: process.env.FIREBASE_KEY,
  authDomain: `${process.env.FIREBASE_ID}.firebaseapp.com`,
  projectId: process.env.FIREBASE_ID,
  storageBucket: `${process.env.FIREBASE_ID}.appspot.com`,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
});
