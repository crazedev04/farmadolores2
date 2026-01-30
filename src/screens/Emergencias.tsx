import { StyleSheet, View, FlatList, ActivityIndicator, Text } from 'react-native';
import React, { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Emergencia, RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import EmergenciaCard from '../components/EmergenciaCard';
type EmergenciasNavigationProp = NavigationProp<RootStackParamList, 'Emergencias'>;

type Props = {
  navigation: EmergenciasNavigationProp;
};

const Emergencias: React.FC<Props> = () => {
  const navigation = useNavigation<EmergenciasNavigationProp>();
  const [emergencias, setEmergencias] = useState<Emergencia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { theme } = useTheme();
  const { colors } = theme;

  useEffect(() => {
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
    }, error => {
      console.error("Error fetching emergencias: ", error);
    });

    return () => unsubscribe();
  }, []);

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
});
