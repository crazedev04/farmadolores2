import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { DateTime } from 'luxon';
import { useTheme } from '../context/ThemeContext';

const FILTERS = ['todos', 'pendientes', 'resueltas'] as const;

type FilterType = typeof FILTERS[number];

type Suggestion = {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp;
  resolved?: boolean;
};

const AdminSuggestionsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<FilterType>('todos');

  useEffect(() => {
    const unsub = firestore()
      .collection('sugerencias')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Suggestion),
          }));
          setItems(data);
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

    return () => unsub();
  }, []);

  const visibleItems = useMemo(() => {
    if (filter === 'pendientes') {
      return items.filter(item => !item.resolved);
    }
    if (filter === 'resueltas') {
      return items.filter(item => item.resolved);
    }
    return items;
  }, [items, filter]);

  const formatDate = (timestamp?: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    return DateTime.fromJSDate(timestamp.toDate()).toFormat('dd/LL/yyyy HH:mm');
  };

  const handleResolve = async (item: Suggestion, value: boolean) => {
    try {
      await firestore().collection('sugerencias').doc(item.id).update({
        resolved: value,
        resolvedAt: value ? firestore.FieldValue.serverTimestamp() : null,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la sugerencia.');
    }
  };

  const handleEmail = async (item: Suggestion) => {
    if (!item.userEmail) {
      Alert.alert('Sin email', 'Esta sugerencia no tiene email asociado.');
      return;
    }
    const subject = `Sobre tu sugerencia${item.title ? `: ${item.title}` : ''}`;
    const body = `Hola ${item.userName || ''}\n\nGracias por tu sugerencia.\n\nRespuesta:\n`;
    const mailto = `mailto:${encodeURIComponent(item.userEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(mailto);
      if (supported) {
        await Linking.openURL(mailto);
      } else {
        Alert.alert('No disponible', 'No se pudo abrir el cliente de correo.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir el correo.');
    }
  };

  const handleDelete = async (item: Suggestion) => {
    Alert.alert('Eliminar', 'Deseas eliminar esta sugerencia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('sugerencias').doc(item.id).delete();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la sugerencia.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Sugerencias</Text>

      <View style={styles.filterRow}>
        {FILTERS.map(option => {
          const active = option === filter;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterChip,
                { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
              ]}
              onPress={() => setFilter(option)}
            >
              <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                {option === 'todos' ? 'Todos' : option === 'pendientes' ? 'Pendientes' : 'Resueltas'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && (
        <ActivityIndicator size="large" color={colors.buttonBackground} style={{ marginTop: 20 }} />
      )}

      {!loading && visibleItems.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>No hay sugerencias.</Text>
      )}

      {visibleItems.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}> 
                {item.title?.trim() || 'Sin titulo'}
              </Text>
              {item.type && (
                <View style={[styles.typeBadge, { borderColor: colors.border }]}> 
                  <Text style={[styles.typeText, { color: colors.mutedText || colors.placeholderText }]}> 
                    {item.type}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Icon name="trash-can-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>

          {!!item.message && (
            <Text style={[styles.message, { color: colors.text }]}>{item.message}</Text>
          )}

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.mutedText || colors.placeholderText }]}> 
              {item.userName || item.userEmail || 'Usuario anonimo'}
            </Text>
            <Text style={[styles.metaText, { color: colors.mutedText || colors.placeholderText }]}> 
              {formatDate(item.createdAt)}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => handleEmail(item)}
            >
              <Icon name="email-outline" size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.resolveButton,
                { backgroundColor: item.resolved ? colors.success : colors.buttonBackground },
              ]}
              onPress={() => handleResolve(item, !item.resolved)}
            >
              <Text style={{ color: colors.buttonText || '#fff', fontWeight: '700' }}>
                {item.resolved ? 'Resuelta' : 'Marcar resuelta'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

export default AdminSuggestionsScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  typeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resolveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
