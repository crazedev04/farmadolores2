import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigationTypes';
import { useTheme } from '../context/ThemeContext';
import Icon from '@react-native-vector-icons/material-design-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validatePassword = (pwd: string) => {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('Minimo 8 caracteres');
  if (!/[A-Z]/.test(pwd)) errors.push('1 mayuscula');
  if (!/[a-z]/.test(pwd)) errors.push('1 minuscula');
  if (!/[0-9]/.test(pwd)) errors.push('1 numero');
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('1 simbolo');
  return errors;
};

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const { register, loading, loginWithGoogle, user } = useAuth();
  const emailValid = validateEmail(email);
  const passwordErrors = validatePassword(password);
  const passwordStrong = passwordErrors.length === 0;
  const showPasswordHints = password.length > 0 && !passwordStrong;
  const successColor = colors.success || colors.primary || colors.buttonBackground || '#00C853';
  const dangerColor = colors.error || '#E53935';

  useEffect(() => {
    if (user) {
      navigation.goBack();
    }
  }, [user, navigation]);

  useEffect(() => {
    let active = true;
    const warmGoogle = async () => {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
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

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Campos vacios', 'Email y contrasena son requeridos.');
      return;
    }
    if (!emailValid) {
      Alert.alert('Email invalido', 'Revisa el formato del email.');
      return;
    }
    if (!passwordStrong) {
      Alert.alert('Contrasena debil', 'Cumpli con los requisitos de seguridad.');
      return;
    }
    try {
      await register(email, password);
    } catch (e) {
      setError((e as Error).message);
      Alert.alert('Error de registro', (e as Error).message);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Error iniciando sesion con Google: ', error);
      const errMsg = error instanceof Error ? error.message : 'Error de inicio de sesion con Google';
      Alert.alert('Error de inicio de sesion con Google', errMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText || colors.placeholderText }]}>
          Registrate para guardar tus preferencias.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Icon name="email-outline" size={18} color={colors.mutedText || colors.placeholderText} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
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
            <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedText || colors.placeholderText} />
          </TouchableOpacity>
        </View>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthSegment,
              {
                backgroundColor:
                  password.length > 0 ? (passwordStrong ? successColor : dangerColor) : colors.border,
              },
            ]}
          />
          <View style={[styles.strengthSegment, { backgroundColor: passwordStrong ? successColor : colors.border }]} />
          <View style={[styles.strengthSegment, { backgroundColor: passwordStrong ? successColor : colors.border }]} />
        </View>
        <View style={styles.passwordHint}>
          {showPasswordHints ? (
            <>
              <Text style={[styles.passwordHintTitle, { color: colors.text }]}>Contrasena segura:</Text>
              {passwordErrors.map((item) => (
                <Text key={item} style={[styles.passwordHintItem, { color: colors.mutedText || colors.placeholderText }]}>
                  - {item}
                </Text>
              ))}
            </>
          ) : null}
          {passwordStrong && password.length > 0 ? (
            <Text style={[styles.passwordOk, { color: successColor }]}>Contrasena segura</Text>
          ) : null}
        </View>
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.buttonBackground, opacity: passwordStrong && emailValid ? 1 : 0.6 }]} onPress={handleRegister} disabled={!passwordStrong || !emailValid}>
          {loading ? (
            <ActivityIndicator color={colors.buttonText || '#fff'} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Registrarme</Text>
          )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
  error: {
    marginBottom: 10,
    fontSize: 13,
  },
  emailError: {
    fontSize: 12,
    marginBottom: 8,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  passwordHint: {
    marginBottom: 12,
  },
  passwordHintTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  passwordHintItem: {
    fontSize: 12,
    marginTop: 2,
  },
  passwordOk: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default RegisterScreen;
