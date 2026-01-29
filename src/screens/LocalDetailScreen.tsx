import React from 'react';
import { StyleSheet, Text, View, Image, Button, Linking } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';

type LocalDetailScreenRouteProp = RouteProp<RootStackParamList, 'LocalDetail'>;

const LocalDetailScreen: React.FC = () => {
  const route = useRoute<LocalDetailScreenRouteProp>();
  const { local } = route.params;
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image source={{ uri: local.image }} style={styles.image} />
        <Text style={[styles.name, { color: colors.text }]}>{local.name}</Text>
        <Text style={[styles.descrip, { color: colors.text }]}>{local.descrip}</Text>
        <Text style={[styles.direccion, { color: colors.text }]}>{local.direccion}</Text>
        <Text style={[styles.tel, { color: colors.text }]}>{local.tel}</Text>
        <Button title="Visitar" color={colors.buttonBackground} onPress={() => Linking.openURL(local.url)} />
      </View>
    </View>
    <AdBanner size={BannerAdSize.FULL_BANNER} />
    </>
  );
};

export default LocalDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  descrip: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  direccion: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  tel: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
});
