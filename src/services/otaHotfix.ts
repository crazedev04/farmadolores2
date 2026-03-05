import OtaHotUpdate from 'react-native-ota-hot-update';
import { Alert, AppState } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';

type GitOtaConfig = {
  enabled?: boolean;
  url: string;
  branch?: string;
  bundlePath: string;
  folderName?: string;
  restartAfterInstall?: boolean;
  notes?: string | string[];
};

export type OtaManifest = {
  source: 'git';
  notes?: string | string[];
  detectedAt?: string;
};

// TODO: Completa con tu repo y ruta del bundle.
const GIT_OTA_CONFIG: GitOtaConfig = {
  enabled: true,
  url: 'https://github.com/crazedev04/farmadolores.git',
  branch: 'main',
  bundlePath: 'ota/android/main.jsbundle',
  folderName: 'git_hot_update_v2',
  restartAfterInstall: false,
  notes: undefined,
};

// Activa alerts de diagnostico en release mientras probas.
const SHOW_OTA_ALERTS = __DEV__;
const db = getFirestore();
const OTA_FLAG_TTL_MS = 1000 * 60;
let otaRemoteFlagCache: { value: boolean; ts: number } = {
  value: true,
  ts: 0,
};

let otaUiHandler: ((manifest: OtaManifest) => void) | null = null;
let otaPromptShown = false;
let otaRetryAttempted = false;
const OTA_LAST_SIG_KEY = 'ota_git_last_sig';
const OTA_PENDING_NOTICE_KEY = 'ota_git_pending_notice';
const OTA_MIN_CHECK_INTERVAL_MS = 1000 * 60 * 5; // 5 min
const OTA_DEFAULT_TIMEOUT_MS = 1000 * 45; // 45s
let otaCheckInFlight: Promise<void> | null = null;
let otaLastCheckAt = 0;

const buildManifest = (): OtaManifest => ({
  source: 'git',
  notes: GIT_OTA_CONFIG.notes,
  detectedAt: new Date().toISOString(),
});

const showAlert = (title: string, message: string) => {
  if (!SHOW_OTA_ALERTS) return;
  Alert.alert(title, message);
};

const isRemoteOtaEnabled = async () => {
  if (Date.now() - otaRemoteFlagCache.ts < OTA_FLAG_TTL_MS) {
    return otaRemoteFlagCache.value;
  }
  let enabled = true;
  try {
    const snap = await getDoc(doc(db, 'config', 'app'));
    const data = snap.data() || {};
    if (typeof data.otaGitEnabled === 'boolean') {
      enabled = data.otaGitEnabled;
    } else if (typeof data.otaEnabled === 'boolean') {
      enabled = data.otaEnabled;
    }
  } catch {
    // default enabled
  }
  otaRemoteFlagCache = { value: enabled, ts: Date.now() };
  return enabled;
};

const normalizeFolderName = (folderName?: string) => {
  if (!folderName) return '/git_hot_update';
  return folderName.startsWith('/') ? folderName : `/${folderName}`;
};

const getRepoPathCandidates = () => {
  const raw = GIT_OTA_CONFIG.folderName || 'git_hot_update';
  const withSlash = normalizeFolderName(raw);
  const withoutSlash = raw.startsWith('/') ? raw.slice(1) : raw;
  const base = RNFS.DocumentDirectoryPath;
  const candidates = [
    `${base}${withSlash}`,
    withoutSlash ? `${base}${withoutSlash}` : undefined,
  ].filter(Boolean) as string[];
  return Array.from(new Set(candidates));
};

const getRepoPath = () => getRepoPathCandidates()[0];

const getBundleFilePath = () => {
  const repoPath = getRepoPath();
  const bundle = GIT_OTA_CONFIG.bundlePath.replace(/^\/+/, '');
  return `${repoPath}/${bundle}`;
};

const getBundleSignature = async () => {
  try {
    const path = getBundleFilePath();
    const exists = await RNFS.exists(path);
    if (!exists) return null;
    const stat = await RNFS.stat(path);
    const rawMtime = (stat as { mtime?: unknown }).mtime;
    const mtime =
      typeof rawMtime === 'number'
        ? String(rawMtime)
        : rawMtime instanceof Date
          ? rawMtime.toISOString()
          : rawMtime
            ? String(rawMtime)
            : '';
    return `${stat.size}:${mtime}`;
  } catch {
    return null;
  }
};

