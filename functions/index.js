const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const MAX_BATCH = 500;
const DEFAULT_DELETE_AFTER_DAYS = 30;
const DEFAULT_CHANNELS = {
  updates: true,
  turno: true,
  promo: true,
};

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

const asTrimmed = (value) => String(value || '').trim();

const ensureAdmin = (context) => {
  if (!context?.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required');
  }
};

const normalizeChannels = (channels) => {
  if (!channels || typeof channels !== 'object') {
    return { ...DEFAULT_CHANNELS };
  }
  return {
    updates: channels.updates !== false,
    turno: channels.turno !== false,
    promo: channels.promo !== false,
  };
};

const canReceiveChannel = (docData, channel) => {
  if (docData?.notificationsEnabled === false) return false;
  const channels = normalizeChannels(docData?.channels);
  return channels[channel] !== false;
};

const getTokenDocs = async () => {
  const snap = await db.collection('fcmTokens').get();
  return snap.docs.map((doc) => ({
    token: doc.id,
    data: doc.data() || {},
  }));
};

const getTokensForChannel = async (channel) => {
  const docs = await getTokenDocs();
  return docs
    .filter((item) => item.token && canReceiveChannel(item.data, channel))
    .map((item) => item.token);
};

const removeTokenDocs = async (tokens) => {
  if (!tokens || tokens.length === 0) return;
  const tasks = tokens.map((token) => db.collection('fcmTokens').doc(token).delete().catch(() => null));
  await Promise.all(tasks);
};

const sendToTokens = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) return { sent: 0, batches: 0 };
  let sent = 0;
  const batches = chunk(tokens, MAX_BATCH);
  for (const batch of batches) {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      ...payload,
    });

    sent += response.successCount;
    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        const code = res.error.code || '';
        if (code.includes('registration-token-not-registered')) {
          invalidTokens.push(batch[idx]);
        }
      }
    });
    await removeTokenDocs(invalidTokens);
  }
  return { sent, batches: batches.length };
};

