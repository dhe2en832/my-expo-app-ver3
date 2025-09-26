// app/customers/create.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, MapPin, Phone, User, Home, Plus } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { rksAPI } from '@/api/services';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateCustomerScreen() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'regular' | 'vip' | 'new'>('new');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

  // Ambil lokasi saat komponen mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Lokasi Dibutuhkan', 'Aplikasi butuh akses lokasi untuk menandai pelanggan.');
          setLocationLoading(false);
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        setCoordinates({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Gagal mendapatkan lokasi. Silakan isi manual.');
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Kamera Dibutuhkan', 'Aplikas butuh akses kamera untuk mengambil foto pelanggan.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Gagal mengambil foto.');
    }
  };

  const handleSubmit = async () => {
    if (!name || !address || !phone) {
      Alert.alert('Lengkapi Data', 'Nama, alamat, dan telepon wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const response = await rksAPI.addNewCustomerVisit('1', {
        name,
        address,
        phone,
        type,
        coordinates: coordinates || undefined,
        photo: photo || undefined,
      });

      // Jika ada foto, simpan ke RKS (opsional, bisa ditambahkan di API)
      if (photo) {
        // Untuk demo, kita simpan di console. Di real app, kirim ke API.
        console.log('Foto pelanggan:', photo);
      }

      Alert.alert('Sukses', 'Pelanggan baru berhasil ditambahkan!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'Gagal menambahkan pelanggan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <Stack.Screen
        options={{
          title: "Pelangan Baru", // custom title
        }}
      />
        {/* <Text style={styles.title}>Tambah Pelanggan Baru</Text> */}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nama Pelanggan *</Text>
          <View style={styles.inputContainer}>
            <User color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Toko Maju Jaya"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Alamat *</Text>
          <View style={styles.inputContainer}>
            <Home color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Alamat lengkap"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Telepon *</Text>
          <View style={styles.inputContainer}>
            <Phone color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="081234567890"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipe Pelanggan</Text>
          <View style={styles.typeButtons}>
            {(['new', 'regular', 'vip'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, type === t && styles.typeButtonActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                  {t === 'new' ? 'Baru' : t === 'regular' ? 'Reguler' : 'VIP'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Lokasi (Otomatis)</Text>
          <View style={styles.locationContainer}>
            {locationLoading ? (
              <ActivityIndicator size="small" color="#667eea" />
            ) : coordinates ? (
              <View style={styles.locationInfo}>
                <MapPin color="#667eea" size={18} />
                <Text style={styles.locationText}>
                  {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                </Text>
              </View>
            ) : (
              <Text style={styles.locationText}>Tidak tersedia</Text>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Foto Pelanggan / Toko (Opsional)</Text>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoPreview} />
            ) : (
              <>
                <Camera color="#667eea" size={24} />
                <Text style={styles.photoButtonText}>Ambil Foto</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.submitButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Simpan Pelanggan Baru</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  typeButtonActive: {
    backgroundColor: '#667eea',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  locationContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  photoButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    height: 150,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
    marginTop: 8,
  },
  submitButton: {
    height: 56,
    marginTop: 20,
  },
  submitButtonGradient: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});