import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import MapView, { Marker } from 'react-native-maps';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';

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

  const latitude = farmacia.gps?.latitude ?? 0;
  const longitude = farmacia.gps?.longitude ?? 0;

  const makeCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const tieneHorariosNuevos = farmacia.horarios && typeof farmacia.horarios === 'object';

  return (
    <>
      <ScrollView contentContainerStyle={[{ backgroundColor: colors.background }, styles.container]}>
        <Image source={{ uri: farmacia.image || farmacia.detail }} style={[styles.image, { borderColor: colors.border }]} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}>
          <Text style={[styles.title, { color: colors.text }]}>{farmacia.name}</Text>
          <Text style={[styles.info, { color: colors.text }]}>Dirección: {farmacia.dir}</Text>
          <TouchableOpacity onPress={() => makeCall(farmacia.tel)}>
            <Text style={[styles.info, { color: colors.success || '#388e3c', textDecorationLine: 'underline', fontWeight: 'bold' }]}>Teléfono: {farmacia.tel}</Text>
          </TouchableOpacity>
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
  image: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
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
