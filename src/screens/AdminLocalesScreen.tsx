import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';

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

  const [name, setName] = useState('');
  const [descrip, setDescrip] = useState('');
  const [image, setImage] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tel, setTel] = useState('');
  const [url, setUrl] = useState('');
  const [galleryText, setGalleryText] = useState('');

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

  const renderHeader = () => (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Negocios y locales</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.formHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}
          >
            {editingId ? 'Editar negocio' : 'Agregar negocio'}
          </Text>
          {editingId && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={resetForm}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}
              >
                Cancelar
              </Text>
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
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Galeria (una URL por linea)"
          placeholderTextColor={colors.placeholderText}
          value={galleryText}
          onChangeText={setGalleryText}
          multiline
        />
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
            <Text style={[styles.saveButtonText, { color: colors.buttonText || '#fff' }]}
            >
              {editingId ? 'Guardar cambios' : 'Agregar negocio'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Buscar negocio</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej: Kiosco"
          placeholderTextColor={colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}
        >
          Toca un negocio para editarlo.
        </Text>
      </View>

      {filtered.length === 0 && !loading && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}
        >
          No hay negocios.
        </Text>
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
              {!!item.direccion && (
                <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]}>
                  {item.direccion}
                </Text>
              )}
              {!!item.url && (
                <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]}
                >
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
