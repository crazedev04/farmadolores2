import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { getFirestore, collection, onSnapshot, getDocs } from '@react-native-firebase/firestore';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { RootStackParamList, Local } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { logEvent } from '../services/analytics';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { useScreenLoadAnalytics } from '../utils/useScreenLoadAnalytics';
import NetInfo from '@react-native-community/netinfo';
const db = getFirestore();

type LocalesListScreenNavigationProp = NavigationProp<RootStackParamList, 'LocalDetail'>;

const LocalesListScreen: React.FC = () => {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const navigation = useNavigation<LocalesListScreenNavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      const online = !!state.isConnected && reachable !== false;
      setIsOffline(!online);
    });
    const snapshot = onSnapshot(
      collection(db, 'publi'),
      (querySnapshot) => {
        const localesData: Local[] = querySnapshot.docs.map((doc) => {
          const data = doc.data() as Local;
          return {
            id: doc.id,
            name: data.name || '',
            descrip: data.descrip || '',
            image: data.image,
            direccion: data.direccion || '',
            tel: data.tel || '',
            url: data.url || '',
            gallery: Array.isArray((data as any).gallery) ? (data as any).gallery : undefined,
        };
      });
      setLocales(localesData);
      setLoading(false);
      setLastUpdated(new Date());
      },
      () => {
        setLoading(false);
      }
    );

    return () => {
      unsubscribeNet();
      snapshot();
    };
  }, []);

  const retryLocales = async () => {
    try {
      setLoading(true);
      setReconnecting(true);
      const state = await NetInfo.fetch();
      if (!state.isConnected || state.isInternetReachable === false) {
        Alert.alert('Sin conexion', 'Activa WiFi o datos para actualizar.');
        return;
      }
      const snap = await getDocs(collection(db, 'publi'));
      const localesData: Local[] = snap.docs.map((doc) => {
        const data = doc.data() as Local;
        return {
          id: doc.id,
          name: data.name || '',
          descrip: data.descrip || '',
          image: data.image,
          direccion: data.direccion || '',
          tel: data.tel || '',
          url: data.url || '',
          gallery: Array.isArray((data as any).gallery) ? (data as any).gallery : undefined,
        };
      });
      setLocales(localesData);
      setIsOffline(false);
      setLastUpdated(new Date());
    } catch {
      setIsOffline(true);
    } finally {
      setReconnecting(false);
      setLoading(false);
    }
  };

  useScreenLoadAnalytics('Locales', loading);

  const filteredLocales = useMemo(() => {
    if (!debouncedQuery.trim()) return locales;
    const term = debouncedQuery.trim().toLowerCase();
    return locales.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        (item.descrip || '').toLowerCase().includes(term) ||
        (item.direccion || '').toLowerCase().includes(term)
      );
    });
  }, [locales, debouncedQuery]);

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Locales</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText || colors.placeholderText }]}
          >
            Comercios y servicios de la zona.
          </Text>
        </View>
        <View style={[styles.countChip, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.countText, { color: colors.text }]}>{filteredLocales.length}</Text>
        </View>
      </View>

      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Icon name="magnify" size={18} color={colors.mutedText || colors.placeholderText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar por nombre o direccion"
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

      {isOffline && (
        <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.offlineText, { color: colors.text }]}>
            Sin conexion. Mostrando datos guardados
            {lastUpdated ? ` (ultima actualizacion ${lastUpdated.toLocaleTimeString()})` : ''}.
          </Text>
          <TouchableOpacity
            style={[styles.offlineButton, { borderColor: colors.border }]}
            onPress={retryLocales}
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

      {filteredLocales.length === 0 && !loading && (
        <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}
        >
          {query ? 'No hay resultados para tu busqueda.' : 'No hay locales disponibles.'}
        </Text>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Local }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        logEvent('local_open', { local_id: item.id, name: item.name });
        navigation.navigate('LocalDetail', { local: item });
      }}
      activeOpacity={0.9}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
        >
          <Icon name="storefront-outline" size={28} color={colors.mutedText || colors.placeholderText} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        {!!item.descrip && (
          <Text style={[styles.descrip, { color: colors.mutedText || colors.placeholderText }]} numberOfLines={2}
          >
            {item.descrip}
          </Text>
        )}
        {!!item.direccion && (
          <View style={styles.metaRow}>
            <Icon name="map-marker-outline" size={14} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.metaText, { color: colors.mutedText || colors.placeholderText }]} numberOfLines={1}
            >
              {item.direccion}
            </Text>
          </View>
        )}
        {!!item.tel && (
          <View style={styles.metaRow}>
            <Icon name="phone-outline" size={14} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.metaText, { color: colors.mutedText || colors.placeholderText }]}
            >
              {item.tel}
            </Text>
          </View>
        )}
        <View style={styles.actionRow}>
          <View style={[styles.actionChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Ver detalle</Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.mutedText || colors.placeholderText} />
        </View>
      </View>
    </TouchableOpacity>
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
    <>
      <FlatList
        data={filteredLocales}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        ListHeaderComponent={renderHeader}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
      <AdBanner size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </>
  );
};

export default LocalesListScreen;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  body: {
    padding: 12,
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  descrip: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    flex: 1,
  },
  actionRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
