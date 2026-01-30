import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Emergencia } from '../types/navigationTypes';
import Icon from '@react-native-vector-icons/material-design-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { openMapsLink } from '../utils/openMapsLink';
import { logEvent } from '../services/analytics';
import { RootStackParamList } from '../types/navigationTypes';

type EmergenciaCardProps = {
  item: Emergencia;
  onPress: (item: Emergencia) => void;
};

const EmergenciaCard: React.FC<EmergenciaCardProps> = ({ item, onPress }) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { name, dir, tel, image, detail, gps, guardiaEnabled, badge } = item;
  const telLabel = Array.isArray(tel) ? tel.join(' / ') : tel;
  const badgeData = badge || (guardiaEnabled ? { enabled: true, text: 'Guardia 24hs', type: 'urgencias', icon: 'alert-decagram' } : undefined);
  const badgeType = badgeData?.type === 'alerta' || badgeData?.type === 'info' ? badgeData.type : 'urgencias';
  const badgeColor = badgeType === 'alerta'
    ? (colors.warning || '#f59e0b')
    : badgeType === 'info'
      ? (colors.buttonBackground || colors.primary || '#3b82f6')
      : (colors.error || '#ef4444');
  const fallbackIcon = badgeType === 'alerta'
    ? 'alert-outline'
    : badgeType === 'info'
      ? 'information-outline'
      : 'alert-decagram';
  const badgeIcon = badgeData?.icon?.trim() || fallbackIcon;

  const openPhone = () => {
    const raw = Array.isArray(tel) ? tel[0] : tel;
    if (!raw) return;
    const clean = String(raw).replace(/[^\d+]/g, '');
    if (!clean) return;
    logEvent('emergency_call', { emergency_id: item.id, name: item.name });
    Linking.openURL(`tel:${clean}`);
  };

  const openMaps = () => {
    const lat = gps?.latitude;
    const lng = gps?.longitude;
    logEvent('emergency_map', { emergency_id: item.id, name: item.name });
    openMapsLink(navigation, { address: dir, lat, lng, title: 'Mapa' });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}>
      <TouchableOpacity
        onPress={() => {
          logEvent('emergency_open', { emergency_id: item.id, name: item.name });
          onPress(item);
        }}
        activeOpacity={0.88}
      >
        <Image source={{ uri: image || detail }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
          {badgeData?.enabled && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              {!!badgeIcon && <Icon name={badgeIcon} size={14} color="#fff" />}
              <Text style={styles.badgeText}>{badgeData.text || 'Guardia 24hs'}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Icon name="map-marker-outline" size={16} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.info, { color: colors.text }]}>{dir}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone-outline" size={16} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.info, { color: colors.text }]}>{telLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.buttonBackground }]}
          onPress={openPhone}
        >
          <Icon name="phone" size={18} color={colors.buttonText || '#fff'} />
          <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Llamar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={openMaps}
        >
          <Icon name="map-outline" size={18} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Mapa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
  },
  infoContainer: {
    padding: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  info: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  actionButton: {
    flex: 1,
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
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default EmergenciaCard;
