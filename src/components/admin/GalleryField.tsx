import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../../context/ThemeContext';
import { deleteImageByUrl, pickAndUploadImage } from '../../utils/uploadImage';

type GalleryFieldProps = {
  value: string;
  onChange: (value: string) => void;
  uploadPath: string;
  placeholder?: string;
  label?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const toGalleryUrls = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const GalleryField: React.FC<GalleryFieldProps> = ({
  value,
  onChange,
  uploadPath,
  placeholder = 'Galeria (una URL por linea)',
  label,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 75,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const urls = useMemo(() => toGalleryUrls(value), [value]);

  const appendGalleryUrl = (url: string) => {
    if (!url) {
      return;
    }
    onChange(value ? `${value}\n${url}` : url);
  };

  const handleUploadSafe = async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadImage(uploadPath, { maxWidth, maxHeight, quality });
      if (result?.url) {
        appendGalleryUrl(result.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveOne = async (target: string) => {
    await deleteImageByUrl(target);
    onChange(urls.filter((entry) => entry !== target).join('\n'));
  };

  const handleClearAll = async () => {
    if (!urls.length) {
      return;
    }
    setClearing(true);
    try {
      await Promise.all(urls.map((url) => deleteImageByUrl(url)));
      onChange('');
    } finally {
      setClearing(false);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <TextInput
        style={[
          styles.input,
          styles.multiline,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholderText}
        value={value}
        onChangeText={onChange}
        multiline
      />

      {urls.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryRow}>
          {urls.map((url) => (
            <View key={url} style={styles.galleryItem}>
              <Image source={{ uri: url }} style={styles.galleryImage} />
              <TouchableOpacity
                style={[styles.galleryRemove, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => handleRemoveOne(url)}
              >
                <Icon name="close" size={14} color={colors.error || '#dc2626'} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.border }]}
          onPress={handleUploadSafe}
          disabled={uploading || clearing}
        >
          {uploading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Icon name="image-multiple" size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Agregar a galeria</Text>
            </>
          )}
        </TouchableOpacity>

        {urls.length > 0 ? (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={handleClearAll}
            disabled={uploading || clearing}
          >
            {clearing ? (
              <ActivityIndicator color={colors.error || '#dc2626'} />
            ) : (
              <>
                <Icon name="trash-can-outline" size={18} color={colors.error || '#dc2626'} />
                <Text style={[styles.actionText, { color: colors.error || '#dc2626' }]}>
                  Limpiar galeria
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export default GalleryField;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  galleryRow: {
    marginTop: 2,
  },
  galleryItem: {
    marginRight: 8,
    position: 'relative',
  },
  galleryImage: {
    width: 88,
    height: 88,
    borderRadius: 8,
  },
  galleryRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
