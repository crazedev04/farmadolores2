import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { getFirestore, collection, onSnapshot, getDocs } from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';
const db = getFirestore();
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { RootStackParamList } from '../types/navigationTypes';
import { openWebLink } from '../utils/openWebLink';
import { logEvent } from '../services/analytics';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { useScreenLoadAnalytics } from '../utils/useScreenLoadAnalytics';
import NetInfo from '@react-native-community/netinfo';

type GuideItem = {
  id: string;
  title: string;
  description: string;
  url: string; // URL del video o guia
  enabled?: boolean;
  order?: number;
  icon?: string;
};

const ICONS = [
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

const PrimerosAuxilios = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      const online = !!state.isConnected && reachable !== false;
      setIsOffline(!online);
    });
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
          setGuides(next);
          setLoading(false);
          setLastUpdated(new Date());
        },
        () => {
          setLoading(false);
        }
      );

    return () => {
      unsubscribeNet();
      unsubscribe();
    };
  }, []);

  const retryGuides = async () => {
    try {
      setLoading(true);
      setReconnecting(true);
      const state = await NetInfo.fetch();
      if (!state.isConnected || state.isInternetReachable === false) {
        Alert.alert('Sin conexion', 'Activa WiFi o datos para actualizar.');
        return;
      }
      const snapshot = await getDocs(collection(db, 'primerosAuxilios'));
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
      setGuides(next);
      setIsOffline(false);
      setLastUpdated(new Date());
    } catch {
      setIsOffline(true);
    } finally {
      setReconnecting(false);
      setLoading(false);
    }
  };

  useScreenLoadAnalytics('PrimerosAuxilios', loading);

  const filteredGuides = useMemo(() => {
    const visible = guides.filter((item) => item.enabled !== false);
    const sorted = [...visible].sort((a, b) => {
      const aOrder = Number.isFinite(a.order) ? (a.order as number) : null;
      const bOrder = Number.isFinite(b.order) ? (b.order as number) : null;
      if (aOrder != null && bOrder != null) return aOrder - bOrder;
      if (aOrder != null) return -1;
      if (bOrder != null) return 1;
      return a.title.localeCompare(b.title);
    });

    if (!debouncedQuery.trim()) return sorted;
    const term = debouncedQuery.trim().toLowerCase();
    return sorted.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    });
  }, [guides, debouncedQuery]);

  const suggestIcon = (text: string) => {
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
    if (value.includes('quimic')) return 'beaker-outline';
    if (value.includes('nino') || value.includes('bebe')) return 'baby-face-outline';
    return '';
  };

  const getGuideIcon = (item: GuideItem, index: number) => {
    if (item.icon && item.icon.trim()) return item.icon;
    const suggested = suggestIcon(`${item.title} ${item.description || ''}`);
    if (suggested) return suggested;
    return ICONS[index % ICONS.length];
  };

  const handlePress = (url: string, title: string) => {
    logEvent('first_aid_open', { title });
    openWebLink(navigation, url, title);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.header, { color: colors.text }]}>Primeros Auxilios</Text>
          <Text style={[styles.subheader, { color: colors.mutedText || colors.placeholderText }]}
          >
            Guias rapidas y confiables para emergencias.
          </Text>
        </View>
        <View style={[styles.countChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.countText, { color: colors.text }]}>{filteredGuides.length}</Text>
        </View>
      </View>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Icon name="magnify" size={18} color={colors.mutedText || colors.placeholderText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar guia"
          placeholderTextColor={colors.placeholderText}
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Icon name="close-circle" size={18} color={colors.mutedText || colors.placeholderText} />
          </TouchableOpacity>
        )}
      </View>

      {filteredGuides.length === 0 && !loading && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
          No hay resultados para tu busqueda.
        </Text>
      )}
      {isOffline && (
        <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.offlineText, { color: colors.text }]}>
            Sin conexion. Mostrando datos guardados
            {lastUpdated ? ` (ultima actualizacion ${lastUpdated.toLocaleTimeString()})` : ''}.
          </Text>
          <TouchableOpacity
            style={[styles.offlineButton, { borderColor: colors.border }]}
            onPress={retryGuides}
            disabled={reconnecting}
          >
            {reconnecting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.offlineButtonText, { color: colors.text }]}>Reintentar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const RenderItem = ({ item, index }: { item: GuideItem; index: number }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handlePress(item.url, item.title)}
      activeOpacity={0.9}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
      >
        <Icon name={getGuideIcon(item, index)} size={20} color={colors.buttonBackground} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.mutedText || colors.placeholderText }]}
        >
          {item.description}
        </Text>
      </View>
      <Icon name="chevron-right" size={22} color={colors.mutedText || colors.placeholderText} />
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}
      >
        <FlatList
          data={filteredGuides}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <RenderItem item={item} index={index} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.buttonBackground} />
              </View>
            ) : !query.trim() ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
                  No hay guias cargadas.
                </Text>
              </View>
            ) : null
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      </View>
      {/* <AdBanner size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} /> */}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    paddingTop: 10,
    marginBottom: 12,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
  },
  subheader: {
    fontSize: 13,
    marginTop: 4,
  },
  countChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  offlineCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  offlineText: {
    fontSize: 12,
  },
  offlineButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  offlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: 16,
    fontSize: 13,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PrimerosAuxilios;
