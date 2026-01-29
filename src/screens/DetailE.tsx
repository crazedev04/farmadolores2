import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes'; // Ajusta la ruta según tu estructura de archivos
import { useTheme } from '../context/ThemeContext';
import MapView, { Marker } from 'react-native-maps';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'DetailE'>;

const DetailE = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const route = useRoute<DetailScreenRouteProp>();
  const { emergencia } = route.params;

  // Extrae latitud y longitud del geopoint de Firebase
  const latitude = emergencia.gps?.latitude ?? 0;
  const longitude = emergencia.gps?.longitude ?? 0;

  const makeCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };
  

  return (
    <>
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={{ uri: emergencia.image || emergencia.detail }} style={[styles.image, { borderColor: colors.border }]} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}>
        <Text style={[styles.title, { color: colors.text }]}>{emergencia.name}</Text>
        <Text style={[styles.info, { color: colors.text }]}>Dirección: {emergencia.dir}</Text>
        <TouchableOpacity onPress={() => makeCall(emergencia.tel)}>
          <Text style={[styles.info, { color: colors.text, textDecorationLine: 'underline' }]}>Teléfono: {emergencia.tel}</Text>
        </TouchableOpacity>
       
      </View>
      {latitude !== 0 && longitude !== 0 && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.020,
              longitudeDelta: 0.010,
            }}
          >
            <Marker coordinate={{ latitude, longitude }} title={emergencia.name} />
          </MapView>
        </View>
      )}
    </ScrollView>
    <AdBanner size={BannerAdSize.FULL_BANNER} />
          </>
  );
};

export default DetailE;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.26, // Ajusta la altura del mapa
    borderRadius: 14,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
