// This file centralizes the Firebase configuration.
// It reads environment variables and exports them for use by the Firebase initialization code.

// IMPORTANT: Your local environment variables should be placed in a `.env.local` file
// at the root of your project. This file is ignored by Git and is the recommended
// way to handle local secrets with Next.js.

// The `NEXT_PUBLIC_` prefix is essential for Next.js to expose these variables
// to the browser. Vercel will automatically pick up these variables from your
// project settings.

export const firebaseConfig = {
  apiKey: "AIzaSyAI1XkNMBqRNPt59plsuP3-MFskCwgibqQ",
  authDomain: "coffee-spark-sample-app-bc73f.firebaseapp.com",
  projectId: "coffee-spark-sample-app-bc73f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: "198751668692",
  appId: "1:198751668692:web:3fb688f93402472118ee41",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
