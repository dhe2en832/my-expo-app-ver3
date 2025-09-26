// app/sales-order/print/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Stack, useLocalSearchParams, router, useRouter } from 'expo-router';
import { Printer, Share2, ArrowLeft } from 'lucide-react-native';
import { SalesOrder, mockSalesOrders } from '@/api/mockData';
import { salesOrderAPI } from '@/api/services';
// import Share from 'react-native-share';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrintSalesOrder() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      const mockOrder = mockSalesOrders.find(o => o.id === id);
      if (mockOrder) {
        setOrder(mockOrder);
      } else {
        Alert.alert('Error', 'Sales Order tidak ditemukan');
        router.back();
      }
      setLoading(false);
    }
  }, [id]);

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

  // const handlePrint = () => {
  //   Alert.alert(
  //     'Print SO',
  //     'Fitur print via Bluetooth akan diimplementasikan segera. Untuk sekarang, Anda bisa screenshot atau bagikan struk ini.',
  //     [
  //       { text: 'OK', style: 'default' }
  //     ]
  //   );
  // };
  const handlePrint = () => {
    Alert.alert(
      'Print SO',
      'Fitur print via Bluetooth akan diimplementasikan segera. Untuk sekarang, Anda bisa screenshot atau bagikan struk ini.',
      [
        { 
          text: 'OK',
          style: 'default',
          onPress: () => router.replace("/sales-order") 
          //router.back() // ✅ pakai router disini
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      const shareContent = `
        SALES ORDER
        ==================
        No. SO: ${order?.orderNumber}
        Tanggal: ${order ? formatDate(order.date) : ''}
        Customer: ${order?.customerName}
        Alamat: ${order?.customerAddress}
        Item: ${order?.items.map(item => `\n- ${item.productName} (${item.quantity} x ${formatCurrency(item.unitPrice)})`).join('')}
        Subtotal: ${formatCurrency(order?.subtotal || 0)}
        Diskon: ${formatCurrency(order?.discount || 0)}
        Pajak: ${formatCurrency(order?.tax || 0)}
        Total: ${formatCurrency(order?.total || 0)}
        Catatan: ${order?.notes || 'Tidak ada catatan'}
      `;
      
      await Share.share({
        message: shareContent,
        title: `Sales Order ${order?.orderNumber}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Gagal membagikan SO');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.centerText}>Sedang memuat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.centerText}>Sales Order tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Cetak Sales Order',
          headerLeft: () => (
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <ArrowLeft color="#333" size={24} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtonContainer}>
              <TouchableOpacity style={styles.headerButton} onPress={handlePrint}>
                <Printer color="#333" size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
                <Share2 color="#333" size={24} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.receiptContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.companyName}>PT. SALES APP</Text>
            <Text style={styles.companyAddress}>Jl. Contoh No. 123</Text>
            <Text style={styles.companyPhone}>Telp: 021-12345678</Text>
          </View>

          <View style={styles.divider} />

          {/* Title */}
          <Text style={styles.title}>SALES ORDER</Text>

          {/* Info */}
          <View style={styles.infoSection}>
            <View style={styles.row}>
              <Text style={styles.label}>No. SO</Text>
              <Text style={styles.value}>{order.orderNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal</Text>
              <Text style={styles.value}>{formatDate(order.date)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jatuh Tempo</Text>
              <Text style={styles.value}>{formatDate(order.dueDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Customer</Text>
              <Text style={styles.value}>{order.customerName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Alamat</Text>
              <Text style={styles.value}>{order.customerAddress}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{order.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionLabel}>Item Pesanan</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemDetail}>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalSection}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>{formatCurrency(order.subtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Diskon</Text>
              <Text style={styles.value}>{formatCurrency(order.discount)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pajak</Text>
              <Text style={styles.value}>{formatCurrency(order.tax)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.labelBold}>Total</Text>
              <Text style={styles.valueBold}>{formatCurrency(order.total)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Notes */}
          {order.notes && (
            <>
              <Text style={styles.notesLabel}>Catatan</Text>
              <Text style={styles.notesValue}>{order.notes}</Text>
              <View style={styles.divider} />
            </>
          )}

          {/* Footer */}
          <Text style={styles.footer}>Terima kasih atas pesanan Anda</Text>
          <Text style={styles.footerSmall}>Simpan bukti ini sebagai referensi</Text>

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
  centerText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  headerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  itemsSection: {
    marginBottom: 16,
  },
  totalSection: {
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
  labelBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  valueBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemDetail: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
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
