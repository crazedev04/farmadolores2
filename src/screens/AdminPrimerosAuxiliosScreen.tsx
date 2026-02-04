import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getFirestore,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  writeBatch,
} from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import RNFS from 'react-native-fs';
const db = getFirestore();
import { useTheme } from '../context/ThemeContext';

type GuideItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  enabled?: boolean;
  order?: number;
  icon?: string;
};

const ICON_CHOICES = [
  'heart-pulse',
  'bandage',
  'fire',
  'bone',
  'alert-circle-outline',
  'snake',
  'gesture',
  'face-man',
  'water',
  'flask',
  'emoticon-sick-outline',
  'brain',
  'beaker-outline',
  'eye-outline',
  'content-cut',
  'lungs',
  'allergy',
  'stairs',
  'cube-outline',
  'baby-face-outline',
];

const suggestIconFromText = (text: string) => {
  const value = text.toLowerCase();
  if (value.includes('rcp') || value.includes('corazon')) return 'heart-pulse';
  if (value.includes('quemadura')) return 'fire';
  if (value.includes('fractura') || value.includes('hueso')) return 'bone';
  if (value.includes('herida') || value.includes('corte') || value.includes('raspon')) return 'bandage';
  if (value.includes('intoxic') || value.includes('veneno') || value.includes('poison')) return 'flask';
  if (value.includes('convulsion') || value.includes('epile')) return 'brain';
  if (value.includes('ojo') || value.includes('ocular')) return 'eye-outline';
  if (value.includes('alerg')) return 'allergy';
  if (value.includes('respir') || value.includes('asma')) return 'lungs';
  if (value.includes('desmayo') || value.includes('desmay')) return 'face-man';
  if (value.includes('hemorrag')) return 'water';
  if (value.includes('mordedura') || value.includes('picadura')) return 'snake';
  if (value.includes('asfixia') || value.includes('ahogo')) return 'gesture';
  if (value.includes('quemadura quimica') || value.includes('quimic')) return 'beaker-outline';
  if (value.includes('nino') || value.includes('bebe')) return 'baby-face-outline';
  return 'alert-circle-outline';
};

const DEFAULT_GUIDES: Omit<GuideItem, 'id'>[] = [
  {
    title: 'RCP Basico',
    description: 'Aprende como realizar maniobras de RCP en caso de emergencia.',
    url: 'https://www.youtube.com/watch?v=dFSiqFTuQxU',
  },
  {
    title: 'Manejo de Heridas',
    description: 'Guia paso a paso sobre como tratar heridas y cortes.',
    url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/wounds-and-bleeding.html',
  },
  {
    title: 'Como Tratar Quemaduras',
    description: 'Instrucciones para tratar quemaduras de diferentes grados.',
    url: 'https://www.mayoclinic.org/first-aid/first-aid-burns/basics/art-20056649',
  },
  {
    title: 'Primeros Auxilios en Fracturas',
    description: 'Pasos para estabilizar fracturas y heridas oseas.',
    url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/fractures.html',
  },
  {
    title: 'Manejo de Shock',
    description: 'Como reconocer y tratar el shock en una emergencia.',
    url: 'https://www.mayoclinic.org/first-aid/first-aid-shock/basics/art-20056620',
  },
  {
    title: 'Mordeduras y Picaduras',
    description: 'Como tratar mordeduras y picaduras de insectos o animales.',
    url: 'https://www.cdc.gov/disasters/snakebite.html',
  },
  {
    title: 'Asfixia',
    description: 'Pasos a seguir para ayudar a una persona que se esta asfixiando.',
    url: 'https://www.nhs.uk/conditions/choking/',
  },
  {
    title: 'Primeros Auxilios para Desmayos',
    description: 'Que hacer cuando alguien se desmaya.',
    url: 'https://www.healthline.com/health/first-aid/fainting',
  },
  {
    title: 'Tratamiento de Hemorragias',
    description: 'Como detener y tratar hemorragias.',
    url: 'https://www.mayoclinic.org/first-aid/first-aid-bleeding/basics/art-20056661',
  },
  {
    title: 'Primeros Auxilios para Intoxicaciones',
    description: 'Acciones a seguir en caso de intoxicacion por sustancias toxicas.',
    url: 'https://www.webmd.com/first-aid/poisoning-treatment',
  },
  {
    title: 'Golpes y Contusiones',
    description: 'Como tratar golpes y contusiones para reducir el dolor.',
    url: 'https://www.webmd.com/first-aid/bruises-treatment',
  },
  {
    title: 'Convulsiones',
    description: 'Que hacer si alguien esta teniendo una convulsion.',
    url: 'https://www.epilepsy.com/learn/seizure-first-aid-and-safety',
  },
  {
    title: 'Quemaduras Quimicas',
    description: 'Instrucciones para tratar quemaduras causadas por productos quimicos.',
    url: 'https://www.healthline.com/health/chemical-burn',
  },
  {
    title: 'Lesiones Oculares',
    description: 'Como tratar lesiones en los ojos.',
    url: 'https://www.aao.org/eye-health/tips-prevention/injuries',
  },
  {
    title: 'Cortes y Raspones',
    description: 'Guia para el tratamiento de cortes y raspones superficiales.',
    url: 'https://www.healthline.com/health/first-aid/cuts-or-lacerations',
  },
  {
    title: 'Problemas Respiratorios',
    description: 'Que hacer en caso de dificultades respiratorias o ataques de asma.',
    url: 'https://www.webmd.com/asthma/guide/asthma-first-aid',
  },
  {
    title: 'Alergias Severas',
    description: 'Como reconocer y tratar reacciones alergicas graves.',
    url: 'https://www.healthline.com/health/allergies/anaphylaxis',
  },
  {
    title: 'Lesiones por Caidas',
    description: 'Que hacer si alguien se lesiona tras una caida.',
    url: 'https://www.nsc.org/community-safety/safety-topics/elderly-falls',
  },
  {
    title: 'Ingestion de Objetos',
    description: 'Como actuar si alguien ingiere objetos no comestibles.',
    url: 'https://www.mayoclinic.org/first-aid/first-aid-foreign-object/basics/art-20056656',
  },
  {
    title: 'Emergencias con Ninos',
    description: 'Guia especifica para manejar emergencias con ninos.',
    url: 'https://www.healthychildren.org/English/safety-prevention/at-home/Pages/Emergency-Situations.aspx',
  },
];

