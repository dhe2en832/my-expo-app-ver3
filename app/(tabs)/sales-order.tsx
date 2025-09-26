// app/(tabs)/sales-order.tsx
// app/(tabs)/sales-order.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, ShoppingCart, User, Package, Edit3, Trash2, Eye, Filter, Download, Printer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router'; // ✅ Tambahkan useLocalSearchParams
import { SalesOrder, mockSalesOrders, mockCustomers, mockProducts } from '@/api/mockData';
import { salesOrderAPI } from '@/api/services';
import { useOfflineQueue } from '@/contexts/OfflineContext';
import { useFocusEffect } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FilterState {
  status: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
}

export default function SalesOrderScreen() {
  const [trigger, setTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    customerId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const { addToQueue } = useOfflineQueue();
  const animatedStatus = useRef<Record<string, Animated.Value>>({});

  // ✅ Ambil params dari RKS
  const params = useLocalSearchParams();
  const customerIdFromRKS = params.customerId as string | undefined;
  const customerNameFromRKS = params.customerName as string | undefined;

  useEffect(() => {
    orders.forEach(order => {
      if (!animatedStatus.current[order.id]) {
        animatedStatus.current[order.id] = new Animated.Value(0);
      }
    });
  }, [orders]);

  const refreshOrders = useCallback(() => {
    setTrigger(prev => prev + 1);
  }, []);

  // ✅ Inisialisasi filter dari RKS
  useEffect(() => {
    if (customerIdFromRKS) {
      setFilters(prev => ({ ...prev, customerId: customerIdFromRKS }));
    }
    loadOrders();
  }, []);

  useEffect(() => {
    if (customerNameFromRKS) {
      setSearchQuery(customerNameFromRKS);
    }
  }, [customerNameFromRKS]);

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [filters, searchQuery]) // ✅ Tambahkan searchQuery
  );

  // ✅ loadData dari mock, bukan API
  const loadOrders = async () => {
    setLoading(true);
    try {
      // Filter dari mockSalesOrders
      const filtered = mockSalesOrders.filter(order => {
        const matchCustomer = !filters.customerId || order.customerId === filters.customerId;
        const matchStatus = !filters.status || order.status === filters.status;
        const matchSearch = !searchQuery ||
          order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
        // Tambahkan filter tanggal jika diperlukan
        return matchCustomer && matchStatus && matchSearch;
      });

      const sorted = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOrders(sorted);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders(mockSalesOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } finally {
      setLoading(false);
    }
  };

  // ❌ Hapus useEffect yang lama berbasis `trigger` karena sudah tidak perlu
  // useEffect(() => { loadOrders(); }, [filters, trigger]);

  const filteredOrders = orders; // Karena sudah difilter di loadOrders

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#FF9800';
      case 'submitted': return '#2196F3';
      case 'approved': return '#4CAF50';
      case 'processed': return '#9C27B0';
      case 'cancelled': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draf';
      case 'submitted': return 'Dikirim';
      case 'approved': return 'Disetujui';
      case 'processed': return 'Diproses';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateOrder = () => {
    router.push('/sales-order/create');
  };

  const handleOrderPress = (order: SalesOrder) => {
    router.push(`/sales-order/${order.id}`);
  };

  const handleEditOrder = (order: SalesOrder) => {
    if (order.status === 'draft') {
      router.push(`/sales-order/edit/${order.id}`);
    } else {
      Alert.alert('Tidak Bisa Edit', 'Hanya pesanan draf yang bisa diedit');
    }
  };

  const handleDeleteOrder = (order: SalesOrder) => {
    if (order.status !== 'draft') {
      Alert.alert('Tidak Bisa Hapus', 'Hanya pesanan draf yang bisa dihapus');
      return;
    }

    Alert.alert(
      'Hapus Pesanan',
      `Apakah Anda yakin ingin menghapus pesanan ${order.orderNumber}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await salesOrderAPI.deleteOrder(order.id);
              addToQueue({
                type: 'delete_sales_order',
                data: { id: order.id },
                endpoint: `/api/sales-orders/${order.id}`,
                method: 'DELETE'
              });
              // Update mock data lokal
              const index = mockSalesOrders.findIndex(o => o.id === order.id);
              if (index !== -1) mockSalesOrders.splice(index, 1);
              refreshOrders();
              Alert.alert('Sukses', 'Pesanan berhasil dihapus');
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus pesanan');
            }
          }
        }
      ]
    );
  };

  const handlePrintOrder = (order: SalesOrder) => {
    router.push(`/sales-order/print/${order.id}`);
  };

  const handleSubmitForApproval = async (order: SalesOrder) => {
    if (order.status !== 'draft') {
      Alert.alert('Tidak Bisa Kirim', 'Hanya pesanan draf yang bisa dikirim untuk persetujuan');
      return;
    }

    Alert.alert(
      'Kirim untuk Persetujuan',
      `Kirim pesanan ${order.orderNumber} untuk persetujuan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kirim',
          onPress: async () => {
            setSubmittingOrderId(order.id);
            try {
              await salesOrderAPI.submitForApproval(order.id);
              addToQueue({
                type: 'submit_sales_order',
                data: { id: order.id },
                endpoint: `/api/sales-orders/${order.id}/submit`,
                method: 'POST'
              });

              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setOrders(prev =>
                prev.map(o => o.id === order.id ? { ...o, status: 'submitted' } : o)
              );

              const mockIndex = mockSalesOrders.findIndex(o => o.id === order.id);
              if (mockIndex !== -1) {
                mockSalesOrders[mockIndex].status = 'submitted';
              }

              Alert.alert('Sukses', 'Pesanan berhasil dikirim untuk persetujuan');
            } catch (error) {
              Alert.alert('Error', 'Gagal mengirim pesanan');
            } finally {
              setSubmittingOrderId(null);
            }
          }
        }
      ]
    );
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      customerId: '',
      dateFrom: '',
      dateTo: ''
    });
    setShowFilters(false);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search color="#999" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari pesanan atau pelanggan..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Filter color="#667eea" size={20} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCreateOrder} style={styles.createButton}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.createButtonGradient}
          >
            <Plus color="white" size={20} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ShoppingCart color="#4CAF50" size={24} />
          <Text style={styles.statValue}>{orders.filter(o => o.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Disetujui</Text>
        </View>
        <View style={styles.statCard}>
          <User color="#2196F3" size={24} />
          <Text style={styles.statValue}>{new Set(orders.map(o => o.customerId)).size}</Text>
          <Text style={styles.statLabel}>Pelanggan</Text>
        </View>
        <View style={styles.statCard}>
          <Package color="#FF9800" size={24} />
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total Pesanan</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daftar Pesanan Penjualan</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Sedang memuat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ShoppingCart color="#ddd" size={64} />
            <Text style={styles.emptyText}>Tidak ada pesanan ditemukan</Text>
          </View>
        }
        renderItem={({ item: order }) => (
          <TouchableOpacity style={styles.orderCard} onPress={() => handleOrderPress(order)}>
            <View style={styles.orderContent}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>{order.orderNumber}</Text>
                  <Text style={styles.orderCustomer}>{order.customerName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                </View>
              </View>
              <View style={styles.orderDetails}>
                <Text style={styles.orderDate}>{order.date}</Text>
                <Text style={styles.orderItems}>{order.items.length} item</Text>
              </View>
              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                <View style={styles.orderActions}>
                  {order.status === 'draft' && (
                    <>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditOrder(order)}>
                        <Edit3 color="#667eea" size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteOrder(order)}>
                        <Trash2 color="#f44336" size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handlePrintOrder(order)}>
                        <Printer color="#333" size={16} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleOrderPress(order)}>
                    <Eye color="#333" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {order.status === 'draft' && (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleSubmitForApproval(order)}
                disabled={submittingOrderId === order.id}
              >
                <Text style={styles.submitButtonText}>
                  {submittingOrderId === order.id ? 'Mengirim...' : 'Kirim untuk Persetujuan'}
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.flatListContent}
      />

      <Modal visible={showFilters} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Pesanan</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalClose}>Tutup</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {['draft', 'submitted', 'approved', 'processed', 'cancelled'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      filters.status === status && styles.filterOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, status: prev.status === status ? '' : status }))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.status === status && styles.filterOptionTextActive
                      ]}
                    >
                      {getStatusText(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Pelanggan</Text>
              <FlatList
                data={mockCustomers}
                keyExtractor={item => item.id}
                style={styles.customerList}
                renderItem={({ item: customer }) => (
                  <TouchableOpacity
                    style={[
                      styles.customerOption,
                      filters.customerId === customer.id && styles.customerOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, customerId: prev.customerId === customer.id ? '' : customer.id }))}
                  >
                    <Text
                      style={[
                        styles.customerOptionText,
                        filters.customerId === customer.id && styles.customerOptionTextActive
                      ]}
                    >
                      {customer.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                <Text style={styles.clearButtonText}>Hapus Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => handleApplyFilters(filters)}>
                <Text style={styles.applyButtonText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ... (styles tetap sama seperti di file asli)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    width: 44,
    height: 44,
  },
  createButtonGradient: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatListContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderContent: {
    padding: 16,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderCustomer: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClose: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  filterOptionTextActive: {
    color: 'white',
  },
  customerList: {
    maxHeight: 200,
  },
  customerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerOptionActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  customerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  customerOptionTextActive: {
    color: 'white',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#667eea',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: 'white',
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