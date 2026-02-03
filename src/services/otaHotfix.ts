import DeviceInfo from 'react-native-device-info';
import OtaHotUpdate from 'react-native-ota-hot-update';
import RNBlobUtil from 'react-native-blob-util';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

type OtaConfig = {
  enabled?: boolean;
  manifestUrl?: string;
};

export type OtaManifest = {
  otaVersion?: number;
  url?: string;
  hotfix?: boolean;
  minAppVersion?: string;
  maxAppVersion?: string;
  targetMajor?: number;
  targetMinor?: number;
  notes?: string | string[];
};

const parseVersion = (raw: string) => {
  const [major = '0', minor = '0', patch = '0'] = raw.split('.');
  return {
    major: Number(major) || 0,
    minor: Number(minor) || 0,
    patch: Number(patch) || 0,
  };
};

const compareVersion = (a: string, b: string) => {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  if (av.major !== bv.major) return av.major > bv.major ? 1 : -1;
  if (av.minor !== bv.minor) return av.minor > bv.minor ? 1 : -1;
  if (av.patch !== bv.patch) return av.patch > bv.patch ? 1 : -1;
  return 0;
};

const isCompatibleHotfix = (manifest: OtaManifest, appVersion: string) => {
  if (!manifest.hotfix) return false;
  if (manifest.minAppVersion && compareVersion(appVersion, manifest.minAppVersion) < 0) {
    return false;
  }
  if (manifest.maxAppVersion && compareVersion(appVersion, manifest.maxAppVersion) > 0) {
    return false;
  }
  const app = parseVersion(appVersion);
  if (typeof manifest.targetMajor === 'number' && manifest.targetMajor !== app.major) {
    return false;
  }
  if (typeof manifest.targetMinor === 'number' && manifest.targetMinor !== app.minor) {
    return false;
  }
  return true;
};

let otaUiHandler: ((manifest: OtaManifest) => void) | null = null;

export const setOtaUiHandler = (handler: ((manifest: OtaManifest) => void) | null) => {
  otaUiHandler = handler;
};

export const savePendingManifest = async (manifest: OtaManifest) => {
  await AsyncStorage.setItem(OTA_PENDING_KEY, JSON.stringify(manifest));
};

export const installManifest = async (manifest: OtaManifest, source: 'user' | 'pending' = 'user') => {
  await OtaHotUpdate.downloadBundleUri(RNBlobUtil, manifest.url as string, manifest.otaVersion as number, {
    extensionBundle: '.bundle',
    restartAfterInstall: true,
    restartDelay: 500,
    metadata: {
      otaVersion: manifest.otaVersion,
      notes: manifest.notes || '',
      appliedAt: new Date().toISOString(),
      source,
    },
  });
};

const promptInstall = async (manifest: OtaManifest) => {
  if (otaPromptShown) return;
  otaPromptShown = true;
  Alert.alert(
    'Actualizacion disponible',
    'Hay una nueva actualizacion. Queres instalarla ahora?',
    [
      {
        text: 'Despues',
        style: 'cancel',
        onPress: async () => {
          try {
            await savePendingManifest(manifest);
          } catch {
            // ignore
          }
        },
      },
      {
        text: 'Instalar',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(OTA_PENDING_KEY);
            await installManifest(manifest, 'user');
          } catch (error) {
            if (__DEV__) {
              console.log('[OTA] install failed', error);
            }
          }
        },
      },
    ],
    { cancelable: true },
  );
};

const resolvePending = async (appVersion: string) => {
  try {
    const pendingRaw = await AsyncStorage.getItem(OTA_PENDING_KEY);
    if (!pendingRaw) return null;
    const pending = JSON.parse(pendingRaw) as OtaManifest;
    if (!pending?.url || typeof pending.otaVersion !== 'number') return null;
    if (!isCompatibleHotfix(pending, appVersion)) return null;
    return pending;
  } catch {
    return null;
  }
};

export const checkAndApplyHotfix = async () => {
  try {
    const appVersion = DeviceInfo.getVersion();
    if (__DEV__) {
      console.log('[OTA] check start', { appVersion });
    }
    const pending = await resolvePending(appVersion);
    if (pending) {
      await AsyncStorage.removeItem(OTA_PENDING_KEY);
      await installManifest(pending, 'pending');
      return;
    }
    const configSnap = await firestore().collection('config').doc('ota').get();
    const rawConfig = (configSnap.exists ? (configSnap.data() as OtaConfig & { manifesturl?: string }) : {}) || {};
    const manifestUrl =
      rawConfig.manifestUrl ||
      (rawConfig as any).manifesturl ||
      (rawConfig as any).manifestURL ||
      (rawConfig as any).manifest_url ||
      '';
    const config: OtaConfig = {
      ...rawConfig,
      manifestUrl: typeof manifestUrl === 'string' ? manifestUrl.trim() : '',
    };
    if (__DEV__) {
      console.log('[OTA] config', config);
    }
    if (!config.enabled || !config.manifestUrl) return;

    const response = await fetch(config.manifestUrl);
    if (!response.ok) return;
    const manifest = (await response.json()) as OtaManifest;
    if (__DEV__) {
      console.log('[OTA] manifest', manifest);
    }
    if (!manifest?.url || typeof manifest.otaVersion !== 'number') return;
    if (!isCompatibleHotfix(manifest, appVersion)) return;

    const currentOtaVersion = await OtaHotUpdate.getCurrentVersion();
    if (__DEV__) {
      console.log('[OTA] current', currentOtaVersion);
    }
    if (manifest.otaVersion <= currentOtaVersion) return;
    if (otaUiHandler) {
      otaUiHandler(manifest);
      return;
    }
    await promptInstall(manifest);
  } catch (error) {
    if (__DEV__) {
      console.log('OTA hotfix check failed', error);
    }
  }
};
const OTA_PENDING_KEY = 'ota_pending_manifest';
let otaPromptShown = false;
