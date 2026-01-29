import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Emergencias from '../screens/Emergencias';
import Farmacias from '../screens/Farmacias';
import Home from '../screens/Home';
import Perfil from '../screens/Profile';

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

const Tab = createBottomTabNavigator();

const AuthGateScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();

  return (
    <View style={[styles.authGateContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.authGateText, { color: colors.text }]}>
        Inicia sesión o crea una cuenta para ver tu perfil.
      </Text>
      <View style={styles.authGateButtons}>
        <TouchableOpacity
          style={[styles.authGateButton, { backgroundColor: colors.buttonBackground || colors.primary }]}
          onPress={() => navigation.navigate('Login' as never)}
        >
          <Text style={[styles.authGateButtonText, { color: colors.buttonText || '#fff' }]}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.authGateButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => navigation.navigate('Register' as never)}
        >
          <Text style={[styles.authGateButtonText, { color: colors.text }]}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const BottomTabs: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { isGuest } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color: _color, size }: TabBarIconProps) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home-variant';
              break;
            case 'Farmacias':
              iconName = 'medical-bag';
              break;
            case 'Emergencias':
              iconName = 'ambulance';
              break;
            case 'Perfil':
              iconName = 'account';
              break;
            default:
              iconName = 'help-circle-outline';
              break;
          }

          return (
            <MaterialDesignIcons
              name={iconName}
              size={size}
              color={focused ? colors.iconActive : colors.iconInactive}
            />
          );
        },
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.iconInactive,
        tabBarActiveTintColor: colors.iconActive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Tab.Screen name="Farmacias" component={Farmacias} options={{ headerShown: false }} />
      <Tab.Screen name="Emergencias" component={Emergencias} options={{ headerShown: false }} />
      <Tab.Screen name="Perfil" component={isGuest ? AuthGateScreen : Perfil} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

export default BottomTabs;

const styles = StyleSheet.create({
  authGateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  authGateText: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  authGateButtons: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  authGateButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  authGateButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
