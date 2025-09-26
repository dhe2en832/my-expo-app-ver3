// app/collection/print/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Share,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Printer, Share2, ArrowLeft } from 'lucide-react-native';
import { Payment, Invoice, mockPayments, mockInvoices } from '@/api/mockData';

export default function PrintPaymentReceipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      const mockPayment = mockPayments.find(p => p.id === id);
      if (mockPayment) {
        setPayment(mockPayment);
        const mockInvoice = mockInvoices.find(inv => inv.id === mockPayment.invoiceId);
        setInvoice(mockInvoice || null);
      } else {
        Alert.alert('Error', 'Payment not found');
        router.back();
      }
      setLoading(false);
    }
  }, [id]);

  const getPaymentMethodText = (method: Payment['method']) => {
    switch (method) {
      case 'cash': return 'Tunai';
      case 'transfer': return 'Transfer Bank';
      case 'check': return 'Cek/Giro';
      case 'card': return 'Kartu Kredit/Debit';
      default: return method;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePrint = () => {
    Alert.alert(
      'Print Receipt',
      'Fitur print via Bluetooth akan diimplementasikan segera. Untuk sekarang, Anda bisa screenshot atau bagikan struk ini.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleShare = async () => {
    try {

        // const printData = `
        // PT. SALES APP
        // Jl. Contoh No. 123
        // ==================
        // BUKTI PEMBAYARAN
        // No: ${payment.reference}
        // Tanggal: ${formatDate(payment.date)}
        // Customer: ${invoice?.customerName}
        // Total: ${formatCurrency(payment.amount)}
        // `;
        
        // BluetoothPrinter.printText(printData);

      const shareContent = `
        BUKTI PEMBAYARAN
        ==================
        No. Referensi: ${payment?.reference}
        Tanggal: ${payment ? formatDate(payment.date) : ''}
        Customer: ${invoice?.customerName}
        Invoice: ${invoice?.invoiceNumber}
        Metode: ${payment ? getPaymentMethodText(payment.method) : ''}
        Jumlah: ${payment ? formatCurrency(payment.amount) : ''}
        Catatan: ${payment?.notes || '-'}

        Terima kasih!
            `.trim();

      await Share.share({
        message: shareContent,
        title: 'Bukti Pembayaran',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Gagal membagikan bukti pembayaran');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading receipt...</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.center}>
        <Text>Payment not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Print Receipt',
          headerRight: () => (
            <>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Share2 color="#667eea" size={20} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrint} style={styles.headerButton}>
                <Printer color="#4CAF50" size={20} />
              </TouchableOpacity>
            </>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.receiptContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.companyName}>PT. SALES APP</Text>
            <Text style={styles.companyAddress}>Jl. Contoh No. 123, Jakarta</Text>
            <Text style={styles.companyPhone}>Telp: (021) 1234-5678</Text>
          </View>

          <View style={styles.divider} />

          {/* Title */}
          <Text style={styles.title}>BUKTI PEMBAYARAN</Text>

          {/* Info */}
          <View style={styles.infoSection}>
            <View style={styles.row}>
              <Text style={styles.label}>No. Referensi</Text>
              <Text style={styles.value}>{payment.reference}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal</Text>
              <Text style={styles.value}>{formatDate(payment.date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Customer</Text>
              <Text style={styles.value}>{invoice?.customerName || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice</Text>
              <Text style={styles.value}>{invoice?.invoiceNumber || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Metode</Text>
              <Text style={styles.value}>{getPaymentMethodText(payment.method)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jumlah</Text>
              <Text style={[styles.value, styles.amount]}>{formatCurrency(payment.amount)}</Text>
            </View>
          </View>

          {payment.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Catatan:</Text>
                <Text style={styles.notesValue}>{payment.notes}</Text>
              </View>
            </>
          )}

          {payment.receiptPhoto && (
            <>
              <View style={styles.divider} />
              <Text style={styles.photoLabel}>Foto Bukti:</Text>
              <Image source={{ uri: payment.receiptPhoto }} style={styles.receiptPhoto} />
            </>
          )}

          <View style={styles.divider} />

          {/* Footer */}
          <Text style={styles.footer}>Terima kasih atas pembayaran Anda</Text>
          <Text style={styles.footerSmall}>Simpan struk ini sebagai bukti sah</Text>

          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Penerima</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerButton: {
    paddingHorizontal: 8,
  },
  receiptContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  companyAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  companyPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  notesSection: {
    paddingVertical: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  receiptPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 4,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
  },
  footer: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginTop: 16,
  },
  footerSmall: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  signature: {
    alignItems: 'center',
    marginTop: 30,
  },
  signatureLine: {
    width: 120,
    height: 1,
    backgroundColor: '#333',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 14,
    color: '#333',
  },
});