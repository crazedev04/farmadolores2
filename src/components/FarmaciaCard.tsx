import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DateTime } from 'luxon';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, Farmacia as FarmaciaType } from '../types/navigationTypes';
import { NavigationProp } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { openMapsLink } from '../utils/openMapsLink';
import { logEvent } from '../services/analytics';

type Status = 'Abierto' | 'CierraPronto' | 'Cerrado';

const ZONA = 'America/Argentina/Buenos_Aires';
const AVISO_MINUTOS = 30;
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

function getHoyInfo(horarios: any) {
  const now = DateTime.local().setZone(ZONA);
  const diaIndex = now.weekday - 1; // 0 (lunes) - 6 (domingo)
  const diaNombre = DIAS[diaIndex];
  return {
    diaNombre,
    franjas: (horarios && horarios[diaNombre]) || [],
  };
}

function getStatus(horarios: any): Status {
  const now = DateTime.local().setZone(ZONA);
  const { franjas } = getHoyInfo(horarios);

  for (const franja of franjas) {
    if (!franja.abre || !franja.cierra) continue;
    const [ah, am] = franja.abre.split(':').map(Number);
    const [ch, cm] = franja.cierra.split(':').map(Number);

    let abre = now.set({ hour: ah, minute: am, second: 0, millisecond: 0 });
    let cierra = now.set({ hour: ch, minute: cm, second: 0, millisecond: 0 });

    // Si cierra después de las 00:00, sumarle un día
    if (cierra <= abre) cierra = cierra.plus({ days: 1 });

    if (now >= abre && now < cierra) {
      if (now >= cierra.minus({ minutes: AVISO_MINUTOS })) return "CierraPronto";
      return "Abierto";
    }
  }
  return "Cerrado";
}

function printFranjas(franjas: { abre: string, cierra: string }[]) {
  if (!franjas.length) return "Cerrado";
  return franjas.map(f =>
    `${f.abre} - ${f.cierra}`
  ).join(" / ");
}

type FarmaciaCardProps = {
  item: FarmaciaType & { horarios?: any };
  onPress?: (item: FarmaciaType) => void;
  distanceKm?: number | null;
  speedMps?: number | null;
  speedThresholdMps?: number | null;
  distanceDisplayMode?: 'auto' | 'km' | 'min';
  locationDenied?: boolean;
};

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    position: 'relative',
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  turnoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  turnoPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
});

const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const DEFAULT_SPEED_THRESHOLD_MPS = 3;
const DEFAULT_MIN_SPEED_MPS = 1.4;

