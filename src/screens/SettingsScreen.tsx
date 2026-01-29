import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '@react-native-vector-icons/material-design-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import AnimatedToggleSwitch from '../components/AnimatedToggleSwitch';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermission } from '../components/Permissions';
import { cancelTurnoNotifications } from '../services/TurnoService';

const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { colors } = theme;
  const { logout, loading } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isDarkTheme, setIsDarkTheme] = useState(theme.dark);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleToggleTheme = () => {
    toggleTheme();
    setIsDarkTheme(!isDarkTheme);
  };

  useEffect(() => {
    const loadNotifications = async () => {
      const stored = await AsyncStorage.getItem('notificationsEnabled');
      setNotificationsEnabled(stored !== 'false');
    };
    loadNotifications();
  }, []);

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      await AsyncStorage.setItem('notificationsEnabled', 'false');
      await cancelTurnoNotifications();
      return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationsEnabled(true);
      await AsyncStorage.setItem('notificationsEnabled', 'true');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Configuracion</Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferencias</Text>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Icon name="theme-light-dark" size={22} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Tema</Text>
          </View>
          <AnimatedToggleSwitch isOn={isDarkTheme} onToggle={handleToggleTheme} />
        </View>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Icon name="bell-outline" size={22} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Notificaciones</Text>
          </View>
          <AnimatedToggleSwitch isOn={notificationsEnabled} onToggle={handleToggleNotifications} />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cuenta</Text>
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('EditProfile')}>
          <View style={styles.rowLeft}>
            <Icon name="account-edit" size={22} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Editar perfil</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('Suggestions')}>
          <View style={styles.rowLeft}>
            <Icon name="message-text-outline" size={22} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Sugerencias</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('ReportProblem')}>
          <View style={styles.rowLeft}>
            <Icon name="alert-circle" size={22} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Reportar problema</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Help')}>
          <View style={styles.rowLeft}>
            <Icon name="help-circle-outline" size={22} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Ayuda</Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sesion</Text>
        {loading ? (
          <View style={styles.row}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <Icon name="logout" size={22} color={colors.error} />
            <Text style={[styles.rowText, { color: colors.error }]}>Cerrar sesion</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.versionContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.versionText, { color: colors.text }]}>Version {DeviceInfo.getVersion()}</Text>
      </View>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 15,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  versionContainer: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  versionText: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.85,
  },
});
