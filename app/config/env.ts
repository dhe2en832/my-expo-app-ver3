// app/config/env.ts
import Constants from 'expo-constants';

// ✅ Environment Configuration untuk EAS Build
export const Config = {
  // Production detection
  isProduction: Constants.expoConfig?.extra?.IS_PRODUCTION === 'true' ||
                Constants.expoConfig?.extra?.EAS_BUILD_PROFILE === 'production' ||
                !__DEV__,

  // Build information
  build: {
    profile: Constants.expoConfig?.extra?.EAS_BUILD_PROFILE || 'development',
    isEAS: !!Constants.expoConfig?.extra?.eas?.projectId,
    environment: Constants.expoConfig?.extra?.APP_ENV || 'development'
  },

  // Bluetooth configuration
  bluetooth: {
    enabled: Constants.expoConfig?.extra?.BLUETOOTH_ENABLED === 'true',
    simulationMode: Constants.expoConfig?.extra?.BLUETOOTH_ENABLED !== 'true'
  },

  // App configuration
  app: {
    name: Constants.expoConfig?.name || 'SalesApp',
    version: Constants.expoConfig?.version || '1.0.0'
  }
};

// ✅ Debug helper
export const logEnvironment = () => {
  console.log('🔍 Environment Config:', {
    isProduction: Config.isProduction,
    buildProfile: Config.build.profile,
    isEAS: Config.build.isEAS,
    environment: Config.build.environment,
    bluetoothEnabled: Config.bluetooth.enabled,
    simulationMode: Config.bluetooth.simulationMode
  });
};