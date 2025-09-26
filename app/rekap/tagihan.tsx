// app/rekap/tagihan.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { collectionAPI } from '../../api/services';
import { Invoice } from '../../api/mockData';
import FormInput from '../../components/FormInput';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

const RekapTagihanScreen = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    customerId: '',
    status: '',
  });

  const fetchInvoices = async () => {
    try {
      const res = await collectionAPI.getInvoices({
        customerId: filters.customerId || undefined,
        status: filters.status || undefined,
      });
      if (res.success) {
        const today = new Date().toISOString().split('T')[0];
        const list = res.invoices.map(inv => ({
          ...inv,
          isOverdue: inv.dueDate < today && inv.status !== 'paid',
        }));
        setInvoices(list);
      }
    } catch (err) {
      Alert.alert('Error', 'Gagal memuat data tagihan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchInvoices();
  }, [user?.id, filters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

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
        title: "Rekap Tagihan", // custom title
      }}
    />      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        {/* <View style={styles.header}>
          <CreditCard color="#2196F3" size={24} />
          <Text style={styles.headerTitle}>Rekap Tagihan</Text>
        </View> */}

        {/* Filter */}
        <View style={styles.filterSection}>
          <FormInput
            label="ID Pelanggan"
            value={filters.customerId}
            onChangeText={(text) => setFilters({ ...filters, customerId: text })}
            placeholder="Contoh: 1"
          />
          <FormInput
            label="Status"
            value={filters.status}
            onChangeText={(text) => setFilters({ ...filters, status: text })}
            placeholder="paid / partial / outstanding"
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan</Text>
          <View style={styles.summaryRow}>
            <Text>Total Tagihan:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total Terbayar:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Persentase Terbayar:</Text>
            <Text style={styles.summaryValue}>{percentPaid.toFixed(1)}%</Text>
          </View>
        </View>

        {/* List */}
        {invoices.length === 0 ? (
          <View style={styles.empty}>
            <Text>Tidak ada data tagihan.</Text>
          </View>
        ) : (
          invoices.map((item) => (
            <View
              key={item.id}
              style={[styles.invoiceCard, item.isOverdue && styles.overdueCard]}
            >
              <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.dueDate}>
                Jatuh Tempo: {format(new Date(item.dueDate), 'dd MMM yyyy')}
              </Text>
              <Text style={styles.amount}>Tagihan: {formatCurrency(item.amount)}</Text>
              <Text style={styles.paid}>Terbayar: {formatCurrency(item.paidAmount)}</Text>
              <View style={styles.statusBadge}>
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'paid' && styles.statusPaid,
                    item.status === 'partial' && styles.statusPartial,
                    (item.status === 'outstanding' || item.isOverdue) && styles.statusOutstanding,
                  ]}
                >
                  {item.isOverdue ? 'Overdue' : item.status}
                </Text>
              </View>
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
  invoiceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  overdueCard: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  invoiceNumber: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#2196F3',
  },
  customerName: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
  },
  amount: {
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  paid: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPaid: {
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },
  statusPartial: {
    color: '#f57f17',
    backgroundColor: '#fff8e1',
  },
  statusOutstanding: {
    color: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
});

export default RekapTagihanScreen;