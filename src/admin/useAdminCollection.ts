import { useEffect, useState } from 'react';
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from '@react-native-firebase/firestore';

const db = getFirestore();

export const useAdminCollection = <T extends { id: string }>(
  collectionName: string,
) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<T, 'id'>),
        })) as T[];
        setItems(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [collectionName]);

  return { items, loading };
};
