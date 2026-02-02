import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
import { deleteImageByUrl, pickAndUploadImage } from '../utils/uploadImage';

type LocalItem = {
  id: string;
  name: string;
  descrip: string;
  image: string;
  direccion: string;
  tel: string;
  url: string;
  gallery?: string[];
};

const AdminLocalesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [items, setItems] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [name, setName] = useState('');
  const [descrip, setDescrip] = useState('');
  const [image, setImage] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tel, setTel] = useState('');
  const [url, setUrl] = useState('');
  const [galleryText, setGalleryText] = useState('');

  const galleryUrls = useMemo(
    () => galleryText.split('\n').map((line) => line.trim()).filter(Boolean),
    [galleryText]
  );

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('publi')
      .orderBy('name')
      .onSnapshot(
        (snapshot) => {
          const next = snapshot.docs.map((doc) => {
            const data = doc.data() as any;
            const telValue = Array.isArray(data.tel) ? data.tel.join(' / ') : (data.tel || '');
            return {
              id: doc.id,
              name: data.name || '',
              descrip: data.descrip || '',
              image: data.image || '',
              direccion: data.direccion || '',
              tel: telValue,
              url: data.url || '',
              gallery: Array.isArray(data.gallery)
                ? data.gallery.filter((url: any) => typeof url === 'string' && url.trim().length > 0)
                : [],
            } as LocalItem;
          });
          setItems(next);
          setLoading(false);
        },
        () => setLoading(false)
      );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.trim().toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      (item.descrip || '').toLowerCase().includes(term) ||
      (item.direccion || '').toLowerCase().includes(term)
    );
  }, [items, search]);

  const resetForm = () => {
    setName('');
    setDescrip('');
    setImage('');
    setDireccion('');
    setTel('');
    setUrl('');
    setGalleryText('');
    setEditingId(null);
  };

  const handleSelect = (item: LocalItem) => {
    setEditingId(item.id);
    setName(item.name || '');
    setDescrip(item.descrip || '');
    setImage(item.image || '');
    setDireccion(item.direccion || '');
    setTel(item.tel || '');
    setUrl(item.url || '');
    setGalleryText((item.gallery || []).join('\n'));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta nombre', 'Ingresa el nombre del negocio.');
      return;
    }
    setSaving(true);
    try {
      const galleryList = galleryText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const payload: any = {
        name: name.trim(),
        descrip: descrip.trim(),
        image: image.trim(),
        direccion: direccion.trim(),
        tel: tel.trim(),
        url: url.trim(),
      };
      if (galleryList.length > 0) {
        payload.gallery = galleryList;
      } else if (editingId) {
        payload.gallery = firestore.FieldValue.delete();
      }

      if (editingId) {
        await firestore().collection('publi').doc(editingId).update(payload);
      } else {
        await firestore().collection('publi').add(payload);
      }
      resetForm();
    } catch {
      Alert.alert('Error', editingId ? 'No se pudo actualizar el negocio.' : 'No se pudo agregar el negocio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: LocalItem) => {
    Alert.alert('Eliminar negocio', `Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('publi').doc(item.id).delete();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el negocio.');
          }
        },
      },
    ]);
  };

  const handleUploadImage = async () => {
    setUploadingImage(true);
    try {
      const result = await pickAndUploadImage('locales/main', {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 80,
      });
      if (result?.url) {
        setImage(result.url);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadGallery = async () => {
    setUploadingGallery(true);
    try {
      const result = await pickAndUploadImage('locales/gallery', {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 75,
      });
      if (result?.url) {
        setGalleryText((prev) => (prev ? `${prev}\n${result.url}` : result.url));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!image) return;
    await deleteImageByUrl(image);
    setImage('');
  };

  const handleClearGallery = async () => {
    if (!galleryText.trim()) return;
    const urls = galleryUrls;
    await Promise.all(urls.map((urlItem) => deleteImageByUrl(urlItem)));
    setGalleryText('');
  };

  const handleRemoveGalleryItem = async (urlItem: string) => {
    await deleteImageByUrl(urlItem);
    const next = galleryUrls.filter((item) => item !== urlItem);
    setGalleryText(next.join('\n'));
  };

  const renderHeader = () => (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Negocios y locales</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.formHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {editingId ? 'Editar negocio' : 'Agregar negocio'}
          </Text>
          {editingId && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={resetForm}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Nombre"
          placeholderTextColor={colors.placeholderText}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Descripcion"
          placeholderTextColor={colors.placeholderText}
          value={descrip}
          onChangeText={setDescrip}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="URL imagen"
          placeholderTextColor={colors.placeholderText}
          value={image}
          onChangeText={setImage}
          autoCapitalize="none"
        />
        {!!image && (
          <Image source={{ uri: image }} style={[styles.mainPreview, { borderColor: colors.border }]} />
        )}
        <TouchableOpacity
          style={[styles.uploadButton, { borderColor: colors.border }]}
          onPress={handleUploadImage}
          disabled={uploadingImage}
        >
          <Icon name="image-plus" size={18} color={colors.text} />
          <Text style={[styles.uploadText, { color: colors.text }]}>
            {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
          </Text>
        </TouchableOpacity>
        {!!image && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: colors.border }]}
            onPress={handleRemoveImage}
          >
            <Icon name="trash-can-outline" size={18} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar imagen</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Galeria (una URL por linea)"
          placeholderTextColor={colors.placeholderText}
          value={galleryText}
          onChangeText={setGalleryText}
          multiline
        />
        {galleryUrls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryRow}>
            {galleryUrls.map((urlItem) => (
              <View key={urlItem} style={styles.galleryItem}>
                <Image source={{ uri: urlItem }} style={styles.galleryImage} />
                <TouchableOpacity
                  style={[styles.galleryRemove, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleRemoveGalleryItem(urlItem)}
                >
                  <Icon name="close" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity
          style={[styles.uploadButton, { borderColor: colors.border }]}
          onPress={handleUploadGallery}
          disabled={uploadingGallery}
        >
          <Icon name="image-multiple" size={18} color={colors.text} />
          <Text style={[styles.uploadText, { color: colors.text }]}>
            {uploadingGallery ? 'Subiendo...' : 'Agregar a galeria'}
          </Text>
        </TouchableOpacity>
        {!!galleryText.trim() && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: colors.border }]}
            onPress={handleClearGallery}
          >
            <Icon name="trash-can-outline" size={18} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar galeria</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Direccion"
          placeholderTextColor={colors.placeholderText}
          value={direccion}
          onChangeText={setDireccion}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Telefono"
          placeholderTextColor={colors.placeholderText}
          value={tel}
          onChangeText={setTel}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="URL del sitio"
          placeholderTextColor={colors.placeholderText}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.buttonText || '#fff'} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.buttonText || '#fff' }]}>
              {editingId ? 'Guardar cambios' : 'Agregar negocio'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Buscar negocio</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej: Kiosco"
          placeholderTextColor={colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Toca un negocio para editarlo.
        </Text>
      </View>

      {filtered.length === 0 && !loading && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
          No hay negocios.
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      data={filtered}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleSelect(item)}
          style={[
            styles.itemCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            editingId === item.id && { borderColor: colors.buttonBackground },
          ]}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name || 'Sin nombre'}</Text>
              {!!item.direccion && (
                <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]}>
                  {item.direccion}
                </Text>
              )}
              {!!item.url && (
                <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]}>
                  {item.url}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Icon name="trash-can-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

export default AdminLocalesScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  galleryRow: {
    marginBottom: 12,
  },
  galleryItem: {
    marginRight: 10,
  },
  galleryImage: {
    width: 86,
    height: 86,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  galleryRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 999,
    borderWidth: 1,
    padding: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: '#0F172A',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
});
