import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { Farmacia } from '../types/navigationTypes';

const db = getFirestore();

export type FavoritePharmacy = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  createdAt?: unknown;
};

export const subscribeFavorites = (
  uid: string,
  onChange: (items: FavoritePharmacy[]) => void,
  onError?: (error: unknown) => void,
) => {
  const ref = collection(db, 'users', uid, 'favorites');
  return onSnapshot(
    ref,
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => ({ id: item.id, ...(item.data() as Omit<FavoritePharmacy, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onChange(items);
    },
    (error) => onError?.(error),
  );
};

export const isFavoritePharmacy = async (uid: string, pharmacyId: string) => {
  const snap = await getDoc(doc(db, 'users', uid, 'favorites', pharmacyId));
  return snap.exists();
};

export const toggleFavoritePharmacy = async (uid: string, pharmacy: Farmacia) => {
  const ref = doc(db, 'users', uid, 'favorites', pharmacy.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, {
    name: pharmacy.name,
    dir: pharmacy.dir,
    tel: pharmacy.tel,
    createdAt: serverTimestamp(),
  });
  return true;
};
