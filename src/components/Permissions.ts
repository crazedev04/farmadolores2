// permissions.ts
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
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
        return false;
      }
    }

    if (Platform.OS === 'android' && PERMISSIONS.ANDROID.POST_NOTIFICATIONS) {
      const status = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
      if (status !== RESULTS.GRANTED) {
        const requestStatus = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        if (requestStatus !== RESULTS.GRANTED) {
          Alert.alert('Permiso denegado', 'No se otorgó el permiso para notificaciones.');
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error solicitando permisos de notificaciones:', error);
    return false;
  }
};
