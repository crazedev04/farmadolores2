import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { usePharmacies } from '../context/PharmacyContext';
import SkeletonCard from '../skeleton/SkeletonCard';
import { DateTime } from 'luxon';
import { useTheme } from '../context/ThemeContext';
import TurnoCard from './TurnoCard';
import Icon from '@react-native-vector-icons/material-design-icons';

const Turno: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { farmacias, loading, fetchPharmacies } = usePharmacies();
  const { matchingPharmacy, errorMessage } = useMemo(() => {
    try {
      const now = DateTime.local().setZone('America/Argentina/Buenos_Aires');
      const match = farmacias?.find((pharmacy) => {
        if (!Array.isArray(pharmacy?.turn)) return false;
        return pharmacy.turn.some((t) => {
          if (!t || typeof t.toDate !== 'function') return false;
          let turnStart;
          try {
            turnStart = DateTime.fromJSDate(t.toDate()).set({
              hour: 8,
              minute: 30,
              second: 0,
              millisecond: 0,
            });
          } catch {
            return false;
          }
          const turnEnd = turnStart.plus({ hours: 24 });
          return now >= turnStart && now <= turnEnd;
        });
      });
      return { matchingPharmacy: match, errorMessage: null };
    } catch (e: any) {
      return { matchingPharmacy: undefined, errorMessage: 'Ocurrió un error mostrando la farmacia de turno.' };
    }
  }, [farmacias]);

  if (loading) {
    return <SkeletonCard />;
  }

  const handleReload = () => {
    fetchPharmacies();
  };

  if (errorMessage) {
    return (
      <View style={styles.noTurnos}>
        <Text style={[styles.noTurnosText, { color: colors.text }]}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleReload}
        >
          <Icon name="reload" size={40} color={colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matchingPharmacy ? (
        <TurnoCard item={matchingPharmacy} />
      ) : (
        <View style={styles.noTurnos}>
          <Text style={[styles.noTurnosText, { color: colors.text }]}>
            No hay farmacias de turno en este momento
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleReload}
          >
            <Icon name="reload" size={40} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};



export default Turno;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  noTurnos: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTurnosText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 16,
    padding: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
});
