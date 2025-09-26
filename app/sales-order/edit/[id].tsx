// app/sales-order/edit/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  Plus,
  Minus,
  Search,
  User,
  Package,
  Save,
  X,
  ShoppingCart,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  SalesOrder, 
  SalesOrderItem, 
  Customer, 
  Product,
  mockCustomers, 
  mockProducts,
  mockSalesOrders 
} from '@/api/mockData';
import { salesOrderAPI, customerAPI, productAPI } from '@/api/services';
import { useOfflineQueue } from '@/contexts/OfflineContext';
import { useOrder } from '@/contexts/OrderContext';

// Fungsi sederhana untuk generate ID tanpa crypto
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface OrderItem extends SalesOrderItem {
  tempId: string;
}

export default function EditSalesOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const { addToQueue } = useOfflineQueue();
  const { refreshOrders } = useOrder();

  useEffect(() => {
    if (id) {
      loadOrder();
      loadCustomers();
      loadProducts();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await salesOrderAPI.getOrder(id!);
      if (!response.order) {
        throw new Error('Pesanan tidak ditemukan');
      }
      const foundOrder = response.order;
      setOrder(foundOrder);
      const customer = mockCustomers.find(c => c.id === foundOrder.customerId);
      setSelectedCustomer(customer || null);
      setOrderItems(foundOrder.items.map(item => ({
        ...item,
        tempId: generateId(),
      })));
      setNotes(foundOrder.notes || '');
    } catch (error) {
      console.error('Kesalahan memuat pesanan:', error);
      Alert.alert('Kesalahan', 'Gagal memuat pesanan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getCustomers();
      setCustomers(response.customers);
    } catch (error) {
      console.error('Kesalahan memuat pelanggan:', error);
      setCustomers(mockCustomers);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productAPI.getProducts();
      setProducts(response.products);
    } catch (error) {
      console.error('Kesalahan memuat produk:', error);
      setProducts(mockProducts);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProductToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      updateItemQuantity(existingItem.tempId, existingItem.quantity + 1);
    } else {
      const newItem: OrderItem = {
        id: '',
        tempId: generateId(),
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        quantity: 1,
        unit: product.unit,
        unitPrice: product.basePrice,
        discount: 0,
        total: product.basePrice,
      };
      setOrderItems(prev => [...prev, newItem]);
    }
    setShowProductModal(false);
  };

  const updateItemQuantity = (tempId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(tempId);
      return;
    }

    setOrderItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const total = (quantity * item.unitPrice) - item.discount;
        return { ...item, quantity, total };
      }
      return item;
    }));
  };

  const updateItemDiscount = (tempId: string, discount: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const total = (item.quantity * item.unitPrice) - discount;
        return { ...item, discount, total };
      }
      return item;
    }));
  };

  const updateItemPrice = (tempId: string, price: number) => {
    setOrderItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const total = (item.quantity * price) - item.discount;
        return { ...item, unitPrice: price, total };
      }
      return item;
    }));
  };

  const removeItem = (tempId: string) => {
    setOrderItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const discount = 0;
    const tax = Math.round((subtotal - discount) * 0.11);
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
  };

  const handleSave = async (isDraft: boolean = true) => {
    if (!selectedCustomer) {
      Alert.alert('Kesalahan', 'Silakan pilih pelanggan');
      return;
    }

    if (orderItems.length === 0) {
      Alert.alert('Kesalahan', 'Tambahkan setidaknya satu item');
      return;
    }

    if (!order) return;

    setLoading(true);
    try {
      const { subtotal, discount, tax, total } = calculateTotals();

      const updatedOrder: SalesOrder = {
        ...order,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerAddress: selectedCustomer.address,
        items: orderItems.map(item => ({
          id: item.id || generateId(),
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
          image: item.image,
        })),
        subtotal,
        discount,
        tax,
        total,
        notes,
        status: isDraft ? 'draft' : 'submitted',
      };

      // Untuk API nyata: await salesOrderAPI.updateOrder(id!, updatedOrder);
      const mockIndex = mockSalesOrders.findIndex(o => o.id === id);
      if (mockIndex !== -1) {
        mockSalesOrders[mockIndex] = updatedOrder;
      } else {
        mockSalesOrders.push(updatedOrder);
      }
      mockSalesOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      addToQueue({
        type: isDraft ? 'update_sales_order_draft' : 'update_sales_order_submit',
        data: updatedOrder,
        endpoint: `/api/sales-orders/${id}`,
        method: 'PUT'
      });

      refreshOrders();
      Alert.alert('Sukses', isDraft ? 'Pesanan draf berhasil diupdate' : 'Pesanan berhasil dikirim');
      router.back();
    } catch (error) {
      Alert.alert('Kesalahan', 'Gagal mengupdate pesanan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const parseCurrency = (text: string) => {
    return parseInt(text.replace(/[^0-9]/g, '')) || 0;
  };

  const renderHeader = () => (
    <View>
      <TouchableOpacity 
        style={styles.selectButton} 
        onPress={() => setShowCustomerModal(true)}
      >
        <User color="#999" size={20} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>
          {selectedCustomer ? selectedCustomer.name : 'Pilih Pelanggan'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.selectButton} 
        onPress={() => setShowProductModal(true)}
      >
        <Package color="#999" size={20} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Tambah Produk</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Item Pesanan</Text>
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

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Pesanan tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Edit Pesanan Penjualan' }} />
      <FlatList
        data={orderItems}
        keyExtractor={item => item.tempId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ShoppingCart color="#ddd" size={64} />
            <Text style={styles.emptyText}>Belum ada item</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.tempId)}>
              <X color="#f44336" size={20} />
            </TouchableOpacity>
            <View style={styles.itemHeader}>
              <Image 
                source={{ uri: item.image || 'https://placehold.co/60x60' }} 
                style={styles.productImage} 
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemCode}>{item.productCode}</Text>
                <Text style={styles.itemUnit}>{item.unit}</Text>
              </View>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={() => updateItemQuantity(item.tempId, item.quantity - 1)}
              >
                <Minus color="#666" size={16} />
              </TouchableOpacity>
              <TextInput 
                style={styles.quantityInput} 
                value={item.quantity.toString()} 
                keyboardType="numeric"
                onChangeText={text => updateItemQuantity(item.tempId, parseInt(text) || 1)}
              />
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={() => updateItemQuantity(item.tempId, item.quantity + 1)}
              >
                <Plus color="#666" size={16} />
              </TouchableOpacity>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Harga Satuan:</Text>
              <TextInput 
                style={styles.priceInput} 
                value={formatCurrency(item.unitPrice).replace('Rp', '').trim()}
                keyboardType="numeric"
                onChangeText={text => updateItemPrice(item.tempId, parseCurrency(text))}
              />
            </View>
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>Diskon:</Text>
              <TextInput 
                style={styles.discountInput} 
                value={item.discount.toString()}
                keyboardType="numeric"
                onChangeText={text => updateItemDiscount(item.tempId, parseInt(text) || 0)}
              />
            </View>
            <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
          </View>
        )}
        ListFooterComponent={
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catatan</Text>
              <TextInput 
                style={styles.notesInput} 
                multiline 
                placeholder="Tambahkan catatan..." 
                value={notes} 
                onChangeText={setNotes} 
              />
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(calculateTotals().subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diskon</Text>
                <Text style={styles.summaryDiscount}>{formatCurrency(calculateTotals().discount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pajak (11%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(calculateTotals().tax)}</Text>
              </View>
              <View style={styles.summaryTotal}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(calculateTotals().total)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.saveButtonBottom} onPress={() => handleSave(true)}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Simpan Draf</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButtonBottom} onPress={() => handleSave(false)}>
                <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>Kirim Pesanan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={styles.flatListContent}
      />

      <Modal visible={showCustomerModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Pelanggan</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <X color="#333" size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Search color="#999" size={20} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Cari pelanggan..." 
              value={customerSearch} 
              onChangeText={setCustomerSearch} 
            />
          </View>
          <FlatList
            data={filteredCustomers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.customerItem} onPress={() => {
                setSelectedCustomer(item);
                setShowCustomerModal(false);
              }}>
                <View style={styles.customerItemInfo}>
                  <Text style={styles.customerItemName}>{item.name}</Text>
                  <Text style={styles.customerItemAddress}>{item.address}</Text>
                  <Text style={styles.customerItemPhone}>{item.phone}</Text>
                </View>
                <View style={styles.customerItemMeta}>
                  <Text style={styles.customerItemType}>{item.type}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal visible={showProductModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Produk</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <X color="#333" size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Search color="#999" size={20} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Cari produk..." 
              value={productSearch} 
              onChangeText={setProductSearch} 
            />
          </View>
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productItem} onPress={() => addProductToOrder(item)}>
                <Image 
                  source={{ uri: item.image || 'https://placehold.co/60x60' }} 
                  style={styles.productImage} 
                />
                <View style={styles.productItemInfo}>
                  <Text style={styles.productItemName}>{item.name}</Text>
                  <Text style={styles.productItemCode}>{item.code}</Text>
                  <Text style={styles.productItemPrice}>{formatCurrency(item.basePrice)}</Text>
                </View>
                <View style={styles.productItemMeta}>
                  <Text style={styles.productItemStock}>Stok: {item.stock}</Text>
                  <Text style={styles.productItemUnit}>{item.unit}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flatListContent: {
    paddingBottom: 100,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
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
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: 'right',
    fontSize: 14,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  discountInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: 'right',
    fontSize: 14,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  notesInput: {
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
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  saveButtonBottom: {
    flex: 1,
    height: 50,
  },
  saveButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  customerItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerItemInfo: {
    flex: 1,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerItemAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  customerItemPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerItemMeta: {
    alignItems: 'flex-end',
  },
  customerItemType: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productItemCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productItemPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  productItemMeta: {
    alignItems: 'flex-end',
  },
  productItemStock: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productItemUnit: {
    fontSize: 12,
    color: '#666',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});