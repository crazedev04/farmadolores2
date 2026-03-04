// src/services/turnoService.ts
import { FirebaseFirestoreTypes, getFirestore, collection, getDocs } from '@react-native-firebase/firestore';
import { DateTime } from 'luxon';
import { showNotification } from './notificationService';
import { createNotificationChannels } from '../constants/notificationChannels';
import { TriggerType, TimestampTrigger } from '@notifee/react-native';
import { Farmacia } from '../types/navigationTypes';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCache, writeCache, serializeForCache, rehydrateFromCache } from '../utils/cache';

const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const LEGACY_LAST_TURNO_PHARMACY_KEY = 'lastTurnoPharmacyId';
const TURNOS_CACHE_KEY = 'cache:farmacias:turnos';
const TURNOS_CACHE_TTL_MS = 1000 * 60 * 10; // 10 min
const ZONE = 'America/Argentina/Buenos_Aires';
const db = getFirestore();

interface NotificationSchedule {
  readonly hour: number;
  readonly minute: number;
  readonly title: string;
  readonly body: (name: string) => string;
}

const NOTIFICATION_SCHEDULES: NotificationSchedule[] = [
  {
    hour: 8,
    minute: 35,
    title: 'De turno hoy',
    body: name => `La farmacia de turno es ${name}`,
  },
  {
    hour: 12,
    minute: 0,
    title: 'Recordatorio de Turno',
    body: name => `La farmacia de turno es ${name}`,
  },
  {
    hour: 20,
    minute: 0,
    title: 'Recordatorio de Turno',
    body: name => `La farmacia de turno es ${name}`,
  },
];

type ActiveTurn = {
  pharmacy: Farmacia;
  start: DateTime;
};

const parseTurnTimestamp = (value: any): FirebaseFirestoreTypes.Timestamp | null => {
  const timestamp = value?.timestamp ?? value;
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return null;
  }
  return timestamp as FirebaseFirestoreTypes.Timestamp;
};

const toTurnStart = (timestamp: FirebaseFirestoreTypes.Timestamp) =>
  DateTime
    .fromJSDate(timestamp.toDate())
    .setZone(ZONE)
    .set({
      hour: 8,
      minute: 30,
      second: 0,
      millisecond: 0,
    });

const resolveActiveTurn = (farmacias: Farmacia[], now: DateTime): ActiveTurn | null => {
  let best: ActiveTurn | null = null;

  for (const pharmacy of farmacias) {
    if (!Array.isArray(pharmacy.turn) || pharmacy.turn.length === 0) continue;

    for (const turnValue of pharmacy.turn) {
      const timestamp = parseTurnTimestamp(turnValue);
      if (!timestamp) continue;

      const start = toTurnStart(timestamp);
      if (!start.isValid) continue;

      const end = start.plus({ hours: 24 });
      const isActive = now >= start && now < end;
      if (!isActive) continue;

      if (!best || start.toMillis() > best.start.toMillis()) {
        best = { pharmacy, start };
      }
    }
  }

  return best;
};

const loadFarmacias = async (): Promise<Farmacia[]> => {
  // Priorizamos Firestore vivo para evitar desfases justo en el cambio de turno.
  try {
    const snapshot = await getDocs(collection(db, 'farmacias'));
    const fresh = snapshot.docs.map((item) => {
      const data = item.data() as Partial<Farmacia>;
      return {
        ...data,
        id: item.id,
      } as Farmacia;
    });
    await writeCache(TURNOS_CACHE_KEY, serializeForCache(fresh));
    return fresh;
  } catch {
    const cached = await readCache<Farmacia[]>(TURNOS_CACHE_KEY, TURNOS_CACHE_TTL_MS);
    if (cached) {
      return rehydrateFromCache(cached) as Farmacia[];
    }
    throw new Error('No se pudo obtener listado de farmacias');
  }
};

/**
 * checkAndNotifyTurnos()
 *
 * Llama directamente a Firestore (sin Hooks ni Context) para ver si hay una farmacia de turno
 * y, de ser así, programa notificaciones locales para ciertas horas.
 * Ahora evita notificaciones duplicadas y mejora logs/errores.
 */
export async function checkAndNotifyTurnos(): Promise<void> {
  try {
    const notificationsEnabledRaw = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    const notificationsEnabled = notificationsEnabledRaw !== 'false';
    if (!notificationsEnabled) {
      await cancelTurnoNotifications();
      return;
    }

    await createNotificationChannels();
    const legacyLastPharmacyId = await AsyncStorage.getItem(LEGACY_LAST_TURNO_PHARMACY_KEY);
    if (legacyLastPharmacyId) {
      for (const schedule of NOTIFICATION_SCHEDULES) {
        await notifee.cancelNotification(`${legacyLastPharmacyId}_${schedule.hour}_${schedule.minute}`);
      }
      await AsyncStorage.removeItem(LEGACY_LAST_TURNO_PHARMACY_KEY);
    }

    // 1. Consulta farmacias (Firestore primero, cache como fallback)
    const farmacias = await loadFarmacias();

    // 2. Determinar farmacia de turno
    const now = DateTime.local().setZone(ZONE);
    // 2. Programar notificaciones por horario usando la farmacia activa EN ESE horario.
    for (const schedule of NOTIFICATION_SCHEDULES) {
      const notificationId = `turno_${schedule.hour}_${schedule.minute}`;
      await notifee.cancelNotification(notificationId);

      const notificationTime = now.set({
        hour: schedule.hour,
        minute: schedule.minute,
        second: 0,
        millisecond: 0,
      });
      if (notificationTime <= now) {
        continue;
      }

      const turnForSchedule = resolveActiveTurn(farmacias, notificationTime);
      if (!turnForSchedule) {
        if (__DEV__) {
          console.log(`[TurnoService] Sin farmacia para horario ${notificationTime.toISO()}`);
        }
        continue;
      }

      const targetPharmacy = turnForSchedule.pharmacy;
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: notificationTime.toMillis(),
      };

      if (__DEV__) {
        console.log(
          `[TurnoService] Programando ${notificationId} (${notificationTime.toISO()}) => ${targetPharmacy.name}`,
        );
      }

      try {
        await showNotification(
          schedule.title,
          schedule.body(targetPharmacy.name),
          {
            name: targetPharmacy.name,
            dir: targetPharmacy.dir,
            image: targetPharmacy.image,
            detail: targetPharmacy.detail,
          },
          trigger,
          notificationId,
        );
      } catch (err) {
        console.error(`[TurnoService] Error programando notificación ${notificationId}:`, err);
      }
    }
  } catch (error) {
    console.error('[checkAndNotifyTurnos] Error:', error);
  }
}

export async function cancelTurnoNotifications(): Promise<void> {
  const legacyLastPharmacyId = await AsyncStorage.getItem(LEGACY_LAST_TURNO_PHARMACY_KEY);
  if (legacyLastPharmacyId) {
    for (const schedule of NOTIFICATION_SCHEDULES) {
      await notifee.cancelNotification(`${legacyLastPharmacyId}_${schedule.hour}_${schedule.minute}`);
    }
    await AsyncStorage.removeItem(LEGACY_LAST_TURNO_PHARMACY_KEY);
  }

  for (const schedule of NOTIFICATION_SCHEDULES) {
    await notifee.cancelNotification(`turno_${schedule.hour}_${schedule.minute}`);
  }
}
