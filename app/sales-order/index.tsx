// app/sales-order/index.tsx
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
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { salesOrderAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
// import { SalesOrderList } from "@/api/interface";
import { SalesOrderListType } from "@/api/interface";

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

// Status badge colors
// ✅ Helper functions untuk status
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case "tertutup":
       return "#ff0000ff";
    case "approved":
    case "disetujui":
      return "#4CAF50";
    case "terbuka":
    case "menunggu":
    case "pending":
      return "#ffa726";
    case "approved":
    case "disetujui":
      return "#4caf50";
    case "rejected":
    case "ditolak":
      return "#f44336";
    case "synced":
      return "#2196f3";
    case "draft":
      return "#9E9E9E";
    case "dikirim":
    case "submitted":
      return "#2196F3";
    default:
      return "#666";
  }
};

const getStatusText = (status: string): string => {
  switch (status?.toLowerCase()) {
    case "tertutup":
      return "Tertutup";
    case "terbuka":
      return "Terbuka";
    case "draft":
      return "Draft";
    case "pending":
    case "menunggu":
      return "Menunggu";
    case "approved":
    case "disetujui":
      return "Disetujui";
    case "rejected":
    case "ditolak":
      return "Ditolak";
    case "synced":
      return "Tersinkron";
    case "dikirim":
      return "Dikirim";
    default:
      return status || "Draft";
  }
};

