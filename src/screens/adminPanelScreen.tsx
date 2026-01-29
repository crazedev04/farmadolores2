import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';


const AdminPanelScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {theme} = useTheme()
  const colors = theme.colors
  return (
    <View style={[{backgroundColor: colors.background},styles.container]}>
      <Text style={[styles.title, { color: colors.primary }]}>Panel de Administración</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBackground }]}
        onPress={() => navigation.navigate('ActualizarHorarios')}
      >
        <Text style={styles.buttonText}>Actualizar Horarios</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBackground }]}
        onPress={() => navigation.navigate('ActualizarTurnos')}
      >
        <Text style={styles.buttonText}>Actualizar Turnos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBackground }]}
        onPress={() => navigation.navigate('AdminHomeConfig')}
      >
        <Text style={styles.buttonText}>Config Home</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBackground }]}
        onPress={() => navigation.navigate('AdminSuggestions')}
      >
        <Text style={styles.buttonText}>Ver sugerencias</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AdminPanelScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginVertical: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
