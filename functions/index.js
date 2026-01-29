const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const MAX_BATCH = 500;

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const buildKey = (prefix, item) => {
  const parts = [prefix, item?.title, item?.body, item?.ctaUrl, item?.message];
  return parts
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
    .join('|');
};

const getTokens = async () => {
  const snap = await db.collection('fcmTokens').get();
  return snap.docs.map((doc) => doc.id).filter(Boolean);
};

const sendToTokens = async (payload) => {
  const tokens = await getTokens();
  if (tokens.length === 0) return;

  const batches = chunk(tokens, MAX_BATCH);
  for (const batch of batches) {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      ...payload,
    });

    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        const code = res.error.code || '';
        if (code.includes('registration-token-not-registered')) {
          invalidTokens.push(batch[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      const deletes = invalidTokens.map((token) => db.collection('fcmTokens').doc(token).delete());
      await Promise.all(deletes);
    }
  }
};

const buildPayload = (title, body, data = {}) => ({
  notification: {
    title,
    body,
  },
  data: {
    ...data,
    title,
    body,
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'updates',
      sound: 'default',
    },
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
      },
    },
  },
});

exports.onMaintenanceUpdate = functions.firestore
  .document('config/appStatus')
  .onWrite(async (change) => {
    if (!change.after.exists) return null;

    const after = change.after.data() || {};
    const before = change.before.exists ? change.before.data() || {} : {};

    if (!after.enabled) return null;

    const keyAfter = buildKey('maintenance', after);
    const keyBefore = buildKey('maintenance', before);

    if (change.before.exists && keyAfter === keyBefore && before.enabled) return null;

    const title = 'Estado del servicio';
    const body = after.message || 'Hay un nuevo aviso de mantenimiento.';

    await sendToTokens(buildPayload(title, body, { type: 'maintenance', ctaUrl: after.ctaUrl || '' }));
    return null;
  });

exports.onHomeUpdate = functions.firestore
  .document('config/home')
  .onWrite(async (change) => {
    if (!change.after.exists) return null;

    const after = change.after.data() || {};
    const before = change.before.exists ? change.before.data() || {} : {};

    const newsEnabled = after.newsEnabled !== false;
    const promosEnabled = after.promosEnabled !== false;

    const afterNews = Array.isArray(after.news) ? after.news : [];
    const afterPromos = Array.isArray(after.promos) ? after.promos : [];
    const beforeNews = Array.isArray(before.news) ? before.news : [];
    const beforePromos = Array.isArray(before.promos) ? before.promos : [];

    const enabledNews = newsEnabled ? afterNews.filter((item) => item?.enabled !== false) : [];
    const enabledPromos = promosEnabled ? afterPromos.filter((item) => item?.enabled !== false) : [];

    const prevNewsKeys = new Set(beforeNews.map((item) => buildKey('news', item)));
    const prevPromoKeys = new Set(beforePromos.map((item) => buildKey('promo', item)));

    const newNews = enabledNews.filter((item) => !prevNewsKeys.has(buildKey('news', item)));
    const newPromos = enabledPromos.filter((item) => !prevPromoKeys.has(buildKey('promo', item)));

    for (const item of newNews.slice(0, 5)) {
      const title = item?.title || 'Nuevo aviso';
      const body = item?.body || 'Hay un nuevo aviso disponible.';
      await sendToTokens(buildPayload(title, body, { type: 'news' }));
    }

    for (const item of newPromos.slice(0, 5)) {
      const title = item?.title || 'Nueva promo';
      const body = item?.body || 'Hay una nueva promo disponible.';
      await sendToTokens(buildPayload(title, body, { type: 'promo', ctaUrl: item?.ctaUrl || '' }));
    }

    return null;
  });
