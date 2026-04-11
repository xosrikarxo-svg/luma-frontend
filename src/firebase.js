import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️  Replace these values with your own Firebase project config.
// Get it from: Firebase Console → Project Settings → Your apps → Web app → SDK setup
const firebaseConfig = {
  apiKey:            "AIzaSyAHuZxB2B6InSYoq7Bgz2rRwKStnEmKuIs",
  authDomain:        "luma-4e00d.firebaseapp.com",
  projectId:         "luma-4e00d",
  storageBucket:     "luma-4e00d.firebasestorage.app",
  messagingSenderId: "531896943006",
  appId:             "1:531896943006:web:1dc72a10db0db79cfd568f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
