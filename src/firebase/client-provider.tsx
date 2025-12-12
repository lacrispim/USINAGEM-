'use client';
import React from 'react';
import { FirebaseProvider, initializeFirebase } from '@/firebase';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { app, auth, firestore } = initializeFirebase();

  // The FirebaseProvider should only be rendered on the client
  if (!app) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider app={app} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