export default function SalesOrderList() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ successMessage?: string }>();

  const [salesOrders, setSalesOrders] = useState<SalesOrderListType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all"); // all, today, week, month, draft, pending

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 50;

  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // ✅ Filter sales orders
  const filteredSalesOrders = useMemo(() => {
    let filtered = salesOrders;

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter((order) => {
        switch (filter) {
          case "today":
            const today = new Date().toDateString();
            const orderDate = new Date(
              order.tgl_so || order.created_at
            ).toDateString();
            return orderDate === today;
          case "draft":
            return order.status?.toLowerCase() === "draft";
          case "pending":
            return (
              order.status?.toLowerCase() === "pending" ||
              order.status?.toLowerCase() === "menunggu"
            );
          case "approved":
            return (
              order.status?.toLowerCase() === "approved" ||
              order.status?.toLowerCase() === "disetujui"
            );
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (!debouncedSearchQuery.trim()) return filtered;

    const query = debouncedSearchQuery.toLowerCase();
    return filtered.filter(
      (order) =>
        order.no_so?.toLowerCase().includes(query) ||
        order.nama_cust?.toLowerCase().includes(query) ||
        order.kode_cust?.toLowerCase().includes(query) ||
        order.nama_sales?.toLowerCase().includes(query)
    );
  }, [salesOrders, debouncedSearchQuery, filter]);

  // ✅ Show success message
  useEffect(() => {
    if (params.successMessage) {
      Alert.alert("Sukses", params.successMessage);
      router.setParams({ successMessage: undefined });
    }
  }, [params.successMessage]);

  // ✅ Fetch sales orders
  const fetchSalesOrders = useCallback(
    async (pageNumber = 1, append = false) => {
      if (!user?.kodeSales) {
        setError("Data sales tidak ditemukan");
        setLoading(false);
        return;
      }

      try {
        append ? setLoadingMore(true) : setLoading(true);
        setError(null);

        const res = await salesOrderAPI.getSalesOrderListCombined(
          user.kodeSales,
          pageNumber,
          limit
        );

        if (res.success && res.data && Array.isArray(res.data)) {
          const orderData: SalesOrderListType[] = res.data.map((order) => ({
            ...order,
            id: order.kode_so, // menggunakan kode_so sebagai ID
            no_so: order.no_so,
            tanggal: order.tgl_so,
            nama_cust: order.nama_cust,
            kode_cust: order.kode_cust,
            no_cust: order.no_cust,
            created_at: order.sort_date,
            // Field tambahan untuk kompatibilitas
            jumlah_item: order.jumlah_item, // bisa diisi dari API detail nanti
            total: order.total, // bisa diisi dari API detail nanti
          }));

          if (append) {
            setSalesOrders((prev) => [...prev, ...orderData]);
          } else {
            setSalesOrders(orderData);
          }
          setPage(pageNumber);
          setTotal(res.meta?.total || orderData.length);
        } else {
          if (!append) {
            setSalesOrders([]);
          }
          setError(res.message || "Gagal mengambil data sales order");
        }
      } catch (err: any) {
        console.error("Error fetching sales orders:", err);
        setError(err.message || "Gagal memuat data sales order");
        if (!append) setSalesOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user?.kodeSales]
  );

  // ✅ Initial load
  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  // ✅ Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSalesOrders(1, false);
  }, [fetchSalesOrders]);

  // ✅ Infinite scroll load more
  const handleLoadMore = useCallback(() => {
    if (
      !loadingMore &&
      salesOrders.length < total &&
      filteredSalesOrders.length > 0
    ) {
      fetchSalesOrders(page + 1, true);
    }
  }, [
    loadingMore,
    salesOrders.length,
    total,
    filteredSalesOrders.length,
    page,
    fetchSalesOrders,
  ]);

  // ✅ Handle sales order press
  const handleSalesOrderPress = useCallback(
    (order: SalesOrderListType) => {
      router.push({
        pathname: `/sales-order/${order.id}`,
        params: {
          id: order.kode_so,
          no_so: order.no_so,
          status: order.status,
          isEditable: order.status === "draft" ? "true" : "false",
        },
      });
    },
    [router]
  );

  const handleCreateSalesOrder = useCallback(() => {
    router.push("/sales-order/create");
  }, [router]);

  const handlePrintSalesOrder = useCallback(
    (order: SalesOrderListType) => {
      router.push({
        pathname: `/sales-order/print/${order.id}`,
        params: {
          no_so: order.no_so,
          nama_cust: order.nama_cust,
        },
      });
    },
    [router]
  );

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

  // ✅ Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  // ✅ Render sales order item
  const renderSalesOrderItem = useCallback(
    ({ item }: { item: SalesOrderListType }) => (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => handleSalesOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderTitle}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              {item.no_so || `SO-${item.id}`}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            {formatDate(item.tgl_so || item.created_at)}
          </Text>
        </View>

        <View style={styles.customerInfo}>
          <MaterialIcons name="person" size={14} color="#666" />
          <Text style={styles.customerName} numberOfLines={1}>
            {item.nama_cust || "Nama tidak tersedia"}
          </Text>
        </View>

        {item.no_cust && (
          <View style={styles.customerInfo}>
            <MaterialIcons name="badge" size={14} color="#666" />
            <Text style={styles.customerCode}>{item.no_cust}</Text>
          </View>
        )}

        <View style={styles.orderDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons name="inventory" size={14} color="#666" />
            <Text style={styles.detailText}>{item.jumlah_item || 0} items</Text>
          </View>

          {item.total && (
            <View style={styles.detailItem}>
              <MaterialIcons name="payments" size={14} color="#666" />
              <Text style={styles.detailText}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.salesName}>
            {item.nama_sales || user?.namaSales || "Sales tidak tersedia"}
          </Text>

          <View style={styles.actions}>
            {item.status !== "draft" && (
              <TouchableOpacity
                style={styles.printButton}
                onPress={() => handlePrintSalesOrder(item)}
              >
                <MaterialIcons name="print" size={16} color="#667eea" />
              </TouchableOpacity>
            )}
            <MaterialIcons name="chevron-right" size={20} color="#999" />
          </View>
        </View>
      </TouchableOpacity>
    ),
    [
      handleSalesOrderPress,
      handlePrintSalesOrder,
      formatDate,
      formatCurrency,
      user?.namaSales,
    ]
  );

  // ✅ Footer untuk loading more
  const renderFooter = useCallback(
    () =>
      loadingMore ? (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#667eea" />
          <Text style={styles.footerText}>Memuat data...</Text>
        </View>
      ) : salesOrders.length < total ? (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Geser ke bawah untuk memuat lebih banyak
          </Text>
        </View>
      ) : null,
    [loadingMore, salesOrders.length, total]
  );

  // ✅ Empty state
  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <MaterialIcons name="receipt-long" size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>
          {searchQuery ? "Tidak Ada Hasil Pencarian" : "Tidak Ada Sales Order"}
        </Text>
        <Text style={styles.emptyStateText}>
          {searchQuery
            ? "Tidak ada sales order yang sesuai dengan pencarian Anda"
            : "Belum ada sales order yang dibuat. Mulai dengan membuat sales order baru."}
        </Text>
        {!searchQuery && (
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={handleCreateSalesOrder}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.emptyStateButtonText}>Buat Sales Order</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [searchQuery, handleCreateSalesOrder]
  );

  // ✅ Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // ✅ Filter buttons
  // ✅ Filter buttons - pastikan semua teks dalam <Text>
  const FilterButton = useCallback(
    ({
      title,
      value,
      isActive,
    }: {
      title: string;
      value: string;
      isActive: boolean;
    }) => (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setFilter(value)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Sales Order",
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreateSalesOrder}
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
          placeholder="Cari nomor SO, customer, atau sales..."
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

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton title="Semua" value="all" isActive={filter === "all"} />
        <FilterButton
          title="Hari Ini"
          value="today"
          isActive={filter === "today"}
        />
        <FilterButton
          title="Draft"
          value="draft"
          isActive={filter === "draft"}
        />
        <FilterButton
          title="Menunggu"
          value="pending"
          isActive={filter === "pending"}
        />
        <FilterButton
          title="Disetujui"
          value="approved"
          isActive={filter === "approved"}
        />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {searchQuery || filter !== "all"
            ? `${filteredSalesOrders.length} dari ${salesOrders.length} SO`
            : `Total: ${salesOrders.length} sales order`}
          {total > salesOrders.length && ` dari ${total}`}
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
          <TouchableOpacity onPress={() => fetchSalesOrders(1, false)}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat sales order...</Text>
        </View>
      ) : (
        /* Sales Order List */
        <FlatList
          data={filteredSalesOrders}
          renderItem={renderSalesOrderItem}
          keyExtractor={(item) => `${item.id}-${item.no_so}`}
          contentContainerStyle={[
            styles.listContainer,
            filteredSalesOrders.length === 0 && styles.emptyListContainer,
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
        onPress={handleCreateSalesOrder}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  filterButtonActive: {
    backgroundColor: "#667eea",
  },
  filterButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
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
  orderItem: {
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
  orderHeader: {
    marginBottom: 8,
  },
  orderTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  customerCode: {
    fontSize: 12,
    color: "#888",
    marginLeft: 6,
    fontFamily: "monospace",
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  salesName: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  printButton: {
    padding: 4,
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
