import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

type UploadResult = {
  url: string;
  name: string;
};

type UploadOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const getAsset = (response: ImagePickerResponse) => {
  const asset = response?.assets && response.assets.length > 0 ? response.assets[0] : undefined;
  if (!asset || !asset.uri) return null;
  return asset;
};

let cachedConfig: { ts: number; maxWidth: number; quality: number } | null = null;
const CONFIG_TTL_MS = 1000 * 60 * 5;

const getUploadConfig = async () => {
  if (cachedConfig && Date.now() - cachedConfig.ts < CONFIG_TTL_MS) {
    return cachedConfig;
  }
  let maxWidth = 1280;
  let quality = 80;
  try {
    const snap = await firestore().collection('config').doc('app').get();
    const data = snap.data() || {};
    if (typeof data.imageMaxWidth === 'number' && data.imageMaxWidth > 300) {
      maxWidth = Math.round(data.imageMaxWidth);
    }
    if (typeof data.imageQuality === 'number' && data.imageQuality >= 10 && data.imageQuality <= 100) {
      quality = Math.round(data.imageQuality);
    }
  } catch {
    // ignore config fetch errors
  }
  cachedConfig = { ts: Date.now(), maxWidth, quality };
  return cachedConfig;
};

export const pickAndUploadImage = async (
  pathPrefix: string,
  options: UploadOptions = {}
): Promise<UploadResult | null> => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.85,
  });

  if (result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'No se pudo seleccionar la imagen.');
  }

  const asset = getAsset(result);
  if (!asset || !asset.uri) {
    throw new Error('No se encontro la imagen seleccionada.');
  }

  const cfg = await getUploadConfig();
  const maxWidth = options.maxWidth ?? cfg.maxWidth ?? 1280;
  const maxHeight = options.maxHeight ?? maxWidth;
  const quality = options.quality ?? cfg.quality ?? 80;

  const baseName = (asset.fileName || `img_${Date.now()}`).replace(/\.[^/.]+$/, '');
  const resized = await ImageResizer.createResizedImage(
    asset.uri,
    maxWidth,
    maxHeight,
    'WEBP',
    quality
  );
  const fileName = `${baseName}.webp`;
  const ref = storage().ref(`${pathPrefix}/${Date.now()}_${fileName}`);
  await ref.putFile(resized.uri);
  const url = await ref.getDownloadURL();
  return { url, name: fileName };
};

export const deleteImageByUrl = async (url?: string) => {
  const trimmed = (url || '').trim();
  if (!trimmed) return;
  try {
    await storage().refFromURL(trimmed).delete();
  } catch {
    // ignore delete errors
  }
};