const shouldNotifyUpdate = async () => {
  const signature = await getBundleSignature();
  if (!signature) return true;
  const last = await AsyncStorage.getItem(OTA_LAST_SIG_KEY);
  if (last === signature) return false;
  await AsyncStorage.setItem(OTA_LAST_SIG_KEY, signature);
  return true;
};

const cleanLocalRepo = async () => {
  try {
    const paths = getRepoPathCandidates();
    for (const path of paths) {
      const exists = await RNFS.exists(path);
      if (exists) {
        console.log('[OTA] cleaning local repo', path);
        await RNFS.unlink(path);
      }
    }
  } catch (error) {
    if (__DEV__) console.log('[OTA] clean repo failed', error);
  }
};

const ensureRepoHealthy = async () => {
  try {
    const repoPath = getRepoPath();
    const exists = await RNFS.exists(repoPath);
    if (!exists) return;
    const headPath = `${repoPath}/.git/HEAD`;
    const headExists = await RNFS.exists(headPath);
    if (!headExists) {
      console.log('[OTA] repo missing HEAD, cleaning', repoPath);
      await cleanLocalRepo();
    }
  } catch (error) {
    if (__DEV__) console.log('[OTA] repo health check failed', error);
  }
};

const ensureGitConfig = async (folderName: string) => {
  try {
    if (!OtaHotUpdate.git?.setConfig) return;
    await OtaHotUpdate.git.setConfig(folderName, {
      userName: 'user.name',
      email: 'hotupdate',
    });
    await OtaHotUpdate.git.setConfig(folderName, {
      userName: 'user.email',
      email: 'hotupdate@example.com',
    });
  } catch (error) {
    if (__DEV__) console.log('[OTA] setConfig failed', error);
  }
};

