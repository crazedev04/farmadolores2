import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigationTypes';

// Screens
import BottomTabs from '../../components/BottomTabs';
import Home from '../../screens/Home';
import Farmacias from '../../screens/Farmacias';
import Emergencias from '../../screens/Emergencias';
import DetailScreen from '../../screens/DetailScreen';
import DetailE from '../../screens/DetailE';
import Locales from '../../screens/Locales';
import LocalDetailScreen from '../../screens/LocalDetailScreen';
import Profile from '../../screens/Profile';
import EditProfileScreen from '../../screens/EditProfileScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import HelpScreen from '../../screens/HelpScreen';
import ReportProblemScreen from '../../screens/ReportProblemScreen';
import SuggestionsScreen from '../../screens/SuggestionsScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import WebViewScreen from '../../screens/WebViewScreen';
import PrimerosAuxilios from '../../screens/PrimeroAuxilios';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Main Stack: The core application flow for authenticated users.
 */
export const MainStack = () => {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BottomTabs" component={BottomTabs} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Farmacias" component={Farmacias} />
      <Stack.Screen name="Emergencias" component={Emergencias} />
      <Stack.Screen name="Detail" component={DetailScreen} />
      <Stack.Screen name="DetailE" component={DetailE} />
      <Stack.Screen name="Local" component={Locales} />
      <Stack.Screen name="LocalDetail" component={LocalDetailScreen} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Editar Perfil' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} options={{ headerShown: true, title: 'Reportar Problema' }} />
      <Stack.Screen name="Suggestions" component={SuggestionsScreen} options={{ headerShown: true, title: 'Sugerencias' }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: true, title: 'Favoritos' }} />
      <Stack.Screen name="WebView" component={WebViewScreen} />
      <Stack.Screen name="PrimeroAuxilios" component={PrimerosAuxilios} options={{ headerShown: true, title: 'Primeros Auxilios' }} />
    </Stack.Navigator>
  );
};
