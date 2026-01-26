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
  storageBucket: "coffee-spark-sample-app-bc73f.appspot.com",
  messagingSenderId: "198751668692",
  appId: "1:198751668692:web:3fb688f93402472118ee41"
};
