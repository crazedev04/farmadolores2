import { Linking } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigationTypes';
import { logEvent } from '../services/analytics';

export const normalizeWebUrl = (url?: string) => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const openWebLink = async (
  navigation: NavigationProp<RootStackParamList>,
  url?: string,
  title?: string,
  meta?: Record<string, unknown>
) => {
  const target = normalizeWebUrl(url);
  if (!target) return false;
  const host = (() => {
    try {
      return new URL(target).host.replace(/^www\./, '');
    } catch {
      return undefined;
    }
  })();
  logEvent('web_open', {
    title,
    host,
    scheme: target.split(':')[0],
    ...(meta || {}),
  });
  if (/^https?:\/\//i.test(target)) {
    navigation.navigate('WebView', { url: target, title });
    return true;
  }
  try {
    await Linking.openURL(target);
    return true;
  } catch {
    return false;
  }
};
