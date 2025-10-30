// utils/testProjectId.ts
import Constants from 'expo-constants';

export function checkExpoConfig() {
  console.log('=== EXPO CONFIG CHECK ===');
  console.log('Constants.expoConfig:', Constants.expoConfig);
  console.log('Project ID:', Constants.expoConfig?.extra?.eas?.projectId);
  console.log('========================');
}

// Panggil di App.tsx atau login screen
checkExpoConfig();