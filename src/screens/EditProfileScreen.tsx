import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import { deleteImageByUrl, pickAndUploadImage } from '../utils/uploadImage';
const db = getFirestore();
const authInstance = getAuth();

const EditProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { user, setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
      setPhotoUrl(user.photoURL || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado.');
      return;
    }

    setLoading(true);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        email: email,
        photoURL: photoUrl || '',
      });
      if (authInstance.currentUser) {
        await updateProfile(authInstance.currentUser, { displayName: name, photoURL: photoUrl || '' });
      }
      const refreshed = authInstance.currentUser;
      if (refreshed) {
        setUser(refreshed);
      }
      Alert.alert('Perfil actualizado', 'Los cambios se han guardado correctamente.');
    } catch (error) {
      console.error('Error updating profile: ', error);
      Alert.alert('Error', 'Hubo un problema al actualizar tu perfil. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const result = await pickAndUploadImage(`users/${user?.uid || 'anon'}/profile`, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 70,
      });
      if (result?.url) {
        setPhotoUrl(result.url);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl) return;
    await deleteImageByUrl(photoUrl);
    setPhotoUrl('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Editar perfil</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.photoRow}>
          <View style={[styles.photoWrap, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : (
              <Text style={[styles.photoPlaceholder, { color: colors.mutedText || colors.placeholderText }]}>
                Sin foto
              </Text>
            )}
          </View>
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleUploadPhoto}
              disabled={uploadingPhoto}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                {uploadingPhoto ? 'Subiendo...' : 'Subir foto'}
              </Text>
            </TouchableOpacity>
            {!!photoUrl && (
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: colors.border }]}
                onPress={handleRemovePhoto}
              >
                <Text style={[styles.dangerButtonText, { color: colors.error }]}>Eliminar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Nombre</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Nombre"
          placeholderTextColor={colors.placeholderText}
          value={name}
          onChangeText={setName}
        />
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.placeholderText}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  photoWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 12,
  },
  photoActions: {
    flex: 1,
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.9,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
});
