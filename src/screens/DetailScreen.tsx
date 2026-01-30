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
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import MapView, { Marker } from 'react-native-maps';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { logEvent } from '../services/analytics';

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
                : <Text style={{ color: colors.disabled || '#888' }}>Cerrado</Text>
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
  const route = useRoute<DetailScreenRouteProp>();
  const { farmacia } = route.params;
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    logEvent('pharmacy_view', { pharmacy_id: farmacia.id, name: farmacia.name });
  }, [farmacia.id, farmacia.name]);

  const latitude = farmacia.gps?.latitude ?? 0;
  const longitude = farmacia.gps?.longitude ?? 0;
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
        </View>
        {latitude !== 0 && longitude !== 0 && (
          <View style={[styles.mapContainer, { borderColor: colors.border }]}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude,
                longitude,
                latitudeDelta: 0.020,
                longitudeDelta: 0.010,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker coordinate={{ latitude, longitude }} title={farmacia.name} />
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
