import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { getFirestore, doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
const db = getFirestore();
import { deleteImageByUrl, pickAndUploadImage } from '../utils/uploadImage';

const TYPE_OPTIONS = ['info', 'warning', 'error'] as const;
const NEWS_TYPE_OPTIONS = ['info', 'warning', 'success'] as const;
const ORDER_OPTIONS = [
  { value: 'newest', label: 'Mas nuevo primero' },
  { value: 'oldest', label: 'Mas viejo primero' },
] as const;

type MaintenanceData = {
  enabled: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  ctaText: string;
  ctaUrl: string;
};

type NewsItem = {
  enabled: boolean;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success';
};

type TipItem = {
  enabled: boolean;
  title: string;
  body: string;
};

type PromoItem = {
  enabled: boolean;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
};

type FeaturedState = {
  enabled: boolean;
  pharmacyId: string;
  name: string;
  address: string;
  phone: string;
  imageUrl: string;
  mapUrl: string;
  lat: string;
  lng: string;
  badge: string;
};

type MapState = {
  enabled: boolean;
  title: string;
  lat: string;
  lng: string;
};

const defaultMaintenance: MaintenanceData = {
  enabled: false,
  title: '',
  message: '',
  type: 'info',
  ctaText: '',
  ctaUrl: '',
};

const defaultFeatured: FeaturedState = {
  enabled: false,
  pharmacyId: '',
  name: '',
  address: '',
  phone: '',
  imageUrl: '',
  mapUrl: '',
  lat: '',
  lng: '',
  badge: '',
};

const defaultMap: MapState = {
  enabled: false,
  title: '',
  lat: '',
  lng: '',
};

const AdminHomeConfigScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [maintenance, setMaintenance] = useState<MaintenanceData>(defaultMaintenance);

  const [newsEnabled, setNewsEnabled] = useState(true);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [promosEnabled, setPromosEnabled] = useState(true);
  const [newsOrder, setNewsOrder] = useState<'newest' | 'oldest'>('oldest');
  const [tipsOrder, setTipsOrder] = useState<'newest' | 'oldest'>('oldest');
  const [promosOrder, setPromosOrder] = useState<'newest' | 'oldest'>('oldest');

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [uploadingPromoIndex, setUploadingPromoIndex] = useState<number | null>(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);

  const [featured, setFeatured] = useState<FeaturedState>(defaultFeatured);
  const [mapConfig, setMapConfig] = useState<MapState>(defaultMap);
  const [speedThresholdMps, setSpeedThresholdMps] = useState('3');
  const [distanceDisplayMode, setDistanceDisplayMode] = useState<'auto' | 'km' | 'min'>('auto');
  const [cafecitoUrl, setCafecitoUrl] = useState('');
  const [imageMaxWidth, setImageMaxWidth] = useState('1280');
  const [imageQuality, setImageQuality] = useState('80');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [statusSnap, homeSnap, appSnap] = await Promise.all([
          getDoc(doc(db, 'config', 'appStatus')),
          getDoc(doc(db, 'config', 'home')),
          getDoc(doc(db, 'config', 'app')),
        ]);

        if (!mounted) return;

        const statusData = statusSnap.data() || {};
        setMaintenance({
          enabled: Boolean(statusData.enabled),
          title: statusData.title || '',
          message: statusData.message || '',
          type: TYPE_OPTIONS.includes(statusData.type) ? statusData.type : 'info',
          ctaText: statusData.ctaText || '',
          ctaUrl: statusData.ctaUrl || '',
        });

        const homeData = homeSnap.data() || {};
        setNewsEnabled(homeData.newsEnabled !== false);
        setTipsEnabled(homeData.tipsEnabled !== false);
        setPromosEnabled(homeData.promosEnabled !== false);
        setNewsOrder(homeData.newsOrder === 'newest' ? 'newest' : 'oldest');
        setTipsOrder(homeData.tipsOrder === 'newest' ? 'newest' : 'oldest');
        setPromosOrder(homeData.promosOrder === 'newest' ? 'newest' : 'oldest');
        setSpeedThresholdMps(
          homeData.speedThresholdMps != null ? String(homeData.speedThresholdMps) : '3'
        );
        if (homeData.distanceDisplayMode === 'km' || homeData.distanceDisplayMode === 'min' || homeData.distanceDisplayMode === 'auto') {
          setDistanceDisplayMode(homeData.distanceDisplayMode);
        }

        const normalizeNews = (item: any): NewsItem => ({
          enabled: item?.enabled !== false,
          title: item?.title || '',
          body: item?.body || '',
          type: NEWS_TYPE_OPTIONS.includes(item?.type) ? item.type : 'info',
        });
        const normalizeTip = (item: any): TipItem => ({
          enabled: item?.enabled !== false,
          title: item?.title || '',
          body: item?.body || '',
        });
        const normalizePromo = (item: any): PromoItem => ({
          enabled: item?.enabled !== false,
          title: item?.title || '',
          body: item?.body || '',
          ctaText: item?.ctaText || '',
          ctaUrl: item?.ctaUrl || '',
          imageUrl: item?.imageUrl || '',
        });

        setNewsItems(Array.isArray(homeData.news) ? homeData.news.map(normalizeNews) : []);
        setTips(Array.isArray(homeData.tips) ? homeData.tips.map(normalizeTip) : []);
        setPromos(Array.isArray(homeData.promos) ? homeData.promos.map(normalizePromo) : []);

        const featuredData = homeData.featured || {};
        setFeatured({
          enabled: featuredData.enabled === true,
          pharmacyId: featuredData.pharmacyId || '',
          name: featuredData.name || '',
          address: featuredData.address || '',
          phone: featuredData.phone || '',
          imageUrl: featuredData.imageUrl || '',
          mapUrl: featuredData.mapUrl || '',
          lat: featuredData.lat != null ? String(featuredData.lat) : '',
          lng: featuredData.lng != null ? String(featuredData.lng) : '',
          badge: featuredData.badge || '',
        });

        const mapData = homeData.map || {};
        setMapConfig({
          enabled: mapData.enabled === true,
          title: mapData.title || '',
          lat: mapData.lat != null ? String(mapData.lat) : '',
          lng: mapData.lng != null ? String(mapData.lng) : '',
        });

        const appData = appSnap.data() || {};
        setCafecitoUrl(appData.cafecitoUrl || '');
        setImageMaxWidth(
          appData.imageMaxWidth != null ? String(appData.imageMaxWidth) : '1280'
        );
        setImageQuality(
          appData.imageQuality != null ? String(appData.imageQuality) : '80'
        );
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar la configuracion.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const parseNumber = (value: string) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  };

  const cleanedNews = useMemo(() => {
    return newsItems
      .map(item => ({
        enabled: item.enabled !== false,
        title: item.title.trim(),
        body: item.body.trim(),
        type: item.type || 'info',
      }))
      .filter(item => item.title || item.body);
  }, [newsItems]);

  const cleanedTips = useMemo(() => {
    return tips
      .map(item => ({
        enabled: item.enabled !== false,
        title: item.title.trim(),
        body: item.body.trim(),
      }))
      .filter(item => item.title || item.body);
  }, [tips]);

  const cleanedPromos = useMemo(() => {
    return promos
      .map(item => ({
        enabled: item.enabled !== false,
        title: item.title.trim(),
        body: item.body.trim(),
        ctaText: item.ctaText.trim(),
        ctaUrl: item.ctaUrl.trim(),
        imageUrl: item.imageUrl.trim(),
      }))
      .filter(item => item.title || item.body || item.ctaUrl || item.imageUrl);
  }, [promos]);

  const buildFeaturedPayload = () => {
    const payload: any = { enabled: featured.enabled };
    const add = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed) payload[key] = trimmed;
    };
    add('pharmacyId', featured.pharmacyId);
    add('name', featured.name);
    add('address', featured.address);
    add('phone', featured.phone);
    add('imageUrl', featured.imageUrl);
    add('mapUrl', featured.mapUrl);
    add('badge', featured.badge);
    const lat = parseNumber(featured.lat);
    const lng = parseNumber(featured.lng);
    if (lat != null) payload.lat = lat;
    if (lng != null) payload.lng = lng;
    return payload;
  };

  const buildMapPayload = () => {
    const payload: any = { enabled: mapConfig.enabled };
    const title = mapConfig.title.trim();
    if (title) payload.title = title;
    const lat = parseNumber(mapConfig.lat);
    const lng = parseNumber(mapConfig.lng);
    if (lat != null) payload.lat = lat;
    if (lng != null) payload.lng = lng;
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const speedValue = parseNumber(speedThresholdMps);
      const homePayload: any = {
        newsEnabled,
        tipsEnabled,
        promosEnabled,
        newsOrder,
        tipsOrder,
        promosOrder,
        news: cleanedNews,
        tips: cleanedTips,
        promos: cleanedPromos,
        featured: buildFeaturedPayload(),
        map: buildMapPayload(),
      };
      if (speedValue != null && speedValue > 0) {
        homePayload.speedThresholdMps = speedValue;
      }
      homePayload.distanceDisplayMode = distanceDisplayMode;

      const maxWidthValue = parseNumber(imageMaxWidth);
      const qualityValue = parseNumber(imageQuality);
      const appPayload: any = {
        cafecitoUrl: cafecitoUrl.trim(),
      };
      if (maxWidthValue != null) {
        appPayload.imageMaxWidth = maxWidthValue;
      }
      if (qualityValue != null) {
        appPayload.imageQuality = qualityValue;
      }

      await Promise.all([
        setDoc(
          doc(db, 'config', 'appStatus'),
          {
            enabled: maintenance.enabled,
            title: maintenance.title.trim(),
            message: maintenance.message.trim(),
            type: maintenance.type,
            ctaText: maintenance.ctaText.trim(),
            ctaUrl: maintenance.ctaUrl.trim(),
          },
          { merge: true }
        ),
        setDoc(doc(db, 'config', 'home'), homePayload, { merge: true }),
        setDoc(doc(db, 'config', 'app'), appPayload, { merge: true }),
      ]);
      Alert.alert('Listo', 'La configuracion se guardo correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuracion.');
    } finally {
      setSaving(false);
    }
  };

  const updateNews = (index: number, patch: Partial<NewsItem>) => {
    setNewsItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const updateTip = (index: number, patch: Partial<TipItem>) => {
    setTips(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const updatePromo = (index: number, patch: Partial<PromoItem>) => {
    setPromos(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleUploadPromoImage = async (index: number) => {
    setUploadingPromoIndex(index);
    try {
      const result = await pickAndUploadImage('promos', {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 85,
      });
      if (result?.url) {
        updatePromo(index, { imageUrl: result.url });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingPromoIndex(null);
    }
  };

  const handleRemovePromoImage = async (index: number) => {
    const current = promos[index]?.imageUrl;
    if (!current) return;
    await deleteImageByUrl(current);
    updatePromo(index, { imageUrl: '' });
  };

  const handleUploadFeaturedImage = async () => {
    setUploadingFeatured(true);
    try {
      const result = await pickAndUploadImage('featured', {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 80,
      });
      if (result?.url) {
        setFeatured(prev => ({ ...prev, imageUrl: result.url }));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploadingFeatured(false);
    }
  };

  const handleRemoveFeaturedImage = async () => {
    if (!featured.imageUrl) return;
    await deleteImageByUrl(featured.imageUrl);
    setFeatured(prev => ({ ...prev, imageUrl: '' }));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.buttonBackground} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Panel Home</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Estado del servicio</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Habilitado</Text>
          <Switch
            value={maintenance.enabled}
            onValueChange={(value) => setMaintenance(prev => ({ ...prev, enabled: value }))}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={maintenance.enabled ? colors.buttonText || '#fff' : colors.card}
          />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Titulo</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Titulo del aviso"
          placeholderTextColor={colors.placeholderText}
          value={maintenance.title}
          onChangeText={(value) => setMaintenance(prev => ({ ...prev, title: value }))}
        />
        <Text style={[styles.label, { color: colors.text }]}>Mensaje</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Mensaje de mantenimiento"
          placeholderTextColor={colors.placeholderText}
          value={maintenance.message}
          onChangeText={(value) => setMaintenance(prev => ({ ...prev, message: value }))}
        />
        <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map(option => {
            const active = maintenance.type === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                ]}
                onPress={() => setMaintenance(prev => ({ ...prev, type: option }))}
              >
                <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                  {option.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Texto CTA</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Mas info"
          placeholderTextColor={colors.placeholderText}
          value={maintenance.ctaText}
          onChangeText={(value) => setMaintenance(prev => ({ ...prev, ctaText: value }))}
        />
        <Text style={[styles.label, { color: colors.text }]}>URL CTA</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="https://tusitio.com/estado"
          placeholderTextColor={colors.placeholderText}
          value={maintenance.ctaUrl}
          onChangeText={(value) => setMaintenance(prev => ({ ...prev, ctaUrl: value }))}
          autoCapitalize="none"
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Noticias</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Mostrar seccion</Text>
          <Switch
            value={newsEnabled}
            onValueChange={setNewsEnabled}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={newsEnabled ? colors.buttonText || '#fff' : colors.card}
          />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Orden</Text>
        <View style={styles.chipRow}>
          {ORDER_OPTIONS.map(option => {
            const active = newsOrder === option.value;
            return (
              <TouchableOpacity
                key={`news-${option.value}`}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                ]}
                onPress={() => setNewsOrder(option.value)}
              >
                <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {newsItems.map((item, index) => (
          <View key={`news-${index}`} style={[styles.itemCard, { borderColor: colors.border }]}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>Noticia {index + 1}</Text>
              <TouchableOpacity onPress={() => setNewsItems(prev => prev.filter((_, i) => i !== index))}
              >
                <Icon name="trash-can-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: colors.text }]}>Habilitada</Text>
              <Switch
                value={item.enabled}
                onValueChange={(value) => updateNews(index, { enabled: value })}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor={item.enabled ? colors.buttonText || '#fff' : colors.card}
              />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Titulo"
              placeholderTextColor={colors.placeholderText}
              value={item.title}
              onChangeText={(value) => updateNews(index, { title: value })}
            />
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Texto"
              placeholderTextColor={colors.placeholderText}
              value={item.body}
              onChangeText={(value) => updateNews(index, { body: value })}
              multiline
            />
            <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
            <View style={styles.chipRow}>
              {NEWS_TYPE_OPTIONS.map(option => {
                const active = item.type === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.chip,
                      { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                    ]}
                    onPress={() => updateNews(index, { type: option })}
                  >
                    <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                      {option.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border }]}
          onPress={() => setNewsItems(prev => [...prev, { enabled: true, title: '', body: '', type: 'info' }])}
        >
          <Text style={[styles.addButtonText, { color: colors.text }]}>+ Agregar noticia</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tips de salud</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Mostrar seccion</Text>
          <Switch
            value={tipsEnabled}
            onValueChange={setTipsEnabled}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={tipsEnabled ? colors.buttonText || '#fff' : colors.card}
          />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Orden</Text>
        <View style={styles.chipRow}>
          {ORDER_OPTIONS.map(option => {
            const active = tipsOrder === option.value;
            return (
              <TouchableOpacity
                key={`tips-${option.value}`}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                ]}
                onPress={() => setTipsOrder(option.value)}
              >
                <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {tips.map((item, index) => (
          <View key={`tip-${index}`} style={[styles.itemCard, { borderColor: colors.border }]}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>Tip {index + 1}</Text>
              <TouchableOpacity onPress={() => setTips(prev => prev.filter((_, i) => i !== index))}
              >
                <Icon name="trash-can-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: colors.text }]}>Habilitado</Text>
              <Switch
                value={item.enabled}
                onValueChange={(value) => updateTip(index, { enabled: value })}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor={item.enabled ? colors.buttonText || '#fff' : colors.card}
              />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Titulo"
              placeholderTextColor={colors.placeholderText}
              value={item.title}
              onChangeText={(value) => updateTip(index, { title: value })}
            />
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Texto"
              placeholderTextColor={colors.placeholderText}
              value={item.body}
              onChangeText={(value) => updateTip(index, { body: value })}
              multiline
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border }]}
          onPress={() => setTips(prev => [...prev, { enabled: true, title: '', body: '' }])}
        >
          <Text style={[styles.addButtonText, { color: colors.text }]}>+ Agregar tip</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Promos y anuncios</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Mostrar seccion</Text>
          <Switch
            value={promosEnabled}
            onValueChange={setPromosEnabled}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={promosEnabled ? colors.buttonText || '#fff' : colors.card}
          />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Orden</Text>
        <View style={styles.chipRow}>
          {ORDER_OPTIONS.map(option => {
            const active = promosOrder === option.value;
            return (
              <TouchableOpacity
                key={`promos-${option.value}`}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                ]}
                onPress={() => setPromosOrder(option.value)}
              >
                <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {promos.map((item, index) => (
          <View key={`promo-${index}`} style={[styles.itemCard, { borderColor: colors.border }]}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>Promo {index + 1}</Text>
              <TouchableOpacity onPress={() => setPromos(prev => prev.filter((_, i) => i !== index))}
              >
                <Icon name="trash-can-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: colors.text }]}>Habilitada</Text>
              <Switch
                value={item.enabled}
                onValueChange={(value) => updatePromo(index, { enabled: value })}
                trackColor={{ false: colors.border, true: colors.buttonBackground }}
                thumbColor={item.enabled ? colors.buttonText || '#fff' : colors.card}
              />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Titulo"
              placeholderTextColor={colors.placeholderText}
              value={item.title}
              onChangeText={(value) => updatePromo(index, { title: value })}
            />
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Texto"
              placeholderTextColor={colors.placeholderText}
              value={item.body}
              onChangeText={(value) => updatePromo(index, { body: value })}
              multiline
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Texto CTA"
              placeholderTextColor={colors.placeholderText}
              value={item.ctaText}
              onChangeText={(value) => updatePromo(index, { ctaText: value })}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="URL CTA"
              placeholderTextColor={colors.placeholderText}
              value={item.ctaUrl}
              onChangeText={(value) => updatePromo(index, { ctaUrl: value })}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="URL imagen"
              placeholderTextColor={colors.placeholderText}
              value={item.imageUrl}
              onChangeText={(value) => updatePromo(index, { imageUrl: value })}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.uploadButton, { borderColor: colors.border }]}
              onPress={() => handleUploadPromoImage(index)}
              disabled={uploadingPromoIndex === index}
            >
              <Icon name="image-plus" size={18} color={colors.text} />
              <Text style={[styles.uploadText, { color: colors.text }]}>
                {uploadingPromoIndex === index ? 'Subiendo...' : 'Subir imagen'}
              </Text>
            </TouchableOpacity>
            {!!item.imageUrl?.trim() && (
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.border }]}
                onPress={() => handleRemovePromoImage(index)}
              >
                <Icon name="trash-can-outline" size={18} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar imagen</Text>
              </TouchableOpacity>
            )}
            {!!item.imageUrl?.trim() && (
              <Image
                source={{ uri: item.imageUrl.trim() }}
                style={[styles.promoPreview, { borderColor: colors.border }]}
              />
            )}
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border }]}
          onPress={() => setPromos(prev => [...prev, { enabled: true, title: '', body: '', ctaText: '', ctaUrl: '', imageUrl: '' }])}
        >
          <Text style={[styles.addButtonText, { color: colors.text }]}>+ Agregar promo</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Farmacia destacada</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Habilitada</Text>
          <Switch
            value={featured.enabled}
            onValueChange={(value) => setFeatured(prev => ({ ...prev, enabled: value }))}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={featured.enabled ? colors.buttonText || '#fff' : colors.card}
          />
        </View>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}
        >
          Si cargas un pharmacyId, se usa esa farmacia. Si no, se usan los campos manuales.
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="pharmacyId"
          placeholderTextColor={colors.placeholderText}
          value={featured.pharmacyId}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, pharmacyId: value }))}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Nombre"
          placeholderTextColor={colors.placeholderText}
          value={featured.name}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, name: value }))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Direccion"
          placeholderTextColor={colors.placeholderText}
          value={featured.address}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, address: value }))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Telefono"
          placeholderTextColor={colors.placeholderText}
          value={featured.phone}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, phone: value }))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Imagen URL"
          placeholderTextColor={colors.placeholderText}
          value={featured.imageUrl}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, imageUrl: value }))}
          autoCapitalize="none"
        />
        {!!featured.imageUrl?.trim() && (
          <Image
            source={{ uri: featured.imageUrl.trim() }}
            style={[styles.promoPreview, { borderColor: colors.border }]}
          />
        )}
        <TouchableOpacity
          style={[styles.uploadButton, { borderColor: colors.border }]}
          onPress={handleUploadFeaturedImage}
          disabled={uploadingFeatured}
        >
          <Icon name="image-plus" size={18} color={colors.text} />
          <Text style={[styles.uploadText, { color: colors.text }]}>
            {uploadingFeatured ? 'Subiendo...' : 'Subir imagen'}
          </Text>
        </TouchableOpacity>
        {!!featured.imageUrl?.trim() && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: colors.border }]}
            onPress={handleRemoveFeaturedImage}
          >
            <Icon name="trash-can-outline" size={18} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Eliminar imagen</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Badge"
          placeholderTextColor={colors.placeholderText}
          value={featured.badge}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, badge: value }))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Mapa URL"
          placeholderTextColor={colors.placeholderText}
          value={featured.mapUrl}
          onChangeText={(value) => setFeatured(prev => ({ ...prev, mapUrl: value }))}
          autoCapitalize="none"
        />
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Lat"
            placeholderTextColor={colors.placeholderText}
            value={featured.lat}
            onChangeText={(value) => setFeatured(prev => ({ ...prev, lat: value }))}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.inlineInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Lng"
            placeholderTextColor={colors.placeholderText}
            value={featured.lng}
            onChangeText={(value) => setFeatured(prev => ({ ...prev, lng: value }))}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mapa rapido</Text>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Habilitado</Text>
          <Switch
            value={mapConfig.enabled}
            onValueChange={(value) => setMapConfig(prev => ({ ...prev, enabled: value }))}
            trackColor={{ false: colors.border, true: colors.buttonBackground }}
            thumbColor={mapConfig.enabled ? colors.buttonText || '#fff' : colors.card}
          />
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="Titulo"
          placeholderTextColor={colors.placeholderText}
          value={mapConfig.title}
          onChangeText={(value) => setMapConfig(prev => ({ ...prev, title: value }))}
        />
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Lat"
            placeholderTextColor={colors.placeholderText}
            value={mapConfig.lat}
            onChangeText={(value) => setMapConfig(prev => ({ ...prev, lat: value }))}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.inlineInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Lng"
            placeholderTextColor={colors.placeholderText}
            value={mapConfig.lng}
            onChangeText={(value) => setMapConfig(prev => ({ ...prev, lng: value }))}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Enlaces</Text>
        <Text style={[styles.label, { color: colors.text }]}>URL Cafecito</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="https://cafecito.app/tuusuario"
          placeholderTextColor={colors.placeholderText}
          value={cafecitoUrl}
          onChangeText={setCafecitoUrl}
          autoCapitalize="none"
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Imagenes</Text>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Configura el tamaño máximo y la calidad de compresión (WEBP).
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>Ancho maximo (px)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="1280"
          placeholderTextColor={colors.placeholderText}
          value={imageMaxWidth}
          onChangeText={setImageMaxWidth}
          keyboardType="numeric"
        />
        <Text style={[styles.label, { color: colors.text }]}>Calidad (10-100)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="80"
          placeholderTextColor={colors.placeholderText}
          value={imageQuality}
          onChangeText={setImageQuality}
          keyboardType="numeric"
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Distancia</Text>
        <Text style={[styles.helperText, { color: colors.mutedText || colors.placeholderText }]}>
          Umbral de velocidad para mostrar “A X min” en lugar de km (m/s). Ej: 3 = ~11 km/h.
        </Text>
        <View style={styles.chipRow}>
          {(['auto', 'km', 'min'] as const).map(option => {
            const active = distanceDisplayMode === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: active ? colors.buttonBackground : colors.card },
                ]}
                onPress={() => setDistanceDisplayMode(option)}
              >
                <Text style={{ color: active ? colors.buttonText || '#fff' : colors.text, fontWeight: '600' }}>
                  {option === 'auto' ? 'Auto' : option === 'km' ? 'Km' : 'Min'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="3"
          placeholderTextColor={colors.placeholderText}
          value={speedThresholdMps}
          onChangeText={setSpeedThresholdMps}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.buttonBackground }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.buttonText || '#fff'} />
        ) : (
          <Text style={[styles.saveButtonText, { color: colors.buttonText || '#fff' }]}>Guardar cambios</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AdminHomeConfigScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  promoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: '#0F172A',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: {
    fontWeight: '700',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
