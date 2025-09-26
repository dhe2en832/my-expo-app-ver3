// utils/syncMasterData.ts
import { saveCustomers, saveSuppliers } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const syncMasterData = async () => {
  try {
    // Ambil timestamp terakhir sync
    const lastSync = await AsyncStorage.getItem('last_master_sync');
    const now = new Date().toISOString();

    // Sync customers
    const custRes = await fetch(`/api/customers?updated_after=${lastSync || '2020-01-01'}`);
    const customers = await custRes.json();
    saveCustomers(customers);

    // Sync suppliers
    const suppRes = await fetch(`/api/suppliers?updated_after=${lastSync || '2020-01-01'}`);
    const suppliers = await suppRes.json();
    saveSuppliers(suppliers);

    // Simpan waktu sync
    await AsyncStorage.setItem('last_master_sync', now);
    console.log('✅ Master data synced');
  } catch (error) {
    console.error('Sync master gagal:', error);
  }
};