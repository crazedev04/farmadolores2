import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigationTypes';

const Login: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const { login, loginWithGoogle, loading, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigation.goBack();
    }
  }, [user, navigation]);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('El email y la contraseña son obligatorios.');
      Alert.alert('Error de validación', 'El email y la contraseña son obligatorios.');
      return;
    }
    try {
      await login(email, password);
      setErrorMsg('');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Error de inicio de sesión';
      setErrorMsg(errMsg);
      Alert.alert('Error de inicio de sesión', errMsg);
    }
  };

  const handleRegister = () => {
    navigation.navigate({ name: 'Register' } as any);
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Error de inicio de sesión con Google';
      console.error('Error iniciando sesión con Google: ', error);
      Alert.alert('Error de inicio de sesión con Google', errMsg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Bienvenido</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {errorMsg ? <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text> : null}
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
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={colors.placeholderText}
        />
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]} onPress={handleLogin}>
          <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleRegister}>
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Crear cuenta</Text>
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

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
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
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  errorText: {
    marginBottom: 10,
    fontSize: 13,
  },
});
