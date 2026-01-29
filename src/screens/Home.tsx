import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Turno from '../components/Turno';
import AdBanner from '../components/ads/AdBanner';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigationTypes';
import SkeletonCard from '../skeleton/SkeletonCard';
import { usePharmacies } from '../context/PharmacyContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAdSize } from 'react-native-google-mobile-ads';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const Home = () => {
  const { loading } = usePharmacies();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handlePress = () => navigation.navigate('PrimeroAuxilios');
  const localesPress = () => navigation.navigate('Local');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
          <AdBanner size={BannerAdSize.FULL_BANNER} />
        
        {loading ? (
          <SkeletonCard />
        ) : (
          <Turno />
        )}
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.button, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handlePress}
            accessibilityLabel="Ver primeros auxilios"
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Ver Primeros Auxilios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={localesPress}
            accessibilityLabel="Ver locales"
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Ver Locales</Text>
          </TouchableOpacity>
          <View style={{ marginTop: 24 }}>
            <AdBanner size={BannerAdSize.MEDIUM_RECTANGLE} />
          </View>
        </View>
        {/* Puedes poner más cosas abajo si quieres */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    //flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 32,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: '92%',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    elevation: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default Home;
