import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { DataReport } from '../types/appConfig';
import { updateDataReportStatus } from '../services/dataReportsService';
import { useAdminCollection } from '../admin/useAdminCollection';

const STATUS_OPTIONS: Array<DataReport['status'] | 'all'> = ['all', 'open', 'in_review', 'resolved', 'rejected'];

const toDateLabel = (value: any) => {
  const date = value?.toDate ? value.toDate() : null;
  if (!date) return '';
  return date.toLocaleString('es-AR');
};

const AdminDataReportsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { items, loading } = useAdminCollection<DataReport>('dataReports');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const setStatus = async (id: string, status: DataReport['status']) => {
    setSavingId(id);
    try {
      await updateDataReportStatus(id, status);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Reportes de datos</Text>
      <View style={styles.filterRow}>
        {STATUS_OPTIONS.map((status) => {
          const active = statusFilter === status;
          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.buttonBackground : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '700' }}>
                {status}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          ListEmptyComponent={<Text style={{ color: colors.mutedText || colors.placeholderText }}>No hay reportes.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.entity, { color: colors.text }]}>
                  {item.entityType}: {item.entityName || item.entityId}
                </Text>
                <View style={[styles.statusBadge, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.reason, { color: colors.text }]}>{item.reason}</Text>
              <Text style={[styles.meta, { color: colors.mutedText || colors.placeholderText }]}>
                UID: {item.reporterUid} {item.reporterEmail ? `· ${item.reporterEmail}` : ''}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedText || colors.placeholderText }]}>
                Fecha: {toDateLabel(item.createdAt)}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={() => setStatus(item.id, 'in_review')}
                  disabled={savingId === item.id}
                >
                  <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>En revision</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success || '#16a34a' }]}
                  onPress={() => setStatus(item.id, 'resolved')}
                  disabled={savingId === item.id}
                >
                  <Text style={[styles.actionText, { color: '#fff' }]}>Resolver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error || '#dc2626' }]}
                  onPress={() => setStatus(item.id, 'rejected')}
                  disabled={savingId === item.id}
                >
                  <Text style={[styles.actionText, { color: '#fff' }]}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default AdminDataReportsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  entity: {
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reason: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  actionButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
