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
  useWindowDimensions,
} from "react-native";
import {
  Stack,
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router"; // ✅ TAMBAH useFocusEffect
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { salesOrderAPI } from "@/api/services";
import { salesAPI } from "@/api/services";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { SalesOrderListType } from "@/api/interface";
import { TabBar, TabView, Route } from "react-native-tab-view";
import DropDownPicker from "react-native-dropdown-picker";

// --- CUSTOM HOOKS ---
// Custom hook untuk debounce
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// --- HELPER FUNCTIONS ---
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "tertutup":
    case "approved":
    case "disetujui":
      return "#4CAF50";
    case "terbuka":
    case "pending":
    case "menunggu":
      return "#FF9800";
    case "ditolak":
    case "rejected":
      return "#F44336";
    case "draft":
      return "#9E9E9E";
    case "dikirim":
    case "submitted":
      return "#2196F3";
    default:
      return "#666";
  }
};

const getStatusText = (status: string) => {
  switch (status?.toLowerCase()) {
    case "tertutup":
      return "Tertutup";
    case "terbuka":
      return "Terbuka";
    case "approved":
    case "disetujui":
      return "Disetujui";
    case "pending":
    case "menunggu":
      return "Menunggu";
    case "rejected":
    case "ditolak":
      return "Ditolak";
    case "draft":
      return "Draft";
    case "submitted":
    case "dikirim":
      return "Dikirim";
    default:
      return status || "Draft";
  }
};

// --- KOMPONEN UNTUK KONTEN SETIAP TAB (Memoized) ---
interface SalesOrderListContentProps {
  filter: string; // Key tab
  baseFilteredOrders: SalesOrderListType[]; // Data yang sudah difilter (search/sales)
  searchQuery: string;
  onSalesOrderPress: (order: SalesOrderListType) => void;
  onPrintPress: (order: SalesOrderListType) => void;
  onApprovePress: (order: SalesOrderListType) => void;
  onRefresh: () => void;
  refreshing: boolean;
  salesDropdownOpen: boolean;
}

const SalesOrderListContent: React.FC<SalesOrderListContentProps> = React.memo(
  ({
    filter,
    baseFilteredOrders,
    searchQuery,
    onSalesOrderPress,
    onPrintPress,
    onApprovePress,
    onRefresh,
    refreshing,
    salesDropdownOpen,
  }) => {
    const { user } = useAuth();

    // Filter data HANYA berdasarkan tab (status)
    const filteredSalesOrders = useMemo(() => {
      let filtered = baseFilteredOrders;

      // Apply status filter berdasarkan tab
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
              return ["pending", "menunggu"].includes(
                order.status?.toLowerCase()
              );
            case "approved":
              return ["approved", "disetujui"].includes(
                order.status?.toLowerCase()
              );
            default:
              return true;
          }
        });
      }
      return filtered;
    }, [baseFilteredOrders, filter]);

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

    const formatCurrency = useCallback((amount: number) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(amount);
    }, []);

    const renderSalesOrderItem = useCallback(
      ({ item }: { item: SalesOrderListType }) => (
        <TouchableOpacity
          style={styles.orderItem}
          onPress={() => onSalesOrderPress(item)}
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
              {item.nama_cust}
            </Text>
          </View>

          {item.kode_cust && (
            <View style={styles.customerInfo}>
              <MaterialIcons name="badge" size={14} color="#666" />
              <Text style={styles.customerCode}>{item.no_cust}</Text>
            </View>
          )}

          <View style={styles.orderDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons name="inventory" size={14} color="#666" />
              <Text style={styles.detailText}>
                {item.jumlah_item || 0} items
              </Text>
            </View>

            {item.total && (
              <View style={styles.detailItem}>
                <MaterialIcons name="request-quote" size={14} color="#666" />
                <Text style={styles.detailText}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.orderFooter}>
            <Text style={styles.salesName}>
              {item.nama_sales || user?.namaSales}
            </Text>

            <View style={styles.actions}>
              {item.status !== "draft" && (
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={() => onPrintPress(item)}
                >
                  <MaterialIcons name="print" size={16} color="#667eea" />
                </TouchableOpacity>
              )}

              {/* ✅ UPDATE: TAMPILKAN APPROVAL BUTTON HANYA UNTUK SUPERVISOR DAN STATUS PENDING */}
              {user?.salesRole === "Sales Supervisor" &&
                ["pending", "menunggu"].includes(
                  item.status?.toLowerCase()
                ) && (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => onApprovePress(item)}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#4CAF50"
                    />
                  </TouchableOpacity>
                )}

              <MaterialIcons name="chevron-right" size={20} color="#999" />
            </View>
          </View>
        </TouchableOpacity>
      ),
      [
        formatDate,
        formatCurrency,
        user,
        onSalesOrderPress,
        onPrintPress,
        onApprovePress,
      ]
    );

    const renderEmptyState = useCallback(
      () => (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt-long" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>
            {searchQuery
              ? "Tidak Ada Hasil Pencarian"
              : "Tidak Ada Sales Order"}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? "Tidak ada sales order yang sesuai dengan pencarian Anda"
              : `Belum ada sales order dengan status ${getStatusText(filter)}.`}
          </Text>
        </View>
      ),
      [searchQuery, filter]
    );

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredSalesOrders}
          renderItem={renderSalesOrderItem}
          keyExtractor={(item) => `${item.id}-${item.no_so}-${filter}`}
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
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          scrollEnabled={!salesDropdownOpen}
        />
      </View>
    );
  }
);

