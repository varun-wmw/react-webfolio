// src/components/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCBvhmggZE-m9kwsFJW0QH6zQDht5Uc7nQ",
  authDomain: "workfolio-app.firebaseapp.com",
  projectId: "workfolio-app",
  storageBucket: "workfolio-app.appspot.com",
  messagingSenderId: "907963772684",
  appId: "1:907963772684:web:0fcf6938de691303cfa329",
  measurementId: "G-7RN5MTSXZ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);