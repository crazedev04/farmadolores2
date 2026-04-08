import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FirebaseFirestoreTypes,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
} from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
import { adminDeleteUserData, adminReactivateAccount } from '../services/adminService';
import { accountActionSchema } from '../admin/validators';
import AdminList from '../components/admin/AdminList';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { writeAdminAuditLogSafe } from '../services/adminAuditService';

const db = getFirestore();
const TYPE_FILTERS = ['all', 'disable', 'delete'] as const;

type TypeFilter = typeof TYPE_FILTERS[number];

type AccountRequestType = 'disable' | 'delete';

type AccountRequest = {
  id: string;
  uid: string;
  email: string;
  type: AccountRequestType;
  reason?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
};

const formatDate = (ts?: FirebaseFirestoreTypes.Timestamp | null) => {
  if (!ts) {
    return '';
  }
  return ts.toDate().toLocaleString('es-AR');
};

const filterLabel = (value: TypeFilter) => {
  if (value === 'disable') {
    return 'Disable';
  }
  if (value === 'delete') {
    return 'Eliminar';
  }
  return 'Todas';
};

const AdminAccountRequestsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AccountRequest[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [userDisabledMap, setUserDisabledMap] = useState<Record<string, boolean>>({});
  const [workingActionKey, setWorkingActionKey] = useState<string | null>(null);
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState<AccountRequest | null>(null);
  const [pendingDeleteData, setPendingDeleteData] = useState<AccountRequest | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'accountRequests'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const next = snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<AccountRequest, 'id' | 'type'> & { type?: string };
          const type: AccountRequestType = data.type === 'delete' ? 'delete' : 'disable';
          return {
            id: entry.id,
            uid: data.uid,
            email: data.email || '',
            type,
            reason: data.reason || '',
            createdAt: data.createdAt || null,
          };
        });
        setItems(next);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDisabled = async () => {
      const uniqueUids = Array.from(new Set(items.map((item) => item.uid).filter(Boolean)));
      if (uniqueUids.length === 0) {
        if (mounted) {
          setUserDisabledMap({});
        }
        return;
      }

      try {
        const chunks: string[][] = [];
        for (let index = 0; index < uniqueUids.length; index += 10) {
          chunks.push(uniqueUids.slice(index, index + 10));
        }

        const next: Record<string, boolean> = {};
        await Promise.all(
          chunks.map(async (chunk) => {
            const snap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)));
            snap.docs.forEach((entry) => {
              const data = entry.data() as { uid?: string; disabled?: boolean };
              if (data.uid) {
                next[data.uid] = !!data.disabled;
              }
            });
          }),
        );

        if (mounted) {
          setUserDisabledMap(next);
        }
      } catch {
        if (mounted) {
          setUserDisabledMap({});
        }
      }
    };

    loadDisabled();

    return () => {
      mounted = false;
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = searchEmail.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === 'all' ? true : item.type === typeFilter;
      const matchesEmail = term.length === 0 ? true : item.email.toLowerCase().includes(term);
      return matchesType && matchesEmail;
    });
  }, [items, searchEmail, typeFilter]);

  const parseRequest = (request: AccountRequest) => {
    const parsed = accountActionSchema.safeParse({ uid: request.uid, requestId: request.id });
    if (!parsed.success) {
      Alert.alert('Error', parsed.error.issues[0]?.message || 'Solicitud invalida.');
      return null;
    }
    return parsed.data;
  };

  const handleReactivate = async (request: AccountRequest) => {
    const parsed = parseRequest(request);
    if (!parsed) {
      return false;
    }

    setWorkingActionKey(`reactivate:${request.id}`);
    try {
      await adminReactivateAccount({ uid: parsed.uid, requestId: parsed.requestId });
      writeAdminAuditLogSafe({
        action: 'account_request_reactivate',
        targetType: 'accountRequest',
        targetId: request.id,
        summary: `Reactivar cuenta ${request.uid} desde solicitud ${request.id}`,
      });
      return true;
    } catch {
      Alert.alert('Error', 'No se pudo reactivar la cuenta.');
      return false;
    } finally {
      setWorkingActionKey(null);
    }
  };

  const handleReactivateAndNotify = async (request: AccountRequest) => {
    const reactivated = await handleReactivate(request);
    if (!reactivated) {
      return;
    }
    if (!request.email) {
      return;
    }

    const subject = encodeURIComponent('Cuenta reactivada');
    const body = encodeURIComponent(
      `Hola,\n\nTu cuenta fue reactivada. Ya podes ingresar nuevamente.\n\nEmail: ${request.email}\nUID: ${request.uid}\n`,
    );

    try {
      const mailto = `mailto:${request.email}?subject=${subject}&body=${body}`;
      const canOpen = await Linking.canOpenURL(mailto);
      if (!canOpen) {
        Alert.alert('No disponible', 'No se pudo abrir el cliente de correo.');
        return;
      }
      await Linking.openURL(mailto);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el correo.');
    }
  };

  const confirmDeleteUserData = async () => {
    if (!pendingDeleteData) {
      return;
    }

    const selected = pendingDeleteData;
    setPendingDeleteData(null);
    const parsed = parseRequest(selected);
    if (!parsed) {
      return;
    }

    setWorkingActionKey(`deleteData:${selected.id}`);
    try {
      await adminDeleteUserData({
        uid: parsed.uid,
        requestId: parsed.requestId,
        reason: selected.reason,
      });
      writeAdminAuditLogSafe({
        action: 'account_request_delete_data',
        targetType: 'accountRequest',
        targetId: selected.id,
        summary: `Eliminar datos para ${selected.uid} desde solicitud ${selected.id}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo eliminar los datos del usuario.');
    } finally {
      setWorkingActionKey(null);
    }
  };

  const confirmDeleteRequest = async () => {
    if (!pendingDeleteRequest) {
      return;
    }

    const selected = pendingDeleteRequest;
    setPendingDeleteRequest(null);
    setWorkingActionKey(`deleteRequest:${selected.id}`);
    try {
      await deleteDoc(doc(db, 'accountRequests', selected.id));
      writeAdminAuditLogSafe({
        action: 'account_request_delete',
        targetType: 'accountRequest',
        targetId: selected.id,
        summary: `Eliminar solicitud ${selected.id} para ${selected.uid}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la solicitud.');
    } finally {
      setWorkingActionKey(null);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Solicitudes de cuenta</Text>

      <View style={styles.filters}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Buscar por email"
          placeholderTextColor={colors.placeholderText}
          value={searchEmail}
          onChangeText={setSearchEmail}
          autoCapitalize="none"
        />

        <View style={styles.filterRow}>
          {TYPE_FILTERS.map((value) => {
            const active = typeFilter === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.buttonBackground : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setTypeFilter(value)}
              >
                <Text style={[styles.filterText, { color: active ? colors.buttonText || '#fff' : colors.text }]}>
                  {filterLabel(value)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <AdminList loading={loading} empty={filteredItems.length === 0} emptyText="No hay solicitudes.">
        <View style={styles.listWrap}>
          {filteredItems.map((item) => {
            const rowBusy = !!workingActionKey && workingActionKey.endsWith(`:${item.id}`);
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.email, { color: colors.text }]}>{item.email || 'Sin email'}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.badgeText, { color: colors.text }]}>{item.type}</Text>
                  </View>
                </View>

                {item.reason ? <Text style={[styles.reason, { color: colors.text }]}>Motivo: {item.reason}</Text> : null}

                <Text style={[styles.meta, { color: colors.mutedText || colors.placeholderText }]}>UID: {item.uid}</Text>
                {item.createdAt ? (
                  <Text style={[styles.meta, { color: colors.mutedText || colors.placeholderText }]}>Fecha: {formatDate(item.createdAt)}</Text>
                ) : null}

                <View style={styles.statusRow}>
                  <Text style={[styles.statusText, { color: colors.mutedText || colors.placeholderText }]}>
                    Estado: {userDisabledMap[item.uid] ? 'Desactivada' : 'Activa'}
                    {item.type === 'delete' ? ' · Solicita eliminacion' : ''}
                  </Text>
                  {item.type === 'delete' ? (
                    <Icon name="alert-circle-outline" size={16} color={colors.error || '#dc2626'} />
                  ) : null}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.buttonBackground },
                      rowBusy ? styles.disabledOpacity : null,
                    ]}
                    onPress={() => handleReactivate(item)}
                    disabled={rowBusy}
                  >
                    <Icon name="account-check-outline" size={18} color={colors.buttonText || '#fff'} />
                    <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Reactivar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionGhost,
                      { borderColor: colors.border },
                      rowBusy ? styles.disabledOpacity : null,
                    ]}
                    onPress={() => handleReactivateAndNotify(item)}
                    disabled={rowBusy}
                  >
                    <Icon name="email-outline" size={18} color={colors.text} />
                    <Text style={[styles.actionGhostText, { color: colors.text }]}>Reactivar y notificar</Text>
                  </TouchableOpacity>

                  {item.type === 'delete' ? (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: colors.error || '#dc2626' },
                        rowBusy ? styles.disabledOpacity : null,
                      ]}
                      onPress={() => setPendingDeleteData(item)}
                      disabled={rowBusy}
                    >
                      <Icon name="delete-forever-outline" size={18} color={colors.buttonText || '#fff'} />
                      <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Eliminar datos</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.actionGhost,
                      { borderColor: colors.border },
                      rowBusy ? styles.disabledOpacity : null,
                    ]}
                    onPress={() => setPendingDeleteRequest(item)}
                    disabled={rowBusy}
                  >
                    <Icon name="trash-can-outline" size={18} color={colors.error || '#dc2626'} />
                    <Text style={[styles.actionGhostText, { color: colors.error || '#dc2626' }]}>Eliminar solicitud</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </AdminList>

      <ConfirmDialog
        visible={!!pendingDeleteData}
        title="Eliminar datos del usuario"
        message={
          pendingDeleteData
            ? `Se eliminaran los datos de ${pendingDeleteData.email || pendingDeleteData.uid}. Esta accion es irreversible.`
            : ''
        }
        confirmText="Eliminar datos"
        confirmDestructive
        loading={!!workingActionKey}
        onCancel={() => setPendingDeleteData(null)}
        onConfirm={confirmDeleteUserData}
      />

      <ConfirmDialog
        visible={!!pendingDeleteRequest}
        title="Eliminar solicitud"
        message={
          pendingDeleteRequest
            ? `Se eliminara la solicitud ${pendingDeleteRequest.id}.`
            : ''
        }
        confirmText="Eliminar"
        confirmDestructive
        loading={!!workingActionKey}
        onCancel={() => setPendingDeleteRequest(null)}
        onConfirm={confirmDeleteRequest}
      />
    </ScrollView>
  );
};

export default AdminAccountRequestsScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
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
    flexWrap: 'wrap',
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterText: {
    fontWeight: '700',
    fontSize: 13,
  },
  listWrap: {
    gap: 12,
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
    gap: 8,
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  reason: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
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
    flex: 1,
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
    minWidth: 150,
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
    minWidth: 170,
  },
  actionGhostText: {
    fontWeight: '700',
    fontSize: 13,
  },
  disabledOpacity: {
    opacity: 0.7,
  },
});
