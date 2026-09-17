import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Cấu hình Firebase trích xuất từ firebase-google-services.json
export const firebaseConfig = {
  apiKey: "AIzaSyA49_93r5iK5nbY6TykssefQjrR6cp1SgY",
  authDomain: "ebook-fdc02.firebaseapp.com",
  databaseURL: "https://ebook-fdc02-default-rtdb.firebaseio.com",
  projectId: "ebook-fdc02",
  storageBucket: "ebook-fdc02.firebasestorage.app",
  messagingSenderId: "657175691442",
  appId: "1:657175691442:android:556972cc7268478ed949ab"
};

// Khởi tạo Firebase App cho Web Client
export const app = initializeApp(firebaseConfig);

// Khởi tạo Cloud Firestore và Authentication
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
