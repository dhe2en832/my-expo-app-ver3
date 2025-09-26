
// app/rks/detail.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { rksAPI } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { useOfflineQueue } from '../../contexts/OfflineContext';
import CustomButton from '../../components/CustomButton';
import { RKS } from '../../api/mockData';

// Define navigation param list
type RootStackParamList = {
  'rks/detail': { rksId: string };
  'rks/edit': { rksId: string };
  'sales-order/create': { rksId: string };
  'collection/record/[id]': { rksId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RKSDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { rksId } = route.params as { rksId: string };
  const { user, isLoading: authLoading } = useAuth();
  const { isOnline, addToQueue } = useOfflineQueue();
  const [rks, setRks] = useState<RKS | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Gagal mengambil detail RKS:', error);
      if (!isOnline) {
        console.log('Mode offline: Mengambil detail RKS dari cache');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRKS = async () => {
    if (!user?.id || !rks) return;
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus RKS ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isOnline) {
                await rksAPI.deleteRKS(rksId);
                navigation.goBack();
              } else {
                addToQueue({
                  type: 'delete-rks',
                  data: { rksId },
                  endpoint: `/rks/${rksId}`,
                  method: 'DELETE',
                });
                Alert.alert('Sukses', 'Aksi hapus ditambahkan ke antrian offline.');
                navigation.goBack();
              }
            } catch (error) {
              console.error('Gagal menghapus RKS:', error);
              Alert.alert('Error', 'Gagal menghapus RKS. Silakan coba lagi.');
            }
          },
        },
      ],
    );
  };

  const handleEditRKS = () => {
    navigation.navigate('rks/edit', { rksId });
  };

  const handleCreateSalesOrder = () => {
    navigation.navigate('sales-order/create', { rksId });
  };

  const handleRecordCollection = () => {
    navigation.navigate('collection/record/[id]', { rksId });
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes} WIB`;
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

  const statusStyles: { [key: string]: { backgroundColor: string; color: string } } = {
    planned: { backgroundColor: '#fefcbf', color: '#744210' },
    completed: { backgroundColor: '#c6f6d5', color: '#065f46' },
    'not-visited': { backgroundColor: '#fed7d7', color: '#991b1b' },
    additional: { backgroundColor: '#bfdbfe', color: '#1e40af' },
    'new-customer': { backgroundColor: '#e9d8fd', color: '#5b21b6' },
    incomplete: { backgroundColor: '#fed7aa', color: '#c2410c' },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Detail Rencana Kunjungan</Text>
      <View style={[styles.card, styles.shadow]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{rks.customerName}</Text>
          <Text style={[styles.statusBadge, statusStyles[rks.status]]}>
            {rks.status === 'planned' ? 'Direncanakan' :
             rks.status === 'completed' ? 'Selesai' :
             rks.status === 'not-visited' ? 'Tidak Dikunjungi' :
             rks.status === 'additional' ? 'Tambahan' :
             rks.status === 'new-customer' ? 'Pelanggan Baru' :
             'Belum Selesai'}
          </Text>
        </View>
        <Text style={styles.cardSubtitle}>Alamat: {rks.customerAddress}</Text>
        <Text style={styles.cardSubtitle}>
          Jadwal: {formatDateTime(rks.scheduledDate + 'T' + rks.scheduledTime + ':00Z')}
        </Text>
        {rks.activities?.notes && (
          <Text style={styles.cardNotes}>Catatan: {rks.activities.notes}</Text>
        )}
        {rks.activities?.checkIn && (
          <View>
            <Text style={styles.cardSubtitle}>
              Check In: {formatDateTime(rks.activities.checkIn.timestamp)}
            </Text>
            <Text style={styles.cardSubtitle}>
              GPS Check In: {rks.activities.checkIn.gps.latitude}, {rks.activities.checkIn.gps.longitude} (Akurasi: {rks.activities.checkIn.gps.accuracy}m)
            </Text>
            <Text style={styles.cardSubtitle}>Selfie: {rks.activities.checkIn.selfie}</Text>
          </View>
        )}
        {rks.activities?.checkOut && (
          <View>
            <Text style={styles.cardSubtitle}>
              Check Out: {formatDateTime(rks.activities.checkOut.timestamp)}
            </Text>
            <Text style={styles.cardSubtitle}>
              GPS Check Out: {rks.activities.checkOut.gps.latitude}, {rks.activities.checkOut.gps.longitude} (Akurasi: {rks.activities.checkOut.gps.accuracy}m)
            </Text>
          </View>
        )}
        {rks.activities?.photos && rks.activities.photos.length > 0 && (
          <Text style={styles.cardSubtitle}>
            Foto: {rks.activities.photos.join(', ')}
          </Text>
        )}
      </View>
      <CustomButton
        title="Edit RKS"
        onPress={handleEditRKS}
        style={styles.actionButton}
      />
      <CustomButton
        title="Buat Sales Order"
        onPress={handleCreateSalesOrder}
        style={styles.actionButton}
      />
      <CustomButton
        title="Catat Tagihan"
        onPress={handleRecordCollection}
        style={styles.actionButton}
      />
      <CustomButton
        title="Hapus RKS"
        onPress={handleDeleteRKS}
        style={[styles.actionButton, styles.deleteButton]}
      />
    </View>
  );
};

export default RKSDetailScreen;

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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cardNotes: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  actionButton: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
