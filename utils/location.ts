// utils/location.ts
import * as Location from 'expo-location';

export const getLocationWithRetry = async (maxRetries = 3, delayBetweenRetries = 3000): Promise<Location.LocationObject> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📍 Mencoba mendapatkan lokasi (percobaan ${attempt}/${maxRetries})`);

      // ✅ Cek apakah GPS sudah aktif dan ready
      const providerStatus = await Location.getProviderStatusAsync();
      console.log('📡 Status GPS:', providerStatus);

      if (!providerStatus.locationServicesEnabled) {
        throw new Error('Location services disabled');
      }

      if (!providerStatus.gpsAvailable && attempt === 1) {
        console.log('⏳ GPS belum siap, menunggu...');
        await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
        continue;
      }

      // ✅ FIXED: Gunakan hanya property yang valid
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // ✅ Pakai High seperti yang Anda mau
        // ❌ HAPUS: maximumAge dan timeout - tidak valid di expo-location
      });

      // ✅ Timeout manual dengan Promise.race
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Mengambil lokasi terlalu lama')), 15000)
      );

      const loc = await Promise.race([locationPromise, timeoutPromise]);

      console.log('📍 Lokasi berhasil didapat:', {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracy: loc.coords.accuracy
      });

      // ✅ Validasi accuracy
      if (loc.coords.accuracy && loc.coords.accuracy > 100) {
        console.log(`⚠️ Accuracy rendah: ${loc.coords.accuracy}m, mencoba lagi...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
          continue;
        }
      }

      return loc;

    } catch (error) {
      console.log(`❌ Percobaan ${attempt} gagal:`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      console.log(`⏳ Menunggu ${delayBetweenRetries/1000} detik sebelum retry...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
    }
  }
  throw new Error('Semua percobaan mendapatkan lokasi gagal');
};