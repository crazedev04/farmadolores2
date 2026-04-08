import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardTypeOptions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GeoPoint, deleteField } from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAdminCollectionCrud } from '../../admin/useAdminCollectionCrud';
import AdminForm from './AdminForm';
import AdminList from './AdminList';
import ConfirmDialog from './ConfirmDialog';
import ImageField from './ImageField';
import GalleryField from './GalleryField';

type StringMap = Record<string, string>;

type AdminEntityBase = {
  id: string;
  [key: string]: unknown;
};

export type AdminEntityField = {
  key: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

type BuildPayloadParams = {
  form: StringMap;
  editing: boolean;
  GeoPointCtor: typeof GeoPoint;
  deleteFieldValue: ReturnType<typeof deleteField>;
};

type AdminEntityCrudScreenProps<TItem extends AdminEntityBase> = {
  screenTitle: string;
  singularLabel: string;
  searchPlaceholder: string;
  emptyText?: string;
  collectionName: string;
  orderByField?: string;
  targetType: string;
  fields: AdminEntityField[];
  initialForm: StringMap;
  imageFieldKey?: string;
  galleryFieldKey?: string;
  imageUploadPath?: string;
  galleryUploadPath?: string;
  mapDoc: (id: string, data: Record<string, unknown>) => TItem;
  mapItemToForm: (item: TItem) => StringMap;
  buildPayload: (params: BuildPayloadParams) => Record<string, unknown>;
  validate: (form: StringMap) => string | null;
  getItemTitle: (item: TItem) => string;
  getItemSubtitle?: (item: TItem) => string;
  searchKeys: string[];
  summaryFieldKey?: string;
};

const AdminEntityCrudScreen = <TItem extends AdminEntityBase>(
  props: AdminEntityCrudScreenProps<TItem>,
) => {
  const {
    screenTitle,
    singularLabel,
    searchPlaceholder,
    emptyText = 'No hay elementos para mostrar.',
    collectionName,
    orderByField = 'name',
    targetType,
    fields,
    initialForm,
    imageFieldKey = 'image',
    galleryFieldKey = 'gallery',
    imageUploadPath = '',
    galleryUploadPath = '',
    mapDoc,
    mapItemToForm,
    buildPayload,
    validate,
    getItemTitle,
    getItemSubtitle,
    searchKeys,
    summaryFieldKey = 'name',
  } = props;

  const { theme } = useTheme();
  const { colors } = theme;
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StringMap>(initialForm);
  const [pendingDelete, setPendingDelete] = useState<TItem | null>(null);

  const { items, loading, saving, saveItem, removeItem } = useAdminCollectionCrud<TItem>({
    collectionName,
    orderByField,
    mapDoc,
    targetType,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (value === null || value === undefined) {
          return false;
        }
        return String(value).toLowerCase().includes(term);
      }),
    );
  }, [items, search, searchKeys]);

  const setFieldValue = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSelect = (item: TItem) => {
    setEditingId(item.id);
    setForm(mapItemToForm(item));
  };

  const handleSubmit = async () => {
    const validationError = validate(form);
    if (validationError) {
      Alert.alert('Datos invalidos', validationError);
      return;
    }

    try {
      const payload = buildPayload({
        form,
        editing: !!editingId,
        GeoPointCtor: GeoPoint,
        deleteFieldValue: deleteField(),
      });
      const itemName = String(form[summaryFieldKey] || singularLabel).trim();
      await saveItem({
        id: editingId,
        payload,
        summary: `${editingId ? 'Actualiza' : 'Crea'} ${singularLabel}: ${itemName}`,
      });
      resetForm();
    } catch {
      Alert.alert(
        'Error',
        editingId
          ? `No se pudo actualizar ${singularLabel}.`
          : `No se pudo crear ${singularLabel}.`,
      );
    }
  };

  const requestDelete = (item: TItem) => setPendingDelete(item);

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    const selected = pendingDelete;
    setPendingDelete(null);
    try {
      await removeItem({
        id: selected.id,
        summary: `Elimina ${singularLabel}: ${getItemTitle(selected)}`,
      });
      if (editingId === selected.id) {
        resetForm();
      }
    } catch {
      Alert.alert('Error', `No se pudo eliminar ${singularLabel}.`);
    }
  };

  const imageValue = imageFieldKey ? (form[imageFieldKey] || '') : '';
  const galleryValue = galleryFieldKey ? (form[galleryFieldKey] || '') : '';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>{screenTitle}</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <AdminForm
        title={editingId ? `Editar ${singularLabel}` : `Agregar ${singularLabel}`}
        editing={!!editingId}
        saving={saving}
        onCancel={resetForm}
        onSubmit={handleSubmit}
      >
        {fields.map((field) => (
          <TextInput
            key={field.key}
            style={[
              styles.input,
              field.multiline ? styles.multiline : null,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={field.placeholder}
            placeholderTextColor={colors.placeholderText}
            value={form[field.key] || ''}
            onChangeText={(value) => setFieldValue(field.key, value)}
            multiline={field.multiline}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize || 'sentences'}
          />
        ))}

        {imageFieldKey && imageUploadPath ? (
          <ImageField
            value={imageValue}
            onChange={(value) => setFieldValue(imageFieldKey, value)}
            uploadPath={imageUploadPath}
          />
        ) : null}

        {galleryFieldKey && galleryUploadPath ? (
          <GalleryField
            value={galleryValue}
            onChange={(value) => setFieldValue(galleryFieldKey, value)}
            uploadPath={galleryUploadPath}
          />
        ) : null}
      </AdminForm>

      <Text style={[styles.listTitle, { color: colors.text }]}>Listado</Text>
      <AdminList loading={loading} empty={filtered.length === 0} emptyText={emptyText}>
        <View style={styles.list}>
          {filtered.map((item) => {
            const itemImage =
              imageFieldKey && typeof item[imageFieldKey] === 'string'
                ? (item[imageFieldKey] as string)
                : '';
            return (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.itemHead}>
                  {!!itemImage && (
                    <Image source={{ uri: itemImage }} style={[styles.itemImage, { borderColor: colors.border }]} />
                  )}
                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{getItemTitle(item)}</Text>
                    {!!getItemSubtitle?.(item) && (
                      <Text
                        numberOfLines={2}
                        style={[styles.itemSubtitle, { color: colors.mutedText || colors.placeholderText }]}
                      >
                        {getItemSubtitle(item)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => handleSelect(item)}
                  >
                    <Icon name="pencil-outline" size={18} color={colors.text} />
                    <Text style={[styles.actionText, { color: colors.text }]}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => requestDelete(item)}
                  >
                    <Icon name="trash-can-outline" size={18} color={colors.error || '#dc2626'} />
                    <Text style={[styles.actionText, { color: colors.error || '#dc2626' }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </AdminList>

      <ConfirmDialog
        visible={!!pendingDelete}
        title={`Eliminar ${singularLabel}`}
        message={
          pendingDelete ? `Se eliminara "${getItemTitle(pendingDelete)}". Esta accion no se puede deshacer.` : ''
        }
        confirmText="Eliminar"
        confirmDestructive
        loading={saving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </ScrollView>
  );
};

export default AdminEntityCrudScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 36,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
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
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  list: {
    gap: 10,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  itemHead: {
    flexDirection: 'row',
    gap: 10,
  },
  itemImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemTextWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
