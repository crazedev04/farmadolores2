// permissions.ts
import { check, request, PERMISSIONS, RESULTS, type Permission } from 'react-native-permissions';
import { Alert, Platform } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const requestPermissions = async (): Promise<boolean> => {
  try {
    const notificationsGranted = await requestNotificationPermission();
    if (!notificationsGranted) {
      return false;
    }

    // Solicitar permisos adicionales (ubicación)
    const permissions = Platform.select({
      android: [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION],
      ios: [PERMISSIONS.IOS.LOCATION_WHEN_IN_USE],
      default: [],
    }) || [];

    for (const permission of permissions) {
      const status = await check(permission);
      if (status !== RESULTS.GRANTED) {
        const requestStatus = await request(permission);
        if (requestStatus !== RESULTS.GRANTED) {
          Alert.alert('Permiso denegado', `No se otorgó el permiso: ${permission}`);
          return false;
        }
      }
    }

    await AsyncStorage.setItem('permissionsGranted', 'true');
    return true;
  } catch (error) {
    console.error('Error solicitando permisos:', error);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const notificationSettings = await notifee.getNotificationSettings();
    if (notificationSettings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
      const { authorizationStatus } = await notifee.requestPermission();
      if (authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        Alert.alert('Permiso de notificaciones denegado', 'No se otorgó el permiso para mostrar notificaciones.');
        await AsyncStorage.setItem('permissionsGranted', 'false');
        return false;
      }
    }

    const postNotificationsPermission = (
      PERMISSIONS.ANDROID as Record<string, Permission | undefined>
    ).POST_NOTIFICATIONS;
    if (Platform.OS === 'android' && postNotificationsPermission) {
      const status = await check(postNotificationsPermission);
      if (status !== RESULTS.GRANTED) {
        const requestStatus = await request(postNotificationsPermission);
        if (requestStatus !== RESULTS.GRANTED) {
          Alert.alert('Permiso denegado', 'No se otorgó el permiso para notificaciones.');
          await AsyncStorage.setItem('permissionsGranted', 'false');
          return false;
        }
      }
    }

    await AsyncStorage.setItem('permissionsGranted', 'true');
    return true;
  } catch (error) {
    console.error('Error solicitando permisos de notificaciones:', error);
    await AsyncStorage.setItem('permissionsGranted', 'false');
    return false;
  }
};
