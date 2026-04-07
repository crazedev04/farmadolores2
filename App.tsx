// App.tsx
import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Tu navegación y contextos
import { AuthContextProvider } from './src/context/AuthContext';
import AppNavigator from './src/screens/AppNavigator';

// Para actualizaciones CodePush (si lo usas)

// Importamos BackgroundFetch
import BackgroundFetch from 'react-native-background-fetch';
// Importamos la función que hace el chequeo y la notificación
import { checkAndNotifyTurnos } from './src/services/TurnoService';
import { checkAndApplyHotfix } from './src/services/otaHotfix';
import { initPushNotifications } from './src/services/pushService';
import { useAuth } from './src/context/AuthContext';
import { ThemeContextProvider, useTheme } from './src/context/ThemeContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PharmacyProvider } from './src/context/PharmacyContext';
import { getApp } from '@react-native-firebase/app';
import { initializeFirestore } from '@react-native-firebase/firestore';
import { checkAppVersionStatus, startInAppUpdate } from './src/services/versionService';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';

const AppContent = () => {
  const { theme } = useTheme();
  const { colors, dark } = theme;
  const { user } = useAuth();
  const [isOutdated, setIsOutdated] = useState(false);

  useEffect(() => {
    const performVersionCheck = async () => {
      const status = await checkAppVersionStatus();
      if (status.isOutdated) {
        setIsOutdated(true);
        // Intentamos también disparar el inmediato de Google Play por si acaso
        startInAppUpdate('immediate');
      } else {
        // Chequeo silencioso de actualización flexible
        startInAppUpdate('flexible');
      }
    };
    performVersionCheck();
  }, []);

  if (isOutdated) {
    return <ForceUpdateScreen />;
  }
  const style = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    const initFirestore = async () => {
      try {
        await initializeFirestore(getApp(), { persistence: true });
      } catch {
        // ignore persistence setup errors
      }
    };

    initFirestore();
  }, []);

  useEffect(() => {
    // Inicializa y configura BackgroundFetch al montar el componente raíz
    const initBackgroundFetch = async () => {
      BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Se intentará ejecutar aprox cada 15 minutos
          stopOnTerminate: false,   // iOS: continuar corriendo incluso si el usuario cierra la app
          startOnBoot: true,        // Android: iniciar al encender el dispositivo
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        },
        async (taskId) => {
          console.log('[BackgroundFetch] Task start:', taskId);
          try {
            // Llamamos a nuestra lógica para revisar turnos y programar notificaciones
            await checkAndNotifyTurnos();
            await checkAndApplyHotfix({ notify: false });
          } finally {
            // MUY IMPORTANTE: marcar la tarea como finalizada
            BackgroundFetch.finish(taskId);
          }
        },
        (error) => {
          if (__DEV__) {
            console.log('[BackgroundFetch] configure error:', error);
          }
        },
      );

      // Iniciar el proceso de background (en versiones recientes quizá no sea 100% necesario, pero recomendable)
      BackgroundFetch.start();

      // Reprograma notificaciones al abrir app para no depender del próximo ciclo de background.
      try {
        await checkAndNotifyTurnos();
      } catch {
        // ignore
      }
    };

    initBackgroundFetch();
  }, []);

  useEffect(() => {
    const stop = initPushNotifications(user?.uid || null);
    return () => {
      if (stop) stop();
    };
  }, [user?.uid]);

  return (
    <SafeAreaView style={style.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background} // Cambia el color de fondo del StatusBar
      />
      {/* Navegación principal */}
      <AppNavigator />
    </SafeAreaView>
  );
};

import { OTAErrorBoundary } from './src/components/common/OTAErrorBoundary';

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeContextProvider>
          <AuthContextProvider>
            <PharmacyProvider>
              <OTAErrorBoundary>
                <AppContent />
              </OTAErrorBoundary>
            </PharmacyProvider>
          </AuthContextProvider>
        </ThemeContextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
