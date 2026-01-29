// src/services/notificationService.ts
import notifee, {
  AndroidImportance,
  TimestampTrigger,
} from '@notifee/react-native';

export interface NotificationData {
  name: string;
  dir: string;
  image: string;
  detail: string;
}

/**
 * showNotification
 * @param title Título de la notificación
 * @param body  Texto de la notificación
 * @param data  Objeto con información adicional
 * @param trigger Objeto TimestampTrigger para programar notificación futura
 * @param notificationId ID único para la notificación (opcional)
 */
export const showNotification = async (
  title: string,
  body: string,
  data: NotificationData,
  trigger: TimestampTrigger,
  notificationId?: string,
): Promise<void> => {
  // Creamos una notificación con trigger (programada)
  await notifee.createTriggerNotification(
    {
      title,
      body,
      // Opciones de Android
      android: {
        channelId: 'turno',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        actions: [
          {
            title: 'Ver Farmacia',
            pressAction: {
              id: 'viewFarmacia',
              launchActivity: 'default',
            },
          },
        ],
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
      data: { ...data },
      id: notificationId,
    },
    trigger
  );
};
