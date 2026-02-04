import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getFirestore, collection, getDocs, onSnapshot } from '@react-native-firebase/firestore';
import { Farmacia } from '../types/navigationTypes';
import { readCache, writeCache, serializeForCache, rehydrateFromCache } from '../utils/cache';
import NetInfo from '@react-native-community/netinfo';

type PharmacyContextType = {
  farmacias: Farmacia[];
  loading: boolean;
  fetchPharmacies: () => void;
  isOffline: boolean;
  lastUpdated: Date | null;
};

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const CACHE_KEY = 'cache:farmacias';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min
const db = getFirestore();

export const PharmacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [networkOnline, setNetworkOnline] = useState(true);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      const online = !!state.isConnected && reachable !== false;
      setNetworkOnline(online);
      setIsOffline(!online);
    });
    return () => unsubscribeNet();
  }, []);

  // Suscripción en tiempo real con cache local
  useEffect(() => {
    let mounted = true;
    let retryDelay = 2000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const loadCache = async () => {
      const cached = await readCache<Farmacia[]>(CACHE_KEY, CACHE_TTL_MS);
      if (cached && mounted) {
        const rehydrated = rehydrateFromCache(cached) as Farmacia[];
        setFarmacias(rehydrated);
        setLoading(false);
      }
    };
    loadCache();

    const subscribe = () =>
      onSnapshot(
        collection(db, 'farmacias'),
        snapshot => {
          const fetchedFarmacias: Farmacia[] = snapshot.docs.map(doc => {
            const data = doc.data() as Farmacia;
            return { ...data, id: doc.id };
          });

          setFarmacias(fetchedFarmacias);
          setLoading(false);
          setLastUpdated(new Date());
          writeCache(CACHE_KEY, serializeForCache(fetchedFarmacias));
          retryDelay = 2000;
        },
        error => {
          console.error('Error onSnapshot: ', error);
          setLoading(false);
          if (retryTimer) return;
          retryTimer = setTimeout(() => {
            retryTimer = null;
            subscribe();
            retryDelay = Math.min(retryDelay * 2, 30000);
          }, retryDelay);
        }
      );

    const unsubscribe = subscribe();
    return () => {
      mounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      unsubscribe();
    };
  }, []);

  // Función manual de recarga (opcional)
  const fetchPharmacies = useCallback(() => {
    setLoading(true);
    getDocs(collection(db, 'farmacias'))
      .then(snapshot => {
        const fetchedFarmacias: Farmacia[] = snapshot.docs.map(doc => {
          const data = doc.data() as Farmacia;
          return { ...data, id: doc.id };
        });
        setFarmacias(fetchedFarmacias);
        setLoading(false);
        writeCache(CACHE_KEY, serializeForCache(fetchedFarmacias));
      })
      .catch(error => {
        console.error('Error fetchPharmacies:', error);
        setLoading(false);
      });
  }, []);

  return (
    <PharmacyContext.Provider value={{ farmacias, loading, fetchPharmacies, isOffline, lastUpdated }}>
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacies = (): PharmacyContextType => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacies must be used within a PharmacyProvider');
  }
  return context;
};
