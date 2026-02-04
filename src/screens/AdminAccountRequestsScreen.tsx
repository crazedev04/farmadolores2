import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput, Linking } from 'react-native';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Icon from '@react-native-vector-icons/material-design-icons';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
const db = getFirestore();

const formatDate = (ts?: FirebaseFirestoreTypes.Timestamp | null) => {
  if (!ts) return '';
  const date = ts.toDate();
  return date.toLocaleString('es-AR');
};

type AccountRequest = {
  id: string;
  uid: string;
  email: string;
  type: string;
  reason?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
};

const AdminAccountRequestsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AccountRequest[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'disable' | 'delete'>('all');
  const [userDisabledMap, setUserDisabledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'accountRequests'), orderBy('createdAt', 'desc')),
        snapshot => {
          const next = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<AccountRequest, 'id'>;
            return {
              id: doc.id,
              uid: data.uid,
              email: data.email || '',
              type: data.type || 'disable',
              reason: data.reason || '',
              createdAt: data.createdAt || null,
            };
          });
          setItems(next);
          setLoading(false);
        },
        () => setLoading(false)
      );

    return () => unsub();
  }, []);

  useEffect(() => {
    const loadDisabled = async () => {
      const uniqueUids = Array.from(new Set(items.map(item => item.uid).filter(Boolean)));
      if (uniqueUids.length == 0) {
        setUserDisabledMap({});
        return;
      }
      try {
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueUids.length; i += 10) {
          chunks.push(uniqueUids.slice(i, i + 10));
        }
        const results: Record<string, boolean> = {};
        await Promise.all(
          chunks.map(async (chunk) => {
            const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)));
            snap.docs.forEach(doc => {
              const data = doc.data() as { uid?: string; disabled?: boolean };
              if (data.uid) {
                results[data.uid] = !!data.disabled;
              }
            });
          })
        );
        setUserDisabledMap(results);
      } catch {
        setUserDisabledMap({});
      }
    };

    loadDisabled();
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = searchEmail.trim().toLowerCase();
    return items.filter(item => {
      const matchesType = typeFilter === 'all' ? true : item.type === typeFilter;
      const matchesEmail = term.length === 0 ? true : (item.email || '').toLowerCase().includes(term);
      return matchesType && matchesEmail;
    });
  }, [items, searchEmail, typeFilter]);

  const handleReactivate = async (request: AccountRequest) => {
    try {
      await setDoc(
        doc(db, 'users', request.uid),
        {
          disabled: false,
          disabledAt: null,
          reactivatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await deleteDoc(doc(db, 'accountRequests', request.id));
    } catch (error) {
      Alert.alert('Error', 'No se pudo reactivar la cuenta.');
    }
  };

  const handleReactivateAndNotify = async (request: AccountRequest) => {
    await handleReactivate(request);
    if (!request.email) return;
    const subject = encodeURIComponent('Cuenta reactivada');
    const body = encodeURIComponent(
      `Hola,

Tu cuenta fue reactivada. Ya podes ingresar nuevamente.

Email: ${request.email}
UID: ${request.uid}
`
    );
    Linking.openURL(`mailto:${request.email}?subject=${subject}&body=${body}`).catch(() => {});
  };

  
  const handleEliminarUserData = async (request: AccountRequest) => {
    try {
      await deleteDoc(doc(db, 'users', request.uid));
      await deleteDoc(doc(db, 'accountRequests', request.id));
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar los datos del usuario.');
    }
  };

  const handleEliminarRequest = async (request: AccountRequest) => {
    try {
      await deleteDoc(doc(db, 'accountRequests', request.id));
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar la solicitud.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Solicitudes de cuenta</Text>
      <View style={styles.filters}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Buscar por email"
          placeholderTextColor={colors.placeholderText}
          value={searchEmail}
          onChangeText={setSearchEmail}
          autoCapitalize="none"
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: typeFilter === 'all' ? colors.buttonBackground : colors.card, borderColor: colors.border },
            ]}
            onPress={() => setTypeFilter('all')}
          >
            <Text style={{ color: typeFilter === 'all' ? colors.buttonText || '#fff' : colors.text, fontWeight: '700' }}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: typeFilter === 'disable' ? colors.buttonBackground : colors.card, borderColor: colors.border },
            ]}
            onPress={() => setTypeFilter('disable')}
          >
            <Text style={{ color: typeFilter === 'disable' ? colors.buttonText || '#fff' : colors.text, fontWeight: '700' }}>
              Disable
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: typeFilter === 'delete' ? colors.buttonBackground : colors.card, borderColor: colors.border },
            ]}
            onPress={() => setTypeFilter('delete')}
          >
            <Text style={{ color: typeFilter === 'delete' ? colors.buttonText || '#fff' : colors.text, fontWeight: '700' }}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>No hay solicitudes.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={styles.rowBetween}>
                <Text style={[styles.email, { color: colors.text }]}>{item.email || 'Sin email'}</Text>
                <View style={[styles.badge, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}> 
                  <Text style={[styles.badgeText, { color: colors.text }]}>{item.type}</Text>
                </View>
              </View>
              {item.reason ? (
                <Text style={[styles.reason, { color: colors.text }]}>Motivo: {item.reason}</Text>
              ) : null}
              <Text style={[styles.uid, { color: colors.mutedText || colors.placeholderText }]}>UID: {item.uid}</Text>
              {!!item.createdAt && (
                <Text style={[styles.date, { color: colors.mutedText || colors.placeholderText }]}>
                  Fecha: {formatDate(item.createdAt)}
                </Text>
              )}
              <View style={styles.statusRow}>
                <Text style={[styles.statusText, { color: colors.mutedText || colors.placeholderText }]}>
                  Estado: {userDisabledMap[item.uid] ? 'Desactivada' : 'Activa'}{item.type === 'delete' ? ' · Solicita eliminacion' : ''}
                </Text>
                {item.type === 'delete' && (
                  <Icon name="alert-circle-outline" size={16} color={colors.error} />
                )}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={() => handleReactivate(item)}
                >
                  <Icon name="account-check-outline" size={18} color={colors.buttonText || '#fff'} />
                  <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Reactivar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionGhost, { borderColor: colors.border }]}
                  onPress={() => handleReactivateAndNotify(item)}
                >
                  <Icon name="email-outline" size={18} color={colors.text} />
                  <Text style={[styles.actionGhostText, { color: colors.text }]}>Reactivar y notificar</Text>
                </TouchableOpacity>
                {item.type === 'delete' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={() =>
                      Alert.alert('Eliminar definitivamente', 'Esto borra los datos de Firestore. Esta accion es irreversible.', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => handleEliminarUserData(item) },
                      ])
                    }
                  >
                    <Icon name="delete-forever-outline" size={18} color={colors.buttonText || '#fff'} />
                    <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Eliminar datos</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionGhost, { borderColor: colors.border }]}
                  onPress={() =>
                    Alert.alert('Eliminar solicitud', '¿Seguro que queres borrar esta solicitud?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => handleEliminarRequest(item) },
                    ])
                  }
                >
                  <Icon name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={[styles.actionGhostText, { color: colors.error }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default AdminAccountRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  filters: {
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
  },
  reason: {
    fontSize: 12,
    fontWeight: '600',
  },
  uid: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
  },
  statusRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  actionText: {
    fontWeight: '700',
    fontSize: 13,
  },
  actionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
  },
  actionGhostText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
