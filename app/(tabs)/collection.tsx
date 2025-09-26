// app/(tabs)/collection.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
} from 'react-native';
import {
  Plus,
  Search,
  DollarSign,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Eye,
  Edit3,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Invoice, Payment, mockInvoices, mockPayments } from '@/api/mockData';
import { collectionAPI } from '@/api/services';
import { useOfflineQueue } from '@/contexts/OfflineContext';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native';
import { InteractionManager } from 'react-native';
import { TabView, SceneMap, TabBar, Route } from 'react-native-tab-view';
import { useWindowDimensions } from 'react-native';

interface FilterState {
  status: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod?: Payment['method'];
}

export default function CollectionScreen() {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'invoices', title: 'Tagihan' },
    { key: 'payments', title: 'Pembayaran' },
  ]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
  });

  const [tempInvoiceFilters, setTempInvoiceFilters] = useState<FilterState>({
    status: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [tempPaymentFilters, setTempPaymentFilters] = useState<FilterState>({
    status: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
    paymentMethod: undefined,
  });

  const currentTempFilters = index === 0 ? tempInvoiceFilters : tempPaymentFilters;
  const setCurrentTempFilters = index === 0 ? setTempInvoiceFilters : setTempPaymentFilters;

  const { addToQueue } = useOfflineQueue();
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [previousPaymentCount, setPreviousPaymentCount] = useState<number>(0);
  const [newPaymentsCount, setNewPaymentsCount] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [lastScrollPosition, setLastScrollPosition] = useState<number>(0);

  const params = useLocalSearchParams();
  const customerIdFromRKS = params.customerId as string | undefined;
  const customerNameFromRKS = params.customerName as string | undefined;

  const layout = useWindowDimensions();

  // Inisialisasi filter dari RKS
  useEffect(() => {
    if (customerIdFromRKS) {
      setTempInvoiceFilters(prev => ({ ...prev, customerId: customerIdFromRKS }));
      setFilters(prev => ({ ...prev, customerId: customerIdFromRKS }));
    }
    loadData();
  }, []);

  useEffect(() => {
    if (customerNameFromRKS) {
      setSearchQuery(customerNameFromRKS);
    }
  }, [customerNameFromRKS]);

  useFocusEffect(
    useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        if (lastScrollPosition > 0 && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: lastScrollPosition, animated: false });
        }
        loadData(true);
      });
    }, [index, filters, searchQuery]) // ✅ Tambahkan searchQuery
  );

  // ✅ loadData() yang dimodifikasi: gunakan mock data langsung
  const loadData = async (isReload: boolean = false) => {
    if (isReload) {
      setIsReloading(true);
    } else {
      setLoading(true);
    }

    try {
      if (index === 0) {
        // Filter Invoices
        const filtered = mockInvoices.filter((invoice) => {
          const matchCustomer = !filters.customerId || invoice.customerId === filters.customerId;
          const matchSearch = !searchQuery || invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());
          const matchStatus = !filters.status || invoice.status === filters.status;
          return matchCustomer && matchSearch && matchStatus;
        });
        setInvoices(filtered);
      } else {
        // Filter Payments
        const filtered = mockPayments.filter((payment) => {
          const matchCustomer = !filters.customerId || payment.customerId === filters.customerId;
          const matchSearch = !searchQuery || payment.customerName.toLowerCase().includes(searchQuery.toLowerCase());
          const matchMethod = !filters.paymentMethod || payment.method === filters.paymentMethod;
          return matchCustomer && matchSearch && matchMethod;
        });

        const currentCount = filtered.length;
        if (previousPaymentCount > 0 && currentCount > previousPaymentCount) {
          const diff = currentCount - previousPaymentCount;
          setNewPaymentsCount(diff);
          setTimeout(() => setNewPaymentsCount(0), 3000);
        }
        setPreviousPaymentCount(currentCount);
        setPayments(filtered);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (index === 0) {
        setInvoices(mockInvoices);
      } else {
        setPayments(mockPayments);
      }
    } finally {
      if (isReload) {
        setIsReloading(false);
        setTimeout(() => {
          if (scrollViewRef.current && lastScrollPosition > 0) {
            scrollViewRef.current.scrollTo({ y: lastScrollPosition, animated: true });
          }
        }, 100);
      } else {
        setLoading(false);
      }
    }
  };

  const applyFilters = () => {
    if (index === 0) {
      setFilters(tempInvoiceFilters);
    } else {
      setFilters(tempPaymentFilters);
    }
    setShowFilters(false);
    loadData();
  };

  const resetFilters = () => {
    if (index === 0) {
      setTempInvoiceFilters({ status: '', customerId: '', dateFrom: '', dateTo: '' });
    } else {
      setTempPaymentFilters({ status: '', customerId: '', dateFrom: '', dateTo: '', paymentMethod: undefined });
    }
  };

  const filteredInvoices = invoices;
  const filteredPayments = payments;

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount((invoice.amount - invoice.paidAmount).toString());
    setPaymentMethod('cash');
    setPaymentNotes('');
    setReceiptPhoto(null);
    setShowPaymentModal(true);
  };

  const takeReceiptPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setReceiptPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const submitPayment = async () => {
    if (!selectedInvoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    if (amount > selectedInvoice.amount - selectedInvoice.paidAmount) {
      Alert.alert('Error', 'Payment amount cannot exceed outstanding balance');
      return;
    }
    setLoading(true);
    try {
      const paymentData = {
        invoiceId: selectedInvoice.id,
        amount,
        method: paymentMethod,
        receiptPhoto: receiptPhoto || undefined,
        notes: paymentNotes.trim() || undefined,
      };
      const response = await collectionAPI.recordPayment(paymentData);
      addToQueue({
        type: 'record_payment',
        data: paymentData,
        endpoint: '/api/payments',
        method: 'POST',
      });
      setPayments(prev => [response.payment, ...prev]);
      Alert.alert('Berhasil', 'Pembayaran berhasil disimpan', [
        {
          text: 'Lihat nota',
          onPress: () => {
            setShowPaymentModal(false);
            router.push(`/collection/print/${response.payment.id}`);
          },
        },
        {
          text: 'Back to List',
          onPress: () => {
            setShowPaymentModal(false);
            loadData();
          },
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'partial': return '#FF9800';
      case 'outstanding': return '#2196F3';
      case 'overdue': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'outstanding': return 'Outstanding';
      case 'overdue': return 'Overdue';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getPaymentMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'cash': return '💵';
      case 'transfer': return '🏦';
      case 'check': return '📝';
      case 'card': return '💳';
      default: return '💰';
    }
  };

  const renderInvoiceItem = (invoice: Invoice) => (
    <View key={invoice.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.itemCustomer}>{invoice.customerName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
          <Text style={styles.statusText}>{getStatusText(invoice.status)}</Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.itemDetail}>
          <Calendar color="#666" size={16} />
          <Text style={styles.itemDetailText}>Due: {formatDate(invoice.dueDate)}</Text>
        </View>
        <View style={styles.itemDetail}>
          <View style={styles.iconContainer}>
            <DollarSign color="#666" size={16} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.itemDetailText} numberOfLines={1} ellipsizeMode="tail">
              {formatCurrency(invoice.paidAmount)} / {formatCurrency(invoice.amount)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/collection/invoice/${invoice.id}`)}
        >
          <Eye color="#2196F3" size={16} />
        </TouchableOpacity>
        {invoice.status !== 'paid' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.paymentButton]}
            onPress={() => handleRecordPayment(invoice)}
          >
            <Plus color="white" size={16} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPaymentItem = (payment: Payment) => (
    <View key={payment.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemNumber}>{payment.reference}</Text>
          <Text style={styles.itemCustomer}>{payment.customerName}</Text>
        </View>
        <View style={styles.paymentMethodBadge}>
          <Text style={styles.paymentMethodIcon}>{getPaymentMethodIcon(payment.method)}</Text>
          <Text style={styles.paymentMethodText}>{payment.method.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.itemDetail}>
          <Calendar color="#666" size={16} />
          <Text style={styles.itemDetailText}>{formatDate(payment.date)}</Text>
        </View>
        <View style={styles.itemDetail}>
          <DollarSign color="#666" size={16} />
          <Text style={styles.itemDetailText}>{formatCurrency(payment.amount)}</Text>
        </View>
      </View>
      {payment.notes && <Text style={styles.paymentNotes}>{payment.notes}</Text>}
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/collection/record/${payment.id}`)}
        >
          <Eye color="#2196F3" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInvoices = () => (
    <ScrollView style={styles.tabScrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>All Invoices</Text>
        {filteredInvoices.length === 0 ? (
          renderEmptyState('No invoices found', <DollarSign color="#ccc" size={48} />)
        ) : (
          filteredInvoices.map(renderInvoiceItem)
        )}
      </View>
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView style={styles.tabScrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Pembayaran terkini</Text>
        {filteredPayments.length === 0 ? (
          renderEmptyState('Tidak ada pembayaran terbaru', <CheckCircle color="#ccc" size={48} />)
        ) : (
          filteredPayments.map(renderPaymentItem)
        )}
      </View>
    </ScrollView>
  );

  const renderScene = SceneMap({
    invoices: renderInvoices,
    payments: renderPayments,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#667eea', height: 3 }}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#667eea"
      inactiveColor="#666"
      pressColor="#f0f0f0"
      renderLabel={({ route, focused }: { route: Route; focused: boolean }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.tabLabel, { color: focused ? '#667eea' : '#666' }]}>
            {route.title}
          </Text>
          {route.key === 'payments' && newPaymentsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{newPaymentsCount}</Text>
            </View>
          )}
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search color="#666" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${index === 0 ? 'invoices' : 'payments'}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Filter color="#667eea" size={20} />
        </TouchableOpacity>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
        lazy
      />

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 150}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pembayaran Baru</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Text style={styles.modalClose}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={[styles.modalContentContainer, { paddingBottom: 100 }]}
              >
                {selectedInvoice && (
                  <>
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceInfoTitle}>Detail Tagihan</Text>
                      <Text style={styles.invoiceInfoText}>
                        {selectedInvoice.invoiceNumber} - {selectedInvoice.customerName}
                      </Text>
                      <Text style={styles.invoiceInfoAmount}>
                        Outstanding: {formatCurrency(selectedInvoice.amount - selectedInvoice.paidAmount)}
                      </Text>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Jumlah Bayar</Text>
                      <TextInput
                        style={styles.formInput}
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Metode Pembayaran</Text>
                      <View style={styles.methodButtons}>
                        {(['cash', 'transfer', 'check', 'card'] as Payment['method'][]).map((method) => (
                          <TouchableOpacity
                            key={method}
                            style={[
                              styles.methodButton,
                              paymentMethod === method && styles.methodButtonActive,
                            ]}
                            onPress={() => setPaymentMethod(method)}
                          >
                            <Text style={styles.methodButtonIcon}>{getPaymentMethodIcon(method)}</Text>
                            <Text
                              style={[
                                styles.methodButtonText,
                                paymentMethod === method && styles.methodButtonTextActive,
                              ]}
                            >
                              {method.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Bukti Penerimaan (Optional)</Text>
                      <TouchableOpacity style={styles.photoButton} onPress={takeReceiptPhoto}>
                        <Camera color="#667eea" size={24} />
                        <Text style={styles.photoButtonText}>
                          {receiptPhoto ? 'Change Photo' : 'Take Photo'}
                        </Text>
                      </TouchableOpacity>
                      {receiptPhoto && (
                        <Image source={{ uri: receiptPhoto }} style={styles.receiptPreview} />
                      )}
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Catatan (Optional)</Text>
                      <TextInput
                        style={styles.formTextArea}
                        value={paymentNotes}
                        onChangeText={setPaymentNotes}
                        placeholder="Add any notes..."
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={submitPayment}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#4CAF50', '#45a049']}
                        style={styles.submitButtonGradient}
                      >
                        <Text style={styles.submitButtonText}>
                          {loading ? 'Recording...' : 'Simpan'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <View style={{ height: 100 }} />
                  </>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Overlay Loading Saat Reload */}
      {isReloading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.overlayText}>Memuat data terbaru...</Text>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 150}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter {index === 0 ? 'Invoices' : 'Payments'}</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Text style={styles.modalClose}>Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={styles.modalContentContainer}
              >
                {index === 0 ? (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Status</Text>
                      <View style={styles.methodButtons}>
                        {[
                          { value: '', label: 'Semua' },
                          { value: 'outstanding', label: 'Outstanding' },
                          { value: 'partial', label: 'Parsial' },
                          { value: 'paid', label: 'Lunas' },
                          { value: 'overdue', label: 'Overdue' },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.methodButton,
                              currentTempFilters.status === option.value && styles.methodButtonActive,
                            ]}
                            onPress={() =>
                              setCurrentTempFilters({
                                ...currentTempFilters,
                                status: option.value,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.methodButtonText,
                                currentTempFilters.status === option.value && styles.methodButtonTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Customer (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={currentTempFilters.customerId}
                        onChangeText={(text) =>
                          setCurrentTempFilters({
                            ...currentTempFilters,
                            customerId: text,
                          })
                        }
                        placeholder="Customer ID or name"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Date From (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={currentTempFilters.dateFrom}
                        onChangeText={(text) =>
                          setCurrentTempFilters({
                            ...currentTempFilters,
                            dateFrom: text,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Date To (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={currentTempFilters.dateTo}
                        onChangeText={(text) =>
                          setCurrentTempFilters({
                            ...currentTempFilters,
                            dateTo: text,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Metode Pembayaran</Text>
                      <View style={styles.methodButtons}>
                        {[
                          { value: undefined, label: 'All' },
                          { value: 'cash', label: 'Tunai' },
                          { value: 'transfer', label: 'Transfer Bank' },
                          { value: 'check', label: 'Cek/Giro' },
                          { value: 'card', label: 'Kartu Kredit/Debit' },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.value?.toString() || 'all'}
                            style={[
                              styles.methodButton,
                              currentTempFilters.paymentMethod === option.value && styles.methodButtonActive,
                            ]}
                            onPress={() =>
                              setCurrentTempFilters({
                                ...currentTempFilters,
                                paymentMethod: option.value as Payment['method'] | undefined,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.methodButtonText,
                                currentTempFilters.paymentMethod === option.value && styles.methodButtonTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Customer (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={currentTempFilters.customerId}
                        onChangeText={(text) =>
                          setCurrentTempFilters({
                            ...currentTempFilters,
                            customerId: text,
                          })
                        }
                        placeholder="Customer ID or name"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Date From (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={currentTempFilters.dateFrom}
                        onChangeText={(text) =>
                          setCurrentTempFilters({
                            ...currentTempFilters,
                            dateFrom: text,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Date To (Optional)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={currentTempFilters.dateTo}
                        onChangeText={(text) =>
                          setCurrentTempFilters({
                            ...currentTempFilters,
                            dateTo: text,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}
                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={[styles.filterButton2, styles.applyButton]}
                    onPress={applyFilters}
                  >
                    <Text style={styles.filteredButtonText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 80 }} />
                <View style={{ height: 80 }} />
              </ScrollView>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const renderEmptyState = (text: string, icon: React.ReactNode) => (
  <View style={styles.emptyState}>
    {icon}
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  modalFooter: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filteredButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContentContainer: {
    paddingBottom: 60,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  filterButton2: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resetButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#ccc',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tabScrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  iconContainer: {
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    gap: 12,
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  tabBar: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
    fontSize: 18,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemCustomer: {
    fontSize: 14,
    color: '#666',
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
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentMethodIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  paymentNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  paymentButton: {
    backgroundColor: '#4CAF50',
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
  invoiceInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  invoiceInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  invoiceInfoAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTextArea: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
  },
  methodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f0ff',
  },
  methodButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  methodButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
    marginLeft: 8,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  submitButton: {
    height: 50,
    marginTop: 20,
  },
  submitButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});