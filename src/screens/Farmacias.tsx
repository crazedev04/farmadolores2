import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, FlatList, Text, Platform } from 'react-native';
import FarmaciaCard from '../components/FarmaciaCard'; // Asegúrate de ajustar la ruta de importación según sea necesario
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import SkeletonCard from '../skeleton/SkeletonCard'; // Asegúrate de ajustar la ruta de importación según sea necesario
import { usePharmacies } from '../context/PharmacyContext';
import { useTheme } from '../context/ThemeContext';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { DateTime } from 'luxon';
import firestore from '@react-native-firebase/firestore';
import { logEvent } from '../services/analytics';

type Coords = { lat: number; lng: number };

const haversineKm = (a: Coords, b: Coords) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

const ZONA = 'America/Argentina/Buenos_Aires';

const isOnDuty = (item: any) => {
  if (!Array.isArray(item?.turn)) return false;
  const now = DateTime.local().setZone(ZONA);
  return item.turn.some((t: any) => {
    const date = t && typeof t.toDate === 'function'
      ? t.toDate()
      : (t instanceof Date ? t : null);
    if (!date) return false;
    const start = DateTime.fromJSDate(date).setZone(ZONA).set({
      hour: 8,
      minute: 30,
      second: 0,
      millisecond: 0,
    });
    const end = start.plus({ hours: 24 });
    return now >= start && now <= end;
  });
};

const Farmacias: React.FC = () => {
  const { farmacias, loading } = usePharmacies();
  const { theme } = useTheme();
  const { colors } = theme;
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [speedThresholdMps, setSpeedThresholdMps] = useState<number | null>(3);
  const [distanceDisplayMode, setDistanceDisplayMode] = useState<'auto' | 'km' | 'min'>('auto');
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    let active = true;
    const requestLocation = async () => {
      const permission = Platform.select({
        android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      });
      if (!permission) return;

      try {
        let status = await check(permission);
        if (status !== RESULTS.GRANTED) {
          status = await request(permission);
        }
        if (status !== RESULTS.GRANTED) {
          setLocationDenied(true);
          logEvent('location_permission', { status: 'denied', source: 'farmacias' });
          return;
        }
        setLocationDenied(false);
        logEvent('location_permission', { status: 'granted', source: 'farmacias' });

        Geolocation.getCurrentPosition(
          (position) => {
            if (!active) return;
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            const speed = position.coords.speed;
            if (typeof speed === 'number' && speed >= 0) {
              setSpeedMps(speed);
            }
            logEvent('location_available', { source: 'farmacias' });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      } catch {
        setLocationDenied(true);
        logEvent('location_permission', { status: 'error', source: 'farmacias' });
      }
    };

    requestLocation();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsub = firestore()
      .collection('config')
      .doc('home')
      .onSnapshot(snapshot => {
        const data = snapshot.data() || {};
        if (typeof data.speedThresholdMps === 'number') {
          setSpeedThresholdMps(data.speedThresholdMps);
        }
        if (data.distanceDisplayMode === 'km' || data.distanceDisplayMode === 'min' || data.distanceDisplayMode === 'auto') {
          setDistanceDisplayMode(data.distanceDisplayMode);
        }
      });

    return () => unsub();
  }, []);

  const distanceMap = useMemo(() => {
    if (!userLocation) return {};
    const map: Record<string, number> = {};
    farmacias.forEach((item) => {
      const lat = item.gps?.latitude;
      const lng = item.gps?.longitude;
      if (lat == null || lng == null) return;
      map[item.id] = haversineKm(userLocation, { lat, lng });
    });
    return map;
  }, [farmacias, userLocation]);

  const turnoMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    farmacias.forEach((item) => {
      map[item.id] = isOnDuty(item);
    });
    return map;
  }, [farmacias]);

  const sortedFarmacias = useMemo(() => {
    const copy = [...farmacias];
    copy.sort((a, b) => {
      const aTurn = turnoMap[a.id];
      const bTurn = turnoMap[b.id];
      if (aTurn !== bTurn) return aTurn ? -1 : 1;
      const da = distanceMap[a.id];
      const db = distanceMap[b.id];
      if (da == null && db == null) {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
    return copy;
  }, [farmacias, distanceMap, turnoMap]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <FlatList
          data={Array(5).fill({})} // Array de 5 elementos vacíos para mostrar los SkeletonCard
          renderItem={() => <SkeletonCard />}
          keyExtractor={(_, index) => index.toString()}
        />
      </View>
    );
  }

  if (farmacias.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.text }]}>No hay farmacias disponibles en este momento.</Text>
      </View>
    );
  }

  return (
    <>
      <AdBanner size={BannerAdSize.FULL_BANNER} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={sortedFarmacias}
          renderItem={({ item }) => (
            <FarmaciaCard
              item={item}
              distanceKm={distanceMap[item.id]}
              speedMps={speedMps}
              speedThresholdMps={speedThresholdMps}
              distanceDisplayMode={distanceDisplayMode}
              locationDenied={locationDenied}
            />
          )}
          keyExtractor={item => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      </View>
    </>
  );
};

export default Farmacias;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
