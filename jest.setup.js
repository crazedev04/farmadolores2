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

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    onAuthStateChanged: (cb) => {
      cb(null);
      return () => {};
    },
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    signInWithCredential: jest.fn(),
  });
});

jest.mock('@react-native-firebase/firestore', () => {
  const firestore = () => ({
    collection: () => ({
      onSnapshot: (cb) => {
        cb({ docs: [] });
        return () => {};
      },
      get: jest.fn().mockResolvedValue({ docs: [] }),
      doc: () => ({ update: jest.fn(), get: jest.fn().mockResolvedValue({ exists: false }) }),
      orderBy: () => ({
        onSnapshot: (cb) => {
          cb({ docs: [] });
          return () => {};
        },
        get: jest.fn().mockResolvedValue({ docs: [] }),
      }),
      where: () => ({
        where: () => ({
          limit: () => ({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
      }),
      limit: () => ({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      }),
    }),
    batch: () => ({ update: jest.fn(), commit: jest.fn() }),
  });

  firestore.GeoPoint = class {
    constructor(latitude, longitude) {
      this.latitude = latitude;
      this.longitude = longitude;
    }
  };
  firestore.Timestamp = class {
    toDate() {
      return new Date();
    }
  };
  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'serverTimestamp'),
  };
  return firestore;
});

jest.mock('@react-native-firebase/messaging', () => {
  const messaging = () => ({
    requestPermission: jest.fn().mockResolvedValue(1),
    registerDeviceForRemoteMessages: jest.fn(),
    getToken: jest.fn().mockResolvedValue('mock-token'),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
  });
  return messaging;
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
}));

jest.mock('@react-native-vector-icons/material-design-icons', () => {
  const React = require('react');
  return (props) => React.createElement('Icon', props, null);
});

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
