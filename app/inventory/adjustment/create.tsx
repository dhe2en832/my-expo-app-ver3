// app/inventory/adjustment/create.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Package,
  MapPin,
  Camera,
  Save,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { 
  Product, 
  StockAdjustment, 
  mockProducts,
  mockAdjustments
} from '@/api/mockData';
import { useOfflineQueue } from '@/contexts/OfflineContext';

export default function CreateStockAdjustmentScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [oldQuantity, setOldQuantity] = useState<number>(0);
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToQueue } = useOfflineQueue();

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const mockProduct = mockProducts.find(p => p.id === productId);
      if (mockProduct) {
        setProduct(mockProduct);
        if (mockProduct.locations.length > 0) {
          setSelectedLocation(mockProduct.locations[0].locationId);
          setOldQuantity(mockProduct.locations[0].stock);
        }
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

  const calculateAdjustment = (newQty: string) => {
    const newQtyNum = parseFloat(newQty) || 0;
    setNewQuantity(newQty);
    setAdjustment(newQtyNum - oldQuantity);
  };

  // const handleSubmit = async () => {
  //   if (!product || !selectedLocation) {
  //     Alert.alert('Error', 'Please select a location');
  //     return;
  //   }

  //   if (isNaN(adjustment)) {
  //     Alert.alert('Error', 'Please enter a valid quantity');
  //     return;
  //   }

  //   if (reason.trim().length === 0) {
  //     Alert.alert('Error', 'Please enter a reason for adjustment');
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const location = product.locations.find(loc => loc.locationId === selectedLocation);
  //     if (!location) {
  //       throw new Error('Location not found');
  //     }

  //     const adjustmentData: Omit<StockAdjustment, 'id' | 'productName' | 'locationName' | 'date' | 'createdBy'> = {
  //       productId: product.id,
  //       locationId: selectedLocation,
  //       oldQuantity: oldQuantity,
  //       newQuantity: parseFloat(newQuantity),
  //       adjustment: adjustment,
  //       reason: reason.trim(),
  //       photo: receiptPhoto || undefined,
  //       notes: undefined,
  //     };

  //     // Simulate API call
  //     await new Promise(resolve => setTimeout(resolve, 1500));

  //     addToQueue({
  //       type: 'create_stock_adjustment',
  //       data: adjustmentData,
  //       endpoint: '/api/inventory/adjustments',
  //       method: 'POST'
  //     });

  //     Alert.alert(
  //       'Success',
  //       'Stock adjustment recorded successfully!',
  //       [
  //         {
  //           text: 'OK',
  //           onPress: () => router.back()
  //         }
  //       ]
  //     );
  //   } catch (error) {
  //     console.error('Error recording adjustment:', error);
  //     Alert.alert('Error', 'Failed to record stock adjustment');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async () => {
    if (!product || !selectedLocation) {
      Alert.alert('Error', 'Please select a location');
      return;
    }
  
    if (isNaN(adjustment)) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
  
    if (reason.trim().length === 0) {
      Alert.alert('Error', 'Please enter a reason for adjustment');
      return;
    }
  
    setLoading(true);
    try {
      const location = product.locations.find(loc => loc.locationId === selectedLocation);
      if (!location) {
        throw new Error('Location not found');
      }
  
      // Create new adjustment
      const newAdjustment: StockAdjustment = {
        id: Date.now().toString(),
        productId: product.id,
        productName: product.name,
        locationId: selectedLocation,
        locationName: location.locationName,
        oldQuantity: oldQuantity,
        newQuantity: parseFloat(newQuantity),
        adjustment: adjustment,
        reason: reason.trim(),
        date: new Date().toISOString(),
        photo: receiptPhoto || undefined,
        notes: undefined,
        createdBy: '1',
      };
  
      // Add to mock data
      mockAdjustments.push(newAdjustment);
  
      // Add to offline queue
      addToQueue({
        type: 'create_stock_adjustment',
        data: newAdjustment,
        endpoint: '/api/inventory/adjustments',
        method: 'POST'
      });
  
      Alert.alert(
        'Success',
        'Stock adjustment recorded successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error recording adjustment:', error);
      Alert.alert('Error', 'Failed to record stock adjustment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading product...</Text>
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
          <Text style={styles.backButtonText}>← Back to Product</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedLocationData = product.locations.find(loc => loc.locationId === selectedLocation);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Adjust Stock',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={styles.saveButton}
            >
              <Save color="#667eea" size={20} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Produk</Text>
          <View style={styles.productCard}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCode}>{product.code}</Text>
            <Text style={styles.productCategory}>{product.category} • {product.unit}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilih Lokasi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationScroll}>
            {product.locations.map((location) => (
              <TouchableOpacity
                key={location.locationId}
                style={[
                  styles.locationChip,
                  selectedLocation === location.locationId && styles.activeLocationChip,
                ]}
                onPress={() => {
                  setSelectedLocation(location.locationId);
                  setOldQuantity(location.stock);
                  setNewQuantity('');
                  setAdjustment(0);
                }}
              >
                <MapPin color={selectedLocation === location.locationId ? 'white' : '#667eea'} size={16} />
                <Text
                  style={[
                    styles.locationChipText,
                    selectedLocation === location.locationId && styles.activeLocationChipText,
                  ]}
                >
                  {location.locationName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedLocationData && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stok saat ini</Text>
              <View style={styles.currentStockCard}>
                <Text style={styles.currentStockLabel}>Kuntitas saat ini :</Text>
                <Text style={styles.currentStockValue}>{oldQuantity} {product.unit}</Text>
                <Text style={styles.currentStockMin}>Minimum Stock: {selectedLocationData.minStock} {product.unit}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kuantitas baru</Text>
              <TextInput
                style={styles.input}
                value={newQuantity}
                onChangeText={calculateAdjustment}
                keyboardType="numeric"
                placeholder="Enter new quantity"
                placeholderTextColor="#999"
              />
              {/* <Text style={styles.adjustmentText}>
                Adjustment: {adjustment > 0 ? '+' : ''}{adjustment} {product.unit}
              </Text> */}
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: adjustment > 0 ? '#4CAF50' : adjustment < 0 ? '#f44336' : '#333',
                marginTop: 8,
                textAlign: 'center',
              }}>
                Adjustment: {adjustment > 0 ? '+' : ''}{adjustment} {product.unit}
              </Text>              
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alasan Adjustment</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason for stock adjustment (e.g., damaged goods, stock replenishment, etc.)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ambil Photo (Optional)</Text>
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
          </>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Recording...' : 'Simpan Adjustment'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#999',
  },
  locationScroll: {
    paddingVertical: 8,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  activeLocationChip: {
    borderColor: '#667eea',
    backgroundColor: '#f0f0ff',
  },
  locationChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeLocationChipText: {
    color: '#667eea',
  },
  currentStockCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStockLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentStockValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentStockMin: {
    fontSize: 14,
    color: '#999',
  },
  input: {
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // adjustmentText: {
  //   fontSize: 16,
  //   fontWeight: '600',
  //   color: adjustment => adjustment > 0 ? '#4CAF50' : adjustment < 0 ? '#f44336' : '#333',
  //   marginTop: 8,
  //   textAlign: 'center',
  // },
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