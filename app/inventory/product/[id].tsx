// app/inventory/product/[id].tsx
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
  Package,
  MapPin,
  Calendar,
  Edit3,
  History,
  Plus,
  Minus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Product, 
  ProductLocation, 
  StockAdjustment,
  mockProducts,
  mockAdjustments
} from '@/api/mockData';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      loadProduct();
      loadAdjustments();
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadAdjustments();
      }
    }, [id])
  );

  const loadProduct = async () => {
    try {
      const mockProduct = mockProducts.find(p => p.id === id);
      if (mockProduct) {
        setProduct(mockProduct);
      } else {
        Alert.alert('Error', 'Product not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      const productAdjustments = mockAdjustments.filter(adj => adj.productId === id);
      setAdjustments(productAdjustments);
    } catch (error) {
      console.error('Error loading adjustments:', error);
    }
  };

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

  const handleStockAdjustment = (location: ProductLocation) => {
    if (!product) return;

    Alert.alert(
      'Stock Adjustment',
      `Product: ${product.name}\nLocation: ${location.locationName}\nCurrent Stock: ${location.stock} ${product.unit}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Adjust Stock', onPress: () => showAdjustmentForm(location) },
      ]
    );
  };

  const showAdjustmentForm = (location: ProductLocation) => {
    if (!product) return;

    Alert.prompt(
      'Stock Adjustment',
      `Enter new stock quantity for ${product.name} at ${location.locationName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adjust',
          onPress: (value: any) => {
            if (value && !isNaN(Number(value))) {
              processStockAdjustment(location, Number(value));
            } else {
              Alert.alert('Error', 'Please enter a valid number');
            }
          },
        },
      ],
      'plain-text',
      location.stock.toString()
    );
  };

  const processStockAdjustment = (location: ProductLocation, newStock: number) => {
    if (!product) return;

    const adjustment = newStock - location.stock;
    Alert.alert(
      'Confirm Adjustment',
      `Product: ${product.name}\nLocation: ${location.locationName}\nCurrent: ${location.stock} ${product.unit}\nNew: ${newStock} ${product.unit}\nAdjustment: ${adjustment > 0 ? '+' : ''}${adjustment} ${product.unit}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            console.log('Stock adjustment processed:', {
              product: product.name,
              location: location.locationName,
              oldQuantity: location.stock,
              newQuantity: newStock,
              adjustment,
            });
            Alert.alert('Success', 'Stock adjustment recorded successfully!');
            // In real app: update API and refresh data
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Package color="#f44336" size={48} />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to Inventory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: product.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/inventory/adjustment/create?productId=${product.id}`)}
              style={styles.headerButton}
            >
              <Plus color="#667eea" size={20} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCode}>{product.code}</Text>
            <Text style={styles.productCategory}>{product.category} • {product.unit}</Text>
          </View>
          <View style={styles.productStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Locations</Text>
              <Text style={styles.statValue}>{product.locations.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Stock</Text>
              <Text style={styles.statValue}>
                {product.locations.reduce((sum, loc) => sum + loc.stock, 0)} {product.unit}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Levels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Levels</Text>
          {product.locations.map((location) => {
            const stockStatus = getStockStatus(location.stock, location.minStock);
            return (
              <View key={location.locationId} style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <View style={styles.locationInfo}>
                    <View style={styles.locationNameContainer}>
                      <MapPin color="#667eea" size={20} />
                      <Text style={styles.locationName}>{location.locationName}</Text>
                    </View>
                    <Text style={styles.lastUpdated}>
                      Last updated: {formatDateTime(location.lastUpdated)}
                    </Text>
                  </View>
                  <View style={styles.stockStatus}>
                    <View style={[styles.statusIndicator, { backgroundColor: stockStatus.color }]} />
                    <Text style={[styles.statusText, { color: stockStatus.color }]}>
                      {stockStatus.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.stockDetails}>
                  <View style={styles.stockRow}>
                    <Text style={styles.currentStock}>
                      {location.stock} {product.unit}
                    </Text>
                    <Text style={styles.minStock}>
                      Min: {location.minStock} {product.unit}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.adjustButton}
                    onPress={() => handleStockAdjustment(location)}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.adjustButtonGradient}
                    >
                      <Edit3 color="white" size={16} />
                      <Text style={styles.adjustButtonText}>Adjust Stock</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Adjustment History */}
        {adjustments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Adjustment History</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push(`/inventory/adjustment/history?productId=${product.id}`)}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <History color="#667eea" size={16} />
              </TouchableOpacity>
            </View>
            
            {adjustments.slice(0, 3).map((adjustment) => (
              <View key={adjustment.id} style={styles.adjustmentCard}>
                <View style={styles.adjustmentHeader}>
                  <Text style={styles.adjustmentLocation}>{adjustment.locationName}</Text>
                  <Text style={[
                    styles.adjustmentAmount,
                    { color: adjustment.adjustment >= 0 ? '#4CAF50' : '#f44336' }
                  ]}>
                    {adjustment.adjustment >= 0 ? '+' : ''}{adjustment.adjustment} {product.unit}
                  </Text>
                </View>
                <View style={styles.adjustmentDetails}>
                  <Text style={styles.adjustmentRange}>
                     {adjustment.oldQuantity} → {adjustment.newQuantity} {product.unit}
                  </Text>
                  <Text style={styles.adjustmentReason}>{adjustment.reason}</Text>
                  <Text style={styles.adjustmentDate}>{formatDateTime(adjustment.date)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push(`/inventory/opname?productId=${product.id}`)}
            >
              <Package color="#667eea" size={24} />
              <Text style={styles.quickActionText}>Stock Opname</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push(`/inventory/transfer?productId=${product.id}`)}
            >
              <Plus color="#667eea" size={24} />
              <Text style={styles.quickActionText}>Transfer Stock</Text>
            </TouchableOpacity>
          </View>
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
  productHeader: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  productCode: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#999',
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  locationCard: {
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
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  stockDetails: {
    gap: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentStock: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  minStock: {
    fontSize: 14,
    color: '#999',
  },
  adjustButton: {
    height: 44,
  },
  adjustButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  adjustButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  adjustmentLocation: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  adjustmentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  adjustmentDetails: {
    gap: 4,
  },
  adjustmentRange: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
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
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});