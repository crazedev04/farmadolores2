import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Linking } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, Farmacia } from '../types/navigationTypes';
import { DateTime } from 'luxon';
import Icon from '@react-native-vector-icons/material-design-icons';
import { openMapsLink } from '../utils/openMapsLink';
import { logEvent } from '../services/analytics';

function printFranjas(franjas: { abre: string, cierra: string }[]) {
  if (!franjas || !franjas.length) return "Cerrado";
  return franjas.map(f =>
    `${f.abre} - ${f.cierra}`
  ).join(" / ");
}

type TurnoCardProps = {
  item: Farmacia;
  onPress?: (item: Farmacia) => void;
  distanceKm?: number | null;
  speedMps?: number | null;
  speedThresholdMps?: number | null;
  distanceDisplayMode?: 'auto' | 'km' | 'min';
  locationDenied?: boolean;
};

const DIAS = [
  'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'
];
const DEFAULT_SPEED_THRESHOLD_MPS = 3;
const DEFAULT_MIN_SPEED_MPS = 1.4;
const ZONA = 'America/Argentina/Buenos_Aires';

const TurnoCard: React.FC<TurnoCardProps> = ({
  item,
  onPress,
  distanceKm,
  speedMps,
  speedThresholdMps,
  distanceDisplayMode,
  locationDenied,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { colors } = theme;
  const telLabel = Array.isArray(item.tel) ? item.tel.join(' / ') : item.tel;
  const detailIsUrl = typeof item.detail === 'string' && item.detail.trim().startsWith('http');
  const imageUri = item.image || (detailIsUrl ? item.detail : '');

  // Día actual, ajustado a Argentina.
  const ahora = DateTime.local().setZone(ZONA);
  const diaHoy = DIAS[ahora.weekday % 7]; // luxon: domingo=7

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // Lógica para horarios nuevos (por día)
  let diaNombre = capitalize(diaHoy);
  let hoyFranjas: { abre: string, cierra: string }[] = [];
  if (item.horarios && typeof item.horarios === 'object' && item.horarios[diaHoy as keyof typeof item.horarios]) {
    hoyFranjas = item?.horarios[diaHoy as keyof typeof item.horarios] || [];
  }

  const status = useMemo(() => {
    if (!hoyFranjas || hoyFranjas.length === 0) return 'Cerrado';
    const now = DateTime.local().setZone(ZONA);
    for (const franja of hoyFranjas) {
      if (!franja.abre || !franja.cierra) continue;
      const [ah, am] = franja.abre.split(':').map(Number);
      const [ch, cm] = franja.cierra.split(':').map(Number);
      let abre = now.set({ hour: ah, minute: am, second: 0, millisecond: 0 });
      let cierra = now.set({ hour: ch, minute: cm, second: 0, millisecond: 0 });
      if (cierra <= abre) cierra = cierra.plus({ days: 1 });
      if (now >= abre && now < cierra) return 'Abierto';
    }
    return 'Cerrado';
  }, [hoyFranjas]);

  const statusColor = status === 'Abierto' ? (colors.success || '#22c55e') : (colors.error || '#ef4444');
  const statusBg = status === 'Abierto' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const statusBorder = status === 'Abierto' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)';

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

  // Lógica para horarios viejos (Mañana/Tarde)
  const formatHora = (t: any) => {
    try {
      return t?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "-";
    }
  };

  const mostrarHorarios = () => {
    if (hoyFranjas && hoyFranjas.length) {
      return (
        <Text style={[styles.info, { color: colors.text }]}>
          <Text style={{ fontWeight: 'bold' }}>
            Horarios de {diaNombre}:
          </Text> {printFranjas(hoyFranjas)}
        </Text>
      );
    }
    // Si NO hay franjas nuevas, muestra los horarios viejos:
    return (
      <>
        <Text style={[styles.info, { color: colors.text }]}>
          <Text style={{ fontWeight: 'bold' }}>Mañana:</Text> {formatHora(item.horarioAperturaMañana)} - {formatHora(item.horarioCierreMañana)}
        </Text>
        <Text style={[styles.info, { color: colors.text }]}>
          <Text style={{ fontWeight: 'bold' }}>Tarde:</Text> {formatHora(item.horarioAperturaTarde)} - {formatHora(item.horarioCierreTarde)}
        </Text>
      </>
    );
  };

  const handlePress = () => {
    logEvent('pharmacy_open', { source: 'turno_card', pharmacy_id: item.id, name: item.name });
    if (onPress) {
      onPress(item);
      return;
    }
    navigation.navigate('Detail', { farmacia: item });
  };

  const openPhone = () => {
    const raw = Array.isArray(item.tel) ? item.tel[0] : item.tel;
    if (!raw) return;
    const clean = String(raw).replace(/[^\d+]/g, '');
    if (!clean) return;
    logEvent('pharmacy_call', { source: 'turno_card', pharmacy_id: item.id, name: item.name });
    Linking.openURL(`tel:${clean}`);
  };

  const openMaps = () => {
    const lat = item.gps?.latitude;
    const lng = item.gps?.longitude;
    logEvent('pharmacy_map', { source: 'turno_card', pharmacy_id: item.id, name: item.name });
    openMapsLink(navigation, { address: item.dir, lat, lng, title: 'Mapa' });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor:'#000' }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.88}>
        {!!imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.pillRow}>
            <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
              <Icon name={status === 'Abierto' ? 'check-circle-outline' : 'close-circle-outline'} size={14} color={statusColor} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Icon name="map-marker-outline" size={16} color={colors.mutedText || colors.placeholderText} />
            <Text style={[styles.info, { color: colors.text }]}>{item.dir}</Text>
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
          <Text style={[styles.subTitle, { color: colors.primary, marginTop: 6, marginBottom: 4 }]}>
            Horario de turno: 24 hs
          </Text>
          {mostrarHorarios()}
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

      <View
        style={[
          styles.turnoBadge,
          {
            backgroundColor: colors.success || '#28a745',
            borderColor: 'rgba(16, 185, 129, 0.6)',
            shadowColor: colors.success || '#28a745',
          },
        ]}
      >
        <Icon name="star-four-points" size={12} color="#fff" />
        <Text style={styles.turnoText}>De Turno</Text>
      </View>
    </View>
  );
};

export default TurnoCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginHorizontal: 16,
    marginVertical: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
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
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
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
  turnoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  turnoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
