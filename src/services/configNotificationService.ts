import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { createNotificationChannels } from '../constants/notificationChannels';

const STORAGE_SEEN_HOME = 'home_notifications_seen';
const STORAGE_SEEDED = 'home_notifications_seeded';
const STORAGE_MAINTENANCE = 'maintenance_notification_last';

const MAX_SEEN = 50;
const MAX_BATCH = 3;
const db = getFirestore();

const getNotificationsEnabled = async () => {
  try {
    const stored = await AsyncStorage.getItem('notificationsEnabled');
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

const showUpdateNotification = async (title: string, body: string) => {
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: 'updates',
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  });
};

const buildKey = (parts: Array<string | undefined | null>) =>
  parts.map(part => (part || '').trim()).join('|').toLowerCase();

const readSeen = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_SEEN_HOME);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as string[];
  }
};

const writeSeen = async (items: string[]) => {
  const trimmed = items.slice(-MAX_SEEN);
  await AsyncStorage.setItem(STORAGE_SEEN_HOME, JSON.stringify(trimmed));
};

export const startConfigNotifications = () => {
  let unsubMaintenance: (() => void) | null = null;
  let unsubHome: (() => void) | null = null;
  let cancelled = false;

  const init = async () => {
    await createNotificationChannels();

    const maintenanceRef = doc(db, 'config', 'appStatus');
    const homeRef = doc(db, 'config', 'home');

    unsubMaintenance = onSnapshot(maintenanceRef, async snapshot => {
      if (cancelled || !snapshot.exists()) return;
      const data = snapshot.data() || {};
      if (!data.enabled) return;

      const key = buildKey([data.type, data.message, data.ctaText, data.ctaUrl]);
      if (!key) return;

      const last = await AsyncStorage.getItem(STORAGE_MAINTENANCE);
      if (last === key) return;

      if (!(await canShowNotification())) return;

      const title = 'Estado del servicio';
      const body = data.message || 'Hay un nuevo aviso de mantenimiento.';
      await showUpdateNotification(title, body);
      await AsyncStorage.setItem(STORAGE_MAINTENANCE, key);
    });

    unsubHome = onSnapshot(homeRef, async snapshot => {
      if (cancelled || !snapshot.exists()) return;
      const data = snapshot.data() || {};
      const newsEnabled = data.newsEnabled !== false;
      const promosEnabled = data.promosEnabled !== false;

      const news: any[] = Array.isArray(data.news) ? data.news : [];
      const promos: any[] = Array.isArray(data.promos) ? data.promos : [];

      const enabledNews = newsEnabled ? news.filter(item => item?.enabled !== false) : [];
      const enabledPromos = promosEnabled ? promos.filter(item => item?.enabled !== false) : [];

      const keys: string[] = [];
      enabledNews.forEach(item => {
        keys.push(buildKey(['news', item?.title, item?.body]));
      });
      enabledPromos.forEach(item => {
        keys.push(buildKey(['promo', item?.title, item?.body, item?.ctaUrl]));
      });

      const seen = await readSeen();
      const newKeys = keys.filter(key => key && !seen.includes(key));

      const seeded = await AsyncStorage.getItem(STORAGE_SEEDED);
      if (seeded !== 'true') {
        await writeSeen([...seen, ...keys]);
        await AsyncStorage.setItem(STORAGE_SEEDED, 'true');
        return;
      }

      if (newKeys.length === 0) return;
      if (!(await canShowNotification())) return;

      const batch = newKeys.slice(0, MAX_BATCH);
      let sentCount = 0;

      for (const key of batch) {
        const source = enabledNews.find(item => buildKey(['news', item?.title, item?.body]) === key)
          || enabledPromos.find(item => buildKey(['promo', item?.title, item?.body, item?.ctaUrl]) === key);

        if (!source) continue;
        const isPromo = enabledPromos.includes(source);
        const title = source?.title || (isPromo ? 'Nueva promo' : 'Nuevo aviso');
        const body = source?.body || (isPromo ? 'Hay una nueva promo disponible.' : 'Hay un nuevo aviso disponible.');

        await showUpdateNotification(title, body);
        sentCount += 1;
      }

      if (sentCount > 0) {
        await writeSeen([...seen, ...batch]);
      }
    });
  };

  init();

  return () => {
    cancelled = true;
    if (unsubMaintenance) unsubMaintenance();
    if (unsubHome) unsubHome();
  };
};
