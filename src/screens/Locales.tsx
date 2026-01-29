import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList, Local } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';

type LocalesListScreenNavigationProp = NavigationProp<RootStackParamList, 'LocalDetail'>;


const LocalesListScreen: React.FC = () => {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<LocalesListScreenNavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;

  useEffect(() => {
    const snapshot = firestore().collection('publi').onSnapshot((querySnapshot) => {
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
        };
      });
      setLocales(localesData);
      setLoading(false);
    })

    return () => snapshot();
  }, []);

  const renderItem = ({ item }: { item: Local }) => (
    <TouchableOpacity style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('LocalDetail', { local: item })}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.descrip, { color: colors.text }]}>{item.descrip}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} />;
  }

  return (
    <>
    <FlatList
      data={locales}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      ListEmptyComponent={
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No hay locales disponibles.
        </Text>
      }
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
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descrip: {
    fontSize: 13,
    opacity: 0.85,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});
