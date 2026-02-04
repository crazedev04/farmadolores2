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
import {
  FirebaseFirestoreTypes,
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
  deleteField,
  GeoPoint,
} from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
import { deleteImageByUrl, pickAndUploadImage } from '../utils/uploadImage';
const db = getFirestore();

type FarmaciaItem = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  image: string;
  detail: string;
  gps?: FirebaseFirestoreTypes.GeoPoint;
  gallery?: string[];
};

const AdminFarmaciasScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [items, setItems] = useState<FarmaciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [dir, setDir] = useState('');
  const [tel, setTel] = useState('');
  const [image, setImage] = useState('');
  const [detail, setDetail] = useState('');
  const [galleryText, setGalleryText] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const galleryUrls = useMemo(
    () => galleryText.split('\n').map((line) => line.trim()).filter(Boolean),
    [galleryText]
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'farmacias'), orderBy('name')),
        (snapshot) => {
          const next = snapshot.docs.map((doc) => {
            const data = doc.data();
            const telValue = Array.isArray(data.tel) ? data.tel.join(' / ') : (data.tel || '');
            return {
              id: doc.id,
              name: data.name || '',
              dir: data.dir || '',
              tel: telValue,
              image: data.image || '',
              detail: data.detail || '',
              gallery: Array.isArray(data.gallery)
                ? data.gallery.filter((url: any) => typeof url === 'string' && url.trim().length > 0)
                : [],
              gps: data.gps,
            } as FarmaciaItem;
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
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [items, search]);

  const resetForm = () => {
    setName('');
    setDir('');
    setTel('');
    setImage('');
    setDetail('');
    setGalleryText('');
    setLat('');
    setLng('');
    setEditingId(null);
  };

  const handleSelect = (item: FarmaciaItem) => {
    setEditingId(item.id);
    setName(item.name || '');
    setDir(item.dir || '');
    setTel(item.tel || '');
    setImage(item.image || '');
    setDetail(item.detail || '');
    setGalleryText((item.gallery || []).join('\n'));
    setLat(item.gps?.latitude != null ? String(item.gps.latitude) : '');
    setLng(item.gps?.longitude != null ? String(item.gps.longitude) : '');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta nombre', 'Ingresa el nombre de la farmacia.');
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
        dir: dir.trim(),
        tel: tel.trim(),
        image: image.trim(),
        detail: detail.trim(),
      };
      if (galleryList.length > 0) {
        payload.gallery = galleryList;
      } else if (editingId) {
        payload.gallery = deleteField();
      }
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        payload.gps = new GeoPoint(latNum, lngNum);
      }
      if (editingId) {
        await updateDoc(doc(db, 'farmacias', editingId), payload);
      } else {
        await addDoc(collection(db, 'farmacias'), payload);
      }
      resetForm();
    } catch {
      Alert.alert('Error', editingId ? 'No se pudo actualizar la farmacia.' : 'No se pudo agregar la farmacia.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async () => {
    setUploadingImage(true);
    try {
      const result = await pickAndUploadImage('farmacias/main', {
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

  const handleRemoveImage = async () => {
    if (!image) return;
    await deleteImageByUrl(image);
    setImage('');
  };

  const handleClearGallery = async () => {
    if (!galleryText.trim()) return;
    const urls = galleryUrls;
    await Promise.all(urls.map((url) => deleteImageByUrl(url)));
    setGalleryText('');
  };

  const handleRemoveGalleryItem = async (url: string) => {
    await deleteImageByUrl(url);
    const next = galleryUrls.filter((item) => item !== url);
    setGalleryText(next.join('\n'));
  };

  const handleUploadGallery = async () => {
    setUploadingGallery(true);
    try {
      const result = await pickAndUploadImage('farmacias/gallery', {
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

  const handleDelete = (item: FarmaciaItem) => {
    Alert.alert('Eliminar farmacia', `Eliminar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'farmacias', item.id));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la farmacia.');
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Gestion de farmacias</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.formHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {editingId ? 'Editar farmacia' : 'Agregar farmacia'}
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
          placeholder="Direccion"
          placeholderTextColor={colors.placeholderText}
          value={dir}
          onChangeText={setDir}
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
            {galleryUrls.map((url) => (
              <View key={url} style={styles.galleryItem}>
                <Image source={{ uri: url }} style={styles.galleryImage} />
                <TouchableOpacity
                  style={[styles.galleryRemove, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleRemoveGalleryItem(url)}
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
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Detalle (opcional)"
          placeholderTextColor={colors.placeholderText}
          value={detail}
          onChangeText={setDetail}
          multiline
        />
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Lat"
            placeholderTextColor={colors.placeholderText}
            value={lat}
            onChangeText={setLat}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.inlineInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Lng"
            placeholderTextColor={colors.placeholderText}
            value={lng}
            onChangeText={setLng}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.buttonText || '#fff'} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.buttonText || '#fff' }]}>
              {editingId ? 'Guardar cambios' : 'Agregar farmacia'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Buscar farmacia</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej: Central"
          placeholderTextColor={colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}
        >
          Tocá una farmacia para editarla.
        </Text>
      </View>

      {filtered.length === 0 && !loading && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>No hay farmacias.</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
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
              {!!item.dir && <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]}>{item.dir}</Text>}
              {!!item.tel && <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]}>{item.tel}</Text>}
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

export default AdminFarmaciasScreen;

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
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineInput: {
    flex: 1,
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