const sendFilteredNotifications = async ({ channel, payload }) => {
  const tokens = await getTokensForChannel(channel);
  return sendToTokens(tokens, payload);
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

const writeAdminAuditLog = async ({ actorUid, actorRole, action, targetType, targetId, summary }) => {
  await db.collection('adminAuditLogs').add({
    actorUid: actorUid || 'system',
    actorRole: actorRole || 'system',
    action: action || 'unknown',
    targetType: targetType || 'unknown',
    targetId: targetId || '',
    summary: summary || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

exports.adminWriteAuditLog = functions.https.onCall(async (data, context) => {
  ensureAdmin(context);
  const action = asTrimmed(data?.action) || 'unknown_action';
  const targetType = asTrimmed(data?.targetType) || 'unknown_target';
  const targetId = asTrimmed(data?.targetId);
  const summary = asTrimmed(data?.summary);

  if (!targetId) {
    throw new functions.https.HttpsError('invalid-argument', 'targetId is required');
  }

  await writeAdminAuditLog({
    actorUid: context.auth.uid,
    actorRole: 'admin',
    action,
    targetType,
    targetId,
    summary,
  });

  return { ok: true };
});

const deleteCollectionDocs = async (queryRef) => {
  let total = 0;
  while (true) {
    const snap = await queryRef.get();
    if (snap.empty) return total;
    const batches = chunk(snap.docs, 450);
    for (const docs of batches) {
      const batch = db.batch();
      docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      total += docs.length;
    }
    if (snap.size < 450) {
      return total;
    }
  }
};

const deleteUserData = async (uid, options = {}) => {
  const requestId = asTrimmed(options.requestId);
  const reason = asTrimmed(options.reason);
  const requestDocRef = requestId ? db.collection('accountRequests').doc(requestId) : null;
  const userRef = db.collection('users').doc(uid);
  const favoritesRef = userRef.collection('favorites');
  const tokenRef = db.collection('fcmTokens').where('userId', '==', uid);
  const requestsByUserRef = db.collection('accountRequests').where('uid', '==', uid);

  await deleteCollectionDocs(favoritesRef.limit(MAX_BATCH));
  await userRef.delete().catch(() => null);
  await deleteCollectionDocs(tokenRef.limit(MAX_BATCH));
  await deleteCollectionDocs(requestsByUserRef.limit(MAX_BATCH));

  if (requestDocRef) {
    await requestDocRef.delete().catch(() => null);
  }

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    const code = error?.code || '';
    if (!String(code).includes('user-not-found')) {
      throw error;
    }
  }

  return {
    uid,
    requestId: requestId || null,
    reason: reason || null,
  };
};

exports.adminReactivateAccount = functions.https.onCall(async (data, context) => {
  ensureAdmin(context);
  const uid = asTrimmed(data?.uid);
  const requestId = asTrimmed(data?.requestId);
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required');
  }

  await db.collection('users').doc(uid).set(
    {
      disabled: false,
      deleteStatus: 'none',
      disabledAt: null,
      deleteRequested: false,
      deleteRequestedAt: null,
      deleteAfterDays: admin.firestore.FieldValue.delete(),
      reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (requestId) {
    await db.collection('accountRequests').doc(requestId).delete().catch(() => null);
  }

  await writeAdminAuditLog({
    actorUid: context.auth.uid,
    actorRole: 'admin',
    action: 'account_reactivate',
    targetType: 'user',
    targetId: uid,
    summary: requestId ? `Reactivated from request ${requestId}` : 'Reactivated user account',
  });

  return { ok: true };
});

exports.adminDeleteUserData = functions.https.onCall(async (data, context) => {
  ensureAdmin(context);
  const uid = asTrimmed(data?.uid);
  const requestId = asTrimmed(data?.requestId);
  const reason = asTrimmed(data?.reason);
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required');
  }

  await deleteUserData(uid, { requestId, reason });
  await writeAdminAuditLog({
    actorUid: context.auth.uid,
    actorRole: 'admin',
    action: 'account_delete_data',
    targetType: 'user',
    targetId: uid,
    summary: reason || 'Deleted user data from admin panel',
  });

  return { ok: true };
});

exports.scheduleAccountDeletion = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async () => {
    const candidates = await db
      .collection('users')
      .where('deleteStatus', 'in', ['requested', 'scheduled'])
      .get();

    if (candidates.empty) return null;

    const nowMs = Date.now();
    for (const doc of candidates.docs) {
      const data = doc.data() || {};
      const uid = asTrimmed(doc.id);
      if (!uid) continue;
      const deleteRequestedAt = data.deleteRequestedAt?.toDate ? data.deleteRequestedAt.toDate() : null;
      const deleteAfterDays = Number(data.deleteAfterDays) || DEFAULT_DELETE_AFTER_DAYS;
      if (!deleteRequestedAt) continue;
      const deleteAfterMs = deleteAfterDays * 24 * 60 * 60 * 1000;
      const elapsed = nowMs - deleteRequestedAt.getTime();

      if (elapsed >= deleteAfterMs) {
        await deleteUserData(uid, { reason: 'scheduled_deletion' });
        await writeAdminAuditLog({
          actorUid: 'system',
          actorRole: 'system',
          action: 'account_delete_scheduled',
          targetType: 'user',
          targetId: uid,
          summary: `Auto-deleted after ${deleteAfterDays} days`,
        });
      } else if (data.deleteStatus !== 'scheduled') {
        await db.collection('users').doc(uid).set(
          {
            deleteStatus: 'scheduled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    return null;
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
    await sendFilteredNotifications({
      channel: 'updates',
      payload: buildPayload(title, body, { type: 'maintenance', ctaUrl: after.ctaUrl || '' }),
    });
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
      await sendFilteredNotifications({
        channel: 'updates',
        payload: buildPayload(title, body, { type: 'news' }),
      });
    }

    for (const item of newPromos.slice(0, 5)) {
      const title = item?.title || 'Nueva promo';
      const body = item?.body || 'Hay una nueva promo disponible.';
      await sendFilteredNotifications({
        channel: 'promo',
        payload: buildPayload(title, body, { type: 'promo', ctaUrl: item?.ctaUrl || '' }),
      });
    }

    return null;
  });

exports.adminSendBroadcast = functions.https.onCall(async (data, context) => {
  ensureAdmin(context);
  const title = asTrimmed(data?.title);
  const body = asTrimmed(data?.body);
  const type = asTrimmed(data?.type) || 'admin_broadcast';

  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Title and body are required');
  }

  const result = await sendFilteredNotifications({
    channel: 'updates',
    payload: buildPayload(title, body, { type }),
  });

  await writeAdminAuditLog({
    actorUid: context.auth.uid,
    actorRole: 'admin',
    action: 'admin_send_broadcast',
    targetType: 'push',
    targetId: 'all',
    summary: `Broadcast sent: ${title} (to ${result.sent} devices)`,
  });

  return { ok: true, sent: result.sent };
});
