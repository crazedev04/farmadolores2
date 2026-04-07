import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Admin Screens
import AdminPanelScreen from '../../screens/adminPanelScreen';
import AdminHomeConfigScreen from '../../screens/AdminHomeConfigScreen';
import AdminSuggestionsScreen from '../../screens/AdminSuggestionsScreen';
import AdminEmergenciasScreen from '../../screens/AdminEmergenciasScreen';
import AdminFarmaciasScreen from '../../screens/AdminFarmaciasScreen';
import AdminEmergenciasCrudScreen from '../../screens/AdminEmergenciasCrudScreen';
import AdminAnalyticsScreen from '../../screens/AdminAnalyticsScreen';
import AdminAccountRequestsScreen from '../../screens/AdminAccountRequestsScreen';
import AdminDataReportsScreen from '../../screens/AdminDataReportsScreen';
import AdminLocalesScreen from '../../screens/AdminLocalesScreen';
import AdminPrimerosAuxiliosScreen from '../../screens/AdminPrimerosAuxiliosScreen';
import AdminTurnosScreen from '../../screens/AdminTurnScreen';
import AdminPushBroadcastScreen from '../../screens/AdminPushBroadcastScreen';
import { BotonActualizarHorariosTodos } from '../../components/BotonActualizarHorariosTodos';

const Stack = createNativeStackNavigator<AdminStackParamList>();

const NotAuthorizedScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { colors } = theme;
  const { isGuest } = useAuth();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
      <Text style={{ color: colors.text, fontSize: 18, marginBottom: 12, textAlign: 'center' }}>
        No tienes permisos para acceder a esta sección.
      </Text>
      {isGuest && (
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}
          onPress={() => (navigation as any).navigate('Login')}
        >
          <Text style={{ color: colors.buttonText || '#fff', fontWeight: 'bold' }}>Iniciar sesión</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Admin Stack: Secure flow for administrative operations.
 */
export const AdminStack = () => {
  const { isAdmin, roleLoading } = useAuth();

  // Guard: if not admin, show not authorized
  if (!roleLoading && !isAdmin) {
    return (
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminPanel" component={NotAuthorizedScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: true }}>
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminHomeConfig" component={AdminHomeConfigScreen} options={{ title: 'Config Home' }} />
      <Stack.Screen name="AdminSuggestions" component={AdminSuggestionsScreen} options={{ title: 'Sugerencias' }} />
      <Stack.Screen name="AdminEmergencias" component={AdminEmergenciasScreen} options={{ title: 'Badges Emergencias' }} />
      <Stack.Screen name="AdminFarmacias" component={AdminFarmaciasScreen} options={{ title: 'Farmacias' }} />
      <Stack.Screen name="AdminEmergenciasCrud" component={AdminEmergenciasCrudScreen} options={{ title: 'Listado Emergencias' }} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="AdminAccountRequests" component={AdminAccountRequestsScreen} options={{ title: 'Solicitudes Cuenta' }} />
      <Stack.Screen name="AdminDataReports" component={AdminDataReportsScreen} options={{ title: 'Reportes Datos' }} />
      <Stack.Screen name="AdminLocales" component={AdminLocalesScreen} options={{ title: 'Negocios' }} />
      <Stack.Screen name="AdminPrimerosAuxilios" component={AdminPrimerosAuxiliosScreen} options={{ title: 'Primeros Auxilios' }} />
      <Stack.Screen name="ActualizarTurnos" component={AdminTurnosScreen} options={{ title: 'Turnos' }} />
      <Stack.Screen name="ActualizarHorarios" component={BotonActualizarHorariosTodos} options={{ title: 'Horarios' }} />
      <Stack.Screen name="AdminPushBroadcast" component={AdminPushBroadcastScreen} options={{ title: 'Enviar Notificación' }} />
    </Stack.Navigator>
  );
};
