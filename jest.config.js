module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-native-community|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|@react-native-async-storage|@notifee|@react-native-firebase|react-native-siren|sp-react-native-in-app-updates)/)',
  ],
  moduleNameMapper: {
    '\\.(ttf|otf|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
