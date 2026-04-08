import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RootStackParamList } from '../../types/navigationTypes';

export const NotAuthorizedScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: colors.buttonText || '#fff', fontWeight: 'bold' }}>Iniciar sesión</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
