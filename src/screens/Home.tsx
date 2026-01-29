import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@react-native-vector-icons/material-design-icons';
import MapView, { Marker } from 'react-native-maps';
import { DateTime } from 'luxon';

import { useTheme } from '../context/ThemeContext';
import { usePharmacies } from '../context/PharmacyContext';
import { RootStackParamList, Farmacia } from '../types/navigationTypes';
import Turno from '../components/Turno';
import AdBanner from '../components/ads/AdBanner';
import SkeletonCard from '../skeleton/SkeletonCard';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type MaintenanceData = {
  enabled?: boolean;
  message?: string;
  type?: 'info' | 'warning' | 'error';
  ctaText?: string;
  ctaUrl?: string;
};

type NewsItem = {
  enabled?: boolean;
  title?: string;
  body?: string;
  type?: 'info' | 'warning' | 'success';
};

type TipItem = {
  enabled?: boolean;
  title?: string;
  body?: string;
};

type PromoItem = {
  enabled?: boolean;
  title?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
};

type FeaturedConfig = {
  enabled?: boolean;
  pharmacyId?: string;
  name?: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  badge?: string;
};

type MapConfig = {
  enabled?: boolean;
  title?: string;
  lat?: number;
  lng?: number;
};

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

const Home = () => {
  const { loading, farmacias } = usePharmacies();
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [promosEnabled, setPromosEnabled] = useState(true);
  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfig | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const maintenanceRef = firestore()
      .collection('config')
      .doc('appStatus');
    const unsubMaintenance = maintenanceRef.onSnapshot(snapshot => {
      if (!snapshot?.exists) {
        setMaintenance(null);
        return;
      }
      setMaintenance(snapshot.data() as MaintenanceData);
    });
    const homeRef = firestore().collection('config').doc('home');
    const unsubHome = homeRef.onSnapshot(snapshot => {
      if (!snapshot?.exists) {
        setNewsItems([]);
        setNewsEnabled(true);
        setTips([]);
        setTipsEnabled(true);
        setPromos([]);
        setPromosEnabled(true);
        setFeaturedConfig(null);
        setMapConfig(null);
        return;
      }
      const data = snapshot.data() || {};
      setNewsItems(Array.isArray(data.news) ? data.news : []);
      setNewsEnabled(data.newsEnabled !== false);
      setTips(Array.isArray(data.tips) ? data.tips : []);
      setTipsEnabled(data.tipsEnabled !== false);
      setPromos(Array.isArray(data.promos) ? data.promos : []);
      setPromosEnabled(data.promosEnabled !== false);
      setFeaturedConfig(data.featured || null);
      setMapConfig(data.map || null);
    });

    return () => {
      unsubMaintenance();
      unsubHome();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const stored = await AsyncStorage.getItem('notificationsEnabled');
          if (active) {
            setNotificationsEnabled(stored !== 'false');
          }
        } catch {
          if (active) setNotificationsEnabled(true);
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [])
  );

  const nextTurn = useMemo(() => {
    if (!farmacias || farmacias.length === 0) return null;
    const now = DateTime.local().setZone('America/Argentina/Buenos_Aires');
    let best: { pharmacy: Farmacia; start: DateTime } | null = null;
    farmacias.forEach(pharmacy => {
      if (!Array.isArray(pharmacy.turn)) return;
      pharmacy.turn.forEach(t => {
        if (!t || typeof t.toDate !== 'function') return;
        const start = DateTime.fromJSDate(t.toDate())
          .setZone('America/Argentina/Buenos_Aires')
          .set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
        if (start < now) return;
        if (!best || start < best.start) {
          best = { pharmacy, start };
        }
      });
    });
    return best;
  }, [farmacias]);

  const featured = useMemo(() => {
    if (!featuredConfig || featuredConfig.enabled === false) return null;
    if (featuredConfig.pharmacyId) {
      const found = farmacias.find(item => item.id === featuredConfig.pharmacyId);
      if (found) {
        const lat = found.gps?.latitude;
        const lng = found.gps?.longitude;
        return {
          name: found.name,
          address: found.dir,
          phone: found.tel,
          imageUrl: found.detail || found.image,
          mapUrl: featuredConfig.mapUrl,
          lat,
          lng,
          badge: featuredConfig.badge,
        };
      }
    }
    return {
      name: featuredConfig.name,
      address: featuredConfig.address,
      phone: featuredConfig.phone,
      imageUrl: featuredConfig.imageUrl,
      mapUrl: featuredConfig.mapUrl,
      lat: featuredConfig.lat,
      lng: featuredConfig.lng,
      badge: featuredConfig.badge,
    };
  }, [featuredConfig, farmacias]);

  const mapData = useMemo(() => {
    if (mapConfig?.enabled && mapConfig.lat && mapConfig.lng) {
      return {
        title: mapConfig.title || 'Ubicacion',
        lat: mapConfig.lat,
        lng: mapConfig.lng,
      };
    }
    if (featured?.lat && featured?.lng) {
      return {
        title: featured?.name || 'Ubicacion',
        lat: featured.lat,
        lng: featured.lng,
      };
    }
    return null;
  }, [mapConfig, featured]);

  const visibleNews = useMemo(
    () => newsItems.filter(item => item.enabled !== false),
    [newsItems]
  );
  const visibleTips = useMemo(
    () => tips.filter(item => item.enabled !== false),
    [tips]
  );
  const visiblePromos = useMemo(
    () => promos.filter(item => item.enabled !== false),
    [promos]
  );

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // ignore
    }
  };

  const openPhone = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^\d+]/g, '');
    openUrl(`tel:${clean}`);
  };

  const openMaps = (address?: string, lat?: number, lng?: number, mapUrl?: string) => {
    if (mapUrl) {
      openUrl(mapUrl);
      return;
    }
    const query = lat && lng ? `${lat},${lng}` : address;
    if (!query) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    openUrl(url);
  };

  const dayIndex = DateTime.local().weekday % 7;
  const todayLabel = DAYS_ES[dayIndex] || 'Hoy';

  const bannerColor = (type?: string) => {
    if (type === 'error') return colors.error;
    if (type === 'warning') return colors.warning;
    return colors.buttonBackground;
  };

  const bannerIcon = (type?: string) => {
    if (type === 'error') return 'alert-circle-outline';
    if (type === 'warning') return 'alert-outline';
    return 'information-outline';
  };

  const nextTurnLabel = nextTurn
    ? `Proxima farmacia: ${nextTurn?.pharmacy.name} - ${nextTurn.start.toFormat('dd/LL HH:mm')}`
    : 'No hay proximos turnos cargados.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.background} barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
        <AdBanner size={BannerAdSize.FULL_BANNER} />

        {maintenance?.enabled && (
          <View style={[styles.bannerCard, { backgroundColor: colors.card, borderColor: bannerColor(maintenance.type) }]}> 
            <View style={[styles.bannerIconWrap, { backgroundColor: bannerColor(maintenance.type) }]}> 
              <Icon name={bannerIcon(maintenance.type)} size={20} color={colors.buttonText || '#fff'} />
            </View>
            <View style={styles.bannerContent}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>Estado del servicio</Text>
              <Text style={[styles.bannerMessage, { color: colors.mutedText || colors.placeholderText }]}> 
                {maintenance.message || 'Estamos realizando tareas de mantenimiento.'}
              </Text>
              {maintenance.ctaUrl && (
                <TouchableOpacity style={styles.bannerLink} onPress={() => openUrl(maintenance.ctaUrl)}>
                  <Text style={{ color: bannerColor(maintenance.type), fontWeight: '700' }}>
                    {maintenance.ctaText || 'Mas info'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!notificationsEnabled && (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.noticeRow}>
              <Icon name="bell-off-outline" size={20} color={colors.warning} />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                Notificaciones desactivadas. Activalas para recibir avisos de turnos.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.noticeButton, { backgroundColor: colors.buttonBackground }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={{ color: colors.buttonText || '#fff', fontWeight: '700' }}>Ir a ajustes</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Farmacia de turno</Text>
          <View style={styles.dayRow}>
            <Icon name="calendar-blank" size={16} color={colors.text} />
            <Text style={[styles.dayText, { color: colors.text }]}>Hoy {todayLabel}</Text>
          </View>
          {loading ? <SkeletonCard /> : <Turno />}
          <View style={[styles.nextTurnBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name="clock-outline" size={16} color={colors.text} />
            <Text style={[styles.nextTurnText, { color: colors.mutedText || colors.placeholderText }]}>
              {nextTurnLabel}
            </Text>
          </View>
        </View>

        

        {newsEnabled && visibleNews.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Noticias rapidas</Text>
            {visibleNews.slice(0, 3).map((item, idx) => {
              const color = item.type === 'warning'
                ? colors.warning
                : item.type === 'success'
                  ? colors.success
                  : colors.buttonBackground;
              const iconName = item.type === 'warning'
                ? 'alert-outline'
                : item.type === 'success'
                  ? 'check-circle-outline'
                  : 'information-outline';
              return (
                <View key={`${item.title || 'news'}-${idx}`} style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <View style={[styles.newsIcon, { backgroundColor: color }]}> 
                    <Icon name={iconName} size={16} color={colors.buttonText || '#fff'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.newsTitle, { color: colors.text }]}>{item.title || 'Aviso'}</Text>
                    {!!item.body && (
                      <Text style={[styles.newsBody, { color: colors.mutedText || colors.placeholderText }]}> 
                        {item.body}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {tipsEnabled && visibleTips.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips de salud</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {visibleTips.map((tip, idx) => (
                <View key={`${tip.title || 'tip'}-${idx}`} style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title || 'Tip'}</Text>
                  {!!tip.body && (
                    <Text style={[styles.tipBody, { color: colors.mutedText || colors.placeholderText }]}> 
                      {tip.body}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {promosEnabled && visiblePromos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Promos y anuncios</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {visiblePromos.map((promo, idx) => (
                <View key={`${promo.title || 'promo'}-${idx}`} style={[styles.promoCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  {promo.imageUrl && (
                    <Image source={{ uri: promo.imageUrl }} style={styles.promoImage} />
                  )}
                  <Text style={[styles.promoTitle, { color: colors.text }]}>{promo.title || 'Promo'}</Text>
                  {!!promo.body && (
                    <Text style={[styles.promoBody, { color: colors.mutedText || colors.placeholderText }]}> 
                      {promo.body}
                    </Text>
                  )}
                  {!!promo.ctaUrl && (
                    <TouchableOpacity
                      style={[styles.promoButton, { backgroundColor: colors.buttonBackground }]}
                      onPress={() => openUrl(promo.ctaUrl)}
                    >
                      <Text style={{ color: colors.buttonText || '#fff', fontWeight: '700' }}>
                        {promo.ctaText || 'Ver mas'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {mapData && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mapa rapido</Text>
            <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <MapView
                style={styles.map}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                initialRegion={{
                  latitude: mapData.lat,
                  longitude: mapData.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: mapData.lat, longitude: mapData.lng }} title={mapData.title} />
              </MapView>
              <TouchableOpacity
                style={[styles.mapButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => openMaps(mapData.title, mapData.lat, mapData.lng)}
              >
                <Text style={{ color: colors.buttonText || '#fff', fontWeight: '700' }}>Ver en mapa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ marginTop: 24, marginBottom: 12 }}>
          <AdBanner size={BannerAdSize.MEDIUM_RECTANGLE} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextTurnBar: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextTurnText: {
    fontSize: 13,
    flex: 1,
  },
  bannerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
  },
  bannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerMessage: {
    fontSize: 13,
    marginBottom: 6,
  },
  bannerLink: {
    alignSelf: 'flex-start',
  },
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noticeText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  noticeButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  featuredCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#0F172A',
  },
  featuredContent: {
    padding: 14,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featuredText: {
    fontSize: 13,
    marginBottom: 2,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  featuredActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionSpacer: {
    width: 10,
  },
  newsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 10,
  },
  newsIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  newsBody: {
    fontSize: 13,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  tipCard: {
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipBody: {
    fontSize: 13,
  },
  promoCard: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
  },
  promoImage: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#0F172A',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  promoBody: {
    fontSize: 13,
    marginBottom: 8,
  },
  promoButton: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  mapCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 160,
  },
  mapButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
});

export default Home;
