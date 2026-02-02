import AsyncStorage from '@react-native-async-storage/async-storage';

type CachePayload<T> = {
  ts: number;
  data: T;
};

export const readCache = async <T>(key: string, ttlMs: number): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload<T>;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

export const writeCache = async <T>(key: string, data: T) => {
  try {
    const payload: CachePayload<T> = { ts: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
};

const isTimestampLike = (value: any) => value && typeof value.toDate === 'function';

export const serializeForCache = (value: any): any => {
  if (isTimestampLike(value)) {
    return { __ts: value.toDate().toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(serializeForCache);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      out[key] = serializeForCache(value[key]);
    });
    return out;
  }
  return value;
};

export const rehydrateFromCache = (value: any): any => {
  if (!value) return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (typeof value.__ts === 'string') {
      const date = new Date(value.__ts);
      return { toDate: () => date };
    }
    const out: Record<string, any> = {};
    Object.keys(value).forEach((key) => {
      out[key] = rehydrateFromCache(value[key]);
    });
    return out;
  }
  if (Array.isArray(value)) {
    return value.map(rehydrateFromCache);
  }
  return value;
};
