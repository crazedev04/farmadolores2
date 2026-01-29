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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';

const TYPE_OPTIONS = ['info', 'warning', 'error'] as const;
const NEWS_TYPE_OPTIONS = ['info', 'warning', 'success'] as const;

type MaintenanceData = {
  enabled: boolean;
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

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [promos, setPromos] = useState<PromoItem[]>([]);

  const [featured, setFeatured] = useState<FeaturedState>(defaultFeatured);
  const [mapConfig, setMapConfig] = useState<MapState>(defaultMap);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [statusSnap, homeSnap] = await Promise.all([
          firestore().collection('config').doc('appStatus').get(),
          firestore().collection('config').doc('home').get(),
        ]);

        if (!mounted) return;

        const statusData = statusSnap.data() || {};
        setMaintenance({
          enabled: Boolean(statusData.enabled),
          message: statusData.message || '',
          type: TYPE_OPTIONS.includes(statusData.type) ? statusData.type : 'info',
          ctaText: statusData.ctaText || '',
          ctaUrl: statusData.ctaUrl || '',
        });

        const homeData = homeSnap.data() || {};
        setNewsEnabled(homeData.newsEnabled !== false);
        setTipsEnabled(homeData.tipsEnabled !== false);
        setPromosEnabled(homeData.promosEnabled !== false);

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
      await Promise.all([
        firestore().collection('config').doc('appStatus').set(
          {
            enabled: maintenance.enabled,
            message: maintenance.message.trim(),
            type: maintenance.type,
            ctaText: maintenance.ctaText.trim(),
            ctaUrl: maintenance.ctaUrl.trim(),
          },
          { merge: true }
        ),
        firestore().collection('config').doc('home').set(
          {
            newsEnabled,
            tipsEnabled,
            promosEnabled,
            news: cleanedNews,
            tips: cleanedTips,
            promos: cleanedPromos,
            featured: buildFeaturedPayload(),
            map: buildMapPayload(),
          },
          { merge: true }
        ),
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
