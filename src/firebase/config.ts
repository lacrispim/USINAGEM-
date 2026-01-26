'use client';

import { firebaseConfig as fbConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

// This file centralizes the Firebase configuration.
// It reads environment variables and exports them for use by the Firebase initialization code.

// IMPORTANT: Your local environment variables should be placed in a `.env.local` file
// at the root of your project. This file is ignored by Git and is the recommended
// way to handle local secrets with Next.js.

// The user has provided a hardcoded configuration. For better security, 
// these values should be moved to environment variables.
export const firebaseConfig = {
  apiKey: "AIzaSyAI1XkNMBqRNPt59plsuP3-MFskCwgibqQ",
  authDomain: "coffee-spark-sample-app-bc73f.firebaseapp.com",
  databaseURL: "https://coffee-spark-sample-app-bc73f-default-rtdb.firebaseio.com",
  projectId: "coffee-spark-sample-app-bc73f",
  storageBucket: "coffee-spark-sample-app-bc73f.firebasestorage.app",
  messagingSenderId: "198751668692",
  appId: "1:198751668692:web:3fb688f93402472118ee41"
};

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    // This check prevents re-initializing the app on the client-side.
    if (getApps().length === 0 && firebaseConfig.apiKey) {
      return initializeApp(firebaseConfig);
    } else if (getApps().length > 0) {
      return getApp();
    }
  }
  // On the server, or if API key is missing, we return null.
  return null;
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const database = getDatabase(firebaseApp);

  if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    const firestorePort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
    const authPort = parseInt(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099', 10);
    const databasePort = parseInt(process.env.NEXT_PUBLIC_DATABASE_EMULATOR_PORT || '9000', 10);

    console.log(`Connecting to emulators at ${host}`);
    connectFirestoreEmulator(firestore, host, firestorePort);
    connectAuthEmulator(auth, `http://${host}:${authPort}`);
    connectDatabaseEmulator(database, host, databasePort);
  }

  return {
    firebaseApp,
    auth,
    firestore,
    database,
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';