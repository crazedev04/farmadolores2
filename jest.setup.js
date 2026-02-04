/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  finish: jest.fn(),
  NETWORK_TYPE_ANY: 0,
}));

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  createTriggerNotification: jest.fn(),
  displayNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
  getNotificationSettings: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  TriggerType: { TIMESTAMP: 0 },
  EventType: { ACTION_PRESS: 'ACTION_PRESS', DISMISSED: 'DISMISSED' },
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({
    name: 'mock-app',
    firestore: jest.fn(() => ({ settings: jest.fn() })),
  })),
  setLogLevel: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => {
  const currentUser = {
    updateProfile: jest.fn(),
    getIdTokenResult: jest.fn().mockResolvedValue({ claims: {} }),
  };
  const authInstance = {
    currentUser,
  };
  return {
    getAuth: jest.fn(() => authInstance),
    onAuthStateChanged: jest.fn((_auth, cb) => {
      cb(null);
      return () => {};
    }),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    fetchSignInMethodsForEmail: jest.fn().mockResolvedValue([]),
    sendPasswordResetEmail: jest.fn(),
    signInWithCredential: jest.fn(),
    GoogleAuthProvider: { credential: jest.fn(() => ({ providerId: 'google.com' })) },
    signOut: jest.fn(),
    updateProfile: jest.fn(),
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const db = {};
  const getFirestore = jest.fn(() => db);
  const collection = jest.fn((_db, path) => ({ _path: path }));
  const doc = jest.fn((_parent, path, ...segments) => {
    const id = segments.length > 0 ? segments[segments.length - 1] : path;
    return { id, _path: [path, ...segments].join('/'), ref: {} };
  });
  const getDoc = jest.fn(async () => ({ exists: () => false, data: () => undefined }));
  const getDocs = jest.fn(async () => ({ docs: [], empty: true }));
  const onSnapshot = jest.fn((_ref, cb) => {
    if (cb) {
      cb({ docs: [], data: () => ({}), exists: () => true });
    }
    return () => {};
  });
  const setDoc = jest.fn(async () => {});
  const updateDoc = jest.fn(async () => {});
  const addDoc = jest.fn(async () => ({ id: 'mock-id' }));
  const deleteDoc = jest.fn(async () => {});
  const writeBatch = jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  }));
  const query = jest.fn((...args) => ({ _query: args }));
  const where = jest.fn((...args) => ({ _where: args }));
  const orderBy = jest.fn((...args) => ({ _orderBy: args }));
  const limit = jest.fn((n) => ({ _limit: n }));
  const startAfter = jest.fn((...args) => ({ _startAfter: args }));
  const serverTimestamp = jest.fn(() => 'serverTimestamp');
  const increment = jest.fn((value) => value);
  const deleteField = jest.fn(() => 'deleteField');

  class GeoPoint {
    constructor(latitude, longitude) {
      this.latitude = latitude;
      this.longitude = longitude;
    }
  }

  class Timestamp {
    toDate() {
      return new Date();
    }
  }

  return {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    increment,
    deleteField,
    GeoPoint,
    Timestamp,
    initializeFirestore: jest.fn(async () => db),
  };
});

jest.mock('@react-native-firebase/analytics', () => {
  const instance = {};
  return {
    getAnalytics: jest.fn(() => instance),
    logEvent: jest.fn(),
    logScreenView: jest.fn(),
    logLogin: jest.fn(),
    logSignUp: jest.fn(),
    setUserId: jest.fn(),
    setUserProperties: jest.fn(),
  };
});

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {};
  return {
    getMessaging: jest.fn(() => instance),
    requestPermission: jest.fn().mockResolvedValue(1),
    registerDeviceForRemoteMessages: jest.fn(),
    getToken: jest.fn().mockResolvedValue('mock-token'),
    onTokenRefresh: jest.fn((_messaging, cb) => {
      if (cb) cb('mock-token');
      return jest.fn();
    }),
    onMessage: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
  };
});

jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: () => null,
  BannerAdSize: {},
  InterstitialAd: {
    createForAdRequest: jest.fn(() => ({
      addAdEventListener: jest.fn(),
      load: jest.fn(),
      show: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  },
  AdEventType: { LOADED: 'LOADED', ERROR: 'ERROR' },
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement('MapView', props, children),
    Marker: ({ children, ...props }) => React.createElement('Marker', props, children),
  };
});

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '0.0.0'),
  getUniqueId: jest.fn(() => Promise.resolve('mock-device')),
  getUniqueIdSync: jest.fn(() => 'mock-device'),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn().mockResolvedValue({ data: { idToken: 'token' } }),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  },
}));

jest.mock('@react-native-vector-icons/material-design-icons', () => {
  const React = require('react');
  return (props) => React.createElement('Icon', props, null);
});

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn().mockResolvedValue('granted'),
  request: jest.fn().mockResolvedValue('granted'),
  PERMISSIONS: {
    ANDROID: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
    IOS: { LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE' },
  },
  RESULTS: { GRANTED: 'granted' },
}));

jest.mock('react-native-modal-datetime-picker', () => {
  const React = require('react');
  return ({ children }) => React.createElement('DateTimePickerModal', null, children);
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  return (props) => React.createElement('WebView', props, null);
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn().mockResolvedValue({ didCancel: true }),
}));

jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn().mockResolvedValue({ uri: 'file:///tmp/mock.webp' }),
}));

jest.mock('@react-native-firebase/storage', () => {
  const instance = {};
  const ref = jest.fn((_storage, path) => ({ path }));
  const refFromURL = jest.fn((_storage, url) => ({ url }));
  return {
    getStorage: jest.fn(() => instance),
    ref,
    refFromURL,
    putFile: jest.fn().mockResolvedValue(undefined),
    getDownloadURL: jest.fn().mockResolvedValue('https://example.com/image.jpg'),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
}));
