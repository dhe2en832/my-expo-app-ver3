// app/rekap/penjualan.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { FileText } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { salesOrderAPI } from '../../api/services';
import { SalesOrder } from '../../api/mockData';
import FormInput from '../../components/FormInput';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

const RekapPenjualanScreen = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    customerId: '',
  });

  const fetchOrders = async () => {
    try {
      const res = await salesOrderAPI.getOrders({
        status: 'processed',
        customerId: filters.customerId || undefined,
      });
      if (res.success) {
        let list = res.orders;
        if (filters.dateFrom) {
          list = list.filter(o => o.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
          list = list.filter(o => o.date <= filters.dateTo);
        }
        setOrders(list);
      }
    } catch (err) {
      Alert.alert('Error', 'Gagal memuat data penjualan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchOrders();
  }, [user?.id, filters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const totalNominal = orders.reduce((sum, o) => sum + o.total, 0);
  const totalUnit = orders.reduce(
    (sum, o) => sum + o.items.reduce((u, i) => u + i.quantity, 0),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Memuat...</Text>
      </View>
    );
  }

  return (
    // <View style={styles.container}>
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
    <Stack.Screen
      options={{
        title: "Rekap Penjualan", // custom title
      }}
    />  
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        {/* <View style={styles.header}>
          <FileText color="#4CAF50" size={24} />
          <Text style={styles.headerTitle}>Rekap Penjualan</Text>
        </View> */}

        {/* Filter */}
        <View style={styles.filterSection}>
          <FormInput
            label="Dari Tanggal"
            value={filters.dateFrom}
            onChangeText={(text) => setFilters({ ...filters, dateFrom: text })}
            placeholder="YYYY-MM-DD"
          />
          <FormInput
            label="Sampai Tanggal"
            value={filters.dateTo}
            onChangeText={(text) => setFilters({ ...filters, dateTo: text })}
            placeholder="YYYY-MM-DD"
          />
          <FormInput
            label="ID Pelanggan"
            value={filters.customerId}
            onChangeText={(text) => setFilters({ ...filters, customerId: text })}
            placeholder="Contoh: 1"
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan</Text>
          <View style={styles.summaryRow}>
            <Text>Total Penjualan:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalNominal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Unit:</Text>
            <Text style={styles.summaryValue}>{totalUnit} unit</Text>
          </View>
        </View>

        {/* List */}
        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Text>Tidak ada data penjualan.</Text>
          </View>
        ) : (
          orders.map((item) => (
            <View key={item.id} style={styles.orderCard}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.orderDate}>
                {format(new Date(item.date), 'dd MMM yyyy')}
              </Text>
              <Text style={styles.total}>{formatCurrency(item.total)}</Text>
              <Text style={styles.unit}>
                {item.items.reduce((sum, i) => sum + i.quantity, 0)} unit
              </Text>
            </View>
          ))
        )}
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryValue: {
    fontWeight: '600',
    color: '#333',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  orderNumber: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#4CAF50',
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  total: {
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  unit: {
    fontSize: 12,
    color: '#666',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
});

export default RekapPenjualanScreen;