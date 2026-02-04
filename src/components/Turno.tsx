import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Image } from 'react-native';
import { usePharmacies } from '../context/PharmacyContext';
import SkeletonCard from '../skeleton/SkeletonCard';
import { DateTime } from 'luxon';
import { useTheme } from '../context/ThemeContext';
import TurnoCard from './TurnoCard';
import Icon from '@react-native-vector-icons/material-design-icons';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { logEvent } from '../services/analytics';

type Coords = { lat: number; lng: number };
const db = getFirestore();

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

const Turno: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { farmacias, loading, fetchPharmacies } = usePharmacies();
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [speedThresholdMps, setSpeedThresholdMps] = useState<number | null>(3);
  const [distanceDisplayMode, setDistanceDisplayMode] = useState<'auto' | 'km' | 'min'>('auto');
  const [locationDenied, setLocationDenied] = useState(false);
  const { matchingPharmacy, errorMessage } = useMemo(() => {
    try {
      const now = DateTime.local().setZone('America/Argentina/Buenos_Aires');
      const match = farmacias?.find((pharmacy) => {
        if (!Array.isArray(pharmacy?.turn)) return false;
        return pharmacy.turn.some((t) => {
          if (!t || typeof t.toDate !== 'function') return false;
          let turnStart;
          try {
            turnStart = DateTime.fromJSDate(t.toDate()).set({
              hour: 8,
              minute: 30,
              second: 0,
              millisecond: 0,
            });
          } catch {
            return false;
          }
          const turnEnd = turnStart.plus({ hours: 24 });
          return now >= turnStart && now <= turnEnd;
        });
      });
      return { matchingPharmacy: match, errorMessage: null };
    } catch (e: any) {
      return { matchingPharmacy: undefined, errorMessage: 'Ocurrió un error mostrando la farmacia de turno.' };
    }
  }, [farmacias]);

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
          logEvent('location_permission', { status: 'denied', source: 'turno' });
          return;
        }
        setLocationDenied(false);
        logEvent('location_permission', { status: 'granted', source: 'turno' });

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
            logEvent('location_available', { source: 'turno' });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      } catch {
        setLocationDenied(true);
        logEvent('location_permission', { status: 'error', source: 'turno' });
      }
    };

    requestLocation();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'home'), snapshot => {
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

  const distanceKm = useMemo(() => {
    if (!userLocation || !matchingPharmacy?.gps) return null;
    const lat = matchingPharmacy.gps?.latitude;
    const lng = matchingPharmacy.gps?.longitude;
    if (lat == null || lng == null) return null;
    return haversineKm(userLocation, { lat, lng });
  }, [userLocation, matchingPharmacy]);

  useEffect(() => {
    const detailIsUrl = typeof matchingPharmacy?.detail === 'string' && matchingPharmacy.detail.trim().startsWith('http');
    const imageUri = matchingPharmacy?.image || (detailIsUrl ? matchingPharmacy.detail : '');
    if (imageUri) {
      Image.prefetch(imageUri).catch(() => {});
    }
  }, [matchingPharmacy?.image, matchingPharmacy?.detail]);

  if (loading) {
    return <SkeletonCard />;
  }

  const handleReload = () => {
    fetchPharmacies();
  };

  if (errorMessage) {
    return (
      <View style={styles.noTurnos}>
        <Text style={[styles.noTurnosText, { color: colors.text }]}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleReload}
        >
          <Icon name="reload" size={40} color={colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matchingPharmacy ? (
        <TurnoCard
          item={matchingPharmacy}
          distanceKm={distanceKm}
          speedMps={speedMps}
          speedThresholdMps={speedThresholdMps}
          distanceDisplayMode={distanceDisplayMode}
          locationDenied={locationDenied}
        />
      ) : (
        <View style={styles.noTurnos}>
          <Text style={[styles.noTurnosText, { color: colors.text }]}>
            No hay farmacias de turno en este momento
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleReload}
          >
            <Icon name="reload" size={40} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};



export default Turno;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  noTurnos: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTurnosText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 16,
    padding: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
});