const FarmaciaCard: React.FC<FarmaciaCardProps> = ({
  item,
  locationDenied,
  onPress,
  distanceKm,
  speedMps,
  speedThresholdMps,
  distanceDisplayMode,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { colors } = theme;
  const { name, dir, tel, detail, horarios,  } = item as any;
  const telLabel = Array.isArray(tel) ? tel.join(' / ') : tel;
  const detailIsUrl = typeof detail === 'string' && detail.trim().startsWith('http');
  const imageUri = item.image || (detailIsUrl ? detail : '');

  const [status, setStatus] = useState<Status>('Cerrado');
  const [diaNombre, setDiaNombre] = useState('');
  const [hoyFranjas, setHoyFranjas] = useState<{ abre: string, cierra: string }[]>([]);

  useEffect(() => {
    const update = () => {
      setStatus(getStatus(horarios));
      const { diaNombre, franjas } = getHoyInfo(horarios);
      setDiaNombre(diaNombre);
      setHoyFranjas(franjas);
    };
    update();
    const intervalId = setInterval(update, 30 * 1000);
    return () => clearInterval(intervalId);
  }, [horarios]);

  const statusLabel = status === 'CierraPronto' ? 'Cierra pronto' : status;
  const statusColor = status === 'Abierto'
    ? (colors.success || '#22c55e')
    : status === 'CierraPronto'
      ? (colors.warning || '#f59e0b')
      : (colors.error || '#ef4444');
  const statusIcon = status === 'Abierto'
    ? 'check-circle-outline'
    : status === 'CierraPronto'
      ? 'clock-alert-outline'
      : 'close-circle-outline';
  const statusBg = hexToRgba(statusColor, 0.15);
  const statusBorder = hexToRgba(statusColor, 0.35);
  const turnoColor = colors.success || '#10b981';

  const isTurno = useMemo(() => {
    if (!Array.isArray(item?.turn)) return false;
    const now = DateTime.local().setZone(ZONA);
    return item.turn.some((t: any) => {
      const date = t && typeof t.toDate === 'function'
        ? t.toDate()
        : (t instanceof Date ? t : null);
      if (!date) return false;
      const start = DateTime.fromJSDate(date).setZone(ZONA).set({
        hour: 8,
        minute: 30,
        second: 0,
        millisecond: 0,
      });
      const end = start.plus({ hours: 24 });
      return now >= start && now <= end;
    });
  }, [item?.turn]);

  const distanceLabel = useMemo(() => {
    if (distanceKm == null || Number.isNaN(distanceKm)) return null;
    const mode = distanceDisplayMode || 'auto';
    const roundedKm = distanceKm < 10 ? distanceKm.toFixed(1) : distanceKm.toFixed(0);

    if (mode === 'km') {
      return `${roundedKm} km`;
    }

    const fallbackSpeed = speedThresholdMps ?? DEFAULT_MIN_SPEED_MPS;
    const speedToUse = (speedMps && speedMps > 0) ? speedMps : fallbackSpeed;

    if (mode === 'min') {
      if (!speedToUse || speedToUse <= 0) return `${roundedKm} km`;
      const minutes = Math.max(1, Math.round((distanceKm * 1000) / speedToUse / 60));
      return `A ${minutes} min`;
    }

    const threshold = speedThresholdMps ?? DEFAULT_SPEED_THRESHOLD_MPS;
    if (speedMps != null && speedMps >= threshold) {
      const minutes = Math.max(1, Math.round((distanceKm * 1000) / speedMps / 60));
      return `A ${minutes} min`;
    }
    return `${roundedKm} km`;
  }, [distanceKm, speedMps, speedThresholdMps, distanceDisplayMode]);

  const showLocationHint = !distanceLabel && locationDenied;

  const handlePress = () => {
    logEvent('pharmacy_open', { source: 'farmacia_card', pharmacy_id: item.id, name: item.name });
    if (onPress) {
      onPress(item);
      return;
    }
    navigation.navigate('Detail', { farmacia: item });
  };

  const openPhone = () => {
    const raw = Array.isArray(tel) ? tel[0] : tel;
    if (!raw) return;
    const clean = String(raw).replace(/[^\d+]/g, '');
    if (!clean) return;
    logEvent('pharmacy_call', { source: 'farmacia_card', pharmacy_id: item.id, name: item.name });
    Linking.openURL(`tel:${clean}`);
  };

  const openMaps = () => {
    const lat = item.gps?.latitude;
    const lng = item.gps?.longitude;
    logEvent('pharmacy_map', { source: 'farmacia_card', pharmacy_id: item.id, name: item.name });
    openMapsLink(navigation, { address: dir, lat, lng, title: 'Mapa' });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: theme.dark ? '#000' : '#000' }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.88}>
        {!!imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
          <View style={styles.pillRow}>
            <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
              <Icon name={statusIcon} size={14} color={statusColor} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {isTurno && (
              <View
                style={[
                  styles.turnoPill,
                  {
                    backgroundColor: turnoColor,
                    borderColor: hexToRgba(turnoColor, 0.6),
                    shadowColor: turnoColor,
                  },
                ]}
              >
                <Icon name="star-four-points" size={12} color="#fff" />
                <Text style={styles.turnoPillText}>De turno</Text>
              </View>
            )}
          </View>
          <View style={styles.infoRow}>
            <Icon name="map-marker-outline" size={16} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.info, { color: colors.text }]}>{dir}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone-outline" size={16} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.info, { color: colors.text }]}>{telLabel}</Text>
          </View>
          {distanceLabel && (
            <View style={styles.infoRow}>
              <Icon name="map-marker-distance" size={16} color={colors.mutedText || colors.placeholderText} />
              <Text style={[styles.info, { color: colors.text }]}>{distanceLabel}</Text>
            </View>
          )}
          {showLocationHint && (
            <View style={styles.infoRow}>
              <Icon name="map-marker-off-outline" size={16} color={colors.mutedText || colors.placeholderText} />
              <Text style={[styles.info, { color: colors.mutedText || colors.placeholderText }]}>
                Activá ubicación para ver distancia
              </Text>
            </View>
          )}
          <Text style={[styles.info, { color: colors.text }]}>
            <Text style={{ fontWeight: 'bold' }}>
              Horarios de {capitalize(diaNombre)}:
            </Text> {printFranjas(hoyFranjas)}
          </Text>
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

export default FarmaciaCard;
