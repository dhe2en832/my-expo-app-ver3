// app/(tabs)/inventory.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Package, Search, Plus, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  basePrice: number;
  locations: ProductLocation[];
}

interface ProductLocation {
  locationId: string;
  locationName: string;
  stock: number;
  minStock: number;
  lastUpdated: string;
}

interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  oldQuantity: number;
  newQuantity: number;
  adjustment: number;
  reason: string;
  date: string;
  photo?: string;
  createdBy: string;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Smartphone Galaxy Pro',
    code: 'SGP-001',
    category: 'Electronics',
    unit: 'PCS',
    basePrice: 8500000,
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 150,
        minStock: 50,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 25,
        minStock: 10,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
  {
    id: '2',
    name: 'Wireless Headphones',
    code: 'WH-002',
    category: 'Accessories',
    unit: 'PCS',
    basePrice: 1200000,
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 80,
        minStock: 30,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 5,
        minStock: 10,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
];

const mockAdjustments: StockAdjustment[] = [
  {
    id: '1',
    productId: '1',
    productName: 'Smartphone Galaxy Pro',
    locationId: '2',
    locationName: 'Van Stock',
    oldQuantity: 30,
    newQuantity: 25,
    adjustment: -5,
    reason: 'Barang rusak',
    date: '2025-01-08T09:30:00Z',
    createdBy: '1',
  },
  {
    id: '2',
    productId: '2',
    productName: 'Wireless Headphones',
    locationId: '1',
    locationName: 'Main Warehouse',
    oldQuantity: 75,
    newQuantity: 80,
    adjustment: 5,
    reason: 'Penambahan stok',
    date: '2025-01-08T08:00:00Z',
    createdBy: '1',
  },
];

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stock' | 'adjustments'>('stock');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [products] = useState<Product[]>(mockProducts);
  const [adjustments] = useState<StockAdjustment[]>(mockAdjustments);

  const locations = [
    { id: 'all', name: 'Semua Lokasi' },
    { id: '1', name: 'Gudang Utama' },
    { id: '2', name: 'Stock Van' },
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdjustments = adjustments.filter(adjustment =>
    adjustment.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return { status: 'out-of-stock', color: '#f44336' };
    if (current <= min) return { status: 'low-stock', color: '#FF9800' };
    return { status: 'in-stock', color: '#4CAF50' };
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ✅ Fungsi aman untuk format mata uang
  const formatCurrency = (amount: number | undefined | null): string => {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(validAmount);
  };

  const handleStockOpname = () => {
    Alert.alert(
      'Stock Opname',
      'Fitur stock opname akan segera hadir.',
      [{ text: 'OK' }]
    );
  };

  const handleStockAdjustment = (product: Product, location: ProductLocation) => {
    router.push({
      pathname: '/inventory/adjustment/create',
      params: {
        productId: product.id,
        locationId: location.locationId,
      }
    });
  };

  const totalProducts = products.length;
  const lowStockItems = products.reduce((count, product) => {
    return count + product.locations.filter(loc => {
      const status = getStockStatus(loc.stock, loc.minStock);
      return status.status === 'low-stock' || status.status === 'out-of-stock';
    }).length;
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search color="#666" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleStockOpname}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.createButtonGradient}
          >
            <Plus color="white" size={24} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Package color="#2196F3" size={24} />
            <Text style={styles.statValue}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Total Produk</Text>
          </View>
          <View style={styles.statCard}>
            <Package color="#FF9800" size={24} />
            <Text style={styles.statValue}>{lowStockItems}</Text>
            <Text style={styles.statLabel}>Stok Rendah</Text>
          </View>
        </View>

        <View style={styles.locationFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationChip,
                  selectedLocation === location.id && styles.activeLocationChip,
                ]}
                onPress={() => setSelectedLocation(location.id)}
              >
                <Text
                  style={[
                    styles.locationChipText,
                    selectedLocation === location.id && styles.activeLocationChipText,
                  ]}
                >
                  {location.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stock' && styles.activeTab]}
            onPress={() => setActiveTab('stock')}
          >
            <Text style={[styles.tabText, activeTab === 'stock' && styles.activeTabText]}>
              Level Stok
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'adjustments' && styles.activeTab]}
            onPress={() => setActiveTab('adjustments')}
          >
            <Text style={[styles.tabText, activeTab === 'adjustments' && styles.activeTabText]}>
              Penyesuaian Stok
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {activeTab === 'stock' ? (
            filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Package color="#ccc" size={48} />
                <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
              </View>
            ) : (
              filteredProducts.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>{formatCurrency(product.basePrice)}</Text>
                      <Text style={styles.productCode}>{product.code} • {product.category}</Text>
                    </View>
                  </View>
                  {product.locations
                    .filter(loc => selectedLocation === 'all' || loc.locationId === selectedLocation)
                    .map((location) => {
                      const stockStatus = getStockStatus(location.stock, location.minStock);
                      return (
                        <TouchableOpacity
                          key={location.locationId}
                          style={styles.locationRow}
                          onPress={() => handleStockAdjustment(product, location)}
                        >
                          <View style={styles.locationInfo}>
                            <View style={styles.locationHeader}>
                              <MapPin color="#666" size={16} />
                              <Text style={styles.locationName}>{location.locationName}</Text>
                            </View>
                            <Text style={styles.lastUpdated}>
                              Diperbarui: {formatDateTime(location.lastUpdated)}
                            </Text>
                          </View>
                          <View style={styles.stockInfo}>
                            <View style={styles.stockRow}>
                              <Text style={[styles.stockValue, { color: stockStatus.color }]}>
                                {location.stock} {product.unit}
                              </Text>
                              <View style={[styles.stockIndicator, { backgroundColor: stockStatus.color }]} />
                            </View>
                            <Text style={styles.minStock}>Min: {location.minStock} {product.unit}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))
            )
          ) : (
            filteredAdjustments.length === 0 ? (
              <View style={styles.emptyState}>
                <Package color="#ccc" size={48} />
                <Text style={styles.emptyText}>Tidak ada penyesuaian</Text>
              </View>
            ) : (
              filteredAdjustments.map((adjustment) => (
                <View key={adjustment.id} style={styles.adjustmentCard}>
                  <View style={styles.adjustmentHeader}>
                    <View style={styles.adjustmentInfo}>
                      <Text style={styles.adjustmentProduct}>{adjustment.productName}</Text>
                      <Text style={styles.adjustmentLocation}>{adjustment.locationName}</Text>
                    </View>
                    <View style={styles.adjustmentAmount}>
                      <Text style={[
                        styles.adjustmentValue,
                        { color: adjustment.adjustment >= 0 ? '#4CAF50' : '#f44336' }
                      ]}>
                        {adjustment.adjustment >= 0 ? '+' : ''}{adjustment.adjustment}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.adjustmentDetails}>
                    <Text style={styles.adjustmentText}>
                      {adjustment.oldQuantity} → {adjustment.newQuantity}
                    </Text>
                    <Text style={styles.adjustmentReason}>{adjustment.reason}</Text>
                    <Text style={styles.adjustmentDate}>{formatDateTime(adjustment.date)}</Text>
                  </View>
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
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
  locationFilter: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  locationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeLocationChip: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  locationChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeLocationChipText: {
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  section: {
    padding: 16,
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
  productCard: {
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
  productHeader: {
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 2,
  },
  productCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  locationInfo: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  minStock: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  adjustmentCard: {
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
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  adjustmentInfo: {
    flex: 1,
  },
  adjustmentProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  adjustmentLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  adjustmentAmount: {
    alignItems: 'flex-end',
  },
  adjustmentValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  adjustmentDetails: {
    gap: 4,
  },
  adjustmentText: {
    fontSize: 14,
    color: '#333',
  },
  adjustmentReason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  adjustmentDate: {
    fontSize: 12,
    color: '#999',
  },
});