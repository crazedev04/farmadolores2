import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import Icon from '@react-native-vector-icons/material-design-icons';




const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {theme} = useTheme();
  const colors = theme.colors;
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { register, loading, loginWithGoogle, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigation.goBack();
    }
  }, [user, navigation]);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Campos Vacios', 'Email y contraseña son requeridos.');
      return;
    }
    try {
      await register(email, password);
    } catch (e) {
      setError((e as Error).message);
      Alert.alert('Registration Error', (e as Error).message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Error iniciando sesión con Google: ', error);
      const errMsg = error instanceof Error ? error.message : 'Error de inicio de sesión con Google';
      Alert.alert('Error de inicio de sesión con Google', errMsg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.placeholderText}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={colors.placeholderText}
        />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]} onPress={handleRegister}>
          <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Registrarme</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <TouchableOpacity style={[styles.googleButton, { backgroundColor: '#db4437' }]} onPress={handleGoogleLogin}>
            <Icon name="google" size={20} color="#fff" style={styles.googleIcon} />
            <Text style={[styles.googleButtonText, { color: colors.buttonText }]}>Iniciar sesión con Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  error: { 
    marginBottom: 10,
    fontSize: 13,
  },
  
});

export default RegisterScreen;
