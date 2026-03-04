import { useEffect, useState } from 'react';
import { doc, getFirestore, onSnapshot } from '@react-native-firebase/firestore';

export type FeatureFlags = {
  favorites: boolean;
  customAlerts: boolean;
  dataReports: boolean;
  newAdminCrud: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  favorites: true,
  customAlerts: true,
  dataReports: true,
  newAdminCrud: true,
};

const db = getFirestore();

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'app'),
      (snapshot) => {
        const data = snapshot.data() || {};
        setFlags({
          favorites: data.favoritesEnabled !== false,
          customAlerts: data.customAlertsEnabled !== false,
          dataReports: data.dataReportsEnabled !== false,
          newAdminCrud: data.newAdminCrudEnabled !== false,
        });
      },
      () => setFlags(DEFAULT_FLAGS),
    );
    return () => unsubscribe();
  }, []);

  return flags;
};
