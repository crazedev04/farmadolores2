import DeviceInfo from 'react-native-device-info';

/**
 * Gets a snapshot of the current device information.
 */
export const getDeviceSnapshot = async () => ({
  brand: DeviceInfo.getBrand(),
  model: DeviceInfo.getModel(),
  systemName: DeviceInfo.getSystemName(),
  systemVersion: DeviceInfo.getSystemVersion(),
  deviceId: DeviceInfo.getDeviceId(),
  appVersion: DeviceInfo.getVersion(),
  buildNumber: DeviceInfo.getBuildNumber(),
  isTablet: DeviceInfo.isTablet(),
});
