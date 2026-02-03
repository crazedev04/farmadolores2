import { StyleSheet, View, FlatList, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Emergencia, RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import EmergenciaCard from '../components/EmergenciaCard';
import { useScreenLoadAnalytics } from '../utils/useScreenLoadAnalytics';
import NetInfo from '@react-native-community/netinfo';
type EmergenciasNavigationProp = NavigationProp<RootStackParamList, 'Emergencias'>;

type Props = {
  navigation: EmergenciasNavigationProp;
};

const Emergencias: React.FC<Props> = () => {
  const navigation = useNavigation<EmergenciasNavigationProp>();
  const [emergencias, setEmergencias] = useState<Emergencia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const { theme } = useTheme();
  const { colors } = theme;

  useScreenLoadAnalytics('Emergencias', loading);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      const online = !!state.isConnected && reachable !== false;
      setIsOffline(!online);
    });
    const unsubscribe = firestore().collection('emergencias').onSnapshot(snapshot => {
      const emergenciaList: Emergencia[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawBadge = data.badge;
        const rawType = rawBadge?.type;
        const normalizedType = rawType === 'alerta' || rawType === 'info' || rawType === 'urgencias'
          ? rawType
          : 'urgencias';
        const badgeFromDoc = rawBadge
          ? {
            enabled: rawBadge.enabled !== false,
            text: rawBadge.text || 'Guardia 24hs',
            type: normalizedType,
            icon: rawBadge.icon || '',
          }
          : undefined;
        const fallbackBadge = data.guardiaEnabled
          ? { enabled: true, text: 'Guardia 24hs', type: 'urgencias', icon: 'alert-decagram' }
          : undefined;
        return {
          id: doc.id,
          name: data.name || '',
          dir: data.dir || '',
          tel: data.tel || '',
          image: data.image || '',
          detail: data.detail || '',
          gps: data.gps,
          guardiaEnabled: data.guardiaEnabled ?? false,
          badge: badgeFromDoc || fallbackBadge,
        };
      });

      setEmergencias(emergenciaList);
      setLoading(false);
      setLastUpdated(new Date());
    }, error => {
      console.error("Error fetching emergencias: ", error);
    });

    return () => {
      unsubscribeNet();
      unsubscribe();
    };
  }, []);

  const retryEmergencias = async () => {
    try {
      setLoading(true);
      setReconnecting(true);
      const state = await NetInfo.fetch();
      if (!state.isConnected || state.isInternetReachable === false) {
        Alert.alert('Sin conexion', 'Activa WiFi o datos para actualizar.');
        return;
      }
      const snapshot = await firestore().collection('emergencias').get();
      const emergenciaList: Emergencia[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawBadge = data.badge;
        const rawType = rawBadge?.type;
        const normalizedType = rawType === 'alerta' || rawType === 'info' || rawType === 'urgencias'
          ? rawType
          : 'urgencias';
        const badgeFromDoc = rawBadge
          ? {
            enabled: rawBadge.enabled !== false,
            text: rawBadge.text || 'Guardia 24hs',
            type: normalizedType,
            icon: rawBadge.icon || '',
          }
          : undefined;
        const fallbackBadge = data.guardiaEnabled
          ? { enabled: true, text: 'Guardia 24hs', type: 'urgencias', icon: 'alert-decagram' }
          : undefined;
        return {
          id: doc.id,
          name: data.name || '',
          dir: data.dir || '',
          tel: data.tel || '',
          image: data.image || '',
          detail: data.detail || '',
          gps: data.gps,
          guardiaEnabled: data.guardiaEnabled ?? false,
          badge: badgeFromDoc || fallbackBadge,
        };
      });
      setEmergencias(emergenciaList);
      setIsOffline(false);
      setLastUpdated(new Date());
    } catch {
      setIsOffline(true);
    } finally {
      setReconnecting(false);
      setLoading(false);
    }
  };

  const handlePress = (item: Emergencia) => {
    navigation.navigate('DetailE', { emergencia: item });
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} />;
  }

  return (
    <>
    <AdBanner size={BannerAdSize.FULL_BANNER} />
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isOffline && (
        <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.offlineText, { color: colors.text }]}>
            Sin conexion. Mostrando datos guardados
            {lastUpdated ? ` (ultima actualizacion ${lastUpdated.toLocaleTimeString()})` : ''}.
          </Text>
          <TouchableOpacity
            style={[styles.offlineButton, { borderColor: colors.border }]}
            onPress={retryEmergencias}
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
      <FlatList
        data={emergencias}
        renderItem={({ item }) => <EmergenciaCard item={item} onPress={handlePress} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No hay emergencias disponibles.
          </Text>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        />
    </View>
        </>
  );
};

export default Emergencias;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  listContainer: {
    paddingVertical: 6,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  infoContainer: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  offlineCard: {
    marginHorizontal: 16,
    marginVertical: 8,
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
});
