import { Platform } from 'react-native';
import Geolocation, { GeolocationResponse } from '@react-native-community/geolocation';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';

/**
 * Wrapper for Geolocation.getCurrentPosition in Promise form.
 */
const getCurrentPositionOnce = (options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}) =>
  new Promise<GeolocationResponse>((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, options);
  });

/**
 * Fetches the current location and reverses geocode it using OpenStreetMap.
 */
export const getLocationInfo = async () => {
  try {
    const permission =
      Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        : Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : null;
    
    if (!permission) return null;

    const status = await check(permission);
    if (status !== RESULTS.GRANTED) return null;

    let coords: GeolocationResponse;
    try {
      coords = await getCurrentPositionOnce({
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000,
      });
    } catch (error: any) {
      // Fallback for devices where GPS takes too long or doesn't have precise fix.
      const shouldFallback = error?.code === 3 || error?.code === 2;
      if (!shouldFallback) {
        throw error;
      }
      coords = await getCurrentPositionOnce({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
    }

    const { latitude, longitude, accuracy } = coords.coords;
    let city = '';
    let region = '';
    let country = '';

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'FarmaDoloresApp/1.9.0',
            'Accept-Language': 'es',
          },
        },
      );
      const json = await response.json();
      const address = json?.address || {};
      city = address.city || address.town || address.village || address.county || '';
      region = address.state || '';
      country = address.country || '';
    } catch {
      // Best effort: if no reverse geocode, we still return coords.
    }

    return {
      coords: {
        latitude,
        longitude,
        accuracy,
      },
      city,
      region,
      country,
    };
  } catch (error: any) {
    const expected = error?.code === 1 || error?.code === 2 || error?.code === 3;
    if (__DEV__ && !expected) {
      console.log('[LocationService] Location not available:', error?.message || error);
    }
    return null;
  }
};
