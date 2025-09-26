 
// app/rks/edit.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { rksAPI } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineQueue } from '../../contexts/OfflineContext';
import CustomButton from '../../components/CustomButton';
import FormInput from '../../components/FormInput';
import { RKS } from '../../api/mockData';

// Define navigation param list
type RootStackParamList = {
  'rks/edit': { rksId: string };
  'rks/detail': { rksId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RKSEditScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { rksId } = route.params as { rksId: string };
  const { user, isLoading: authLoading } = useAuth();
  const { isOnline, addToQueue } = useOfflineQueue();
  const [rks, setRks] = useState<RKS | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    customerName: '',
    customerAddress: '',
    scheduledDate: '',
    scheduledTime: '',
    status: 'planned' as RKS['status'],
    notes: '',
  });
  const [errors, setErrors] = useState({
    customerName: '',
    customerAddress: '',
    scheduledDate: '',
    scheduledTime: '',
  });

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchRKSDetail();
    }
  }, [rksId, user?.id, authLoading]);

  const fetchRKSDetail = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await rksAPI.getRKSById(rksId);
      setRks(response);
      setFormData({
        customerName: response.customerName,
        customerAddress: response.customerAddress,
        scheduledDate: response.scheduledDate,
        scheduledTime: response.scheduledTime,
        status: response.status,
        notes: response.activities?.notes || '',
      });
    } catch (error) {
      console.error('Gagal mengambil detail RKS:', error);
      if (!isOnline) {
        console.log('Mode offline: Mengambil detail RKS dari cache');
        // TODO: Load from local storage (e.g., AsyncStorage)
      }
      Alert.alert('Error', 'Gagal mengambil detail RKS. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      customerName: '',
      customerAddress: '',
      scheduledDate: '',
      scheduledTime: '',
    };

    if (!formData.customerName) {
      newErrors.customerName = 'Nama pelanggan wajib diisi';
      isValid = false;
    }
    if (!formData.customerAddress) {
      newErrors.customerAddress = 'Alamat wajib diisi';
      isValid = false;
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Tanggal wajib diisi';
      isValid = false;
    }
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Waktu wajib diisi';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id || !rks) return;

    const updatedRKS: RKS = {
      ...rks,
      customerName: formData.customerName,
      customerAddress: formData.customerAddress,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      status: formData.status,
      activities: {
        ...rks.activities,
        notes: formData.notes || undefined,
      },
    };

    try {
      if (isOnline) {
        await rksAPI.updateRKS(rksId, updatedRKS);
        navigation.navigate('rks/detail', { rksId });
      } else {
        addToQueue({
          type: 'update-rks',
          data: updatedRKS,
          endpoint: `/rks/${rksId}`,
          method: 'PUT',
        });
        Alert.alert('Sukses', 'Perubahan RKS ditambahkan ke antrian offline.');
        navigation.navigate('rks/detail', { rksId });
      }
    } catch (error) {
      console.error('Gagal menyimpan RKS:', error);
      Alert.alert('Error', 'Gagal menyimpan perubahan RKS. Silakan coba lagi.');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (authLoading || loading) {
    return <ActivityIndicator size="large" color="#3b82f6" style={styles.loading} />;
  }

  if (!rks) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>RKS tidak ditemukan.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Edit Rencana Kunjungan</Text>

      {/* Form Card */}
      <View style={[styles.card, styles.shadow]}>
        <FormInput
          placeholder="Nama Pelanggan"
          value={formData.customerName}
          onChangeText={(text) => setFormData({ ...formData, customerName: text })}
          style={styles.input}
        />
        {errors.customerName && <Text style={styles.errorText}>{errors.customerName}</Text>}

        <FormInput
          placeholder="Alamat Pelanggan"
          value={formData.customerAddress}
          onChangeText={(text) => setFormData({ ...formData, customerAddress: text })}
          style={styles.input}
        />
        {errors.customerAddress && <Text style={styles.errorText}>{errors.customerAddress}</Text>}

        <FormInput
          placeholder="Tanggal (YYYY-MM-DD)"
          value={formData.scheduledDate}
          onChangeText={(text) => setFormData({ ...formData, scheduledDate: text })}
          style={styles.input}
        />
        {errors.scheduledDate && <Text style={styles.errorText}>{errors.scheduledDate}</Text>}

        <FormInput
          placeholder="Waktu (HH:mm)"
          value={formData.scheduledTime}
          onChangeText={(text) => setFormData({ ...formData, scheduledTime: text })}
          style={styles.input}
        />
        {errors.scheduledTime && <Text style={styles.errorText}>{errors.scheduledTime}</Text>}

        <FormInput
          placeholder="Status"
          value={formData.status}
          onChangeText={(text) => setFormData({ ...formData, status: text as RKS['status'] })}
          style={styles.input}
        />
        <Text style={styles.hintText}>
          Status: planned, completed, not-visited, additional, new-customer
        </Text>

        <FormInput
          placeholder="Catatan (opsional)"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          style={styles.input}
          multiline
        />
      </View>

      {/* Action Buttons */}
      <CustomButton
        title="Simpan"
        onPress={handleSave}
        style={styles.saveButton}
      />
      <CustomButton
        title="Batal"
        onPress={handleCancel}
        style={styles.cancelButton}
      />
    </ScrollView>
  );
};

export default RKSEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
  },
  cancelButton: {
    marginTop: 8,
    backgroundColor: '#6b7280',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
