import { Platform } from 'react-native';
import SpInAppUpdates, {
  IAUUpdateKind,
  StartUpdateOptions,
} from 'sp-react-native-in-app-updates';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import DeviceInfo from 'react-native-device-info';

const db = getFirestore();

/**
 * Compara dos versiones semánticas (ej: '2.0.0' vs '2.1.0')
 * @returns 1 si v1 > v2, -1 si v1 < v2, 0 si son iguales
 */
export const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map(p => parseInt(p, 10) || 0);
  
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * Chequea si la versión instalada es menor a la versión mínima requerida en Firestore
 */
export const checkAppVersionStatus = async (): Promise<{
  isOutdated: boolean;
  currentVersion: string;
  minVersion: string;
}> => {
  try {
    const currentVersion = DeviceInfo.getVersion();
    const snap = await getDoc(doc(db, 'config', 'app'));
    const data = snap.data();
    
    // El campo en Firestore debería llamarse 'minAppVersion'
    const minVersion = data?.minAppVersion || '0.0.0';

    const comparison = compareVersions(currentVersion, minVersion);

    return {
      isOutdated: comparison < 0,
      currentVersion,
      minVersion,
    };
  } catch (error) {
    console.error('[VersionService] Error checking version from Firestore:', error);
    return { 
      isOutdated: false, 
      currentVersion: DeviceInfo.getVersion(), 
      minVersion: '0.0.0' 
    };
  }
};

/**
 * Inicia el flujo nativo de actualización de la Play Store / App Store
 */
export const startInAppUpdate = async (priority: 'flexible' | 'immediate' = 'flexible') => {
  try {
    const inAppUpdates = new SpInAppUpdates(false); // isDebug = false
    
    // Verificamos si Google Play tiene una versión superior a la instalada
    const result = await inAppUpdates.checkNeedsUpdate();

    if (result.shouldUpdate) {
      const updateOptions: StartUpdateOptions = Platform.select({
        android: {
          updateType: priority === 'immediate' ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE,
        },
        ios: {
          title: 'Actualización disponible',
          message: 'Hay una nueva versión de Farmadolores. ¿Querés actualizarla ahora?',
          buttonUpgradeText: 'Actualizar',
          buttonCancelText: 'Más tarde',
        },
      }) as StartUpdateOptions;

      await inAppUpdates.startUpdate(updateOptions);
    }
  } catch (error) {
    console.error('[VersionService] Native InAppUpdate error:', error);
  }
};
