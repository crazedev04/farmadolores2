import { FirebaseMessagingTypes, getMessaging, requestPermission, registerDeviceForRemoteMessages, getToken, onTokenRefresh, onMessage } from '@react-native-firebase/messaging';
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
const messagingInstance = getMessaging();
const db = getFirestore();

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

const saveToken = async (token: string, userId: string | null) => {
  try {
    const payload = {
      token,
      userId: userId || null,
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

  const data = remoteMessage?.data || {};
  const title =
    remoteMessage?.notification?.title ||
    data.title ||
    'Actualizacion';
  const body =
    remoteMessage?.notification?.body ||
    data.body ||
    'Tienes una nueva actualizacion.';

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'updates',
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
    data,
  });
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

    const token = await getToken(messagingInstance);
    if (token) {
      await saveToken(token, userId);
    }

    unsubscribeToken = onTokenRefresh(messagingInstance, async (newToken) => {
      await saveToken(newToken, userId);
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
