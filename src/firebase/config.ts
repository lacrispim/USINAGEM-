// This file centralizes the Firebase configuration.
// It reads environment variables and exports them for use by the Firebase initialization code.

// IMPORTANT: Your local environment variables should be placed in a `.env.local` file
// at the root of your project. This file is ignored by Git and is the recommended
// way to handle local secrets with Next.js.

// The `NEXT_PUBLIC_` prefix is essential for Next.js to expose these variables
// to the browser. Vercel will automatically pick up these variables from your
// project settings.

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
