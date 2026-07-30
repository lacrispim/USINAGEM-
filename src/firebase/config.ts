
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyAI1XkNMBqRNPt59plsuP3-MFskCwgibqQ",
  authDomain: "coffee-spark-sample-app-bc73f.firebaseapp.com",
  databaseURL: "https://coffee-spark-sample-app-bc73f-default-rtdb.firebaseio.com",
  projectId: "coffee-spark-sample-app-bc73f",
  storageBucket: "coffee-spark-sample-app-bc73f.firebasestorage.app",
  messagingSenderId: "198751668692",
  appId: "1:198751668692:web:3fb688f93402472118ee41"
};

export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (getApps().length === 0 && firebaseConfig.apiKey) {
      return initializeApp(firebaseConfig);
    } else if (getApps().length > 0) {
      return getApp();
    }
  }
  return null;
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const database = getDatabase(firebaseApp);

  // Removido lógica de emuladores para evitar conflitos no ambiente de produção do Studio
  return {
    firebaseApp,
    auth,
    firestore,
    database,
  };
}
