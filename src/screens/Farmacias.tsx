import React from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import FarmaciaCard from '../components/FarmaciaCard'; // Asegúrate de ajustar la ruta de importación según sea necesario
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import SkeletonCard from '../skeleton/SkeletonCard'; // Asegúrate de ajustar la ruta de importación según sea necesario
import { usePharmacies } from '../context/PharmacyContext';
import { useTheme } from '../context/ThemeContext';

const Farmacias: React.FC = () => {
  const { farmacias, loading } = usePharmacies();
  const { theme } = useTheme();
  const { colors } = theme;

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <FlatList
          data={Array(5).fill({})} // Array de 5 elementos vacíos para mostrar los SkeletonCard
          renderItem={() => <SkeletonCard />}
          keyExtractor={(_, index) => index.toString()}
        />
      </View>
    );
  }

  if (farmacias.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.text }]}>No hay farmacias disponibles en este momento.</Text>
      </View>
    );
  }

  return (
    <>
      <AdBanner size={BannerAdSize.FULL_BANNER} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={farmacias}
          renderItem={({ item }) => <FarmaciaCard item={item} />}
          keyExtractor={item => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      </View>
    </>
  );
};

export default Farmacias;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
