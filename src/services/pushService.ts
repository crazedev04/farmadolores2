import {
  FirebaseMessagingTypes,
  getMessaging,
  requestPermission,
  registerDeviceForRemoteMessages,
  getToken,
  onTokenRefresh,
  onMessage,
} from '@react-native-firebase/messaging';
import { getFirestore, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import { Platform } from 'react-native';
import { createNotificationChannels } from '../constants/notificationChannels';
import { requestNotificationPermission } from '../components/Permissions';

const TOKEN_COLLECTION = 'fcmTokens';
const STORAGE_NOTIFICATIONS = 'notificationsEnabled';
const STORAGE_PERMISSIONS_GRANTED = 'permissionsGranted';
const STORAGE_NOTIFICATION_CHANNELS = 'notificationChannels';
const DEFAULT_CHANNELS = {
  updates: true,
  turno: true,
  promo: true,
};

const messagingInstance = getMessaging();
const db = getFirestore();

export type PushChannels = typeof DEFAULT_CHANNELS;

const sanitizeChannels = (channels?: Partial<PushChannels> | null): PushChannels => ({
  updates: channels?.updates !== false,
  turno: channels?.turno !== false,
  promo: channels?.promo !== false,
});

const toText = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const getNotificationsEnabled = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_NOTIFICATIONS);
    return stored !== 'false';
  } catch {
    return true;
  }
};

const getPermissionsGranted = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_PERMISSIONS_GRANTED);
    return stored === 'true';
  } catch {
    return false;
  }
};

const getNotificationChannels = async (): Promise<PushChannels> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_NOTIFICATION_CHANNELS);
    if (!raw) return { ...DEFAULT_CHANNELS };
    const parsed = JSON.parse(raw);
    return sanitizeChannels(parsed);
  } catch {
    return { ...DEFAULT_CHANNELS };
  }
};

const setNotificationChannels = async (channels: PushChannels) => {
  await AsyncStorage.setItem(STORAGE_NOTIFICATION_CHANNELS, JSON.stringify(channels));
};

const canShowNotification = async () => {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return false;
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus >= 1;
  } catch {
    return true;
  }
};

const saveToken = async (
  token: string,
  userId: string | null,
  notificationsEnabled: boolean,
  channels: PushChannels,
) => {
  try {
    const payload = {
      token,
      userId: userId || null,
      notificationsEnabled,
      channels,
      deviceId: DeviceInfo.getUniqueIdSync ? DeviceInfo.getUniqueIdSync() : await DeviceInfo.getUniqueId(),
      platform: Platform.OS,
      appVersion: DeviceInfo.getVersion(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, TOKEN_COLLECTION, token), payload, { merge: true });
  } catch {
    // ignore write errors (rules, offline)
  }
};

const displayRemoteNotification = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
  if (!(await canShowNotification())) return;

  await createNotificationChannels();

  const data = (remoteMessage?.data || {}) as Record<string, unknown>;
  const notificationData: Record<string, string | number | object> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      notificationData[key] = value;
      return;
    }
    if (value && typeof value === 'object') {
      notificationData[key] = value;
      return;
    }
    notificationData[key] = String(value ?? '');
  });
  const title = toText(
    remoteMessage?.notification?.title ?? data.title,
    'Actualizacion',
  );
  const body = toText(
    remoteMessage?.notification?.body ?? data.body,
    'Tienes una nueva actualizacion.',
  );

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'updates',
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
    data: notificationData,
  });
};

export const updateNotificationPreferences = async (
  userId: string | null,
  options: { enabled: boolean; channels?: Partial<PushChannels> } ,
) => {
  const channels = sanitizeChannels(options.channels);
  await AsyncStorage.setItem(STORAGE_NOTIFICATIONS, options.enabled ? 'true' : 'false');
  await setNotificationChannels(channels);

  try {
    const token = await getToken(messagingInstance);
    if (!token) return;
    await saveToken(token, userId, options.enabled, channels);
  } catch {
    // ignore if token is unavailable
  }
};

let activeUserId: string | null = null;
let activeUnsubscribeMessage: (() => void) | null = null;
let activeUnsubscribeToken: (() => void) | null = null;
let initializing = false;

export const initPushNotifications = (userId: string | null, force = false) => {
  let unsubscribeMessage: (() => void) | null = null;
  let unsubscribeToken: (() => void) | null = null;

  const init = async () => {
    if (initializing) return;
    initializing = true;
    const storedGranted = await getPermissionsGranted();
    if (!force && !storedGranted) {
      initializing = false;
      return;
    }
    if (activeUserId === userId && (activeUnsubscribeMessage || activeUnsubscribeToken)) {
      initializing = false;
      return;
    }
    if (activeUnsubscribeMessage) activeUnsubscribeMessage();
    if (activeUnsubscribeToken) activeUnsubscribeToken();
    activeUnsubscribeMessage = null;
    activeUnsubscribeToken = null;
    activeUserId = userId;

    let settings;
    try {
      settings = await notifee.getNotificationSettings();
    } catch {
      settings = null;
    }
    const authorized = !!settings && settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    if (!authorized && !force) {
      initializing = false;
      return;
    }
    if (force && !authorized) {
      const notificationsAllowed = await requestNotificationPermission();
      if (!notificationsAllowed) {
        initializing = false;
        return;
      }
    }

    try {
      await requestPermission(messagingInstance);
    } catch {
      // ignore
    }

    await registerDeviceForRemoteMessages(messagingInstance);
    await createNotificationChannels();

    const notificationsEnabled = await getNotificationsEnabled();
    const channels = await getNotificationChannels();
    const token = await getToken(messagingInstance);
    if (token) {
      await saveToken(token, userId, notificationsEnabled, channels);
    }

    unsubscribeToken = onTokenRefresh(messagingInstance, async (newToken) => {
      const enabled = await getNotificationsEnabled();
      const latestChannels = await getNotificationChannels();
      await saveToken(newToken, userId, enabled, latestChannels);
    });

    unsubscribeMessage = onMessage(messagingInstance, async (message) => {
      await displayRemoteNotification(message);
    });
    activeUnsubscribeMessage = unsubscribeMessage;
    activeUnsubscribeToken = unsubscribeToken;
    initializing = false;
  };

  init();

  return () => {
    if (unsubscribeMessage) unsubscribeMessage();
    if (unsubscribeToken) unsubscribeToken();
    if (activeUnsubscribeMessage === unsubscribeMessage) activeUnsubscribeMessage = null;
    if (activeUnsubscribeToken === unsubscribeToken) activeUnsubscribeToken = null;
    if (activeUserId === userId) activeUserId = null;
  };
};

export const handleBackgroundMessage = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
  await displayRemoteNotification(remoteMessage);
};
