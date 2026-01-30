import React, { useLayoutEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import WebView from 'react-native-webview';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';

type WebViewRouteProp = RouteProp<RootStackParamList, 'WebView'>;

const WebViewScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();
  const route = useRoute<WebViewRouteProp>();
  const { url, title } = route.params;

  useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    }
  }, [navigation, title]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        source={{ uri: url }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.buttonBackground} />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default WebViewScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
