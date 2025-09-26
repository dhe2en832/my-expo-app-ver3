
// app/sales-order/[id].tsx
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
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  User,
  MapPin,
  Calendar,
  Package,
  DollarSign,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SalesOrder, mockSalesOrders, mockCustomers, mockProducts } from '@/api/mockData';
import { salesOrderAPI } from '@/api/services';
import { useOfflineQueue } from '@/contexts/OfflineContext';
import { useOrder } from '@/contexts/OrderContext';

export default function SalesOrderDetailScreen() {
  const { refreshOrders } = useOrder(); 
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToQueue } = useOfflineQueue();

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await salesOrderAPI.getOrder(id!);
      setOrder(response.order);
    } catch (error) {
      console.error('Error loading order:', error);
      const mockOrder = mockSalesOrders.find(o => o.id === id);
      if (mockOrder) {
        setOrder(mockOrder);
      } else {
        Alert.alert('Error', 'Order not found');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (order?.status === 'draft') {
      router.push(`/sales-order/edit/${order.id}`);
    } else {
      Alert.alert('Cannot Edit', 'Only draft orders can be edited');
    }
  };

  const handleDelete = () => {
    if (order?.status !== 'draft') {
      Alert.alert('Cannot Delete', 'Only draft orders can be deleted');
      return;
    }

    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete order ${order.orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
              Alert.alert('Success', 'Order deleted successfully');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete order');
            }
          }
        }
      ]
    );
  };

  const handleSubmitForApproval = () => {
    if (order?.status !== 'draft') {
      Alert.alert('Cannot Submit', 'Only draft orders can be submitted for approval');
      return;
    }

    Alert.alert(
      'Submit for Approval',
      `Submit order ${order.orderNumber} for approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              await salesOrderAPI.submitForApproval(order.id);
              addToQueue({
                type: 'submit_sales_order',
                data: { id: order.id },
                endpoint: `/api/sales-orders/${order.id}/submit`,
                method: 'POST'
              });
               // ✅ SOLUSI: Update state langsung
              setOrder(prev => prev ? { ...prev, status: 'submitted' } : null);

              refreshOrders();
              Alert.alert('Success', 'Order submitted for approval');
              // loadOrder();
            } catch (error) {
              Alert.alert('Error', 'Failed to submit order');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#FF9800';
      case 'submitted': return '#2196F3';
      case 'approved': return '#4CAF50';
      case 'processed': return '#9C27B0';
      case 'cancelled': return '#f44336';
      case 'rejected': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted';
      case 'approved': return 'Approved';
      case 'processed': return 'Processed';
      case 'cancelled': return 'Cancelled';
      case 'rejected': return 'Rejected';
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

  const getCustomer = () => {
    return mockCustomers.find(c => c.id === order?.customerId);
  };

  const getProduct = (productId: string) => {
    return mockProducts.find(p => p.id === productId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const customer = getCustomer();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: order.orderNumber,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft color="#333" size={20} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {order.status === 'draft' && (
                <>
                  <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                    <Edit3 color="#667eea" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                    <Trash2 color="#f44336" size={20} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) }
            ]}>
              <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
            </View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          </View>
          <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</Text>
          {order.notes && (
            <Text style={styles.orderNotes}>{order.notes}</Text>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <User color="#667eea" size={24} />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{order.customerName}</Text>
                <Text style={styles.customerAddress}>{order.customerAddress}</Text>
              </View>
            </View>
            {customer && (
              <View style={styles.customerDetails}>
                <View style={styles.customerDetail}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{customer.phone}</Text>
                </View>
                <View style={styles.customerDetail}>
                  <Text style={styles.detailLabel}>Credit Limit:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(customer.creditLimit)}</Text>
                </View>
                <View style={styles.customerDetail}>
                  <Text style={styles.detailLabel}>Outstanding:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(customer.outstanding)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => {
            const product = getProduct(item.productId);
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  {product?.image && (
                    <Image source={{ uri: product.image }} style={styles.productImage} />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemCode}>{item.productCode}</Text>
                    <Text style={styles.itemUnit}>{item.quantity} {item.unit}</Text>
                  </View>
                  <View style={styles.itemPricing}>
                    <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice)}</Text>
                    {item.discount > 0 && (
                      <Text style={styles.itemDiscount}>-{formatCurrency(item.discount)}</Text>
                    )}
                    <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={styles.summaryDiscount}>-{formatCurrency(order.discount)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (11%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(order.tax)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total:</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* Approval Info */}
        {(order.approvedBy || order.rejectedReason) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approval Information</Text>
            <View style={styles.approvalCard}>
              {order.approvedBy && (
                <View style={styles.approvalInfo}>
                  <CheckCircle color="#4CAF50" size={20} />
                  <View style={styles.approvalDetails}>
                    <Text style={styles.approvalText}>Approved by: {order.approvedBy}</Text>
                    {order.approvedAt && (
                      <Text style={styles.approvalDate}>
                        {new Date(order.approvedAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {order.rejectedReason && (
                <View style={styles.approvalInfo}>
                  <XCircle color="#f44336" size={20} />
                  <View style={styles.approvalDetails}>
                    <Text style={styles.rejectionText}>Rejected</Text>
                    <Text style={styles.rejectionReason}>{order.rejectedReason}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {order.status === 'draft' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitForApproval}>
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.submitButtonGradient}
            >
              <Send color="white" size={20} />
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    marginBottom: 12,
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
  customerDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  customerDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
    alignItems: 'flex-start',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 14,
    color: '#333',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemDiscount: {
    fontSize: 12,
    color: '#f44336',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryDiscount: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  approvalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approvalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  approvalDetails: {
    flex: 1,
    marginLeft: 12,
  },
  approvalText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  approvalDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rejectionText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  rejectionReason: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  actionButtons: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    height: 50,
  },
  submitButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});