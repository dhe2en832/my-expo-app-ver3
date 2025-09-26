// app/collection/invoice/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Invoice, 
  Payment, 
  mockInvoices, 
  mockPayments 
} from '@/api/mockData';
import { collectionAPI } from '@/api/services';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      loadInvoice();
      loadPayments();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      // In real app: await collectionAPI.getInvoice(id)
      const mockInvoice = mockInvoices.find(inv => inv.id === id);
      if (mockInvoice) {
        setInvoice(mockInvoice);
      } else {
        Alert.alert('Error', 'Invoice not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      Alert.alert('Error', 'Failed to load invoice');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      // In real app: await collectionAPI.getPayments({ invoiceId: id })
      const mockPaymentsForInvoice = mockPayments.filter(p => p.invoiceId === id);
      setPayments(mockPaymentsForInvoice);
    } catch (error) {
      console.error('Error loading payments:', error);
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
      case 'paid': return 'Lunas';
      case 'partial': return 'Parsial';
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
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading detail tagihan...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color="#f44336" size={48} />
        <Text style={styles.errorText}>Tagihan tidak ditemukan</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Kembali ke tagihan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Detail Tagihan',
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Invoice Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <DollarSign color="#667eea" size={28} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{invoice.invoiceNumber}</Text>
              <Text style={styles.statusDate}>{formatDate(invoice.createdDate)}</Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(invoice.status) }
          ]}>
            <Text style={styles.statusText}>{getStatusText(invoice.status)}</Text>
          </View>
          <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <User color="#667eea" size={24} />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{invoice.customerName}</Text>
                <Text style={styles.customerAddress}>
                  {invoice.customerName === 'PT. Maju Jaya Sentosa' && 'Jl. Sudirman No. 123, Jakarta Pusat'}
                  {invoice.customerName === 'CV. Berkah Sejahtera' && 'Jl. Gatot Subroto No. 456, Jakarta Selatan'}
                  {invoice.customerName === 'Toko Sumber Rejeki' && 'Jl. Raya Bogor No. 789, Depok'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail Tagihan</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Jatuh Tempo</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[
                styles.statusBadgeSmall,
                { backgroundColor: getStatusColor(invoice.status) }
              ]}>
                <Text style={styles.statusTextSmall}>{getStatusText(invoice.status)}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Jumlah</Text>
              <Text style={styles.detailValue}>{formatCurrency(invoice.amount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dibayarkan</Text>
              <Text style={styles.detailValuePaid}>{formatCurrency(invoice.paidAmount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Outstanding</Text>
              <Text style={styles.detailValueOutstanding}>
                {formatCurrency(invoice.amount - invoice.paidAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History Pembayaran</Text>
            {payments.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                onPress={() => router.push(`/collection/record/${payment.id}`)}
              >
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodText}>
                    {payment.method.toUpperCase()} {payment.reference && `(${payment.reference})`}
                  </Text>
                </View>
                {payment.notes && (
                  <Text style={styles.paymentNotes}>{payment.notes}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  invoiceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailValuePaid: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  detailValueOutstanding: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '500',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
  },
  paymentMethod: {
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  paymentNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
});