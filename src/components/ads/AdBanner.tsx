import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdProps } from 'react-native-google-mobile-ads';

interface AdBannerProps {
  size: BannerAdProps['size'];
}

const AdBanner: React.FC<AdBannerProps> = ({ size }) => {
  return (
    <View style={styles.bannerContainer}>
      <BannerAd
        unitId="ca-app-pub-2226872749228128/9910553145"
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    
    alignItems: 'center',
    marginBottom: 5,
  },
});

export default AdBanner;
