import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FirebaseAuthTypes, onAuthStateChanged, getIdTokenResult } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useTheme } from './ThemeContext';
import { Alert, Platform, ToastAndroid, Linking } from 'react-native';
import { AuthRepository } from '../services/AuthRepository';
import { logEvent, logLogin, logSignUp, setUserId, setUserProperties } from '../services/analytics';

// Configura Google Sign-In
GoogleSignin.configure({
  webClientId: '320257863836-7mq4mav5bst0iuraeahu2lpoinjrtc02.apps.googleusercontent.com',
});

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  isAuth: boolean;
  role: 'guest' | 'user' | 'admin';
  isGuest: boolean;
  isAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  getSignInMethods: (email: string) => Promise<string[]>;
  resetPassword: (email: string) => Promise<void>;
  disableAccount: (reason?: string) => Promise<void>;
  requestFullDeletion: (reason?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<FirebaseAuthTypes.User | null>>;
  disabledAccount: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { resetTheme } = useTheme();
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [role, setRole] = useState<AuthContextType['role']>('guest');
  const [roleLoading, setRoleLoading] = useState<boolean>(false);
  const [disabledAccount, setDisabledAccount] = useState(false);

  const isAdmin = role === 'admin';
  const isGuest = role === 'guest';

  const notify = (message: string, long = false) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, long ? ToastAndroid.LONG : ToastAndroid.SHORT);
    } else {
      Alert.alert('Aviso', message);
    }
  };

  const handleSignOut = useCallback(async (message?: string) => {
    await AuthRepository.signOut();
    await AsyncStorage.removeItem('user');
    setUser(null);
    setIsAuth(false);
    setUserId(null);
    if (message) {notify(message, true);}
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(AuthRepository.authInstance, async (currentUser) => {
      if (currentUser) {
        const status = await AuthRepository.checkUserStatus(currentUser.uid);
        if (status.disabled) {
          setDisabledAccount(true);
          await handleSignOut('Cuenta desactivada. Contacta soporte si fue un error.');
          return;
        }

        setDisabledAccount(false);
        setUser(currentUser);
        setIsAuth(true);
        setUserId(currentUser.uid);
        logEvent('auth_state', { state: 'signed_in' });

        AuthRepository.ensureUserDoc(currentUser).catch(err =>
          console.error('[AuthContext] sync failed:', err)
        );
      } else {
        setUser(null);
        setIsAuth(false);
        await AsyncStorage.removeItem('user');
        setUserId(null);
        logEvent('auth_state', { state: 'signed_out' });
      }
    });

    return () => unsubscribe();
  }, [handleSignOut]);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole('guest');
        setRoleLoading(false);
        setUserProperties({ role: 'guest' });
        return;
      }
      setRoleLoading(true);
      try {
        const tokenResult = await getIdTokenResult(user, true);
        const isAdminClaim = !!tokenResult?.claims?.admin;
        const currentRole = isAdminClaim ? 'admin' : 'user';
        setRole(currentRole);
        setUserProperties({ role: currentRole });
      } catch (error) {
        setRole('user');
        setUserProperties({ role: 'user' });
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const login = async (email: string, password: string) => {
    if (!email || !password) {return notify('Email y contraseña requeridos');}
    setLoading(true);
    try {
      const cred = await AuthRepository.signIn(email, password);
      if (cred.user) {
        const status = await AuthRepository.checkUserStatus(cred.user.uid);
        if (status.disabled) {
          setDisabledAccount(true);
          return await handleSignOut('Cuenta desactivada.');
        }
        await AuthRepository.ensureUserDoc(cred.user);
      }
      logLogin('password');
    } catch (error: any) {
      notify(error.message || 'Error iniciando sesión', true);
      logEvent('login_error', { method: 'password' });
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    if (!email || !password) {return notify('Email y contraseña requeridos');}
    setLoading(true);
    try {
      const cred = await AuthRepository.signUp(email, password);
      if (cred.user) {
        await AuthRepository.ensureUserDoc(cred.user);
      }
      logSignUp('password');
    } catch (error: any) {
      const msg = error?.code === 'auth/email-already-in-use' ? 'Email ya registrado.' : 'Error registrando usuario.';
      notify(msg, true);
      logEvent('register_error', { method: 'password' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {return notify('Ingresa tu email');}
    try {
      await AuthRepository.sendResetEmail(email);
      notify('Email de recuperación enviado.', true);
      logEvent('password_reset_requested');
    } catch (error: any) {
      notify(error.message || 'No se pudo enviar el email', true);
    }
  };

  const getSignInMethods = async (email: string) => {
    if (!email) {return [];}
    return await AuthRepository.getMethodsForEmail(email);
  };

  const handleAccountRequest = async (type: 'disable' | 'delete', reason?: string) => {
    if (!user) {return notify('No hay usuario logueado');}
    try {
      await AuthRepository.submitAccountRequest(user.uid, user.email || '', type, reason || '');

      const subject = encodeURIComponent(type === 'delete' ? 'Eliminación total de cuenta' : 'Baja de cuenta');
      const body = encodeURIComponent(`UID: ${user.uid}\nEmail: ${user.email}\nMotivo: ${reason || 'No especificado'}`);
      Linking.openURL(`mailto:crazedevs@gmail.com?subject=${subject}&body=${body}`).catch(() => {});

      await handleSignOut(type === 'delete' ? 'Solicitud de eliminación enviada' : 'Cuenta desactivada temporalmente');
      setDisabledAccount(true);
      logEvent(type === 'delete' ? 'account_deletion_requested' : 'account_disabled');
    } catch (error: any) {
      notify(error.message || 'Error en la solicitud', true);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const idToken = userInfo?.idToken || tokens?.idToken;

      if (!idToken) {throw new Error('No se pudo obtener el token de Google.');}

      const cred = await AuthRepository.signInWithGoogle(idToken);
      if (cred.user) {
        const status = await AuthRepository.checkUserStatus(cred.user.uid);
        if (status.disabled) {
          setDisabledAccount(true);
          return await handleSignOut('Cuenta desactivada.');
        }
        await AuthRepository.ensureUserDoc(cred.user);
      }
      logLogin('google');
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        notify(error.message || 'Error con Google Sign-In', true);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthRepository.signOut();
      await GoogleSignin.signOut();
      logEvent('logout');
    } finally {
      setUser(null);
      setIsAuth(false);
      setDisabledAccount(false);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('theme');
      resetTheme();
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuth,
        role,
        isGuest,
        isAdmin,
        loading,
        roleLoading,
        login,
        register,
        getSignInMethods,
        resetPassword,
        disableAccount: (reason) => handleAccountRequest('disable', reason),
        requestFullDeletion: (reason) => handleAccountRequest('delete', reason),
        loginWithGoogle,
        logout,
        setUser,
        disabledAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {throw new Error('useAuth must be used within an AuthContextProvider');}
  return context;
};