// --- KOMPONEN UTAMA ---
export default function SalesOrderList() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const insets = useSafeAreaInsets();

  // State utama
  const [allSalesOrders, setAllSalesOrders] = useState<SalesOrderListType[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sales filter state
  type SalesDropdownItem = {
    label: string;
    value: string;
  };
  const [salesList, setSalesList] = useState<SalesDropdownItem[]>([]);
  const [salesFilter, setSalesFilter] = useState<string>("");
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);

  // Tab View state
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const routes: Route[] = [
    { key: "all", title: "Semua" },
    { key: "today", title: "Hari Ini" },
    { key: "draft", title: "Draft" },
    { key: "pending", title: "Menunggu" },
    { key: "approved", title: "Disetujui" },
  ];

  // --- LOGIKA FILTER UTAMA (Dibawa ke Induk) ---
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const baseFilteredOrders = useMemo(() => {
    let filtered = allSalesOrders;

    // Filter by sales jika supervisor
    if (user?.salesRole === "Sales Supervisor" && salesFilter) {
      filtered = filtered.filter((order) => order.kode_sales === salesFilter);
    }

    // Apply search
    if (!debouncedSearchQuery.trim()) return filtered;
    const query = debouncedSearchQuery.toLowerCase();
    return filtered.filter(
      (order) =>
        order.no_so?.toLowerCase().includes(query) ||
        order.nama_cust?.toLowerCase().includes(query) ||
        order.kode_cust?.toLowerCase().includes(query) ||
        order.nama_sales?.toLowerCase().includes(query)
    );
  }, [allSalesOrders, debouncedSearchQuery, salesFilter, user?.salesRole]);

  // Hitung total untuk stats (berdasarkan baseFilteredOrders)
  const totalFiltered = useMemo(
    () => baseFilteredOrders.length,
    [baseFilteredOrders]
  );

  // --- HANDLERS ---
  const handleSalesOrderPress = useCallback(
    (order: SalesOrderListType) => {
      // ✅ TENTUKAN MODE BERDASARKAN STATUS DAN ROLE USER
      let mode: "edit" | "view" | "approval" = "view";
      let isEditable = false;

      if (user?.salesRole === "Sales Supervisor") {
        // Supervisor bisa view semua, approval untuk pending
        if (["pending", "menunggu"].includes(order.status?.toLowerCase())) {
          mode = "approval";
        } else {
          mode = "view";
        }
      } else {
        // Sales biasa: edit hanya untuk draft milik sendiri
        if (order.status === "draft" && order.kode_sales === user?.kodeSales) {
          mode = "edit";
          isEditable = true;
        } else {
          mode = "view";
        }
      }

      router.push({
        pathname: `/sales-order/${order.id}`,
        params: {
          id: order.id,
          no_so: order.no_so,
          status: order.status,
          mode: mode, // ✅ KIRIM MODE SEBAGAI PARAM
          isEditable: isEditable ? "true" : "false",
        },
      });
    },
    [router, user]
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

  // ✅ UPDATE: HANDLER APPROVAL - NAVIGASI KE FORM DENGAN MODE APPROVAL
  const handleApproveSalesOrder = useCallback(
    (order: SalesOrderListType) => {
      router.push({
        pathname: `/sales-order/${order.id}`,
        params: {
          id: order.id,
          no_so: order.no_so,
          status: order.status,
          mode: "approval", // ✅ MODE APPROVAL
          isEditable: "false",
        },
      });
    },
    [router]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // ✅ UPDATE: API FUNCTIONS UNTUK APPROVAL/REJECT
  const handleApproveOrder = async (orderId: string, notes?: string) => {
    try {
      const res = await salesOrderAPI.approveSalesOrder(orderId, notes);
      if (res.success) {
        Alert.alert("Berhasil", "Sales Order berhasil disetujui", [
          {
            text: "OK",
            onPress: () => {
              // Refresh data setelah approval
              fetchAllSalesOrders();
              router.back(); // Kembali ke list
            },
          },
        ]);
      } else {
        Alert.alert("Error", res.message || "Gagal menyetujui sales order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal menyetujui sales order");
    }
  };

  const handleRejectOrder = async (orderId: string, notes?: string) => {
    try {
      const res = await salesOrderAPI.rejectSalesOrder(orderId, notes);
      if (res.success) {
        Alert.alert("Berhasil", "Sales Order berhasil ditolak", [
          {
            text: "OK",
            onPress: () => {
              // Refresh data setelah reject
              fetchAllSalesOrders();
              router.back(); // Kembali ke list
            },
          },
        ]);
      } else {
        Alert.alert("Error", res.message || "Gagal menolak sales order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal menolak sales order");
    }
  };

  // --- DATA FETCHING ---
  const loadSalesList = async () => {
    try {
      const resSalesList = await salesAPI.getSalesDetail();
      if (resSalesList.success && Array.isArray(resSalesList.data)) {
        const dropdownItems: SalesDropdownItem[] = [
          { label: "Semua Sales", value: "" },
          ...resSalesList.data.map((item) => ({
            label: item.nama_sales,
            value: item.kode_sales,
          })),
        ];
        setSalesList(dropdownItems);
      }
    } catch (err) {
      console.error("Error loading sales list:", err);
    }
  };

  const fetchAllSalesOrders = async () => {
    if (!user?.kodeSales && user?.salesRole !== "Sales Supervisor") {
      setError("Data sales tidak ditemukan");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await salesOrderAPI.getSalesOrderListCombined(1, 1000);

      if (res.success && res.data && Array.isArray(res.data)) {
        const orderData: SalesOrderListType[] = res.data.map((order) => ({
          ...order,
          id: order.kode_so,
          no_so: order.no_so,
          tanggal: order.tgl_so,
          nama_cust: order.nama_cust,
          kode_cust: order.kode_cust,
          created_at: order.sort_date,
          jumlah_item: order.jumlah_item,
          total: order.total,
        }));
        setAllSalesOrders(orderData);
      } else {
        setAllSalesOrders([]);
        setError(res.message || "Gagal mengambil data sales order");
      }
    } catch (err: any) {
      console.error("Error fetching sales orders:", err);
      setError(err.message || "Gagal memuat data sales order");
      setAllSalesOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllSalesOrders();
  }, []);

  // --- USE EFFECTS ---
  // ✅ STEP 1: TAMBAH useFocusEffect UNTUK AUTO-REFRESH
  useFocusEffect(
    useCallback(() => {
      fetchAllSalesOrders();
    }, [])
  );

  // Success message
  useEffect(() => {
    if (params.successMessage) {
      Alert.alert("Sukses", params.successMessage);
      router.setParams({ successMessage: undefined });
    }
  }, [params.successMessage]);

  // Load sales list jika supervisor
  useEffect(() => {
    if (user?.salesRole === "Sales Supervisor") {
      loadSalesList();
    }
  }, [user?.salesRole]);

  // Fetch data utama (initial load)
  useEffect(() => {
    fetchAllSalesOrders();
  }, []);

  // --- TABVIEW RENDERING ---
  interface RenderSceneProps {
    route: Route;
    jumpTo: (key: string) => void;
  }

  const renderScene = ({ route }: RenderSceneProps) => (
    <SalesOrderListContent
      filter={route.key}
      baseFilteredOrders={baseFilteredOrders} // Mengirim data yang sudah difilter
      searchQuery={searchQuery} // Hanya untuk empty state
      onSalesOrderPress={handleSalesOrderPress}
      onPrintPress={handlePrintSalesOrder}
      onApprovePress={handleApproveSalesOrder}
      onRefresh={onRefresh}
      refreshing={refreshing}
      salesDropdownOpen={salesDropdownOpen}
    />
  );

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: "#667eea" }}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#667eea"
      inactiveColor="#666"
      pressColor="transparent"
      getLabelText={({ route }: { route: Route }) => route.title}
      tabStyle={styles.tabStyle}
      contentContainerStyle={styles.tabContentContainer}
      scrollEnabled={true}
    />
  );

  // --- INITIAL LOADING STATE ---
  if (loading) {
    return (
      <View style={styles.loadingContainerFull}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Memuat sales order...</Text>
      </View>
    );
  }

  // --- MAIN RENDER ---
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Sales Order List",
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

      {/* Kontainer Wrapper untuk Pencarian, Dropdown, dan Stats Bar */}
      <View style={styles.headerContentWrapper}>
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

        {/* Sales Filter Dropdown */}
        {user?.salesRole === "Sales Supervisor" && (
          <View
            style={[
              styles.dropdownContainer,
              { zIndex: salesDropdownOpen ? 3000 : 2000 },
            ]}
          >
            <DropDownPicker
              open={salesDropdownOpen}
              value={salesFilter}
              items={salesList}
              setOpen={setSalesDropdownOpen}
              setValue={setSalesFilter}
              placeholder="Pilih Sales..."
              searchable
              searchPlaceholder="Cari sales..."
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainerStyle}
              listItemContainerStyle={styles.dropdownItem}
              // listMode="SCROLLVIEW"
              listMode="MODAL"
              scrollViewProps={{
                nestedScrollEnabled: true,
                contentContainerStyle: {
                  paddingVertical: 4,
                },
              }}
              modalProps={{
                animationType: "fade",
              }}
              // ✅ OPSIONAL: Auto scroll ke item yang dipilih
              autoScroll
              // ✅ OPSIONAL: Close ketika select item
              closeAfterSelecting={true}
            />
          </View>
        )}

        {/* Stats Bar */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {`Total: ${totalFiltered} sales order`}
          </Text>
          <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
            <MaterialIcons
              name="refresh"
              size={20}
              color={refreshing ? "#ccc" : "#667eea"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab View */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
        style={styles.tabView}
        swipeEnabled={true}
      />

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAllSalesOrders}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
        onPress={handleCreateSalesOrder}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  loadingContainerFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  // Wrapper untuk Search, Dropdown, dan Stats agar memiliki padding luar yang sama
  headerContentWrapper: {
    backgroundColor: "white",
    paddingHorizontal: 0, // <--- Perbaikan 1: Hapus padding di wrapper
    paddingBottom: 8,
  },

  // Search Bar Disesuaikan
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 8,
    marginHorizontal: 16, // <--- Perbaikan 1: Tambah margin di sini
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },

  // Dropdown Disesuaikan
  dropdownContainer: {
    marginTop: 8,
    marginHorizontal: 16, // <--- Perbaikan 1: Tambah margin di sini
    zIndex: 3000,
  },
  dropdown: {
    borderColor: "#e0e0e0",
    backgroundColor: "white",
    borderRadius: 10,
    height: 44,
    zIndex: 3001,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownContainerStyle: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 250, // Memastikan scroll berfungsi
    // minHeight: 100, // ✅ Minimum height untuk memastikan scroll
    zIndex: 9999, // ✅ Sangat tinggi untuk berada di atas semua elemen
    elevation: 20, // ✅ Untuk Android
    // marginTop: 4, // ✅ Beri jarak dari input
    top: 44, // ✅ Posisikan tepat di bawah input
    width: "100%", // ✅ Full width
  },
  // Perbaikan 2: Sesuaikan padding untuk mencegah teks terpotong dan menambah kerapihan horizontal
  dropdownItem: {
    // paddingVertical: 12,
    paddingHorizontal: 16, // <--- Tambahkan paddingHorizontal untuk kerapihan
  },

  // Stats Container Disesuaikan
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    backgroundColor: "white",
    paddingHorizontal: 16, // <--- Perbaikan 1: Tambah padding di sini
  },

  statsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabView: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tabStyle: {
    height: 48, // ✅ Tinggi yang cukup untuk teks
    paddingVertical: 8, // ✅ Padding vertikal
    minHeight: 48, // ✅ Minimum height
  },

  // ✅ CONTENT CONTAINER STYLE
  tabContentContainer: {
    alignItems: "center", // ✅ Pusatkan konten
    justifyContent: "center",
  },
  tabLabel: {
    fontWeight: "600",
    textTransform: "capitalize",
    fontSize: 12, // ✅ Lebih kecil lagi
    textAlign: "center",
    includeFontPadding: false,
    padding: 0,
    margin: 0,
    lineHeight: 14,
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
  approveButton: {
    padding: 4,
  },
  headerButton: {
    padding: 4,
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
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 1000,
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
});
