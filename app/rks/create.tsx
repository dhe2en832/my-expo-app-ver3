
// app/rks/create.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, Image as RNImage } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineQueue } from '@/contexts/OfflineContext';
import { rksAPI, RKS } from '@/api/services';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, XCircle } from 'lucide-react-native';

const MIN_ACCURACY_METERS = 50;
const MAX_IMAGE_DIMENSION = 1000;

// Helper cek low-end device
const isLowEndDevice = () => {
  const name = (Device.deviceName || '').toLowerCase();
  if (name.includes('realme c35') || name.includes('realme c21') || name.includes('redmi 9a')) {
    return true;
  }
  return false;
};

// Fungsi untuk menghitung jarak Haversine (dalam meter)
const haversineDistance = (
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Radius bumi dalam meter
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);
  const deltaLat = toRad(coords2.latitude - coords1.latitude);
  const deltaLon = toRad(coords2.longitude - coords1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CreateRKSScreen() {
  const { user } = useAuth();
  const { addToQueue, processQueue, isOnline } = useOfflineQueue();
  const router = useRouter();
  const [form, setForm] = useState<Partial<RKS>>({
    customerName: '',
    customerAddress: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    radius: 100,
  });
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [pendingType, setPendingType] = useState<'check-in' | 'check-out' | null>(null);
  const [newRKSId, setNewRKSId] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    getCurrentLocation();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Lokasi', 'Izin lokasi diperlukan.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (isMounted.current) {
        setCurrentLocation(loc);
        setForm(prev => ({
          ...prev,
          customerLocation: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          coordinates: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          customerAddress: `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`,
        }));
      }
    } catch (error) {
      console.error('Lokasi error:', error);
      Alert.alert('Lokasi', 'Gagal mendapatkan lokasi.');
    }
  };

  const pickAndPreviewSelfie = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Kamera', 'Izin kamera diperlukan.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: isLowEndDevice() ? 0.3 : 0.7,
        cameraType: ImagePicker.CameraType.front,
        base64: false,
      });

      if (result.canceled) return null;
      if (!result.assets || result.assets.length === 0 || !result.assets[0].uri) return null;

      const uri = result.assets[0].uri;

      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: isLowEndDevice() ? 600 : MAX_IMAGE_DIMENSION } }],
        {
          compress: isLowEndDevice() ? 0.5 : 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipResult.uri;
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Kamera', 'Terjadi error saat membuka kamera.');
      return null;
    }
  };

  const handleInputChange = (field: keyof RKS, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.customerName || form.customerName.length < 3) {
      Alert.alert('Error', 'Nama pelanggan minimal 3 karakter.');
      return false;
    }
    if (!form.customerAddress) {
      Alert.alert('Error', 'Alamat pelanggan harus diisi.');
      return false;
    }
    if (!form.scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.scheduledDate)) {
      Alert.alert('Error', 'Tanggal harus dalam format YYYY-MM-DD.');
      return false;
    }
    if (!form.scheduledTime || !/^\d{2}:\d{2}$/.test(form.scheduledTime)) {
      Alert.alert('Error', 'Waktu harus dalam format HH:mm.');
      return false;
    }
    if (!form.radius || form.radius < 50) {
      Alert.alert('Error', 'Radius geofence minimal 50 meter.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id || !currentLocation) return;

    setIsProcessing(true);
    try {
      const rks: RKS = {
        id: Date.now().toString(),
        userId: user.id,
        salesId: user.id,
        customerId: `C${Date.now()}`,
        customerName: form.customerName!,
        customerAddress: form.customerAddress!,
        scheduledDate: form.scheduledDate!,
        scheduledTime: form.scheduledTime!,
        status: 'planned',
        radius: form.radius || 100,
        customerLocation: form.customerLocation || {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        coordinates: form.coordinates || {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isOnline) {
        await rksAPI.createRKS(rks);
      } else {
        addToQueue({
          type: 'create-rks',
          data: rks,
          endpoint: '/rks',
          method: 'POST',
        });
      }

      if (isOnline && processQueue) {
        await processQueue();
      }

      setNewRKSId(rks.id);
      Alert.alert('Sukses', 'RKS berhasil dibuat.');
    } catch (error) {
      console.error('Create RKS error:', error);
      Alert.alert('Error', 'Gagal membuat RKS.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onPressAttendance = async (type: 'check-in' | 'check-out') => {
    if (!currentLocation) {
      Alert.alert('Lokasi', 'Lokasi belum tersedia.');
      return;
    }
    if ((currentLocation.coords.accuracy ?? 999) > MIN_ACCURACY_METERS) {
      Alert.alert(
        'Akurasi Rendah',
        `Akurasi GPS terlalu rendah (±${Math.round(currentLocation.coords.accuracy ?? 0)} m). Harus ≤ ${MIN_ACCURACY_METERS} m.`
      );
      return;
    }

    if (!newRKSId) {
      Alert.alert('Error', 'Silakan buat RKS terlebih dahulu.');
      return;
    }

    const rks = await rksAPI.getRKSById(newRKSId);
    if (type === 'check-out' && !rks.checkIn) {
      Alert.alert('Error', 'Harus Check In terlebih dahulu sebelum Check Out.');
      return;
    }

    setPendingType(type);
    if (type === 'check-in') {
      const uri = await pickAndPreviewSelfie();
      if (!uri) {
        setPendingType(null);
        return;
      }
      if (isMounted.current) {
        setPhotoPreviewUri(uri);
        setPreviewModalVisible(true);
      }
    } else {
      submitAttendance();
    }
  };

  const submitAttendance = async () => {
    if (!currentLocation || !pendingType || !user?.id || !newRKSId) return;
    setIsProcessing(true);

    try {
      const isWithinGeofence = haversineDistance(
        { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude },
        form.customerLocation || {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        }
      ) <= (form.radius || 100);

      if (pendingType === 'check-in' && !isWithinGeofence) {
        Alert.alert('Luar Geofence', 'Lokasi Anda di luar radius pelanggan.');
        setIsProcessing(false);
        return;
      }

      if (pendingType === 'check-in') {
        if (!photoPreviewUri) {
          Alert.alert('Error', 'Foto selfie diperlukan untuk Check In.');
          setIsProcessing(false);
          return;
        }
        if (isOnline) {
          await rksAPI.checkIn(newRKSId, {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy ?? 0,
            photo: photoPreviewUri,
            isWithinGeofence,
          });
        } else {
          addToQueue({
            type: 'check-in',
            data: {
              rksId: newRKSId,
              userLocation: {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy ?? 0,
              },
              photoUri: photoPreviewUri,
              isWithinGeofence,
            },
            endpoint: `/rks/${newRKSId}/check-in`,
            method: 'POST',
          });
        }
      } else {
        if (isOnline) {
          await rksAPI.checkOut(newRKSId, {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy ?? 0,
          });
        } else {
          addToQueue({
            type: 'check-out',
            data: {
              rksId: newRKSId,
              userLocation: {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy ?? 0,
              },
            },
            endpoint: `/rks/${newRKSId}/check-out`,
            method: 'POST',
          });
        }
      }

      if (isOnline && processQueue) {
        await processQueue();
      }

      if (isMounted.current) {
        setPreviewModalVisible(false);
        setPhotoPreviewUri(null);
        setPendingType(null);
        Alert.alert(
          'Sukses',
          pendingType === 'check-in' ? 'Check In berhasil dicatat.' : 'Check Out berhasil dicatat.'
        );
        router.push('/(tabs)/rks');
      }
    } catch (err) {
      console.error('Submit attendance error:', err);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan absensi.');
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Buat Rencana Kunjungan Sales</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nama Pelanggan</Text>
          <TextInput
            style={styles.input}
            value={form.customerName}
            onChangeText={text => handleInputChange('customerName', text)}
            placeholder="Masukkan nama pelanggan"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Alamat Pelanggan</Text>
          <TextInput
            style={styles.input}
            value={form.customerAddress}
            onChangeText={text => handleInputChange('customerAddress', text)}
            placeholder="Masukkan alamat pelanggan"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tanggal Kunjungan</Text>
          <TextInput
            style={styles.input}
            value={form.scheduledDate}
            onChangeText={text => handleInputChange('scheduledDate', text)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Waktu Kunjungan</Text>
          <TextInput
            style={styles.input}
            value={form.scheduledTime}
            onChangeText={text => handleInputChange('scheduledTime', text)}
            placeholder="HH:mm"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Radius Geofence (meter)</Text>
          <TextInput
            style={styles.input}
            value={form.radius?.toString()}
            onChangeText={text => handleInputChange('radius', parseInt(text) || 100)}
            keyboardType="numeric"
            placeholder="Masukkan radius (min 50)"
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isProcessing}
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.buttonGradient}>
            <Text style={styles.buttonText}>
              {isProcessing ? 'Menyimpan...' : 'Buat RKS'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {newRKSId && (
          <View style={styles.attendanceButtons}>
            <TouchableOpacity
              onPress={() => onPressAttendance('check-in')}
              style={{ flex: 1 }}
              disabled={isProcessing}
            >
              <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.buttonGradient}>
                <CheckCircle color="white" size={20} />
                <Text style={styles.buttonText}>Check In</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onPressAttendance('check-out')}
              style={{ flex: 1 }}
              disabled={isProcessing}
            >
              <LinearGradient colors={['#f44336', '#d32f2f']} style={styles.buttonGradient}>
                <XCircle color="white" size={20} />
                <Text style={styles.buttonText}>Check Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Preview foto */}
      <Modal visible={previewModalVisible} transparent animationType="slide">
        <View style={styles.modalWrapper}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Preview Selfie</Text>
            {photoPreviewUri && <RNImage source={{ uri: photoPreviewUri }} style={styles.previewImage} />}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#eee' }]}
                onPress={() => {
                  if (isMounted.current) {
                    setPreviewModalVisible(false);
                    setPhotoPreviewUri(null);
                    setPendingType(null);
                  }
                }}
              >
                <Text>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#667eea' }]}
                onPress={submitAttendance}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>{isProcessing ? 'Mengirim...' : 'Kirim'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    marginTop: 16,
  },
  buttonGradient: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  attendanceButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modal: {
    width: '92%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 18,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
});
