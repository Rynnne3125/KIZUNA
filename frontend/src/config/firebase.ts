import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dummy_api_key_for_ui_testing',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ebook-fdc02.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://ebook-fdc02-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ebook-fdc02',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ebook-fdc02.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '657175691442',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:657175691442:android:556972cc7268478ed949ab'
};

let app, db, auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.warn("Firebase initialization failed. Please check your .env configuration.", error);
}

export { app, db, auth };
export default app;
