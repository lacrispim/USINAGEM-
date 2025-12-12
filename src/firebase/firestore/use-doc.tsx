'use client';
import {useEffect, useState, useRef} from 'react';
import {
  doc,
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';

interface UseDocOptions {
  // Define any options here if needed in the future
}

export function useDoc<T = DocumentData>(
  ref: DocumentReference<T> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const docRef = useRef(ref);

  useEffect(() => {
    // If ref is null, do nothing
    if (!docRef.current) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      docRef.current,
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          setData({
            id: snapshot.id,
            ...snapshot.data(),
          } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef]);

  return {data, loading, error};
}
