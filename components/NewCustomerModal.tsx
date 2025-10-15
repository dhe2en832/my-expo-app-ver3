// components/NewCustomerModal.tsx - NEW FILE
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface NewCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerCreated: (customerData: {
    kode_cust: string;
    nama_cust: string;
    alamat_kirim1: string;
    kota_kirim: string;
    phone?: string;
  }) => void;
  kodeSales: string;
  namaSales: string;
}

export default function NewCustomerModal({
  visible,
  onClose,
  onCustomerCreated,
  kodeSales,
  namaSales,
}: NewCustomerModalProps) {
  const [formData, setFormData] = useState({
    namaPemilik: '',
    namaToko: '',
    alamat: '',
    kota: '',
    nomorHp: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validasi form
    if (!formData.namaPemilik.trim() || !formData.alamat.trim()) {
      Alert.alert('Error', 'Nama pemilik dan alamat harus diisi');
      return;
    }

    setLoading(true);

    try {
      // Generate kode_cust temporary untuk NOO
      const tempKodeCust = `TEMP_NOO_${Date.now()}`;

      // Data customer untuk RKS NOO
      const customerData = {
        kode_cust: tempKodeCust,
        nama_cust: formData.namaToko ? `${formData.namaPemilik} / ${formData.namaToko}` : formData.namaPemilik,
        alamat_kirim1: formData.alamat,
        kota_kirim: formData.kota || 'Tidak diketahui',
        phone: formData.nomorHp,
        kode_sales: kodeSales,
      };

      // Panggil callback dengan data customer
      onCustomerCreated(customerData);

      // Reset form
      setFormData({
        namaPemilik: '',
        namaToko: '',
        alamat: '',
        kota: '',
        nomorHp: '',
      });

    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'Gagal membuat customer baru');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      namaPemilik: '',
      namaToko: '',
      alamat: '',
      kota: '',
      nomorHp: '',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tambah Customer Baru (NOO)</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Sales Info */}
          <View style={styles.salesInfo}>
            <Text style={styles.salesLabel}>Sales:</Text>
            <Text style={styles.salesName}>{namaSales}</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Pemilik *</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama pemilik"
              value={formData.namaPemilik}
              onChangeText={(text) => handleInputChange('namaPemilik', text)}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Toko</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama toko (opsional)"
              value={formData.namaToko}
              onChangeText={(text) => handleInputChange('namaToko', text)}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alamat *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Masukkan alamat lengkap"
              value={formData.alamat}
              onChangeText={(text) => handleInputChange('alamat', text)}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kota</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kota"
              value={formData.kota}
              onChangeText={(text) => handleInputChange('kota', text)}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor HP</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nomor HP"
              value={formData.nomorHp}
              onChangeText={(text) => handleInputChange('nomorHp', text)}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, (!formData.namaPemilik.trim() || !formData.alamat.trim()) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !formData.namaPemilik.trim() || !formData.alamat.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Simpan & Check-in</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  salesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  salesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginRight: 8,
  },
  salesName: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#667eea',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});