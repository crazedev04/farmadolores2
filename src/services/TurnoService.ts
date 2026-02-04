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

const LAST_TURNO_PHARMACY_KEY = 'lastTurnoPharmacyId';
const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const TURNOS_CACHE_KEY = 'cache:farmacias:turnos';
const TURNOS_CACHE_TTL_MS = 1000 * 60 * 10; // 10 min
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
    // 1. Consulta farmacias con cache
    let farmacias: Farmacia[] | null = await readCache<Farmacia[]>(TURNOS_CACHE_KEY, TURNOS_CACHE_TTL_MS);
    if (farmacias) {
      farmacias = rehydrateFromCache(farmacias) as Farmacia[];
    } else {
      const snapshot = await getDocs(collection(db, 'farmacias'));
      farmacias = snapshot.docs.map(doc => {
        const data = doc.data() as Partial<Farmacia>;
        return {
          ...data,
          id: doc.id,
        } as Farmacia;
      });
      writeCache(TURNOS_CACHE_KEY, serializeForCache(farmacias));
    }
    // 2. Determinar farmacia de turno
    const now = DateTime.local().setZone('America/Argentina/Buenos_Aires');
    const matchingPharmacy = farmacias.find((pharmacy) => {
      return pharmacy.turn?.some((t: any) => {
        const timestamp: FirebaseFirestoreTypes.Timestamp = t?.timestamp ?? t;
        if (!timestamp?.toDate) return false;
        const turnStart = DateTime.fromJSDate(timestamp.toDate()).set({
          hour: 8,
          minute: 30,
          second: 0,
          millisecond: 0,
        });
        const turnEnd = turnStart.plus({ hours: 24 });
        return now >= turnStart && now <= turnEnd;
      });
    });
    if (!matchingPharmacy) {
      if (__DEV__) {
        console.log('[TurnoService] No hay farmacia de turno.');
      }
      const lastPharmacyId = await AsyncStorage.getItem(LAST_TURNO_PHARMACY_KEY);
      if (lastPharmacyId) {
        for (const schedule of NOTIFICATION_SCHEDULES) {
          await notifee.cancelNotification(`${lastPharmacyId}_${schedule.hour}_${schedule.minute}`);
        }
        await AsyncStorage.removeItem(LAST_TURNO_PHARMACY_KEY);
      }
      return;
    }
    // 3. Evitar duplicados: cancela notificaciones futuras solo de estas IDs
    const lastPharmacyId = await AsyncStorage.getItem(LAST_TURNO_PHARMACY_KEY);
    if (lastPharmacyId && lastPharmacyId !== matchingPharmacy.id) {
      for (const schedule of NOTIFICATION_SCHEDULES) {
        await notifee.cancelNotification(`${lastPharmacyId}_${schedule.hour}_${schedule.minute}`);
      }
    }
    for (const schedule of NOTIFICATION_SCHEDULES) {
      await notifee.cancelNotification(`${matchingPharmacy.id}_${schedule.hour}_${schedule.minute}`);
    }
    // 4. Programar notificaciones
    for (const schedule of NOTIFICATION_SCHEDULES) {
      const notificationTime = now.set({
        hour: schedule.hour,
        minute: schedule.minute,
        second: 0,
        millisecond: 0,
      });
      if (notificationTime > now) {
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: notificationTime.toMillis(),
        };
        // ID único por farmacia y horario
        const notificationId = `${matchingPharmacy.id}_${schedule.hour}_${schedule.minute}`;
        if (__DEV__) {
          console.log(`[TurnoService] Programando notificación ${notificationId} para ${notificationTime.toISO()}`);
        }
        try {
          await showNotification(
            schedule.title,
            schedule.body(matchingPharmacy.name),
            {
              name: matchingPharmacy.name,
              dir: matchingPharmacy.dir,
              image: matchingPharmacy.image,
              detail: matchingPharmacy.detail,
            },
            trigger,
            notificationId
          );
          if (__DEV__) {
            console.log(`[TurnoService] Notificación programada: ${notificationId}`);
          }
        } catch (err) {
          console.error(`[TurnoService] Error programando notificación ${notificationId}:`, err);
        }
      }
    }
    await AsyncStorage.setItem(LAST_TURNO_PHARMACY_KEY, matchingPharmacy.id);
  } catch (error) {
    console.error('[checkAndNotifyTurnos] Error:', error);
  }
}

export async function cancelTurnoNotifications(): Promise<void> {
  const lastPharmacyId = await AsyncStorage.getItem(LAST_TURNO_PHARMACY_KEY);
  if (!lastPharmacyId) {
    return;
  }
  for (const schedule of NOTIFICATION_SCHEDULES) {
    await notifee.cancelNotification(`${lastPharmacyId}_${schedule.hour}_${schedule.minute}`);
  }
  await AsyncStorage.removeItem(LAST_TURNO_PHARMACY_KEY);
}
