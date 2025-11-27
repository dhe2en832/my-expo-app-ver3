// app/(tabs)/customers/index.tsx - FIXED TYPESCRIPT ERRORS
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import {
  Stack,
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { customerAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomerList as CustomerListType } from "@/api/interface";
import * as SecureStore from "expo-secure-store";
import { getStorageItem, setStorageItem } from "@/utils/storage";

// ✅ HAPUS interface APIResponse lokal, gunakan yang dari services
// Interface APIResponse sudah didefinisikan di services.ts

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function CustomerList() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ successMessage?: string }>();

  const [customers, setCustomers] = useState<CustomerListType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 50;

  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // ✅ Filter customers
  const filteredCustomers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return customers;

    const query = debouncedSearchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.nama_cust?.toLowerCase().includes(query) ||
        customer.alamat_kirim1?.toLowerCase().includes(query) ||
        customer.kota_kirim?.toLowerCase().includes(query) ||
        customer.hp?.toLowerCase().includes(query)
    );
  }, [customers, debouncedSearchQuery]);

  useEffect(() => {
    const updateActivity = async () => {
      const now = Date.now();
      // await SecureStore.setItemAsync("last_active", Date.now().toString());
      await setStorageItem("last_active", now.toString());
    };
    updateActivity();
  }, []);
  // ✅ Show success message
  useEffect(() => {
    if (params.successMessage) {
      Alert.alert("Sukses", params.successMessage);
      router.setParams({ successMessage: undefined });
    }
  }, [params.successMessage]);

  // ✅ Fetch customers - FIX TYPE ISSUE
  const fetchCustomers = useCallback(
    async (pageNumber = 1, append = false) => {
      if (!user?.kodeSales) {
        setError("Data sales tidak ditemukan");
        setLoading(false);
        return;
      }

      try {
        append ? setLoadingMore(true) : setLoading(true);
        setError(null);

        // ✅ Type assertion untuk handle response dengan benar
        const res = await customerAPI.getCombinedCustomerList(
          // user.kodeSales,
          pageNumber,
          limit
        );

        // console.log("📊 API Response:", {
        //   success: res.success,
        //   dataLength: res.data?.length,
        //   meta: res.meta,
        //   message: res.message
        // });

        // ✅ Handle response dengan type safety
        if (res.success && res.data && Array.isArray(res.data)) {
          const customerData = res.data; // Type sudah CustomerListType[]

          if (append) {
            setCustomers((prev) => [...prev, ...customerData]);
          } else {
            setCustomers(customerData);
          }
          setPage(pageNumber);
          setTotal(res.meta?.total || customerData.length);
        } else {
          if (!append) {
            setCustomers([]);
          }
          setError(res.message || "Gagal mengambil data pelanggan");
        }
      } catch (err: any) {
        console.error("Error fetching customers:", err);
        setError(err.message || "Gagal memuat data pelanggan");
        if (!append) setCustomers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user?.kodeSales]
  );

  useFocusEffect(
    useCallback(() => {
      fetchCustomers(); // Refresh setiap kali focus
    }, [])
  );

  // ✅ Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(1, false);
  }, [fetchCustomers]);

  // ✅ Infinite scroll load more
  const handleLoadMore = useCallback(() => {
    if (
      !loadingMore &&
      customers.length < total &&
      filteredCustomers.length > 0
    ) {
      fetchCustomers(page + 1, true);
    }
  }, [
    loadingMore,
    customers.length,
    total,
    filteredCustomers.length,
    page,
    fetchCustomers,
  ]);

  // ✅ Handle customer press
  const handleCustomerPress = useCallback(
    (customer: CustomerListType) => {
      router.push({
        pathname: `/customers/${customer.kode_cust}`,
        params: {
          kode_relasi: customer.kode_relasi,
          nama_cust: customer.nama_cust,
          alamat_kirim1: customer.alamat_kirim1,
          kota_kirim: customer.kota_kirim,
          phone: customer.hp,
          no_cust: customer.no_cust,
          status_sumber: customer.status_sumber,
          propinsi_kirim: customer.propinsi_kirim,
          lat_kirim: customer.lat_kirim,
          long_kirim: customer.long_kirim,
        },
      });
    },
    [router]
  );

  const handleCreateCustomer = useCallback(() => {
    router.push("/customers/create");
  }, [router]);

  // ✅ Format date untuk display
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  }, []);

  // ✅ Check if customer has mobile photos
  const hasMobilePhotos = useCallback((customer: CustomerListType) => {
    return customer.filegambar && customer.filegambar.includes("mobile-images");
  }, []);

  // ✅ Render customer item
  const renderCustomerItem = useCallback(
    ({ item }: { item: CustomerListType }) => (
      <TouchableOpacity
        style={styles.customerItem}
        onPress={() => handleCustomerPress(item)}
      >
        <View style={styles.customerHeader}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.nama_cust}
          </Text>
          <View style={styles.customerBadges}>
            {item.status_sumber === "baru" && (
              <View style={[styles.badge, styles.newBadge]}>
                <Text style={styles.badgeText}>Baru</Text>
              </View>
            )}
            {hasMobilePhotos(item) && (
              <View style={[styles.badge, styles.photoBadge]}>
                <MaterialIcons name="photo" size={10} color="#fff" />
                <Text style={styles.badgeText}>Foto</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.customerDetail}>
          <Text style={styles.customerNo}>No: {item.no_cust}</Text>
          <Text style={styles.customerDate}>
            {item.created_at ? formatDate(item.created_at) : ""}
          </Text>
        </View>

        {item.hp ? (
          <View style={styles.customerInfo}>
            <MaterialIcons name="phone" size={14} color="#666" />
            <Text style={styles.customerPhone}>{item.hp}</Text>
          </View>
        ) : null}

        <View style={styles.customerInfo}>
          <MaterialIcons name="location-on" size={14} color="#666" />
          <Text style={styles.customerAddress} numberOfLines={2}>
            {item.alamat_kirim1}
          </Text>
        </View>

        <View style={styles.customerInfo}>
          <MaterialIcons name="place" size={14} color="#666" />
          <Text style={styles.customerCity}>
            {item.kota_kirim}
            {item.propinsi_kirim && `, ${item.propinsi_kirim}`}
          </Text>
        </View>

        {/* ✅ GPS Coordinates jika ada */}
        {(item.lat_kirim || item.long_kirim) && (
          <View style={styles.customerInfo}>
            <MaterialIcons name="gps-fixed" size={14} color="#666" />
            <Text style={styles.customerGps}>
              {item.lat_kirim && `Lat: ${item.lat_kirim}`}
              {item.long_kirim && ` Long: ${item.long_kirim}`}
            </Text>
          </View>
        )}

        <View style={styles.customerFooter}>
          <Text style={styles.customerCode}>
            {/* {item.kode_cust} • {item.kode_relasi} */}
            {item.no_cust}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    ),
    [handleCustomerPress, formatDate, hasMobilePhotos]
  );

  // ✅ Footer untuk loading more
  const renderFooter = useCallback(
    () =>
      loadingMore ? (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#667eea" />
          <Text style={styles.footerText}>Memuat data...</Text>
        </View>
      ) : customers.length < total ? (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Geser ke bawah untuk memuat lebih banyak
          </Text>
        </View>
      ) : null,
    [loadingMore, customers.length, total]
  );

  // ✅ Empty state
  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <MaterialIcons name="people-outline" size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>
          {searchQuery
            ? "Tidak Ada Hasil Pencarian"
            : "Tidak Ada Data Customer"}
        </Text>
        <Text style={styles.emptyStateText}>
          {searchQuery
            ? "Tidak ada pelanggan yang sesuai dengan pencarian Anda"
            : "Belum ada data customer yang tersedia. Mulai dengan menambahkan customer baru."}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={handleCreateCustomer}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.emptyStateButtonText}>
              Tambah Customer Baru
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [searchQuery, handleCreateCustomer]
  );

  // ✅ Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Daftar Pelanggan",
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreateCustomer}
            >
              <MaterialIcons name="add" size={24} color="#667eea" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama, alamat, atau kota..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={handleClearSearch}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {searchQuery
            ? `${filteredCustomers.length} dari ${customers.length} pelanggan`
            : `Total: ${customers.length} pelanggan`}
          {total > customers.length && ` dari ${total}`}
        </Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <MaterialIcons
            name="refresh"
            size={20}
            color={refreshing ? "#ccc" : "#667eea"}
          />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchCustomers(1, false)}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat data pelanggan...</Text>
        </View>
      ) : (
        /* Customer List */
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) =>
            `${item.kode_cust}-${item.kode_relasi}-${item.no_cust}`
          }
          contentContainerStyle={[
            styles.listContainer,
            filteredCustomers.length === 0 && styles.emptyListContainer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#667eea"]}
              tintColor="#667eea"
            />
          }
          ListEmptyComponent={renderEmptyState}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateCustomer}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ✅ Styles tetap sama seperti sebelumnya
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  customerItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  customerBadges: {
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  newBadge: {
    backgroundColor: "#4CAF50",
  },
  photoBadge: {
    backgroundColor: "#2196F3",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  customerDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerNo: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  customerDate: {
    fontSize: 12,
    color: "#999",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  customerAddress: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  customerCity: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  customerGps: {
    fontSize: 12,
    color: "#888",
    marginLeft: 6,
    fontFamily: "monospace",
  },
  customerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  customerCode: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
  },
  headerButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdecea",
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: "#f44336",
    fontSize: 14,
    marginLeft: 8,
  },
  retryText: {
    color: "#667eea",
    fontWeight: "600",
    marginLeft: 8,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#667eea",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
