import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigationTypes';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Login: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [resetInfo, setResetInfo] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const emailValid = validateEmail(email);
  const { login, loginWithGoogle, loading, user, resetPassword, getSignInMethods } = useAuth();

  useEffect(() => {
    if (user) {
      navigation.goBack();
    }
  }, [user, navigation]);

  useEffect(() => {
    let active = true;
    const warmGoogle = async () => {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        if (active) setGoogleReady(true);
      } catch {
        if (active) setGoogleReady(false);
      }
    };
    warmGoogle();
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('El email y la contrasena son obligatorios.');
      Alert.alert('Error de validacion', 'El email y la contrasena son obligatorios.');
      return;
    }
    try {
      await login(email, password);
      setErrorMsg('');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Error de inicio de sesion';
      setErrorMsg(errMsg);
      Alert.alert('Error de inicio de sesion', errMsg);
    }
  };

  const handleRegister = () => {
    navigation.navigate({ name: 'Register' } as any);
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Recuperar contrasena', 'Ingresa tu email para enviar el enlace.');
      return;
    }
    if (!emailValid) {
      setResetInfo('Email invalido');
      return;
    }
    const methods = await getSignInMethods(email);
    if (methods.length === 0) {
      Alert.alert('Recuperar contrasena', 'No existe una cuenta con ese email.');
      return;
    }
    if (!methods.includes('password')) {
      if (methods.includes('google.com')) {
        Alert.alert('Recuperar contrasena', 'Esta cuenta se registra con Google. Inicia sesion con Google.');
        return;
      }
      Alert.alert('Recuperar contrasena', 'Esta cuenta usa otro metodo de acceso.');
      return;
    }
    await resetPassword(email);
    setResetInfo('Solicitud enviada. Revisa tu email y elegi una contrasena segura.');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Error de inicio de sesion con Google';
      console.error('Error iniciando sesion con Google: ', error);
      Alert.alert('Error de inicio de sesion con Google', errMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Bienvenido</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText || colors.placeholderText }]}>
          Inicia sesion para acceder a todas las funciones.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {errorMsg ? <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text> : null}
        {resetInfo ? (
          <View style={[styles.infoRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Icon name="check-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>{resetInfo}</Text>
          </View>
        ) : null}
        <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Icon name="email-outline" size={18} color={colors.mutedText || colors.placeholderText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email"
            value={email}
            onChangeText={(value) => { setEmail(value); setResetInfo(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.placeholderText}
          />
        </View>
        {!emailValid && email.length > 0 ? (
          <Text style={[styles.emailError, { color: colors.error }]}>Email invalido</Text>
        ) : null}
        <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Icon name="lock-outline" size={18} color={colors.mutedText || colors.placeholderText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Contrasena"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholderTextColor={colors.placeholderText}
          />
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.mutedText || colors.placeholderText}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading && !googleLoading ? (
            <ActivityIndicator color={colors.buttonText || '#fff'} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Iniciar sesion</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={handleRegister}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Crear cuenta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleResetPassword}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Olvidaste tu contrasena?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.googleButton, { borderColor: colors.border, opacity: googleReady ? 1 : 0.6 }]}
          onPress={handleGoogleLogin}
          disabled={!googleReady || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Icon name="google" size={18} color={colors.text} style={styles.googleIcon} />
              <Text style={[styles.googleButtonText, { color: colors.text }]}>Continuar con Google</Text>
            </>
          )}
        </TouchableOpacity>
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
  header: {
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    marginBottom: 10,
    fontSize: 13,
  },
  emailError: {
    fontSize: 12,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
});
