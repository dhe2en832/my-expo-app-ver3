// utils/storage.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Simpan nilai ke penyimpanan aman (native) atau localStorage (web)
 */
export const setStorageItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

/**
 * Ambil nilai dari penyimpanan
 */
export const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

/**
 * Hapus item dari penyimpanan
 */
export const deleteStorageItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};