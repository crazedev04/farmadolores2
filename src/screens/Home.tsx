import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { openWebLink } from '../utils/openWebLink';
import { openMapsLink } from '../utils/openMapsLink';
import { logEvent } from '../services/analytics';
import { readCache, writeCache } from '../utils/cache';
import { useScreenLoadAnalytics } from '../utils/useScreenLoadAnalytics';
import NetInfo from '@react-native-community/netinfo';
import { BlurView } from '@react-native-community/blur';
import { checkAndApplyHotfix, installManifest, savePendingManifest, setOtaUiHandler, type OtaManifest } from '../services/otaHotfix';
import { requestPermissions } from '../components/Permissions';
import { initPushNotifications } from '../services/pushService';
import { useAuth } from '../context/AuthContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type MaintenanceData = {
  enabled?: boolean;
  title?: string;
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

type OrderMode = 'newest' | 'oldest';

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
const HOME_CACHE_KEY = 'cache:home-config';
const MAINT_CACHE_KEY = 'cache:maintenance';
const HOME_CACHE_TTL_MS = 1000 * 60 * 5; // 5 min
const MAINT_CACHE_TTL_MS = 1000 * 60 * 2; // 2 min

const Home = () => {
  const { loading, farmacias } = usePharmacies();
  const { theme } = useTheme();
  const { colors } = theme;
  const { user } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [newsOrder, setNewsOrder] = useState<OrderMode>('oldest');
  const [tips, setTips] = useState<TipItem[]>([]);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [tipsOrder, setTipsOrder] = useState<OrderMode>('oldest');
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [promosEnabled, setPromosEnabled] = useState(true);
  const [promosOrder, setPromosOrder] = useState<OrderMode>('oldest');
  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfig | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionsDeferred, setPermissionsDeferred] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [otaModalVisible, setOtaModalVisible] = useState(false);
  const [otaManifest, setOtaManifest] = useState<OtaManifest | null>(null);
  const [otaInstalling, setOtaInstalling] = useState(false);
  const [otaMinimized, setOtaMinimized] = useState(false);
  const installTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      const online = !!state.isConnected && reachable !== false;
      setIsOffline(!online);
    });
    let mounted = true;
    const loadCache = async () => {
      const cachedMaint = await readCache<MaintenanceData | null>(MAINT_CACHE_KEY, MAINT_CACHE_TTL_MS);
      if (cachedMaint && mounted) {
        setMaintenance(cachedMaint);
      }
      const cachedHome = await readCache<any>(HOME_CACHE_KEY, HOME_CACHE_TTL_MS);
      if (cachedHome && mounted) {
        setNewsItems(Array.isArray(cachedHome.news) ? cachedHome.news : []);
        setNewsEnabled(cachedHome.newsEnabled !== false);
        setNewsOrder(cachedHome.newsOrder === 'newest' ? 'newest' : 'oldest');
        setTips(Array.isArray(cachedHome.tips) ? cachedHome.tips : []);
        setTipsEnabled(cachedHome.tipsEnabled !== false);
        setTipsOrder(cachedHome.tipsOrder === 'newest' ? 'newest' : 'oldest');
        setPromos(Array.isArray(cachedHome.promos) ? cachedHome.promos : []);
        setPromosEnabled(cachedHome.promosEnabled !== false);
        setPromosOrder(cachedHome.promosOrder === 'newest' ? 'newest' : 'oldest');
        setFeaturedConfig(cachedHome.featured || null);
        setMapConfig(cachedHome.map || null);
      }
    };
    loadCache();

    const maintenanceRef = firestore()
      .collection('config')
      .doc('appStatus');
    const unsubMaintenance = maintenanceRef.onSnapshot(snapshot => {
      if (!snapshot?.exists) {
        setMaintenance(null);
        return;
      }
      const data = snapshot.data() as MaintenanceData;
      setMaintenance(data);
      writeCache(MAINT_CACHE_KEY, data);
    }, () => {
    });
    const homeRef = firestore().collection('config').doc('home');
    const unsubHome = homeRef.onSnapshot(snapshot => {
      if (!snapshot?.exists) {
        setNewsItems([]);
        setNewsEnabled(true);
        setNewsOrder('oldest');
        setTips([]);
        setTipsEnabled(true);
        setTipsOrder('oldest');
        setPromos([]);
        setPromosEnabled(true);
        setPromosOrder('oldest');
        setFeaturedConfig(null);
        setMapConfig(null);
        return;
      }
      const data = snapshot.data() || {};
      setNewsItems(Array.isArray(data.news) ? data.news : []);
      setNewsEnabled(data.newsEnabled !== false);
      setNewsOrder(data.newsOrder === 'newest' ? 'newest' : 'oldest');
      setTips(Array.isArray(data.tips) ? data.tips : []);
      setTipsEnabled(data.tipsEnabled !== false);
      setTipsOrder(data.tipsOrder === 'newest' ? 'newest' : 'oldest');
      setPromos(Array.isArray(data.promos) ? data.promos : []);
      setPromosEnabled(data.promosEnabled !== false);
      setPromosOrder(data.promosOrder === 'newest' ? 'newest' : 'oldest');
      setFeaturedConfig(data.featured || null);
      setMapConfig(data.map || null);
      writeCache(HOME_CACHE_KEY, data);
    }, () => {
    });

    return () => {
      mounted = false;
      unsubscribeNet();
      unsubMaintenance();
      unsubHome();
    };
  }, []);

  useScreenLoadAnalytics('Home', loading);

  useEffect(() => {
    setOtaUiHandler((manifest) => {
      setOtaManifest(manifest);
      setOtaModalVisible(true);
      setOtaMinimized(false);
    });
    return () => setOtaUiHandler(null);
  }, []);

  useEffect(() => {
    return () => {
      if (installTimeoutRef.current) {
        clearTimeout(installTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    checkAndApplyHotfix();
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
          const deferred = await AsyncStorage.getItem('permissionsDeferred');
          const granted = await AsyncStorage.getItem('permissionsGranted');
          if (active) {
            setPermissionsDeferred(deferred === 'true');
            setPermissionsGranted(granted === 'true');
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
    (farmacias as Farmacia[]).forEach(pharmacy => {
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
    const pickImage = (image?: string, detail?: string) => {
      const detailValue = typeof detail === 'string' ? detail.trim() : '';
      return image || (detailValue.startsWith('http') ? detailValue : '');
    };
    if (featuredConfig.pharmacyId) {
      const found = farmacias.find(item => item.id === featuredConfig.pharmacyId);
      if (found) {
        const lat = found.gps?.latitude;
        const lng = found.gps?.longitude;
        return {
          name: found.name,
          address: found.dir,
          phone: found.tel,
          imageUrl: pickImage(found.image, found.detail),
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

  const applyOrder = <T,>(items: T[], order: OrderMode) => {
    if (order === 'newest') return [...items].reverse();
    return items;
  };

  const visibleNews = useMemo(() => {
    const filtered = newsItems.filter(item => item.enabled !== false);
    return applyOrder(filtered, newsOrder);
  }, [newsItems, newsOrder]);

  const visibleTips = useMemo(() => {
    const filtered = tips.filter(item => item.enabled !== false);
    return applyOrder(filtered, tipsOrder);
  }, [tips, tipsOrder]);

  const visiblePromos = useMemo(() => {
    const filtered = promos.filter(item => item.enabled !== false);
    return applyOrder(filtered, promosOrder);
  }, [promos, promosOrder]);

  useEffect(() => {
    if (featured?.imageUrl) {
      Image.prefetch(featured.imageUrl).catch(() => {});
    }
    visiblePromos.slice(0, 3).forEach((promo) => {
      if (promo.imageUrl) {
        Image.prefetch(promo.imageUrl).catch(() => {});
      }
    });
  }, [featured?.imageUrl, visiblePromos]);

  const openUrl = async (url?: string, title?: string, meta?: Record<string, unknown>) => {
    const ok = await openWebLink(navigation, url, title, meta);
    if (!ok) {
      Alert.alert('No se pudo abrir el enlace', 'Verifica que el enlace sea correcto.');
    }
  };

  const openPhone = (phone?: string | string[] | number) => {
    const raw = Array.isArray(phone) ? phone[0] : phone;
    if (!raw) return;
    const clean = String(raw).replace(/[^\d+]/g, '');
    if (!clean) return;
    openUrl(`tel:${clean}`);
  };

  const openMaps = (address?: string, lat?: number, lng?: number, mapUrl?: string) => {
    openMapsLink(navigation, { address, lat, lng, mapUrl, title: 'Mapa' });
  };

  const retryHome = async () => {
    try {
      setReconnecting(true);
      const state = await NetInfo.fetch();
      if (!state.isConnected || state.isInternetReachable === false) {
        Alert.alert('Sin conexion', 'Activa WiFi o datos para actualizar.');
        return;
      }
      const [statusSnap, homeSnap] = await Promise.all([
        firestore().collection('config').doc('appStatus').get(),
        firestore().collection('config').doc('home').get(),
      ]);
      if (statusSnap.exists) {
        const data = statusSnap.data() as MaintenanceData;
        setMaintenance(data);
        setIsOffline(false);
        writeCache(MAINT_CACHE_KEY, data);
      }
      if (homeSnap.exists) {
        const data = homeSnap.data() || {};
        setNewsItems(Array.isArray(data.news) ? data.news : []);
        setNewsEnabled(data.newsEnabled !== false);
        setNewsOrder(data.newsOrder === 'newest' ? 'newest' : 'oldest');
        setTips(Array.isArray(data.tips) ? data.tips : []);
        setTipsEnabled(data.tipsEnabled !== false);
        setTipsOrder(data.tipsOrder === 'newest' ? 'newest' : 'oldest');
        setPromos(Array.isArray(data.promos) ? data.promos : []);
        setPromosEnabled(data.promosEnabled !== false);
        setPromosOrder(data.promosOrder === 'newest' ? 'newest' : 'oldest');
        setFeaturedConfig(data.featured || null);
        setMapConfig(data.map || null);
        setIsOffline(false);
        writeCache(HOME_CACHE_KEY, data);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setReconnecting(false);
    }
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
    ? `Proxima farmacia: ${nextTurn.pharmacy.name} - ${nextTurn.start.toFormat('dd/LL HH:mm')}`
    : 'No hay proximos turnos cargados.';

  const normalizeNotes = (notes?: string | string[]) => {
    if (!notes) return [];
    if (Array.isArray(notes)) return notes.filter(Boolean);
    return notes.split('\n').map((item) => item.trim()).filter(Boolean);
  };

  const notesList = normalizeNotes(otaManifest?.notes);

  const startInstallTimer = () => {
    if (installTimeoutRef.current) {
      clearTimeout(installTimeoutRef.current);
    }
    installTimeoutRef.current = setTimeout(() => {
      setOtaModalVisible(false);
      setOtaMinimized(true);
    }, 15000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar backgroundColor={colors.background} barStyle={theme.dark ? 'light-content' : 'dark-content'} />
        <AdBanner size={BannerAdSize.FULL_BANNER} />
      <Modal
        visible={otaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!otaInstalling) setOtaModalVisible(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!otaInstalling) setOtaModalVisible(false);
          }}
        >
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType={theme.dark ? 'dark' : 'light'}
            blurAmount={12}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.55)"
          />
        </Pressable>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.card, borderColor: colors.border, bottom: Math.max(insets.bottom + 84, 96) },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: colors.buttonBackground }]}>
              <Icon name="update" size={18} color={colors.buttonText || '#fff'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Actualizacion disponible</Text>
              <Text style={[styles.modalText, { color: colors.mutedText || colors.placeholderText }]}>
                Hay mejoras listas para instalar. Se aplicaran al reiniciar la app.
              </Text>
            </View>
          </View>
          {notesList.length > 0 && (
            <View style={styles.modalNotes}>
              <Text style={[styles.modalNotesTitle, { color: colors.text }]}>Novedades</Text>
              {notesList.map((note, index) => (
                <View key={`${note}-${index}`} style={styles.modalNoteRow}>
                  <View style={[styles.modalBullet, { backgroundColor: colors.buttonBackground }]} />
                  <Text style={[styles.modalNoteText, { color: colors.text }]}>{note}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { borderColor: colors.border }]}
              onPress={async () => {
                if (!otaManifest) return;
                try {
                  await savePendingManifest(otaManifest);
                } catch {
                  // ignore
                }
                setOtaModalVisible(false);
                setOtaMinimized(false);
              }}
              disabled={otaInstalling}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Despues</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.buttonBackground }]}
              onPress={async () => {
                if (!otaManifest) return;
                setOtaInstalling(true);
                setOtaMinimized(false);
                startInstallTimer();
                try {
                  await installManifest(otaManifest, 'user');
                } catch {
                  Alert.alert('No se pudo instalar', 'Reintenta en unos minutos.');
                  setOtaInstalling(false);
                  setOtaMinimized(false);
                  if (installTimeoutRef.current) {
                    clearTimeout(installTimeoutRef.current);
                  }
                }
              }}
            >
              {otaInstalling ? (
                <ActivityIndicator color={colors.buttonText || '#fff'} />
              ) : (
                <Text style={[styles.modalButtonText, { color: colors.buttonText || '#fff' }]}>Instalar ahora</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {otaMinimized && otaInstalling && (
        <View
          style={[
            styles.otaMiniCard,
            { backgroundColor: colors.card, borderColor: colors.border, bottom: Math.max(insets.bottom + 70, 80) },
          ]}
        >
          <ActivityIndicator color={colors.buttonBackground} />
          <Text style={[styles.otaMiniText, { color: colors.text }]}>Actualizando...</Text>
          <TouchableOpacity
            style={styles.otaMiniButton}
            onPress={() => {
              setOtaModalVisible(true);
              setOtaMinimized(false);
            }}
          >
            <Text style={[styles.otaMiniButtonText, { color: colors.buttonBackground }]}>Ver</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>

        {isOffline && (
          <View style={[styles.offlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name="cloud-off-outline" size={18} color={colors.warning} />
            <Text style={[styles.offlineText, { color: colors.text }]}>
              Sin conexion. Mostrando datos guardados.
            </Text>
            <TouchableOpacity
              style={[styles.offlineButton, { borderColor: colors.border }]}
              onPress={retryHome}
              disabled={reconnecting}
            >
              {reconnecting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.offlineButtonText, { color: colors.text }]}>Reintentar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {maintenance?.enabled && (
          <View style={[styles.bannerCard, { backgroundColor: colors.card, borderColor: bannerColor(maintenance.type) }]}> 
            <View style={[styles.bannerIconWrap, { backgroundColor: bannerColor(maintenance.type) }]}> 
              <Icon name={bannerIcon(maintenance.type)} size={20} color={colors.buttonText || '#fff'} />
            </View>
            <View style={styles.bannerContent}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                {maintenance.title || 'Estado del servicio'}
              </Text>
              <Text style={[styles.bannerMessage, { color: colors.mutedText || colors.placeholderText }]}> 
                {maintenance.message || 'Estamos realizando tareas de mantenimiento.'}
              </Text>
              {maintenance.ctaUrl && (
                <TouchableOpacity
                  style={styles.bannerLink}
                  onPress={() => {
                    logEvent('service_status_click', {
                      type: maintenance.type || 'info',
                      message: maintenance.message || '',
                    });
                    openUrl(maintenance.ctaUrl, maintenance.ctaText || 'Estado', { source: 'service_status' });
                  }}
                >
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
              onPress={() => {
                logEvent('notifications_settings_open', { source: 'home' });
                navigation.navigate('Settings');
              }}
            >
              <Text style={{ color: colors.buttonText || '#fff', fontWeight: '700' }}>Ir a ajustes</Text>
            </TouchableOpacity>
          </View>
        )}

        {permissionsDeferred && !permissionsGranted && (
          <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.noticeRow}>
              <Icon name="shield-account-outline" size={20} color={colors.warning} />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                Te faltan permisos para mostrar turnos y avisos. Podes activarlos ahora.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.noticeButton, { backgroundColor: colors.buttonBackground }]}
              onPress={async () => {
                const granted = await requestPermissions();
                if (granted) {
                  setPermissionsGranted(true);
                  setPermissionsDeferred(false);
                  initPushNotifications(user?.uid || null, true);
                }
              }}
            >
              <Text style={{ color: colors.buttonText || '#fff', fontWeight: '700' }}>Dar permisos</Text>
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accesos</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                logEvent('home_quick_access', { target: 'first_aid' });
                navigation.navigate('PrimeroAuxilios');
              }}
            >
              <Icon name="medical-bag" size={22} color={colors.buttonBackground} />
              <Text style={[styles.quickTitle, { color: colors.text }]}>Primeros auxilios</Text>
              <Text style={[styles.quickSubtitle, { color: colors.mutedText || colors.placeholderText }]}>
                Guias y consejos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                logEvent('home_quick_access', { target: 'locales' });
                navigation.navigate('Local');
              }}
            >
              <Icon name="storefront-outline" size={22} color={colors.buttonBackground} />
              <Text style={[styles.quickTitle, { color: colors.text }]}>Locales</Text>
              <Text style={[styles.quickSubtitle, { color: colors.mutedText || colors.placeholderText }]}>
                Ver comercios
              </Text>
            </TouchableOpacity>
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
                <TouchableOpacity
                  key={`${item.title || 'news'}-${idx}`}
                  style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => logEvent('news_click', { title: item.title || '', type: item.type || 'info', index: idx })}
                >
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
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {tipsEnabled && visibleTips.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips de salud</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {visibleTips.map((tip, idx) => (
                <TouchableOpacity
                  key={`${tip.title || 'tip'}-${idx}`}
                  style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => logEvent('tip_click', { title: tip.title || '', index: idx })}
                >
                  <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title || 'Tip'}</Text>
                  {!!tip.body && (
                    <Text style={[styles.tipBody, { color: colors.mutedText || colors.placeholderText }]}> 
                      {tip.body}
                    </Text>
                  )}
                </TouchableOpacity>
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
                      onPress={() => {
                        logEvent('promo_click', { title: promo.title || '', index: idx });
                        openUrl(promo.ctaUrl, promo.title || 'Promo', { source: 'promo' });
                      }}
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
                onPress={() => {
                  logEvent('map_open', { source: 'home_map', title: mapData.title || '' });
                  openMaps(mapData.title, mapData.lat, mapData.lng);
                }}
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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalText: {
    fontSize: 13,
  },
  modalNotes: {
    marginBottom: 14,
    gap: 6,
  },
  modalNotesTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalNoteText: {
    fontSize: 13,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalPrimaryButton: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  otaMiniCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otaMiniText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  otaMiniButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  otaMiniButtonText: {
    fontSize: 13,
    fontWeight: '700',
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 16,
  },
  quickCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickSubtitle: {
    fontSize: 12,
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
  offlineCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineText: {
    fontSize: 13,
    flex: 1,
  },
  offlineButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  offlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
