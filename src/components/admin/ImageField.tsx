import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../../context/ThemeContext';
import { deleteImageByUrl, pickAndUploadImage } from '../../utils/uploadImage';

type ImageFieldProps = {
  value: string;
  onChange: (value: string) => void;
  uploadPath: string;
  placeholder?: string;
  label?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const ImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  uploadPath,
  placeholder = 'URL imagen',
  label,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 80,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const result = await pickAndUploadImage(uploadPath, { maxWidth, maxHeight, quality });
      if (result?.url) {
        onChange(result.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) {
      return;
    }
    setRemoving(true);
    try {
      await deleteImageByUrl(value);
      onChange('');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholderText}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
      />

      {!!value && (
        <Image source={{ uri: value }} style={[styles.preview, { borderColor: colors.border }]} />
      )}

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.border }]}
          onPress={handleUpload}
          disabled={uploading || removing}
        >
          {uploading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Icon name="image-plus" size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Subir imagen</Text>
            </>
          )}
        </TouchableOpacity>

        {!!value && (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={handleRemove}
            disabled={uploading || removing}
          >
            {removing ? (
              <ActivityIndicator color={colors.error || '#dc2626'} />
            ) : (
              <>
                <Icon name="trash-can-outline" size={18} color={colors.error || '#dc2626'} />
                <Text style={[styles.actionText, { color: colors.error || '#dc2626' }]}>
                  Eliminar
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ImageField;

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
  preview: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    borderWidth: 1,
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
