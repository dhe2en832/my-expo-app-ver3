// app/customers/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Home, Phone, MapPin, Camera, Trash2 } from 'lucide-react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { mockCustomers, Customer } from '@/api/mockData';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'regular' | 'vip' | 'new'>('regular');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ambil foto saat data dimuat
  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'ID pelanggan tidak ditemukan');
      router.back();
      return;
    }

    const found = mockCustomers.find(c => c.id === id);
    if (!found) {
      Alert.alert('Error', 'Pelanggan tidak ditemukan');
      router.back();
      return;
    }

    setCustomer(found);
    setName(found.name);
    setAddress(found.address);
    setPhone(found.phone);
    setType(found.type);
    setPhoto(found.photo || null);
    setLoading(false);
    setPhoto(found.photo || null); 
  }, [id]);

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Kamera Dibutuhkan', 'Aplikasi butuh akses kamera untuk mengambil foto.');
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

  const removePhoto = () => {
    setPhoto(null);
  };

  const handleSave = () => {
    if (!name.trim() || !address.trim() || !phone.trim()) {
      Alert.alert('Lengkapi Data', 'Nama, alamat, dan telepon wajib diisi.');
      return;
    }

    const updatedCustomer: Customer = {
      ...customer!,
      name,
      address,
      phone,
      type,
      photo: photo || undefined, // ✅ Simpan foto (bisa null)
    };

    // Update di mock data
    const index = mockCustomers.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCustomers[index] = updatedCustomer;
    }

    Alert.alert('Sukses', 'Data pelanggan berhasil diperbarui!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat data pelanggan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <Stack.Screen
        options={{
          title: "Edit Pelanggan", // custom title
        }}
      />
        {/* <Text style={styles.title}>Edit Pelanggan</Text> */}

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

        {customer?.coordinates && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Lokasi Pelanggan</Text>
            <View style={styles.locationContainer}>
              <MapPin color="#667eea" size={18} />
              <Text style={styles.locationText}>
                {customer.coordinates.latitude.toFixed(5)}, {customer.coordinates.longitude.toFixed(5)}
              </Text>
            </View>
          </View>
        )}

        {/* Foto Pelanggan */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Foto Pelanggan / Toko</Text>
          <View style={styles.photoContainer}>
            {photo ? (
              <>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
                    <Camera color="#667eea" size={16} />
                    <Text style={styles.photoActionText}>Ganti Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoActionButton} onPress={removePhoto}>
                    <Trash2 color="#f44336" size={16} />
                    <Text style={styles.photoActionText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Camera color="#667eea" size={24} />
                <Text style={styles.photoButtonText}>Ambil Foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSave}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (semua style sebelumnya tetap sama)

  // Tambahkan style baru untuk foto
  photoContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  photoButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
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
    width: '100%',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
    marginTop: 8,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 16,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  photoActionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },

  // Pastikan style lain tetap ada
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});