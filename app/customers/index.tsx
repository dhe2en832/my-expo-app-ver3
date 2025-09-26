// app/customers/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Plus, MapPin, Phone, Search } from 'lucide-react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { mockCustomers } from '@/api/mockData';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomerListScreen() {
  const [customers, setCustomers] = useState(mockCustomers);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tambahkan di dalam komponen:
    
  useFocusEffect(
    React.useCallback(() => {
      // Reload data dari mock (karena mungkin ada perubahan)
      setCustomers([...mockCustomers]);
    }, [])
  );
  
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleAddCustomer = () => {
    router.push('/customers/create');
  };

  const handleCustomerPress = (customerId: string) => {
    // Bisa digunakan untuk detail atau langsung ke RKS
    router.push({
      pathname: "/customers/[id]",
      params: {
        id: customerId,
      },
    });
    // Alert.alert('Info', 'Fitur detail pelanggan belum aktif');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Daftar Pelanggan", // custom title
        }}
      />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search color="#999" size={20} />
          <Text style={styles.title}>Pelanggan</Text>
        </View>
        <TouchableOpacity style={styles.fab} onPress={handleAddCustomer}>
          <Plus color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search color="#999" size={18} style={styles.searchIcon} />
        <Text style={styles.searchLabel}>Cari pelanggan...</Text>
        {/* Untuk simpel, kita pakai TextInput biasa */}
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama, alamat, atau telepon"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.customerCard}
              onPress={() => handleCustomerPress(item.id)}
            >
              <View style={styles.customerIcon}>
                <User color="#667eea" size={24} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{item.name}</Text>
                <View style={styles.customerDetail}>
                  <MapPin color="#666" size={14} />
                  <Text style={styles.customerText} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                <View style={styles.customerDetail}>
                  <Phone color="#666" size={14} />
                  <Text style={styles.customerText}>{item.phone}</Text>
                </View>
                <View style={styles.customerBadge}>
                  <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <User color="#ccc" size={64} />
              <Text style={styles.emptyText}>Tidak ada pelanggan ditemukan</Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fabBottom} onPress={handleAddCustomer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fabGradient}
        >
          <Plus color="white" size={24} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchLabel: {
    color: '#999',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  customerCard: {
    flexDirection: 'row',
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
  customerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  customerBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e0f7fa',
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#00796b',
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBottom: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});