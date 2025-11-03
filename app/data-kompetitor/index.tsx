import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from "react-native";
import {
  Text,
  FAB,
  Card,
  ActivityIndicator,
  Searchbar,
  Chip,
  Menu,
  Divider,
  IconButton,
} from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { KompetitorList } from "@/api/interface";
import { kompetitorAPI } from "@/api/services";
import DropDownPicker from "react-native-dropdown-picker";
import debounce from "lodash/debounce";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Portal } from "react-native-paper";
import * as SecureStore from "expo-secure-store";

// Types untuk response API
interface KompetitorAPIResponse {
  success: boolean;
  data: KompetitorList[] | null;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Status options untuk filter — ✅ Dikomentari karena tidak digunakan sementara
/*
const STATUS_OPTIONS = [
  { label: "Semua Status", value: "all" },
  { label: "Aktif", value: "active" },
  { label: "Nonaktif", value: "inactive" },
];
*/

const DataKompetitorList = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // State management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<KompetitorList[]>([]);
  const [filteredData, setFilteredData] = useState<KompetitorList[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [selectedSales, setSelectedSales] = useState<string>("");
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // const [statusFilter, setStatusFilter] = useState("all"); // ✅ Dikomentari
  const [sortBy, setSortBy] = useState<"latest" | "name">("latest");
  const [menuVisible, setMenuVisible] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  });

  const isSupervisor = user?.salesRole === "Sales Supervisor";
  const fadeAnim = useRef(new Animated.Value(0)).current; // ✅ Gunakan useRef

  useEffect(() => {
    const updateActivity = async () => {
      await SecureStore.setItemAsync("last_active", Date.now().toString());
    };
    updateActivity();
  }, []);

  // ✅ FILTER & SORT DI FRONTEND SAJA
  useEffect(() => {
    let filtered = [...data];

    // 🔽 Status filter — Dikomentari
    /*
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) =>
        statusFilter === "active"
          ? item.status === "1" || item.status === "active"
          : item.status === "0" || item.status === "inactive"
      );
    }
    */

    // Sort data
    if (sortBy === "name") {
      filtered = filtered.sort((a, b) =>
        (a.nama_cust || "").localeCompare(b.nama_cust || "")
      );
    } else {
      filtered = filtered.sort(
        (a, b) =>
          new Date(b.tanggal_input || 0).getTime() -
          new Date(a.tanggal_input || 0).getTime()
      );
    }

    setFilteredData(filtered);
    // console.log("Filtered data:", filtered);
  }, [data, /* statusFilter, */ sortBy]);

  useFocusEffect(
    useCallback(() => {
      loadData("", true); // Refresh setiap kali focus
    }, [])
  );

  useEffect(() => {
    if (pagination.page === 1) {
      loadData(searchQuery, true);
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [searchQuery, selectedSales, sortBy]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      loadData(query, true);
    }, 500),
    []
  );

  // Load data (tanpa filter sales/status di API)
  const loadData = async (
    search: string = searchQuery,
    isSearch: boolean = false
  ) => {
    try {
      if (isSearch) {
        setLoading(true);
      } else if (!refreshing) {
        setLoading(true);
      }

      const pageToLoad = isSearch ? 1 : pagination.page;

      const res = await kompetitorAPI.getKompetitorList(
        pageToLoad,
        pagination.limit,
        search || ""
      );

      // console.log("🔹 [FRONTEND DEBUG] API Response:", res);

      if (res.success && res.data) {
        const responseData = res.data || [];

        if (isSearch || pageToLoad === 1) {
          setData(responseData);
        } else {
          setData((prev) => {
            const existingIds = new Set(
              prev.map((item) => item.kode_kompetitor)
            );
            const newData = responseData.filter(
              (item) => !existingIds.has(item.kode_kompetitor)
            );
            return [...prev, ...newData];
          });
        }

        setPagination((prev) => ({
          ...prev,
          page: pageToLoad,
          total: res.meta?.total || 0,
          hasMore: pageToLoad < (res.meta?.pages || 1),
        }));
      } else {
        if (isSearch || pageToLoad === 1) {
          setData([]);
        }
        setPagination((prev) => ({ ...prev, hasMore: false }));
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      Alert.alert("Error", "Gagal memuat data kompetitor");
      if (isSearch || pagination.page === 1) {
        setData([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load more data untuk infinite scroll
  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  // Load sales list untuk supervisor
  const loadSalesList = async () => {
    try {
      const res = await kompetitorAPI.getKompetitorList(1, 100);
      if (res.success && res.data) {
        const responseData = res.data || [];
        const uniqueSales = responseData.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.kode_sales === item.kode_sales)
        );
        setSalesList(uniqueSales);
      }
    } catch (err) {
      console.error("Error loading sales list:", err);
    }
  };

  // Handle search input change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Handle search submit
  const handleSearchSubmit = (
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    loadData(searchQuery, true);
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadData(searchQuery, true);
  };

  // Handle sales filter change
  const handleSalesChange = (value: string) => {
    setSelectedSales(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setTimeout(() => applyFilters(), 0);
  };

  // Apply filter berdasarkan sales (frontend)
  const applyFilters = () => {
    let result = [...data];

    // Filter sales
    if (selectedSales) {
      result = result.filter((item) => item.kode_sales === selectedSales);
    }

    // 🔽 Status filter — Dikomentari
    /*
    if (statusFilter !== "all") {
      result = result.filter((item) =>
        statusFilter === "active"
          ? item.status === "1" || item.status === "active"
          : item.status === "0" || item.status === "inactive"
      );
    }
    */

    // Sort
    if (sortBy === "name") {
      result = result.sort((a, b) =>
        (a.nama_cust || "").localeCompare(b.nama_cust || "")
      );
    } else {
      result = result.sort(
        (a, b) =>
          new Date(b.tanggal_input || 0).getTime() -
          new Date(a.tanggal_input || 0).getTime()
      );
    }

    setFilteredData(result);
  };

  // Reset semua filter
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSales("");
    // setStatusFilter("all"); // ✅ Dikomentari
    setSortBy("latest");
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadData("", true);
  };

  // Effects
  useEffect(() => {
    loadData();
    if (isSupervisor) {
      loadSalesList();
    }
  }, [pagination.page]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0); // ✅ Reset animasi setiap fokus
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      return () => {
        fadeAnim.setValue(0);
      };
    }, [])
  );

  // Render item untuk FlatList
  const renderItem = ({
    item,
    index,
  }: {
    item: KompetitorList;
    index: number;
  }) => {
    // console.log("Rendering item:", item);
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        }}
      >
        <Card
          style={[styles.itemCard, { marginTop: index === 0 ? 8 : 4 }]}
          onPress={() =>
            router.push(`/data-kompetitor/${item.kode_kompetitor}`)
          }
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.nama_cust || "-"}
                </Text>
                <Text style={styles.customerCode}>
                  Kode: {item.kode_kompetitor}
                </Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sales:</Text>
                <Text style={styles.detailValue}>{item.nama_sales || "-"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tanggal:</Text>
                <Text style={styles.detailValue}>
                  {item.tanggal_input
                    ? new Date(item.tanggal_input).toLocaleDateString("id-ID")
                    : "-"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Produk:</Text>
                <Text style={styles.detailValue}>{item.total_produk || 0}</Text>
              </View>
              {item.catatan ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Catatan:</Text>
                  <Text style={styles.notesValue} numberOfLines={2}>
                    {item.catatan}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  // Render footer untuk loading indicator
  const renderFooter = () => {
    if (!loading || !pagination.hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" />
        <Text style={styles.footerText}>Memuat data lebih lanjut...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Tidak ada data kompetitor</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || selectedSales
          ? "Coba ubah filter pencarian Anda"
          : "Mulai dengan menambahkan data kompetitor baru"}
      </Text>
      {(searchQuery || selectedSales) && (
        <Chip
          mode="outlined"
          onPress={resetFilters}
          style={styles.resetFilterChip}
        >
          Reset Filter
        </Chip>
      )}
    </View>
  );

  const handlCreate = useCallback(() => {
    router.push("/data-kompetitor/create");
  }, [router]);

  return (
    // <Portal>
    <>
      {/* ✅ Portal diaktifkan kembali */}
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
          options={{
            title: "Data Kompetitor",
          }}
        />
        <View style={styles.container}>
          {/* Header dengan Search */}
          <View style={styles.header}>
            <Searchbar
              placeholder="Cari kompetitor..."
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              iconColor="#666"
            />
            <Menu
              key={menuVisible ? "open" : "closed"}
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="filter-variant"
                  size={24}
                  onPress={() => setMenuVisible(true)}
                  style={styles.filterButton}
                />
              }
              contentStyle={styles.menuContent}
            >
              <Menu.Item
                leadingIcon="sort-calendar-descending"
                title="Urutkan Terbaru"
                onPress={() => {
                  setSortBy("latest");
                  setMenuVisible(false);
                }}
                titleStyle={sortBy === "latest" ? styles.menuItemActive : {}}
              />
              <Menu.Item
                leadingIcon="sort-alphabetical-ascending"
                title="Urutkan Nama A-Z"
                onPress={() => {
                  setSortBy("name");
                  setMenuVisible(false);
                }}
                titleStyle={sortBy === "name" ? styles.menuItemActive : {}}
              />
              <Divider />
              <Menu.Item
                leadingIcon="filter-off"
                title="Reset Semua Filter"
                onPress={() => {
                  resetFilters();
                  setMenuVisible(false);
                }}
              />
            </Menu>
          </View>

          {/* Filter Section */}
          <View style={styles.filterSection}>
            {isSupervisor && (
              <View style={styles.dropdownWrapper}>
                <DropDownPicker
                  open={salesDropdownOpen}
                  value={selectedSales}
                  items={[
                    { label: "Semua Sales", value: "" },
                    ...salesList.map((x: any) => ({
                      label: x.nama_sales || "Unknown",
                      value: x.kode_sales,
                    })),
                  ]}
                  setOpen={setSalesDropdownOpen}
                  setValue={setSelectedSales}
                  placeholder="Filter Sales..."
                  searchable
                  searchPlaceholder="Cari sales..."
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                  dropDownContainerStyle={styles.dropdownContainer}
                  listItemContainerStyle={styles.dropdownItem}
                  listMode="MODAL"
                  scrollViewProps={{ nestedScrollEnabled: true }}
                  autoScroll
                  closeAfterSelecting={true}
                />
              </View>
            )}
          </View>

          {/* Results Info */}
          {filteredData.length > 0 && (
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsText}>
                Menampilkan {filteredData.length} dari {pagination.total} data
              </Text>
            </View>
          )}

          {/* Main Content */}
          {loading && pagination.page === 1 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Memuat data kompetitor...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              renderItem={renderItem}
              keyExtractor={(item) =>
                item.kode_kompetitor || String(Math.random())
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#667eea"]}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* FAB */}
          <FAB
            icon="plus"
            label="Tambah Kompetitor"
            style={styles.fab}
            onPress={handlCreate}
            animated={true}
          />
        </View>
      </SafeAreaView>
    </>
    // </Portal>
  );
};

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    elevation: 0,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchInput: {
    fontSize: 14,
  },
  filterButton: {
    margin: 0,
  },
  menuContent: {
    borderRadius: 8,
  },
  menuItemActive: {
    color: "#667eea",
    fontWeight: "600",
  },
  filterSection: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  dropdownWrapper: {
    marginBottom: 12,
    zIndex: 1000,
  },
  dropdown: {
    borderColor: "#e9ecef",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownContainer: {
    borderColor: "#e9ecef",
    borderRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e7f3ff",
  },
  resultsText: {
    fontSize: 12,
    color: "#0066cc",
    fontWeight: "500",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itemCard: {
    marginHorizontal: 4,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  customerCode: {
    fontSize: 12,
    color: "#666",
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "400",
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  notesLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 2,
  },
  notesValue: {
    fontSize: 12,
    color: "#333",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  resetFilterChip: {
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    borderRadius: 28,
    backgroundColor: "#667eea",
  },
});

export default DataKompetitorList;
