import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useTheme } from './ThemeContext';
import { Alert, Platform, ToastAndroid, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Geolocation from '@react-native-community/geolocation';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { logEvent, logLogin, logSignUp, setUserId, setUserProperties } from '../services/analytics';

// Configura Google Sign-In
GoogleSignin.configure({
  webClientId: '320257863836-7mq4mav5bst0iuraeahu2lpoinjrtc02.apps.googleusercontent.com', // Reemplaza con tu web client ID de Firebase console
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
  const isAdmin = role === 'admin';
  const isGuest = role === 'guest';
  const [disabledAccount, setDisabledAccount] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuth(true);
      } else {
        setIsAuth(false);
      }
    };

    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        const disabled = !!userDoc.data()?.disabled;
        if (disabled) {
          setDisabledAccount(true);
          await auth().signOut();
          await AsyncStorage.removeItem('user');
          setUser(null);
          setIsAuth(false);
          setUserId(null);
          notify('Cuenta desactivada. Contacta soporte si fue un error.', true);
          return;
        }
        setDisabledAccount(false);
        setUser(user);
        setIsAuth(true);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setUserId(user.uid);
        logEvent('auth_state', { state: 'signed_in' });
        try {
          await ensureUserDoc(user);
        } catch (error) {
          console.error('Error ensuring user doc:', error);
        }
      } else {
        setUser(null);
        setIsAuth(false);
        await AsyncStorage.removeItem('user');
        setUserId(null);
        logEvent('auth_state', { state: 'signed_out' });
      }
    });

    checkUser();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRoleFromClaims = async () => {
      if (!user) {
        setRole('guest');
        setRoleLoading(false);
        setUserProperties({ role: 'guest' });
        return;
      }
      setRoleLoading(true);
      try {
        const tokenResult = await user.getIdTokenResult(true);
        const isAdminClaim = !!tokenResult?.claims?.admin;
        setRole(isAdminClaim ? 'admin' : 'user');
        setUserProperties({ role: isAdminClaim ? 'admin' : 'user' });
      } catch (error) {
        setRole('user');
        setUserProperties({ role: 'user' });
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRoleFromClaims();
  }, [user]);

  const notify = (message: string, long = false) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, long ? ToastAndroid.LONG : ToastAndroid.SHORT);
    } else {
      Alert.alert('Aviso', message);
    }
  };

  const getDeviceSnapshot = async () => ({
    brand: DeviceInfo.getBrand(),
    model: DeviceInfo.getModel(),
    systemName: DeviceInfo.getSystemName(),
    systemVersion: DeviceInfo.getSystemVersion(),
    deviceId: DeviceInfo.getDeviceId(),
    appVersion: DeviceInfo.getVersion(),
    buildNumber: DeviceInfo.getBuildNumber(),
    isTablet: DeviceInfo.isTablet(),
  });

  const getLocationInfo = async () => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      default: null,
    });
    if (!permission) return null;

    const status = await check(permission);
    if (status !== RESULTS.GRANTED) return null;

    const coords = await new Promise<Geolocation.GeoPosition>((resolve, reject) => {
      Geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      });
    });

    const { latitude, longitude, accuracy } = coords.coords;
    let city = '';
    let region = '';
    let country = '';

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'FarmaDoloresApp/1.9.0',
            'Accept-Language': 'es',
          },
        },
      );
      const json = await response.json();
      const address = json?.address || {};
      city = address.city || address.town || address.village || address.county || '';
      region = address.state || '';
      country = address.country || '';
    } catch {
      // Mejor esfuerzo: si no hay reverse geocode, guardamos solo coords
    }

    return {
      coords: {
        latitude,
        longitude,
        accuracy,
      },
      city,
      region,
      country,
    };
  };

  const ensureUserDoc = async (currentUser: FirebaseAuthTypes.User) => {
    const userRef = firestore().collection('users').doc(currentUser.uid);
    const existing = await userRef.get();
    const existingData = existing.exists ? existing.data() : null;
    const device = await getDeviceSnapshot();
    const payload = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || '',
      photoURL: currentUser.photoURL || '',
      phoneNumber: currentUser.phoneNumber || '',
      emailVerified: currentUser.emailVerified || false,
      isAnonymous: currentUser.isAnonymous || false,
      providerIds: (currentUser.providerData || []).map((provider) => provider.providerId),
      providers: (currentUser.providerData || []).map((provider) => ({
        providerId: provider.providerId,
        uid: provider.uid || '',
        displayName: provider.displayName || '',
        email: provider.email || '',
        phoneNumber: provider.phoneNumber || '',
        photoURL: provider.photoURL || '',
      })),
      metadata: {
        creationTime: currentUser.metadata?.creationTime || '',
        lastSignInTime: currentUser.metadata?.lastSignInTime || '',
      },
      device,
      createdAt: existingData?.createdAt || firestore.FieldValue.serverTimestamp(),
      lastLoginAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await userRef.set(payload, { merge: true });

    getLocationInfo()
      .then((location) => {
        if (!location) return;
        return userRef.set(
          {
            location: location.coords,
            city: location.city || '',
            region: location.region || '',
            country: location.country || '',
            locationUpdatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      })
      .catch((error) => console.error('Error getting location info:', error));
  };

  const checkDisabledAndSignOut = async (uid: string) => {
    const doc = await firestore().collection('users').doc(uid).get();
    const disabled = !!doc.data()?.disabled;
    if (disabled) {
      setDisabledAccount(true);
      await auth().signOut();
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuth(false);
      setUserId(null);
      notify('Cuenta desactivada. Contacta soporte si fue un error.', true);
      return true;
    }
    return false;
  };


  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('min 8');
    if (!/[A-Z]/.test(pwd)) errors.push('1 mayus');
    if (!/[a-z]/.test(pwd)) errors.push('1 minus');
    if (!/[0-9]/.test(pwd)) errors.push('1 numero');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('1 simbolo');
    return errors;
  };

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      notify('Email y contrasena requeridos');
      return;
    }

    setLoading(true);
    try {
      const credential = await auth().signInWithEmailAndPassword(email, password);
      if (credential.user) {
        const blocked = await checkDisabledAndSignOut(credential.user.uid);
        if (blocked) return;
        await ensureUserDoc(credential.user);
      }
      logLogin('password');
    } catch (error: any) {
      notify(error.message || 'Error iniciando sesion', true);
      console.error('Login error:', error);
      logEvent('login_error', { method: 'password' });
    } finally {
      setLoading(false);
    }
  };

  
  const register = async (email: string, password: string) => {
    if (!email || !password) {
      notify('Email y contrasena requeridos');
      return;
    }

    setLoading(true);
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      if (credential.user) {
        const blocked = await checkDisabledAndSignOut(credential.user.uid);
        if (blocked) return;
        await ensureUserDoc(credential.user);
      }
      logSignUp('password');
    } catch (error: any) {
      if (error?.code == 'auth/email-already-in-use') {
        notify('Ese email ya esta registrado. Inicia sesion o recupera la contrasena.', true);
        throw new Error('Ese email ya esta registrado.');
      }
      if (error?.code == 'auth/invalid-email') {
        notify('Email invalido', true);
        throw new Error('Email invalido.');
      }
      if (error?.code == 'auth/weak-password') {
        notify('Contrasena debil. Usa una contrasena mas segura.', true);
        throw new Error('Contrasena debil.');
      }
      notify(error.message || 'Error registrando usuario', true);
      console.error('Register error:', error);
      logEvent('register_error', { method: 'password' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {
      notify('Ingresa tu email para recuperar la contrasena');
      return;
    }
    try {
      await auth().sendPasswordResetEmail(email);
      notify('Solicitud enviada. Revisa tu email y usa una contrasena segura', true);
      logEvent('password_reset_requested');
    } catch (error: any) {
      if (error.code === 'auth/invalid-email') {
        notify('Email invalido', true);
      } else if (error.code === 'auth/user-not-found') {
        notify('No existe una cuenta con ese email', true);
      } else if (error.code === 'auth/too-many-requests') {
        notify('Demasiados intentos. Proba mas tarde', true);
      } else {
        notify(error.message || 'No se pudo enviar el email', true);
      }
      console.error('Reset password error:', error);
    }
  };

  const disableAccount = async (reason?: string) => {
    if (!user) {
      notify('No hay usuario logueado', false);
      return;
    }
    try {
      await firestore().collection('users').doc(user.uid).set(
        {
          disabled: true,
          disabledAt: firestore.FieldValue.serverTimestamp(),
          disableReason: reason || '',
        },
        { merge: true }
      );
      await firestore().collection('accountRequests').add({
        uid: user.uid,
        email: user.email || '',
        type: 'disable',
        reason: reason || '',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      const subject = encodeURIComponent('Solicitud de baja de cuenta');
      const body = encodeURIComponent(
        `Hola, quiero desactivar mi cuenta.\n\nUID: ${user.uid}\nEmail: ${user.email || ''}\nMotivo: ${reason || 'No especificado'}`
      );
      Linking.openURL(`mailto:crazedevs@gmail.com?subject=${subject}&body=${body}`).catch(() => {});
      await auth().signOut();
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuth(false);
      setUserId(null);
      setDisabledAccount(true);
      notify('Cuenta desactivada. Tus datos se conservaran 30 dias antes de eliminarse.', true);
      logEvent('account_disabled');
    } catch (error: any) {
      notify(error.message || 'No se pudo desactivar la cuenta', true);
      console.error('Disable account error:', error);
    }
  };

  const getSignInMethods = async (email: string) => {
    if (!email) return [];
    try {
      return await auth().fetchSignInMethodsForEmail(email);
    } catch (error: any) {
      console.error('Fetch sign-in methods error:', error);
      return [];
    }
  };

  const requestFullDeletion = async (reason?: string) => {
    if (!user) {
      notify('No hay usuario logueado', false);
      return;
    }
    try {
      const now = firestore.FieldValue.serverTimestamp();
      await firestore().collection('users').doc(user.uid).set(
        {
          disabled: true,
          disabledAt: now,
          deleteRequested: true,
          deleteRequestedAt: now,
          deleteAfterDays: 30,
          deleteReason: reason || '',
        },
        { merge: true }
      );
      await firestore().collection('accountRequests').add({
        uid: user.uid,
        email: user.email || '',
        type: 'delete',
        reason: reason || '',
        createdAt: now,
      });
      const subject = encodeURIComponent('Solicitud de eliminacion total de cuenta');
      const body = encodeURIComponent(
        `Hola, solicito eliminacion total de mi cuenta.\n\nUID: ${user.uid}\nEmail: ${user.email || ''}\nMotivo: ${reason || 'No especificado'}\n`
      );
      Linking.openURL(`mailto:crazedevs@gmail.com?subject=${subject}&body=${body}`).catch(() => {});
      await auth().signOut();
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuth(false);
      setUserId(null);
      setDisabledAccount(true);
      notify('Solicitud de eliminacion enviada', false);
      logEvent('account_deletion_requested');
    } catch (error: any) {
      notify(error.message || 'No se pudo solicitar la eliminacion', true);
      console.error('Request deletion error:', error);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo: any = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const idToken = userInfo?.idToken || tokens?.idToken;
      if (!idToken) {
        throw new Error('No se pudo obtener el token de Google. Proba nuevamente.');
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const credential = await auth().signInWithCredential(googleCredential);
      if (credential.user) {
        const blocked = await checkDisabledAndSignOut(credential.user.uid);
        if (blocked) return;
        ensureUserDoc(credential.user).catch((error) => console.error('Error ensuring user doc:', error));
      }
      logLogin('google');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        notify('Inicio de sesion cancelado.', false);
        return;
      }
      notify(error.message || 'Error con Google Sign-In', true);
      console.error('Google login error:', error);
      logEvent('login_error', { method: 'google' });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await auth().signOut();
      await GoogleSignin.signOut();
      logEvent('logout');
    } catch (error: any) {
      notify('Error cerrando sesion', true);
      console.error('Logout error:', error);
      logEvent('logout_error');
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
        disableAccount,
        requestFullDeletion,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};
