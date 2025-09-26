// app/collection/record/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Edit3,
  DollarSign,
  Calendar,
  User,
  Camera,
  CheckCircle,
  AlertCircle,
  Printer,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Payment, 
  Invoice, 
  mockPayments, 
  mockInvoices 
} from '@/api/mockData';
import { collectionAPI } from '@/api/services';
import { useOfflineQueue } from '@/contexts/OfflineContext';

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToQueue } = useOfflineQueue();

  useEffect(() => {
    if (id) {
      loadPayment();
    }
  }, [id]);

  const loadPayment = async () => {
    try {
      // In real app: await collectionAPI.getPayment(id)
      // For now, use mock data
      const mockPayment = mockPayments.find(p => p.id === id);
      if (mockPayment) {
        setPayment(mockPayment);
        // Load related invoice
        const mockInvoice = mockInvoices.find(inv => inv.id === mockPayment.invoiceId);
        setInvoice(mockInvoice || null);
      } else {
        Alert.alert('Error', 'Payment not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      Alert.alert('Error', 'Failed to load payment');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = () => {
    // In real app, you might allow editing if payment is recent or not reconciled
    Alert.alert(
      'Edit Payment',
      'Edit pembayaran ? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            router.push(`/collection/edit/${id}`);
          }
        }
      ]
    );
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color="#f44336" size={48} />
        <Text style={styles.errorText}>Payment not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Collection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Payment Details',
          headerRight: () => (
            <>
            <TouchableOpacity
              onPress={handleEditPayment}
              style={styles.headerButton}
            >
              <Edit3 color="#667eea" size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push(`/collection/print/${id}`)}
              style={styles.headerButton}
            >
              <Printer color="#4CAF50" size={20} />
            </TouchableOpacity>
            </>
            
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Payment Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <CheckCircle color="#4CAF50" size={28} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Pembayaran tersimpan</Text>
              <Text style={styles.statusDate}>{formatDate(payment.date)}</Text>
            </View>
          </View>
          <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <DollarSign color="#667eea" size={20} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Jumlah</Text>
                <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Text style={styles.methodIcon}>{getPaymentMethodIcon(payment.method)}</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Metode pembayaran</Text>
                <Text style={styles.detailValue}>{payment.method.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Calendar color="#667eea" size={20} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Tanggal</Text>
                <Text style={styles.detailValue}>{formatDate(payment.date)}</Text>
              </View>
            </View>

            {payment.reference && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Text style={styles.methodIcon}>#</Text>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Refferensi</Text>
                  <Text style={styles.detailValue}>{payment.reference}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Invoice Information */}
        {invoice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tagihan terkait</Text>
            <TouchableOpacity
              style={styles.invoiceCard}
              onPress={() => router.push(`/collection/invoice/${invoice.id}`)}
            >
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <View style={[
                  styles.invoiceStatus,
                  { backgroundColor: getStatusColor(invoice.status) }
                ]}>
                  <Text style={styles.invoiceStatusText}>{getStatusText(invoice.status)}</Text>
                </View>
              </View>
              <Text style={styles.invoiceCustomer}>{invoice.customerName}</Text>
              <View style={styles.invoiceAmounts}>
                <Text style={styles.invoiceTotal}>Total: {formatCurrency(invoice.amount)}</Text>
                <Text style={styles.invoicePaid}>Paid: {formatCurrency(invoice.paidAmount)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Receipt Photo */}
        {payment.receiptPhoto && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt Photo</Text>
            <View style={styles.photoContainer}>
              <Image source={{ uri: payment.receiptPhoto }} style={styles.receiptImage} />
            </View>
          </View>
        )}

        {/* Notes */}
        {payment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{payment.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#667eea',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusInfo: {
    marginLeft: 16,
    alignItems: 'flex-start',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statusDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodIcon: {
    fontSize: 20,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  invoiceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  invoiceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invoiceStatusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  invoiceCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  invoiceAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceTotal: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  invoicePaid: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  photoContainer: {
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
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});