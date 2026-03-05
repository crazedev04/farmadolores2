import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import MapView, { Marker } from 'react-native-maps';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { logEvent } from '../services/analytics';
import { useAuth } from '../context/AuthContext';
import { isFavoritePharmacy, toggleFavoritePharmacy } from '../services/favoritesService';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useFeatureFlags } from '../services/featureFlags';
import { getCoordsFromPharmacyLike } from '../utils/geo';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Tabla de horarios, full theme
function HorarioTable({ horarios }: { horarios?: any }) {
  const { theme } = useTheme();
  const { colors } = theme;
  if (!horarios || typeof horarios !== 'object') {
    return (
      <Text style={{
        color: colors.error || '#dc3545',
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 10
      }}>
        Sin horarios registrados
      </Text>
    );
  }
  return (
    <View style={[
      styles.horarioTable,
      { backgroundColor: colors.card, borderColor: colors.border }
    ]}>
      <View style={[styles.horarioRow, { backgroundColor: colors.primary + '11' }]}>
        <Text style={[styles.horarioDia, styles.horarioHeader, { color: colors.primary }]}>Día</Text>
        <Text style={[styles.horarioFranjas, styles.horarioHeader, { color: colors.primary }]}>Horario</Text>
      </View>
      {DIAS.map(dia => {
        const franjas = horarios[dia];
        return (
          <View key={dia} style={[styles.horarioRow, { borderColor: colors.border }]}>
            <Text style={[styles.horarioDia, { color: colors.text }]}>{capitalize(dia)}</Text>
            <Text style={[styles.horarioFranjas, { color: colors.text }]}>
              {Array.isArray(franjas) && franjas.length
                ? franjas.map(f => `${f.abre} - ${f.cierra}`).join(' / ')
                : <Text style={{ color: colors.mutedText || colors.placeholderText || '#888' }}>Cerrado</Text>
              }
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

const DetailScreen = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<DetailScreenRouteProp>();
  const { farmacia } = route.params;
  const { user } = useAuth();
  const flags = useFeatureFlags();
  const [activeIndex, setActiveIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  useEffect(() => {
    logEvent('pharmacy_view', { pharmacy_id: farmacia.id, name: farmacia.name });
  }, [farmacia.id, farmacia.name]);

  useEffect(() => {
    let active = true;
    const loadFavorite = async () => {
      if (!user?.uid) {
        if (active) setFavorite(false);
        return;
      }
      try {
        const value = await isFavoritePharmacy(user.uid, farmacia.id);
        if (active) setFavorite(value);
      } catch {
        if (active) setFavorite(false);
      }
    };
    loadFavorite();
    return () => {
      active = false;
    };
  }, [user?.uid, farmacia.id]);

  const { lat, lng } = useMemo(() => getCoordsFromPharmacyLike(farmacia), [farmacia]);
  const hasValidCoords = lat != null && lng != null && lat !== 0 && lng !== 0;
  const carouselWidth = Math.max(0, Dimensions.get('window').width - 20);

  const { images, detailText } = useMemo(() => {
    const rawGallery = Array.isArray(farmacia.gallery)
      ? farmacia.gallery.filter((uri) => typeof uri === 'string' && uri.trim().length > 0)
      : [];
    const detailValue = typeof farmacia.detail === 'string' ? farmacia.detail.trim() : '';
    const detailLooksLikeUrl = detailValue.startsWith('http');
    const fallbackImage = farmacia.image || (detailLooksLikeUrl ? detailValue : '');
    const imageList = rawGallery.length > 0
      ? rawGallery
      : (fallbackImage ? [fallbackImage] : []);
    return {
      images: imageList,
      detailText: detailLooksLikeUrl ? '' : detailValue,
    };
  }, [farmacia.detail, farmacia.gallery, farmacia.image]);

  const telLabel = Array.isArray(farmacia.tel) ? farmacia.tel.join(' / ') : farmacia.tel;
  const makeCall = (phoneNumber?: string | string[] | number) => {
    const raw = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;
    if (!raw) return;
    const clean = String(raw).replace(/[^\d+]/g, '');
    if (!clean) return;
    logEvent('pharmacy_call', { source: 'detail', pharmacy_id: farmacia.id, name: farmacia.name });
    Linking.openURL(`tel:${clean}`);
  };

  const onToggleFavorite = async () => {
    if (!user?.uid || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const next = await toggleFavoritePharmacy(user.uid, farmacia);
      setFavorite(next);
      logEvent('favorite_toggle', { pharmacy_id: farmacia.id, enabled: next });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const tieneHorariosNuevos = farmacia.horarios && typeof farmacia.horarios === 'object';

  return (
    <>
      <ScrollView contentContainerStyle={[{ backgroundColor: colors.background }, styles.container]}>
        {images.length > 0 && (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={carouselWidth}
              decelerationRate="fast"
              onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const nextIndex = Math.round(offsetX / carouselWidth);
                setActiveIndex(nextIndex);
              }}
            >
              {images.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={[
                    styles.carouselImage,
                    {
                      width: carouselWidth,
                      borderColor: colors.border,
                    },
                  ]}
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <View
                      key={`dot-${index}`}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isActive ? colors.buttonBackground : colors.border,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{farmacia.name}</Text>
          <Text style={[styles.info, { color: colors.text }]}>Dirección: {farmacia.dir}</Text>
          <TouchableOpacity onPress={() => makeCall(farmacia.tel)}>
            <Text style={[styles.info, { color: colors.success || '#388e3c', textDecorationLine: 'underline', fontWeight: 'bold' }]}>Teléfono: {telLabel}</Text>
          </TouchableOpacity>
          {!!detailText && (
            <>
              <Text style={[styles.subTitle, { color: colors.primary, marginTop: 12, marginBottom: 4 }]}>Detalle</Text>
              <Text style={[styles.info, { color: colors.text }]}>{detailText}</Text>
            </>
          )}
          <Text style={[styles.subTitle, { color: colors.primary, marginTop: 15, marginBottom: 5 }]}>Horarios de atención:</Text>
          {tieneHorariosNuevos ? (
            <HorarioTable horarios={farmacia.horarios} />
          ) : (
            <>
              <Text style={[styles.info, { color: colors.text }]}>
                Mañana: {farmacia.horarioAperturaMañana?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '-'} - {farmacia.horarioCierreMañana?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '-'}
              </Text>
              <Text style={[styles.info, { color: colors.text }]}>
                Tarde: {farmacia.horarioAperturaTarde?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '-'} - {farmacia.horarioCierreTarde?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '-'}
              </Text>
            </>
          )}
          {(flags.favorites || flags.dataReports) && (
            <View style={styles.actionRow}>
              {flags.favorites && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: favorite ? (colors.success || '#16a34a') : colors.buttonBackground,
                      opacity: favoriteLoading ? 0.7 : 1,
                    },
                  ]}
                  onPress={onToggleFavorite}
                  disabled={!user || favoriteLoading}
                >
                  <Icon name={favorite ? 'star' : 'star-outline'} size={18} color={colors.buttonText || '#fff'} />
                  <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>
                    {favorite ? 'En favoritos' : 'Agregar favorito'}
                  </Text>
                </TouchableOpacity>
              )}
              {flags.dataReports && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() =>
                    navigation.navigate('ReportProblem', {
                      entityType: 'farmacia',
                      entityId: farmacia.id,
                      entityName: farmacia.name,
                    })
                  }
                >
                  <Icon name="alert-circle-outline" size={18} color={colors.text} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Reportar datos</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        {hasValidCoords && (
          <View style={[styles.mapContainer, { borderColor: colors.border }]}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: lat as number,
                longitude: lng as number,
                latitudeDelta: 0.020,
                longitudeDelta: 0.010,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker coordinate={{ latitude: lat as number, longitude: lng as number }} title={farmacia.name} />
            </MapView>
          </View>
        )}
      </ScrollView>
      <AdBanner size={BannerAdSize.FULL_BANNER} />
    </>
  );
};

export default DetailScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 10,
  },
  carouselImage: {
    height: 260,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.26,
    borderRadius: 13,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 18,
    borderWidth: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  horarioTable: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 15,
    overflow: 'hidden',
  },
  horarioRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  horarioHeader: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  horarioDia: {
    width: 110,
    fontWeight: 'bold',
    fontSize: 15,
  },
  horarioFranjas: {
    flex: 1,
    fontSize: 15,
    marginLeft: 4,
  },
});
