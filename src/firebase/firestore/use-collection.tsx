'use client';
import {useEffect, useState, useRef} from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import {useFirestore} from '@/firebase';

interface UseCollectionOptions {
  // Define any options here if needed in the future
}

export function useCollection<T = DocumentData>(
  q: Query<T> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const queryRef = useRef(q);

  useEffect(() => {
    // If query is null, do nothing
    if (!queryRef.current) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      queryRef.current,
      (snapshot: QuerySnapshot<T>) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as T)
        );
        setData(docs);
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
  }, [queryRef]);

  return {data, loading, error};
}
