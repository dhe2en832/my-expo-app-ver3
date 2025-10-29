// app/ppi/index.tsx
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
  ScrollView,
} from "react-native";
import {
  Stack,
  useRouter,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { ppiAPI, salesAPI } from "@/api/services";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  PPIListItem,
  APIResponse,
  PPISummary,
  PPIStatusOverviewProps,
  PPISummaryDashboardProps,
  PPIListContentProps,
} from "@/api/interface";
import { TabBar, TabView, Route } from "react-native-tab-view";
import DropDownPicker from "react-native-dropdown-picker";
import { Card, Button } from "react-native-paper";

// --- CUSTOM HOOKS ---
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
    case "synced":
    case "approved":
      return "#4CAF50";
    case "pending_sync":
    case "pending":
      return "#FF9800";
    case "draft":
      return "#9E9E9E";
    case "rejected":
    case "cancelled":
      return "#F44336";
    default:
      return "#666";
  }
};

const getStatusText = (status: string) => {
  switch (status?.toLowerCase()) {
    case "synced":
      return "Synced";
    case "pending_sync":
      return "Pending Sync";
    case "draft":
      return "Draft";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
    case "cancelled":
      return "Dibatalkan";
    default:
      return status || "Draft";
  }
};

const getPaymentMethodIcon = (caraBayar: string) => {
  switch (caraBayar) {
    case "cash":
      return "attach-money";
    case "transfer":
      return "account-balance";
    case "giro":
      return "receipt";
    default:
      return "payment";
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
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
};

// UPDATE PPISummaryDashboard component dengan prop isFiltered
const PPISummaryDashboard: React.FC<
  PPISummaryDashboardProps & { isFiltered?: boolean }
> = ({ summary, loading, isFiltered = false }) => {
  if (loading) {
    return (
      <View style={styles.summaryContainer}>
        {[1, 2, 3].map((item) => (
          <Card key={item} style={styles.summaryCard}>
            <Card.Content style={styles.summaryCardContent}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.summaryAmount}>...</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.summaryContainer}>
      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryCardContent}>
          <MaterialIcons name="receipt-long" size={16} color="#667eea" />
          <Text style={styles.summaryTitle}>
            {isFiltered ? "Piutang Sales" : "Total Piutang"}
          </Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(summary?.totalPiutang || 0)}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryCardContent}>
          <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.summaryTitle}>Tertagih</Text>
          <Text style={[styles.summaryAmount, styles.successText]}>
            {formatCurrency(summary?.totalTertagih || 0)}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryCardContent}>
          <MaterialIcons name="pending" size={16} color="#FF9800" />
          <Text style={styles.summaryTitle}>Outstanding</Text>
          <Text style={[styles.summaryAmount, styles.warningText]}>
            {formatCurrency(summary?.totalOutstanding || 0)}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const PPIListContent: React.FC<PPIListContentProps> = React.memo(
  ({
    filter,
    baseFilteredPPI,
    searchQuery,
    onPPIPress,
    onPrintPress,
    onRefresh,
    refreshing,
    salesDropdownOpen,
  }) => {
    const { user } = useAuth();

    // Filter data berdasarkan tab
    const filteredPPI = useMemo(() => {
      let filtered = baseFilteredPPI;

      // Apply status filter berdasarkan tab
      if (filter !== "all") {
        filtered = filtered.filter((ppi) => {
          switch (filter) {
            case "today":
              const today = new Date().toDateString();
              const ppiDate = new Date(ppi.tanggal_ppi).toDateString();
              return ppiDate === today;
            case "draft":
              return ppi.status?.toLowerCase() === "draft";
            case "pending":
              return ["pending_sync", "pending"].includes(
                ppi.status?.toLowerCase()
              );
            case "synced":
              return ["synced", "approved"].includes(ppi.status?.toLowerCase());
            default:
              return true;
          }
        });
      }
      return filtered;
    }, [baseFilteredPPI, filter]);

    const renderPPIItem = useCallback(
      ({ item }: { item: PPIListItem }) => (
        <TouchableOpacity
          style={styles.ppiItem}
          onPress={() => onPPIPress(item)}
        >
          <View style={styles.ppiHeader}>
            <View style={styles.ppiTitle}>
              <Text style={styles.ppiNumber} numberOfLines={1}>
                {item.no_ppi || `PPI-${item.kode_ppi}`}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status_badge?.color || getStatusColor(item.status),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {item.status_badge?.text || getStatusText(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.ppiDate}>{formatDate(item.tanggal_ppi)}</Text>
          </View>

          <View style={styles.customerInfo}>
            <MaterialIcons name="person" size={14} color="#666" />
            <Text style={styles.customerName} numberOfLines={1}>
              {item.nama_cust}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <MaterialIcons name="person" size={14} color="#666" />
            <Text style={styles.customerName} numberOfLines={1}>
              {item.nama_sales}
            </Text>
          </View>

          <View style={styles.ppiDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons name="request-quote" size={14} color="#666" />
              <Text style={styles.detailText}>
                {formatCurrency(item.jumlah_bayar)}
              </Text>
            </View>

            {item.total_discount > 0 && (
              <View style={styles.detailItem}>
                <MaterialIcons name="discount" size={14} color="#666" />
                <Text style={styles.discountText}>
                  {formatCurrency(item.total_discount)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.ppiFooter}>
            <View style={styles.paymentInfo}>
              <MaterialIcons
                name={getPaymentMethodIcon(item.cara_bayar)}
                size={14}
                color="#667eea"
              />
              <Text style={styles.paymentMethod}>
                {item.cara_bayar.toUpperCase()}
              </Text>
              <Text style={styles.fakturCount}>
                • {item.jumlah_faktur} Faktur
              </Text>
            </View>

            <View style={styles.actions}>
              {item.status !== "draft" && (
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={() => onPrintPress(item)}
                >
                  <MaterialIcons name="print" size={16} color="#667eea" />
                </TouchableOpacity>
              )}
              <MaterialIcons name="chevron-right" size={20} color="#999" />
            </View>
          </View>
        </TouchableOpacity>
      ),
      [onPPIPress, onPrintPress]
    );

    const renderEmptyState = useCallback(
      () => (
        <View style={styles.emptyState}>
          <MaterialIcons name="payments" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? "Tidak Ada Hasil Pencarian" : "Tidak Ada PPI"}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? "Tidak ada PPI yang sesuai dengan pencarian Anda"
              : `Belum ada PPI dengan status ${getStatusText(filter)}.`}
          </Text>
        </View>
      ),
      [searchQuery, filter]
    );

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredPPI}
          renderItem={renderPPIItem}
          keyExtractor={(item) => `${item.kode_ppi}-${filter}`}
          contentContainerStyle={[
            styles.listContainer,
            filteredPPI.length === 0 && styles.emptyListContainer,
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

// --- MAIN COMPONENT ---
export default function PPIHome() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ successMessage?: string }>();
  const insets = useSafeAreaInsets();

  // State utama
  const [allPPI, setAllPPI] = useState<PPIListItem[]>([]);
  const [summary, setSummary] = useState<PPISummary | null>(null);
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
    // { key: "draft", title: "Draft" },
    // { key: "pending", title: "Pending" },
    // { key: "synced", title: "Synced" },
  ];

  // --- LOGIKA FILTER UTAMA ---
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const baseFilteredPPI = useMemo(() => {
    let filtered = allPPI;
    if (user?.salesRole === "Sales Supervisor") {
      filtered = filtered.filter(
        (ppi) => ppi.status?.toLowerCase() !== "draft"
      );
    }
    // Filter by sales jika supervisor
    if (user?.salesRole === "Sales Supervisor" && salesFilter) {
      filtered = filtered.filter((ppi) => ppi.kode_sales === salesFilter);
    }

    // Apply search
    if (!debouncedSearchQuery.trim()) return filtered;
    const query = debouncedSearchQuery.toLowerCase();
    return filtered.filter(
      (ppi) =>
        ppi.no_ppi?.toLowerCase().includes(query) ||
        ppi.nama_cust?.toLowerCase().includes(query) ||
        ppi.kode_sales?.toLowerCase().includes(query) ||
        ppi.nama_sales?.toLowerCase().includes(query)
    );
  }, [allPPI, debouncedSearchQuery, salesFilter, user?.salesRole]);

  // Hitung total untuk stats
  const totalFiltered = useMemo(
    () => baseFilteredPPI.length,
    [baseFilteredPPI]
  );

  // --- HANDLERS ---
  const handlePPIPress = useCallback(
    (ppi: PPIListItem) => {
      router.push({
        pathname: `/ppi/${ppi.kode_ppi}`,
        params: {
          kode_ppi: ppi.kode_ppi,
          no_ppi: ppi.no_ppi,
          status: ppi.status,
        },
      });
    },
    [router]
  );

  const handleCreatePPI = useCallback(() => {
    router.push("/ppi/create");
  }, [router]);

  const handlePrintPPI = useCallback(
    (ppi: PPIListItem) => {
      router.push({
        pathname: `/ppi/print/${ppi.kode_ppi}`,
        params: {
          no_ppi: ppi.no_ppi,
          nama_cust: ppi.nama_cust,
        },
      });
    },
    [router]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // --- DATA FETCHING ---
  const loadSummaryData = async (salesCode?: string) => {
    try {
      // console.log("salesCode ", salesCode);
      const summaryData = await ppiAPI.getPPISummary(salesCode);
      setSummary(summaryData);
      // console.log("summaryData ", summaryData);
    } catch (error) {
      console.error("Error loading summary:", error);
      // Fallback: hitung dari data lokal
      const dataToUse = salesCode
        ? allPPI.filter((ppi) => ppi.kode_sales === salesCode)
        : allPPI;

      const calculatedSummary: PPISummary = {
        totalPiutang: dataToUse.reduce(
          (sum, ppi) => sum + (ppi.jumlah_bayar || 0),
          0
        ),
        totalTertagih: dataToUse
          .filter((ppi) =>
            ["synced", "approved"].includes(ppi.status?.toLowerCase())
          )
          .reduce((sum, ppi) => sum + (ppi.jumlah_bayar || 0), 0),
        totalOutstanding: dataToUse
          .filter((ppi) =>
            ["draft", "pending_sync", "pending"].includes(
              ppi.status?.toLowerCase()
            )
          )
          .reduce((sum, ppi) => sum + (ppi.jumlah_bayar || 0), 0),
        draftCount: dataToUse.filter(
          (ppi) => ppi.status?.toLowerCase() === "draft"
        ).length,
        pendingSyncCount: dataToUse.filter((ppi) =>
          ["pending_sync", "pending"].includes(ppi.status?.toLowerCase())
        ).length,
        syncedCount: dataToUse.filter((ppi) =>
          ["synced", "approved"].includes(ppi.status?.toLowerCase())
        ).length,
      };

      setSummary(calculatedSummary);
    }
  };

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

  const fetchAllPPI = async () => {
    if (!user?.kodeSales && user?.salesRole !== "Sales Supervisor") {
      setError("Data sales tidak ditemukan");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res: APIResponse<PPIListItem[]> = await ppiAPI.getPPIList({
        limit: 1000,
      });

      if (res.success && res.data && Array.isArray(res.data)) {
        setAllPPI(res.data);
        // Setelah data PPI dimuat, hitung summary berdasarkan filter sales saat ini
        await loadSummaryData(salesFilter);
      } else {
        setAllPPI([]);
        setError(res.message || "Gagal mengambil data PPI");
      }
    } catch (err: any) {
      console.error("Error fetching PPI:", err);
      setError(err.message || "Gagal memuat data PPI");
      setAllPPI([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([fetchAllPPI()]);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, [salesFilter]);

  // --- USE EFFECTS ---
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [salesFilter])
  );

  // Effect untuk update summary ketika sales filter berubah
  useEffect(() => {
    if (allPPI.length > 0) {
      loadSummaryData(salesFilter);
    }
  }, [salesFilter, allPPI]);

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

  // --- TABVIEW RENDERING ---
  interface RenderSceneProps {
    route: Route;
    jumpTo: (key: string) => void;
  }

  const renderScene = ({ route }: RenderSceneProps) => (
    <PPIListContent
      filter={route.key}
      baseFilteredPPI={baseFilteredPPI}
      searchQuery={searchQuery}
      onPPIPress={handlePPIPress}
      onPrintPress={handlePrintPPI}
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

  // --- RENDER LOGIC ---
  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainerFull}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat data PPI...</Text>
        </View>
      );
    }

    return (
      <View style={styles.mainContainer}>
        {/* Compact Dashboard Section */}
        <View style={styles.dashboardSection}>
          <PPISummaryDashboard
            summary={summary}
            loading={loading}
            isFiltered={!!salesFilter}
          />
        </View>

        {/* Search and Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nomor PPI, customer, atau sales..."
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

          {user?.salesRole === "Sales Supervisor" && (
            <View style={styles.dropdownWrapper}>
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
                listMode="MODAL"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
                autoScroll
                closeAfterSelecting={true}
              />
            </View>
          )}

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {`Menampilkan: ${totalFiltered} PPI`}
              {salesFilter &&
                ` • Sales: ${
                  salesList.find((s) => s.value === salesFilter)?.label
                }`}
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
        <View style={styles.tabSection}>
          <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={renderTabBar}
            style={styles.tabView}
            swipeEnabled={true}
          />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadAllData}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Penerimaan Piutang",
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePPI}
            >
              <MaterialIcons name="add" size={24} color="#667eea" />
            </TouchableOpacity>
          ),
        }}
      />

      {renderContent()}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
        onPress={handleCreatePPI}
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
  mainContainer: {
    flex: 1,
  },
  // Compact Dashboard Section
  dashboardSection: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  // More Compact Filter Section
  filterSection: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  // Tab Section - Takes most space
  tabSection: {
    flex: 1,
  },
  // Optimized Summary Dashboard
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 1,
    minHeight: 70, // Reduced height
  },
  summaryCardContent: {
    alignItems: "center",
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 4,
  },
  summaryTitle: {
    fontSize: 11, // Smaller font
    textAlign: "center",
    marginTop: 2,
    color: "#666",
  },
  summaryAmount: {
    fontSize: 12, // Smaller font
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  // Optimized Status Overview
  statusOverviewCard: {
    elevation: 1,
    backgroundColor: "transparent",
    shadowOpacity: 0,
  },
  statusOverviewTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  statusOverview: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: {
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 1,
  },
  statusLabel: {
    fontSize: 11,
    color: "#666",
  },
  // More Compact Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    padding: 0,
  },
  // Compact Dropdown
  dropdownWrapper: {
    marginBottom: 8,
    zIndex: 3000,
  },
  dropdown: {
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    height: 40,
    zIndex: 3001,
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  dropdownContainerStyle: {
    backgroundColor: "white",
    borderColor: "#e0e0e0",
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 20,
    top: 40,
  },
  // Compact Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  statsText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  // Optimized Tab Bar
  tabBar: {
    backgroundColor: "white",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    height: 44, // Reduced height
  },
  tabStyle: {
    height: 44, // Reduced height
    paddingVertical: 6,
    minHeight: 44,
  },
  tabLabel: {
    fontWeight: "600",
    textTransform: "capitalize",
    fontSize: 11, // Smaller font
    textAlign: "center",
    includeFontPadding: false,
    padding: 0,
    margin: 0,
    lineHeight: 12,
  },
  // More Compact List Items
  listContainer: {
    flexGrow: 1,
    padding: 12, // Reduced padding
  },
  ppiItem: {
    backgroundColor: "white",
    padding: 12, // Reduced padding
    borderRadius: 8,
    marginBottom: 8, // Reduced margin
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ppiHeader: {
    marginBottom: 6,
  },
  ppiTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  ppiNumber: {
    fontSize: 14, // Slightly smaller
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 6,
  },
  ppiDate: {
    fontSize: 11,
    color: "#999",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  ppiDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "bold",
    marginLeft: 4,
  },
  discountText: {
    fontSize: 11,
    color: "#ff6d00",
    marginLeft: 4,
  },
  ppiFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentMethod: {
    fontSize: 11,
    color: "#667eea",
    fontWeight: "500",
    marginLeft: 4,
    marginRight: 6,
  },
  fakturCount: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    paddingVertical: 40, // Reduced padding
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  successText: {
    color: "#66bb6a",
  },
  warningText: {
    color: "#ffa726",
  },
  printButton: {
    padding: 4,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  tabContentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItem: {
    paddingHorizontal: 16,
  },
  tabView: {
    flex: 1,
  },
});
