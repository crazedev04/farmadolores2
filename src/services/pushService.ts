import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import { createNotificationChannels } from '../constants/notificationChannels';
import { requestNotificationPermission } from '../components/Permissions';

const TOKEN_COLLECTION = 'fcmTokens';
const STORAGE_NOTIFICATIONS = 'notificationsEnabled';

const getNotificationsEnabled = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_NOTIFICATIONS);
    return stored !== 'false';
  } catch {
    return true;
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
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore().collection(TOKEN_COLLECTION).doc(token).set(payload, { merge: true });
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

export const initPushNotifications = (userId: string | null) => {
  let unsubscribeMessage: (() => void) | null = null;
  let unsubscribeToken: (() => void) | null = null;

  const init = async () => {
    const notificationsAllowed = await requestNotificationPermission();
    if (!notificationsAllowed) return;

    try {
      await messaging().requestPermission();
    } catch {
      // ignore
    }

    await messaging().registerDeviceForRemoteMessages();
    await createNotificationChannels();

    const token = await messaging().getToken();
    if (token) {
      await saveToken(token, userId);
    }

    unsubscribeToken = messaging().onTokenRefresh(async (newToken) => {
      await saveToken(newToken, userId);
    });

    unsubscribeMessage = messaging().onMessage(async (message) => {
      await displayRemoteNotification(message);
    });
  };

  init();

  return () => {
    if (unsubscribeMessage) unsubscribeMessage();
    if (unsubscribeToken) unsubscribeToken();
  };
};

export const handleBackgroundMessage = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
  await displayRemoteNotification(remoteMessage);
};
