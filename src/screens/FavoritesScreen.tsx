import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Linking,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { DateTime } from 'luxon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FavoritePharmacy, subscribeFavorites } from '../services/favoritesService';
import { RootStackParamList, Farmacia } from '../types/navigationTypes';
import { usePharmacies } from '../context/PharmacyContext';
import { logEvent } from '../services/analytics';

const ZONE = 'America/Argentina/Buenos_Aires';

const isOnDuty = (item: Farmacia) => {
  if (!Array.isArray(item?.turn)) return false;
  const now = DateTime.local().setZone(ZONE);
  return item.turn.some((turn) => {
    const date = turn && typeof turn.toDate === 'function' ? turn.toDate() : null;
    if (!date) return false;
    const start = DateTime.fromJSDate(date).setZone(ZONE).set({
      hour: 8,
      minute: 30,
      second: 0,
      millisecond: 0,
    });
    const end = start.plus({ hours: 24 });
    return now >= start && now <= end;
  });
};

const FavoritesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { farmacias } = usePharmacies();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoritePharmacy[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeFavorites(
      user.uid,
      (items) => {
        setFavorites(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [user?.uid]);

  const favoritesWithData = useMemo(() => {
    const byId = new Map(farmacias.map((item) => [item.id, item]));
    const merged = favorites.map((fav) => {
      const full = byId.get(fav.id);
      return {
        favorite: fav,
        full,
        onDuty: full ? isOnDuty(full) : false,
      };
    });
    merged.sort((a, b) => {
      if (a.onDuty !== b.onDuty) return a.onDuty ? -1 : 1;
      return a.favorite.name.localeCompare(b.favorite.name);
    });
    return merged;
  }, [favorites, farmacias]);

  const callPhone = (phone?: string | number) => {
    if (!phone) return;
    const clean = String(phone).replace(/[^\d+]/g, '');
    if (!clean) return;
    Linking.openURL(`tel:${clean}`).catch(() => null);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 20 }]}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>
          Inicia sesion para guardar y consultar tus farmacias favoritas.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Favoritos</Text>
      <FlatList
        data={favoritesWithData}
        keyExtractor={(item) => item.favorite.id}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.mutedText || colors.placeholderText }}>
              Todavia no agregaste farmacias favoritas.
            </Text>
          </View>
        }
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.name, { color: colors.text }]}>{item.favorite.name}</Text>
              {item.onDuty && (
                <View style={[styles.turnBadge, { backgroundColor: colors.success || '#16a34a' }]}>
                  <Text style={{ color: colors.buttonText || '#fff', fontSize: 12, fontWeight: '700' }}>De turno</Text>
                </View>
              )}
            </View>
            <Text style={[styles.meta, { color: colors.mutedText || colors.placeholderText }]}>{item.favorite.dir}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.action, { backgroundColor: colors.buttonBackground }]}
                onPress={() => {
                  if (!item.full) return;
                  logEvent('favorite_open', { pharmacy_id: item.full.id, source: 'favorites' });
                  navigation.navigate('Detail', { farmacia: item.full });
                }}
                disabled={!item.full}
              >
                <Icon name="eye-outline" size={18} color={colors.buttonText || '#fff'} />
                <Text style={[styles.actionText, { color: colors.buttonText || '#fff' }]}>Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => callPhone(item.favorite.tel)}
              >
                <Icon name="phone-outline" size={18} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Llamar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default FavoritesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  turnBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  meta: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  action: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
