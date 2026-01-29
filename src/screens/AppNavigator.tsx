import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabs from '../components/BottomTabs';
import Home from './Home';
import Farmacias from './Farmacias';
import Emergencias from './Emergencias';
import DetailScreen from './DetailScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import PrimerosAuxilios from './PrimeroAuxilios';
import { RootStackParamList } from '../types/navigationTypes';
import { useAuth } from '../context/AuthContext';
import SettingsScreen from './SettingsScreen';
import Profile from './Profile';
import OnboardingScreen from '../onboarding/OnboardingScreen';
import Locales from './Locales';
import LocalDetailScreen from './LocalDetailScreen';
import DetailE from './DetailE';
import EditProfileScreen from './EditProfileScreen';
import ReportProblemScreen from './ReportProblemScreen';
import HelpScreen from './HelpScreen';
import { useTheme } from '../context/ThemeContext';
import AdScreen from '../components/ads/AdScreen';
import { BotonActualizarHorariosTodos } from '../components/BotonActualizarHorariosTodos';
import AdminTurnosScreen from './AdminTurnScreen';
import AdminPanelScreen from './adminPanelScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

type OnboardingStackProps = {
  setIsFirstLaunch: React.Dispatch<React.SetStateAction<boolean | null>>;
};
// Simple screen shown when user is not admin
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
          onPress={() => navigation.navigate('Login' as never)}
        >
          <Text style={{ color: colors.buttonText || '#fff', fontWeight: 'bold' }}>Iniciar sesión</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Navigator for Onboarding Screens
const OnboardingStack: React.FC<OnboardingStackProps> = ({ setIsFirstLaunch }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" options={{ headerShown: false }}>
        {props => <OnboardingScreen {...props} setIsFirstLaunch={setIsFirstLaunch} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Navigator for Main App Screens
const AppStack = () => {
  const { isAdmin, roleLoading } = useAuth();
  return (
    <>
    
    <Stack.Navigator>
      <Stack.Screen name="BottomTabs" component={BottomTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="Farmacias" component={Farmacias} options={{ headerShown: false }} />
      <Stack.Screen name="Emergencias" component={Emergencias} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{headerShown: false}} />
      <Stack.Screen name="PrimeroAuxilios" component={PrimerosAuxilios}  />
      <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false, title: 'Perfil' }} />
      <Stack.Screen name="Local" component={Locales} options={{headerShown: false}} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{title: 'Editar perfil'}} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} options={{title: 'Reportar Problema'}} />
      <Stack.Screen name="Help" component={HelpScreen} options={{headerShown: false}} />
      <Stack.Screen name="ActualizarHorarios" component={BotonActualizarHorariosTodos} options={{headerShown: false}} />
      <Stack.Screen
        name="Admin"
        component={!roleLoading && isAdmin ? AdminPanelScreen : NotAuthorizedScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ActualizarTurnos"
        component={!roleLoading && isAdmin ? AdminTurnosScreen : NotAuthorizedScreen}
        options={{title: 'Turnos'}}
      />
      <Stack.Screen name="LocalDetail" component={LocalDetailScreen} options={{headerShown: false}} />
      <Stack.Screen name="Detail" component={DetailScreen} options={{headerShown: false}} />
      <Stack.Screen name="DetailE" component={DetailE} options={{headerShown: false}} />
    </Stack.Navigator>
    <AdScreen />

    </>
  );
};

const AppNavigator: React.FC = () => {
  const { navigationTheme } = useTheme();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const hasOpenedBefore = await AsyncStorage.getItem('hasOpenedBefore');
      setIsFirstLaunch(hasOpenedBefore === null);
    };

    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (isFirstLaunch === false) {
      AsyncStorage.setItem('hasOpenedBefore', 'true');
    }
  }, [isFirstLaunch]);

  if (isFirstLaunch === null) {
    return null; // Puedes mostrar una pantalla de carga aquí
  } 

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator >
        {isFirstLaunch ? (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {props => <OnboardingStack {...props} setIsFirstLaunch={setIsFirstLaunch} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="App" component={AppStack} options={{ headerShown: false }} />
        )}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
