import { Linking, Platform } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigationTypes';
import { normalizeWebUrl, openWebLink } from './openWebLink';

type MapOpenOptions = {
  address?: string;
  lat?: number;
  lng?: number;
  mapUrl?: string;
  title?: string;
  meta?: Record<string, unknown>;
};

const tryOpen = async (url?: string) => {
  if (!url) return false;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};

export const openMapsLink = async (
  navigation: NavigationProp<RootStackParamList>,
  options: MapOpenOptions
) => {
  const { address, lat, lng, mapUrl, title, meta } = options;
  const query = lat != null && lng != null ? `${lat},${lng}` : (address || '').trim();
  const encodedQuery = query ? encodeURIComponent(query) : '';

  if (encodedQuery) {
    if (Platform.OS === 'android') {
      if (await tryOpen(`google.navigation:q=${encodedQuery}`)) return true;
      if (await tryOpen(`geo:0,0?q=${encodedQuery}`)) return true;
    } else {
      if (await tryOpen(`maps:0,0?q=${encodedQuery}`)) return true;
    }
  }

  const fallbackUrl = mapUrl
    ? normalizeWebUrl(mapUrl)
    : (encodedQuery ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` : '');

  if (!fallbackUrl) return false;
  return openWebLink(navigation, fallbackUrl, title || 'Mapa', meta);
};
