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
import AdBanner from '../components/ads/AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import Icon from '@react-native-vector-icons/material-design-icons';
import { openWebLink } from '../utils/openWebLink';
import { openMapsLink } from '../utils/openMapsLink';
import { logEvent } from '../services/analytics';


type LocalDetailScreenRouteProp = RouteProp<RootStackParamList, 'LocalDetail'>;

const LocalDetailScreen: React.FC = () => {
  const route = useRoute<LocalDetailScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { local } = route.params;
  const { theme } = useTheme();
  const { colors } = theme;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    logEvent('local_view', { local_id: local.id, name: local.name });
  }, [local.id, local.name]);

  const carouselWidth = Math.max(0, Dimensions.get('window').width - 32);

  const { images, description } = useMemo(() => {
    const rawGallery = Array.isArray((local as any).gallery)
      ? (local as any).gallery.filter((uri: string) => typeof uri === 'string' && uri.trim().length > 0)
      : [];
    const fallbackImage = local.image ? [local.image] : [];
    return {
      images: rawGallery.length > 0 ? rawGallery : fallbackImage,
      description: local.descrip || '',
    };
  }, [local]);

  const telLabel = Array.isArray(local.tel) ? local.tel.join(' / ') : local.tel;

  const makeCall = (phoneNumber?: string | string[] | number) => {
    const raw = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;
    if (!raw) return;
    const clean = String(raw).replace(/[^\d+]/g, '');
    if (!clean) return;
    logEvent('local_call', { local_id: local.id, name: local.name });
    Linking.openURL(`tel:${clean}`);
  };

  const openWebsite = () => {
    logEvent('local_website', { local_id: local.id, name: local.name });
    openWebLink(navigation, local.url, local.name);
  };

  const openMaps = () => {
    logEvent('local_map', { local_id: local.id, name: local.name });
    openMapsLink(navigation, { address: local.direccion, title: 'Mapa' });
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      >
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
                  style={[styles.carouselImage, { width: carouselWidth, borderColor: colors.border }]}
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
                        { backgroundColor: isActive ? colors.buttonBackground : colors.border },
                      ]}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.name, { color: colors.text }]}>{local.name}</Text>
          {!!description && (
            <Text style={[styles.descrip, { color: colors.mutedText || colors.placeholderText }]}
            >
              {description}
            </Text>
          )}
          {!!local.direccion && (
            <View style={styles.metaRow}>
              <Icon name="map-marker-outline" size={16} color={colors.mutedText || colors.placeholderText} />
              <Text style={[styles.metaText, { color: colors.text }]}>{local.direccion}</Text>
            </View>
          )}
          {!!telLabel && (
            <TouchableOpacity style={styles.metaRow} onPress={() => makeCall(local.tel)}>
              <Icon name="phone-outline" size={16} color={colors.mutedText || colors.placeholderText} />
              <Text style={[styles.metaText, { color: colors.text }]}>{telLabel}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.buttonBackground }]}
              onPress={openWebsite}
              disabled={!local.url}
            >
              <Icon name="web" size={18} color={colors.buttonText || '#fff'} />
              <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Visitar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={openMaps}
              disabled={!local.direccion}
            >
              <Icon name="map-outline" size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => makeCall(local.tel)}
              disabled={!telLabel}
            >
              <Icon name="phone" size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Llamar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AdBanner size={BannerAdSize.FULL_BANNER} />
    </>
  );
};

export default LocalDetailScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  carouselImage: {
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: '#0F172A',
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
    padding: 16,
    gap: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  descrip: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
