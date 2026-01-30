import analytics from '@react-native-firebase/analytics';
import firestore from '@react-native-firebase/firestore';

const MAX_PARAM_LENGTH = 100;

const sanitizeValue = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.length > MAX_PARAM_LENGTH ? trimmed.slice(0, MAX_PARAM_LENGTH) : trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  try {
    const text = JSON.stringify(value);
    return text.length > MAX_PARAM_LENGTH ? text.slice(0, MAX_PARAM_LENGTH) : text;
  } catch {
    return undefined;
  }
};

const sanitizeParams = (params?: Record<string, unknown>) => {
  if (!params) return undefined;
  const cleaned: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) {
      cleaned[key] = sanitized as string | number | boolean;
    }
  });
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

const toKey = (value?: string) => {
  const raw = (value || '').toString().trim().toLowerCase();
  if (!raw) return 'unknown';
  return raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'unknown';
};

const incrementCounter = async (group: string, key?: string) => {
  if (!group) return;
  const safeGroup = toKey(group);
  const safeKey = toKey(key);
  try {
    await firestore()
      .collection('analytics')
      .doc('counters')
      .set(
        {
          [`${safeGroup}.${safeKey}`]: firestore.FieldValue.increment(1),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch {
    // Ignore counter errors
  }
};

const counterFromEvent = (name: string, params?: Record<string, unknown>) => {
  const p = params || {};
  switch (name) {
    case 'promo_click':
      return { group: 'promo_clicks', key: (p.title as string) || (p.id as string) };
    case 'tip_click':
      return { group: 'tip_clicks', key: (p.title as string) || (p.id as string) };
    case 'news_click':
      return { group: 'news_clicks', key: (p.title as string) || (p.id as string) };
    case 'pharmacy_open':
      return { group: 'pharmacy_opens', key: (p.pharmacy_id as string) || (p.name as string) };
    case 'pharmacy_call':
      return { group: 'pharmacy_calls', key: (p.pharmacy_id as string) || (p.name as string) };
    case 'pharmacy_map':
      return { group: 'pharmacy_maps', key: (p.pharmacy_id as string) || (p.name as string) };
    case 'local_open':
      return { group: 'local_opens', key: (p.local_id as string) || (p.name as string) };
    case 'local_call':
      return { group: 'local_calls', key: (p.local_id as string) || (p.name as string) };
    case 'local_map':
      return { group: 'local_maps', key: (p.local_id as string) || (p.name as string) };
    case 'local_website':
      return { group: 'local_web', key: (p.local_id as string) || (p.name as string) };
    case 'emergency_open':
      return { group: 'emergency_opens', key: (p.emergency_id as string) || (p.name as string) };
    case 'emergency_call':
      return { group: 'emergency_calls', key: (p.emergency_id as string) || (p.name as string) };
    case 'emergency_map':
      return { group: 'emergency_maps', key: (p.emergency_id as string) || (p.name as string) };
    case 'first_aid_open':
      return { group: 'first_aid_opens', key: (p.title as string) || (p.id as string) };
    case 'home_quick_access':
      return { group: 'quick_access', key: (p.target as string) };
    case 'map_open':
      return { group: 'map_open', key: (p.source as string) || (p.title as string) };
    case 'service_status_click':
      return { group: 'service_status', key: (p.type as string) };
    case 'notifications_toggle':
      return { group: 'notifications_toggle', key: String(p.enabled) };
    case 'suggestion_submit':
      return { group: 'suggestions', key: (p.type as string) };
    case 'report_submit':
      return { group: 'reports', key: 'submitted' };
    case 'login_error':
      return { group: 'login_error', key: (p.method as string) };
    default:
      return null;
  }
};

export const logEvent = async (name: string, params?: Record<string, unknown>) => {
  try {
    await analytics().logEvent(name, sanitizeParams(params));
    const counter = counterFromEvent(name, params);
    if (counter) {
      await incrementCounter(counter.group, counter.key);
    }
  } catch {
    // Silently ignore analytics errors
  }
};

export const logScreenView = async (screenName: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
    await incrementCounter('screen_views', screenName);
  } catch {
    // Silently ignore analytics errors
  }
};

export const logLogin = async (method: string) => {
  try {
    await analytics().logLogin({ method });
    await incrementCounter('login', method);
  } catch {
    // Silently ignore analytics errors
  }
};

export const logSignUp = async (method: string) => {
  try {
    await analytics().logSignUp({ method });
    await incrementCounter('signup', method);
  } catch {
    // Silently ignore analytics errors
  }
};

export const setUserId = async (userId: string | null) => {
  try {
    await analytics().setUserId(userId || null);
  } catch {
    // Silently ignore analytics errors
  }
};

export const setUserProperties = async (properties: Record<string, string>) => {
  try {
    await analytics().setUserProperties(properties);
  } catch {
    // Silently ignore analytics errors
  }
};
