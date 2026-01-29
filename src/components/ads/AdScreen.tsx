// src/components/AdScreen.js
import { useEffect } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplaza por tu ID de interstitial real
const adUnitId = 'ca-app-pub-2226872749228128/7318943549';
const LAST_AD_SHOWN_KEY = 'lastInterstitialShownAt';
const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

const AdScreen = () => {
  useEffect(() => {
    let ad: InterstitialAd | null = null;

    const maybeShowAd = async () => {
      const lastShownRaw = await AsyncStorage.getItem(LAST_AD_SHOWN_KEY);
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
      if (Date.now() - lastShown < MIN_INTERVAL_MS) {
        return;
      }

      // Creamos el anuncio. Google decide qué mostrar según usuario.
      ad = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const handleAdLoaded = async () => {
        await ad.show();
        await AsyncStorage.setItem(LAST_AD_SHOWN_KEY, String(Date.now()));
      };

      const handleAdError = () => {
        // Silencioso para no molestar al usuario.
      };

      ad.addAdEventListener(AdEventType.LOADED, handleAdLoaded);
      ad.addAdEventListener(AdEventType.ERROR, handleAdError);

      // Cargamos el anuncio (solo una vez)
      ad.load();

    };

    maybeShowAd();

    // Limpiamos listeners cuando desmonta
    return () => {
      if (ad) {
        ad.removeAllListeners();
      }
    };
  }, []);

  return null; // Este componente no muestra nada visual, solo lanza el interstitial
};

export default AdScreen;