type HeaderProps = {
  colors: any;
  editingId: string | null;
  resetForm: () => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  order: string;
  setOrder: (value: string) => void;
  icon: string;
  setIcon: (value: string) => void;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  saving: boolean;
  handleSubmit: () => void;
  bulkLoading: boolean;
  handleLoadDefaults: () => void;
  filePath: string;
  setFilePath: (value: string) => void;
  importing: boolean;
  handleImportJson: () => void;
  search: string;
  setSearch: (value: string) => void;
  isEmpty: boolean;
  loading: boolean;
};

const AdminPrimerosAuxiliosHeader = React.memo((props: HeaderProps) => {
  const {
    colors,
    editingId,
    resetForm,
    title,
    setTitle,
    description,
    setDescription,
    url,
    setUrl,
    order,
    setOrder,
    icon,
    setIcon,
    enabled,
    setEnabled,
    saving,
    handleSubmit,
    bulkLoading,
    handleLoadDefaults,
    filePath,
    setFilePath,
    importing,
    handleImportJson,
    search,
    setSearch,
    isEmpty,
    loading,
  } = props;
  const suggestedIcon = suggestIconFromText(`${title} ${description}`);
  const [pathModalVisible, setPathModalVisible] = useState(false);
  const [pathDraft, setPathDraft] = useState(filePath);

  useEffect(() => {
    setPathDraft(filePath);
  }, [filePath]);

  return (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Primeros auxilios</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.formHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {editingId ? 'Editar guia' : 'Agregar guia'}
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
          placeholder="Titulo"
          placeholderTextColor={colors.placeholderText}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Descripcion"
          placeholderTextColor={colors.placeholderText}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="URL"
          placeholderTextColor={colors.placeholderText}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Orden (opcional)"
          placeholderTextColor={colors.placeholderText}
          value={order}
          onChangeText={setOrder}
          keyboardType="numeric"
        />
        <View style={styles.iconRow}>
          <View style={[styles.iconPreview, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Icon
              name={(icon || suggestedIcon) || 'alert-circle-outline'}
              size={20}
              color={colors.buttonBackground}
            />
          </View>
          <TextInput
            style={[styles.input, styles.iconInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Icono (opcional)"
            placeholderTextColor={colors.placeholderText}
            value={icon}
            onChangeText={setIcon}
            autoCapitalize="none"
          />
        </View>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Sugerencia: {suggestedIcon}. Toca un icono para elegirlo.
        </Text>
        <View style={styles.iconList}>
          {ICON_CHOICES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.iconChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                (icon || '').trim() === item && { borderColor: colors.buttonBackground },
              ]}
              onPress={() => setIcon(item)}
            >
              <Icon name={item} size={18} color={colors.text} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Habilitada</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={enabled ? colors.buttonText || '#fff' : colors.card}
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
              {editingId ? 'Guardar cambios' : 'Agregar guia'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Carga rapida</Text>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Carga el listado base de guias en Firestore (solo para primeros auxilios).
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={handleLoadDefaults}
          disabled={bulkLoading}
        >
          {bulkLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.text }]}>Cargar JSON por defecto</Text>
          )}
        </TouchableOpacity>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Ruta del archivo JSON (por defecto en Descargas):
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ruta del archivo"
          placeholderTextColor={colors.placeholderText}
          value={filePath}
          onChangeText={setFilePath}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus
        />
        <View style={styles.pathActions}>
          <TouchableOpacity
            style={[styles.pathButton, { borderColor: colors.border }]}
            onPress={() => setPathModalVisible(true)}
          >
            <Text style={[styles.pathButtonText, { color: colors.text }]}>Editar ruta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pathButton, { borderColor: colors.border }]}
            onPress={() => setFilePath(
              Platform.OS === 'android'
                ? `${RNFS.DownloadDirectoryPath}/guia.json`
                : `${RNFS.DocumentDirectoryPath}/guia.json`
            )}
          >
            <Text style={[styles.pathButtonText, { color: colors.text }]}>Restaurar</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={handleImportJson}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.text }]}>Importar JSON desde archivo</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={pathModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPathModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Editar ruta</Text>
            <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
              Ingresa la ruta completa del archivo JSON.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Ruta del archivo"
              placeholderTextColor={colors.placeholderText}
              value={pathDraft}
              onChangeText={setPathDraft}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.pathButton, { borderColor: colors.border }]}
                onPress={() => setPathModalVisible(false)}
              >
                <Text style={[styles.pathButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pathButton, { borderColor: colors.border }]}
                onPress={() => {
                  setFilePath(pathDraft);
                  setPathModalVisible(false);
                }}
              >
                <Text style={[styles.pathButtonText, { color: colors.text }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Buscar guia</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej: RCP"
          placeholderTextColor={colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isEmpty && !loading && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
          No hay guias.
        </Text>
      )}
    </View>
  );
});

const AdminPrimerosAuxiliosScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [items, setItems] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [order, setOrder] = useState('');
  const [icon, setIcon] = useState('');
  const [filePath, setFilePath] = useState(
    Platform.OS === 'android'
      ? `${RNFS.DownloadDirectoryPath}/guia.json`
      : `${RNFS.DocumentDirectoryPath}/guia.json`
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'primerosAuxilios'),
        (snapshot) => {
          const next = snapshot.docs.map((doc) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              title: data.title || '',
              description: data.description || '',
              url: data.url || '',
              enabled: data.enabled !== false,
              order: typeof data.order === 'number' ? data.order : undefined,
              icon: typeof data.icon === 'string' ? data.icon : '',
            } as GuideItem;
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
      item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    );
  }, [items, search]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setEnabled(true);
    setOrder('');
    setIcon('');
    setEditingId(null);
  };

  const handleSelect = (item: GuideItem) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setUrl(item.url || '');
    setEnabled(item.enabled !== false);
    setOrder(item.order != null ? String(item.order) : '');
    setIcon(item.icon || '');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Falta titulo', 'Ingresa el titulo de la guia.');
      return;
    }
    if (!url.trim()) {
      Alert.alert('Falta URL', 'Ingresa el enlace de la guia.');
      return;
    }
    setSaving(true);
    try {
      const orderValue = Number(order);
      const suggestedIcon = suggestIconFromText(`${title} ${description}`);
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        enabled,
      };
      if (Number.isFinite(orderValue)) {
        payload.order = orderValue;
      }
      payload.icon = (icon || suggestedIcon).trim();

      if (editingId) {
        await updateDoc(doc(db, 'primerosAuxilios', editingId), payload);
      } else {
        await addDoc(collection(db, 'primerosAuxilios'), payload);
      }
      resetForm();
    } catch {
      Alert.alert('Error', editingId ? 'No se pudo actualizar la guia.' : 'No se pudo agregar la guia.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: GuideItem) => {
    Alert.alert('Eliminar guia', `Eliminar "${item.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'primerosAuxilios', item.id));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la guia.');
          }
        },
      },
    ]);
  };

  const handleLoadDefaults = () => {
    Alert.alert('Cargar guias', 'Se cargaran las guias por defecto en Firestore.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cargar',
        onPress: async () => {
          setBulkLoading(true);
          try {
            const tasks = DEFAULT_GUIDES.map((item, index) => {
              const id = `guia-${index + 1}`;
              return setDoc(doc(db, 'primerosAuxilios', id), {
                  title: item.title,
                  description: item.description,
                  url: item.url,
                  enabled: true,
                  order: index + 1,
                });
            });
            await Promise.all(tasks);
          } catch {
            Alert.alert('Error', 'No se pudieron cargar las guias.');
          } finally {
            setBulkLoading(false);
          }
        },
      },
    ]);
  };

  const normalizeGuides = (raw: any[]) => {
    return raw
      .map((item, index) => {
        const title = typeof item?.title === 'string' ? item.title.trim() : '';
        const url = typeof item?.url === 'string' ? item.url.trim() : '';
        if (!title || !url) return null;

        const description = typeof item?.description === 'string' ? item.description.trim() : '';
        const enabled = typeof item?.enabled === 'boolean' ? item.enabled : true;
        const orderValue = typeof item?.order === 'number' && Number.isFinite(item.order)
          ? item.order
          : index + 1;
        const iconValue = typeof item?.icon === 'string' && item.icon.trim()
          ? item.icon.trim()
          : suggestIconFromText(`${title} ${description}`);

        return {
          title,
          description,
          url,
          enabled,
          order: orderValue,
          icon: iconValue,
        } as GuideItem;
      })
      .filter(Boolean) as GuideItem[];
  };

  const clearCollection = async () => {
    const snapshot = await getDocs(collection(db, 'primerosAuxilios'));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  };

  const saveGuides = async (guidesToSave: GuideItem[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      await clearCollection();
    }
    const batch = writeBatch(db);
    guidesToSave.forEach((item) => {
      const docRef = doc(collection(db, 'primerosAuxilios'));
      batch.set(docRef, {
        title: item.title,
        description: item.description || '',
        url: item.url,
        enabled: item.enabled !== false,
        order: item.order,
        icon: item.icon || suggestIconFromText(`${item.title} ${item.description || ''}`),
      });
    });
    await batch.commit();
  };

  const handleImportJson = async () => {
    try {
      setImporting(true);
      const rawPath = filePath.trim();
      if (!rawPath) {
        Alert.alert('Ruta vacia', 'Ingresa la ruta del archivo JSON.');
        return;
      }

      const path = rawPath.startsWith('file://') ? rawPath.replace('file://', '') : rawPath;
      const exists = await RNFS.exists(path);
      if (!exists) {
        Alert.alert(
          'Archivo no encontrado',
          'No se encontro el archivo. Asegurate de copiar guia.json a Descargas.'
        );
        return;
      }

      const content = await RNFS.readFile(path, 'utf8');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        Alert.alert('Formato invalido', 'El JSON debe ser un array de guias.');
        return;
      }

      const normalized = normalizeGuides(parsed);
      if (normalized.length === 0) {
        Alert.alert('JSON vacio', 'No se encontraron guias validas.');
        return;
      }

      Alert.alert(
        'Importar JSON',
        `Se encontraron ${normalized.length} guias. Como queres cargarlo?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Agregar',
            onPress: async () => {
              try {
                await saveGuides(normalized, 'append');
                Alert.alert('Listo', 'Guias importadas correctamente.');
              } catch {
                Alert.alert('Error', 'No se pudo importar el JSON.');
              }
            },
          },
          {
            text: 'Reemplazar',
            style: 'destructive',
            onPress: async () => {
              try {
                await saveGuides(normalized, 'replace');
                Alert.alert('Listo', 'Guias importadas correctamente.');
              } catch {
                Alert.alert('Error', 'No se pudo importar el JSON.');
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'No se pudo leer el archivo JSON.');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
    >
      <AdminPrimerosAuxiliosHeader
        colors={colors}
        editingId={editingId}
        resetForm={resetForm}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        url={url}
        setUrl={setUrl}
        order={order}
        setOrder={setOrder}
        icon={icon}
        setIcon={setIcon}
        enabled={enabled}
        setEnabled={setEnabled}
        saving={saving}
        handleSubmit={handleSubmit}
        bulkLoading={bulkLoading}
        handleLoadDefaults={handleLoadDefaults}
        filePath={filePath}
        setFilePath={setFilePath}
        importing={importing}
        handleImportJson={handleImportJson}
        search={search}
        setSearch={setSearch}
        isEmpty={filtered.length === 0}
        loading={loading}
      />
      {filtered.map((item) => (
        <TouchableOpacity
          key={item.id}
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
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title || 'Sin titulo'}</Text>
              {!!item.description && (
                <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              {!!item.url && (
                <Text style={[styles.itemMeta, { color: colors.mutedText || colors.placeholderText }]} numberOfLines={1}>
                  {item.url}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Icon name="trash-can-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default AdminPrimerosAuxiliosScreen;

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
    marginBottom: 10,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconPreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInput: {
    flex: 1,
    marginBottom: 0,
  },
  iconList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pathButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pathButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    marginTop: 10,
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
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
});
