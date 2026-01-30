import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';

type CounterMap = Record<string, number>;

const formatKey = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toList = (map: CounterMap | undefined) => {
  if (!map) return [];
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
};

const Section = ({
  title,
  items,
  colors,
}: {
  title: string;
  items: { key: string; count: number }[];
  colors: { card: string; border: string; text: string; mutedText?: string; placeholderText?: string };
}) => {
  if (items.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>Sin datos.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {items.slice(0, 5).map((item) => (
        <View key={`${title}-${item.key}`} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{formatKey(item.key)}</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
};

const AdminAnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<Record<string, CounterMap>>({});
  const [updatedAt, setUpdatedAt] = useState<string>('');

  useEffect(() => {
    const unsub = firestore()
      .collection('analytics')
      .doc('counters')
      .onSnapshot(
        (snapshot) => {
          const data = snapshot.data() || {};
          const next: Record<string, CounterMap> = {};
          Object.entries(data).forEach(([key, value]) => {
            if (key === 'updatedAt') return;
            if (value && typeof value === 'object') {
              next[key] = value as CounterMap;
            }
          });
          setCounters(next);
          const updated = (data as any).updatedAt?.toDate?.();
          setUpdatedAt(updated ? updated.toLocaleString() : '');
          setLoading(false);
        },
        () => setLoading(false)
      );

    return () => unsub();
  }, []);

  const lists = useMemo(
    () => ({
      screens: toList(counters.screen_views),
      promos: toList(counters.promo_clicks),
      tips: toList(counters.tip_clicks),
      news: toList(counters.news_clicks),
      pharmacies: toList(counters.pharmacy_opens),
      locals: toList(counters.local_opens),
      emergencies: toList(counters.emergency_opens),
      firstAid: toList(counters.first_aid_opens),
      login: toList(counters.login),
    }),
    [counters]
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>
      {!!updatedAt && (
        <Text style={[styles.subtitle, { color: colors.mutedText || colors.placeholderText }]}>
          Actualizado: {updatedAt}
        </Text>
      )}

      <Section title="Pantallas mas vistas" items={lists.screens} colors={colors} />
      <Section title="Promos mas clickeadas" items={lists.promos} colors={colors} />
      <Section title="Tips mas vistos" items={lists.tips} colors={colors} />
      <Section title="Noticias mas abiertas" items={lists.news} colors={colors} />
      <Section title="Farmacias mas visitadas" items={lists.pharmacies} colors={colors} />
      <Section title="Locales mas visitados" items={lists.locals} colors={colors} />
      <Section title="Emergencias mas vistas" items={lists.emergencies} colors={colors} />
      <Section title="Primeros auxilios mas vistos" items={lists.firstAid} colors={colors} />
      <Section title="Logins por metodo" items={lists.login} colors={colors} />
    </ScrollView>
  );
};

export default AdminAnalyticsScreen;

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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  section: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    flex: 1,
    paddingRight: 10,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
  },
});
