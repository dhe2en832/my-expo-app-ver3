// components/UnscheduledVisitModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Customer } from '../api/interface';

interface UnscheduledVisitModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
  customerList: Customer[];
  loading: boolean;
}

export default function UnscheduledVisitModal({
  visible,
  onClose,
  onCustomerSelect,
  customerList,
  loading,
}: UnscheduledVisitModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customerList);
    } else {
      const filtered = customerList.filter(customer =>
        customer.nama_cust.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.kode_cust.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.alamat_kirim1?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customerList]);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchQuery('');
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => handleCustomerSelect(item)}
    >
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.nama_cust}</Text>
        <Text style={styles.customerCode}>No. Cust: {item.no_cust}</Text>
        <Text style={styles.customerAddress} numberOfLines={2}>
          {item.alamat_kirim1 || "Alamat tidak tersedia"}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#667eea" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pilih Customer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Customer List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Memuat data customer...</Text>
          </View>
        ) : filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Customer tidak ditemukan' : 'Tidak ada customer'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.kode_cust}
            renderItem={renderCustomerItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerCode: {
    fontSize: 12,
    color: '#667eea',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});