const shouldRetryForMsg = (msg: string) => {
  const text = msg.toLowerCase();
  return (
    text.includes('checkoutconflicterror') ||
    text.includes('would be overwritten by checkout') ||
    text.includes('local changes') ||
    text.includes('could not find head') ||
    text.includes('notfounderror') ||
    text.includes('missingnameerror') ||
    text.includes('no name was provided for author') ||
    text.includes('no email was provided for author')
  );
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`OTA timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const setOtaUiHandler = (handler: ((manifest: OtaManifest) => void) | null) => {
  otaUiHandler = handler;
};

const queuePendingNotice = async (manifest: OtaManifest) => {
  try {
    await AsyncStorage.setItem(OTA_PENDING_NOTICE_KEY, JSON.stringify(manifest));
  } catch {
    // ignore
  }
};

export const consumePendingOtaNotice = async (): Promise<OtaManifest | null> => {
  try {
    const raw = await AsyncStorage.getItem(OTA_PENDING_NOTICE_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(OTA_PENDING_NOTICE_KEY);
    return JSON.parse(raw) as OtaManifest;
  } catch {
    return null;
  }
};

const promptNotify = async (_manifest: OtaManifest) => {
  if (otaPromptShown) return;
  otaPromptShown = true;
  Alert.alert(
    'Actualizacion disponible',
    'Hay cambios listos. Se aplicaran al reiniciar la app.',
    [
      {
        text: 'Entendido',
        style: 'default',
        onPress: () => {},
      },
    ],
    { cancelable: true },
  );
};

type OtaCheckOptions = {
  notify?: boolean;
  timeoutMs?: number;
  force?: boolean;
  skipIfForeground?: boolean;
};

const runSafeHotfixCheck = async (options?: OtaCheckOptions) => {
  try {
    if (!GIT_OTA_CONFIG.enabled) return;
    const notifyUi = options?.notify !== false;
    const skipIfForeground = options?.skipIfForeground ?? true;
    const shouldSkipForForeground = !notifyUi && skipIfForeground && AppState.currentState === 'active';
    if (shouldSkipForForeground) {
      if (__DEV__) {
        console.log('[OTA] skipped while app is active');
      }
      return;
    }

    const remoteEnabled = await isRemoteOtaEnabled();
    if (!remoteEnabled) {
      if (__DEV__) console.log('[OTA] disabled by remote config');
      return;
    }
    if (!GIT_OTA_CONFIG.url || !GIT_OTA_CONFIG.bundlePath) return;

    otaRetryAttempted = false;
    console.log('[OTA] check start', notifyUi ? 'notify' : 'silent');

    const runGitUpdate = async () => {
      try {
        await ensureRepoHealthy();
        const folderName = normalizeFolderName(GIT_OTA_CONFIG.folderName);
        let config: string | null = null;
        let branch: string | null = null;
        try {
          [config, branch] = await Promise.all([
            OtaHotUpdate.git.getConfig(folderName),
            OtaHotUpdate.git.getBranchName(folderName),
          ]);
        } catch (error) {
          if (__DEV__) console.log('[OTA] read config failed', error);
        }

        if (branch && config) {
          await ensureGitConfig(folderName);
          const pull = await OtaHotUpdate.git.pullUpdate({
            branch,
            folderName,
          });
          if (pull.success) {
            console.log('[OTA] update downloaded (pull)');
            if (GIT_OTA_CONFIG.restartAfterInstall) {
              setTimeout(() => OtaHotUpdate.resetApp(), 300);
              return;
            }
            const shouldNotify = await shouldNotifyUpdate();
            if (!shouldNotify) return;
            const manifest = buildManifest();
            if (!notifyUi) {
              await queuePendingNotice(manifest);
              return;
            }
            if (otaUiHandler) {
              otaUiHandler(manifest);
              return;
            }
            await promptNotify(manifest);
          } else {
            const message = String(pull.msg || 'Pull failed');
            if (!otaRetryAttempted && shouldRetryForMsg(message)) {
              otaRetryAttempted = true;
              await cleanLocalRepo();
              await runGitUpdate();
              return;
            }
            console.log('[OTA] git pull failed', message);
            if (notifyUi) {
              showAlert('OTA Git error (pull)', message);
            }
          }
        } else {
          const clone = await OtaHotUpdate.git.cloneRepo({
            folderName,
            url: GIT_OTA_CONFIG.url,
            branch: GIT_OTA_CONFIG.branch,
            bundlePath: GIT_OTA_CONFIG.bundlePath,
          });
          if (clone.success && clone.bundle) {
            await OtaHotUpdate.setupExactBundlePath(clone.bundle);
            await ensureGitConfig(folderName);
            console.log('[OTA] update downloaded (clone)');
            if (GIT_OTA_CONFIG.restartAfterInstall) {
              setTimeout(() => OtaHotUpdate.resetApp(), 300);
              return;
            }
            const shouldNotify = await shouldNotifyUpdate();
            if (!shouldNotify) return;
            const manifest = buildManifest();
            if (!notifyUi) {
              await queuePendingNotice(manifest);
              return;
            }
            if (otaUiHandler) {
              otaUiHandler(manifest);
              return;
            }
            await promptNotify(manifest);
          } else {
            const message = String(clone.msg || 'Clone failed');
            if (!otaRetryAttempted && shouldRetryForMsg(message)) {
              otaRetryAttempted = true;
              await cleanLocalRepo();
              await runGitUpdate();
              return;
            }
            console.log('[OTA] git clone failed', message);
            if (notifyUi) {
              showAlert('OTA Git error (clone)', message);
            }
          }
        }
      } catch (err) {
        const message = String(err);
        if (!otaRetryAttempted && shouldRetryForMsg(message)) {
          otaRetryAttempted = true;
          await cleanLocalRepo();
          await runGitUpdate();
          return;
        }
        console.log('[OTA] git check failed', message);
        if (notifyUi) {
          showAlert('OTA Git error', message);
        }
        if (__DEV__) console.log('[OTA] git check failed', err);
      }
    };

    const timeoutMs = options?.timeoutMs ?? OTA_DEFAULT_TIMEOUT_MS;
    await withTimeout(runGitUpdate(), timeoutMs);
    console.log('[OTA] check finish');
  } catch (error) {
    showAlert('OTA Git error', String(error));
    if (__DEV__) {
      console.log('OTA git check failed', error);
    }
  }
};

export const checkAndApplyHotfix = async (options?: OtaCheckOptions) => {
  const now = Date.now();
  if (!options?.force && now - otaLastCheckAt < OTA_MIN_CHECK_INTERVAL_MS) {
    if (__DEV__) {
      console.log('[OTA] throttled by interval');
    }
    return;
  }

  if (otaCheckInFlight) {
    if (__DEV__) {
      console.log('[OTA] check already in progress');
    }
    return otaCheckInFlight;
  }

  otaCheckInFlight = (async () => {
    try {
      await runSafeHotfixCheck(options);
    } finally {
      otaLastCheckAt = Date.now();
      otaCheckInFlight = null;
    }
  })();

  return otaCheckInFlight;
};
