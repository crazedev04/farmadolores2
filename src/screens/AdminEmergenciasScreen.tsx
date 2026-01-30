import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BADGE_TEXT = 'Guardia 24hs';
const DEFAULT_BADGE_ICON = 'alert-decagram';
const BADGE_TYPES = ['urgencias', 'alerta', 'info'] as const;
type BadgeType = typeof BADGE_TYPES[number];
const BADGE_LABELS: Record<BadgeType, string> = {
  urgencias: 'Urgencias',
  alerta: 'Alerta',
  info: 'Info',
};

type EmergencyItem = {
  id: string;
  name: string;
  badge: {
    enabled: boolean;
    text: string;
    type: BadgeType;
    icon: string;
  };
};

const AdminEmergenciasScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [items, setItems] = useState<EmergencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkBadge, setBulkBadge] = useState({
    text: DEFAULT_BADGE_TEXT,
    type: 'urgencias' as BadgeType,
    icon: '',
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  const getTypeColor = (type: BadgeType) => {
    switch (type) {
      case 'alerta':
        return colors.warning || '#f59e0b';
      case 'info':
        return colors.buttonBackground || colors.primary || '#3b82f6';
      default:
        return colors.error || '#ef4444';
    }
  };

  const getTypeIcon = (type: BadgeType) => {
    switch (type) {
      case 'alerta':
        return 'alert-outline';
      case 'info':
        return 'information-outline';
      default:
        return DEFAULT_BADGE_ICON;
    }
  };

  useEffect(() => {
    const unsub = firestore()
      .collection('emergencias')
      .onSnapshot(
        (snapshot) => {
          const next = snapshot.docs.map((doc) => {
            const data = doc.data();
            const fallbackBadge = data.guardiaEnabled
              ? { enabled: true, text: DEFAULT_BADGE_TEXT, type: 'urgencias', icon: DEFAULT_BADGE_ICON }
              : { enabled: false, text: DEFAULT_BADGE_TEXT, type: 'urgencias', icon: DEFAULT_BADGE_ICON };
            const badge = data.badge || fallbackBadge;
            const rawType = badge?.type;
            const normalizedType: BadgeType = BADGE_TYPES.includes(rawType) ? rawType : 'urgencias';
            return {
              id: doc.id,
              name: data.name || 'Emergencia',
              badge: {
                enabled: badge?.enabled !== false,
                text: badge?.text || DEFAULT_BADGE_TEXT,
                type: normalizedType,
                icon: badge?.icon || '',
              },
            } as EmergencyItem;
          });
          setItems(next);
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

    return () => unsub();
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.trim().toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [items, search]);

  const updateItem = (id: string, patch: Partial<EmergencyItem['badge']>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, badge: { ...item.badge, ...patch } } : item)));
  };

  const handleSave = async (item: EmergencyItem) => {
    setSavingId(item.id);
    try {
      const resolvedText = item.badge.text.trim() || DEFAULT_BADGE_TEXT;
      const resolvedIcon = item.badge.icon.trim();
      await firestore().collection('emergencias').doc(item.id).update({
        badge: {
          enabled: item.badge.enabled,
          text: resolvedText,
          type: item.badge.type,
          icon: resolvedIcon,
        },
        guardiaEnabled: item.badge.enabled,
      });
    } catch {
      Alert.alert('Error', 'No se pudo guardar el badge.');
    } finally {
      setSavingId(null);
    }
  };

  const handleActivateAll = () => {
    if (!items.length) {
      Alert.alert('Sin emergencias', 'No hay emergencias para actualizar.');
      return;
    }
    Alert.alert('Activar en todas', 'Se habilitara el badge en todas las emergencias.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Activar',
        style: 'destructive',
        onPress: async () => {
          setBulkSaving(true);
          try {
            const resolvedText = bulkBadge.text.trim() || DEFAULT_BADGE_TEXT;
            const resolvedIcon = bulkBadge.icon.trim();
            const batch = firestore().batch();
            items.forEach((item) => {
              const ref = firestore().collection('emergencias').doc(item.id);
              batch.update(ref, {
                badge: {
                  enabled: true,
                  text: resolvedText,
                  type: bulkBadge.type,
                  icon: resolvedIcon,
                },
                guardiaEnabled: true,
              });
            });
            await batch.commit();
            setItems((prev) =>
              prev.map((item) => ({
                ...item,
                badge: {
                  ...item.badge,
                  enabled: true,
                  text: resolvedText,
                  type: bulkBadge.type,
                  icon: resolvedIcon,
                },
              }))
            );
          } catch {
            Alert.alert('Error', 'No se pudieron actualizar todas las emergencias.');
          } finally {
            setBulkSaving(false);
          }
        },
      },
    ]);
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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Badges de emergencias</Text>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Buscar emergencia</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej: Hospital"
          placeholderTextColor={colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones masivas</Text>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Aplica el mismo badge a todas las emergencias.
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>Texto del badge</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder={DEFAULT_BADGE_TEXT}
          placeholderTextColor={colors.placeholderText}
          value={bulkBadge.text}
          onChangeText={(value) => setBulkBadge((prev) => ({ ...prev, text: value }))}
        />
        <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
        <View style={styles.chipRow}>
          {BADGE_TYPES.map((option) => {
            const active = bulkBadge.type === option;
            const typeColor = getTypeColor(option);
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? typeColor : colors.border,
                    backgroundColor: active ? typeColor : colors.card,
                  },
                ]}
                onPress={() => setBulkBadge((prev) => ({ ...prev, type: option }))}
              >
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>
                  {BADGE_LABELS[option]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Icono (Material)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder={DEFAULT_BADGE_ICON}
          placeholderTextColor={colors.placeholderText}
          value={bulkBadge.icon}
          onChangeText={(value) => setBulkBadge((prev) => ({ ...prev, icon: value }))}
          autoCapitalize="none"
        />
        <View style={[styles.badgePreview, { backgroundColor: getTypeColor(bulkBadge.type) }]}>
          {!!(bulkBadge.icon || getTypeIcon(bulkBadge.type)) && (
            <Icon name={(bulkBadge.icon || getTypeIcon(bulkBadge.type)).trim()} size={14} color="#fff" />
          )}
          <Text style={styles.badgePreviewText}>{(bulkBadge.text.trim() || DEFAULT_BADGE_TEXT)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleActivateAll}
          disabled={bulkSaving}
        >
          {bulkSaving ? (
            <ActivityIndicator color={colors.buttonText || '#fff'} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.buttonText || '#fff' }]}>Activar en todas</Text>
          )}
        </TouchableOpacity>
      </View>

      {filteredItems.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>No hay resultados.</Text>
      )}

      {filteredItems.map((item) => {
        const previewText = item.badge.text.trim() || DEFAULT_BADGE_TEXT;
        const previewIcon = item.badge.icon.trim() || getTypeIcon(item.badge.type);
        const previewColor = getTypeColor(item.badge.type);
        return (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: colors.text }]}>Badge</Text>
                <Switch
                  value={item.badge.enabled}
                  onValueChange={(value) => updateItem(item.id, { enabled: value })}
                  trackColor={{ false: colors.border, true: colors.buttonBackground }}
                  thumbColor={item.badge.enabled ? colors.buttonText || '#fff' : colors.card}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Texto del badge</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder={DEFAULT_BADGE_TEXT}
              placeholderTextColor={colors.placeholderText}
              value={item.badge.text}
              onChangeText={(value) => updateItem(item.id, { text: value })}
            />

            <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
            <View style={styles.chipRow}>
              {BADGE_TYPES.map((option) => {
                const active = item.badge.type === option;
                const typeColor = getTypeColor(option);
                return (
                  <TouchableOpacity
                    key={`${item.id}-${option}`}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? typeColor : colors.border,
                        backgroundColor: active ? typeColor : colors.card,
                      },
                    ]}
                    onPress={() => updateItem(item.id, { type: option })}
                  >
                    <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>
                      {BADGE_LABELS[option]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Icono (Material)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder={DEFAULT_BADGE_ICON}
              placeholderTextColor={colors.placeholderText}
              value={item.badge.icon}
              onChangeText={(value) => updateItem(item.id, { icon: value })}
              autoCapitalize="none"
            />

            <View style={[styles.badgePreview, { backgroundColor: previewColor }]}>
              {!!previewIcon && <Icon name={previewIcon} size={14} color="#fff" />}
              <Text style={styles.badgePreviewText}>{previewText}</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.buttonBackground }]}
              onPress={() => handleSave(item)}
              disabled={savingId === item.id}
            >
              {savingId === item.id ? (
                <ActivityIndicator color={colors.buttonText || '#fff'} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.buttonText || '#fff' }]}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
};

export default AdminEmergenciasScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 12,
  },
  searchCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 12,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePreview: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgePreviewText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
});
