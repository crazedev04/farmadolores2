import notifee, { AndroidImportance } from '@notifee/react-native';

export const createNotificationChannels = async () => {
  await notifee.createChannel({
    id: 'turno',
    name: 'Turno Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.createChannel({
    id: 'updates',
    name: 'Actualizaciones y avisos',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await notifee.createChannel({
    id: 'comment',
    name: 'Comment Notifications',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });

  // Añade más canales según sea necesario
};
