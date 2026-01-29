import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Emergencia } from '../types/navigationTypes';

type EmergenciaCardProps = {
  item: Emergencia;
  onPress: (item: Emergencia) => void;
};

const EmergenciaCard: React.FC<EmergenciaCardProps> = ({ item, onPress }) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { name, dir, tel, image, detail } = item;

  return (
    <TouchableOpacity onPress={() => onPress(item)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}>
        <Image source={{ uri: image || detail }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.info, { color: colors.text }]}>Dirección: {dir}</Text>
          <Text style={[styles.info, { color: colors.text }]}>Teléfono: {tel}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
    marginVertical: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  infoContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
  },
});

export default EmergenciaCard;
