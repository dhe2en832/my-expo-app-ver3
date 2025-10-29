import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import { Card, ActivityIndicator, ProgressBar } from "react-native-paper";
import { StockItemGrouped } from "@/api/interface";
import { dataBarangAPI } from "@/api/services";
import { Stack } from "expo-router";
import { formatNumber } from "@/utils/helpers";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function StockListScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [data, setData] = useState<StockItemGrouped[]>([]);
  const [filtered, setFiltered] = useState<StockItemGrouped[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // dropdown filters
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);

  // summary
  const [totalItems, setTotalItems] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [totalGudang, setTotalGudang] = useState(0);

  // THEME colors
  const bgColor = isDark ? "#121212" : "#f5f7fb";
  const cardColor = isDark ? "#1e1e1e" : "#fff";
  const textColor = isDark ? "#e5e5e5" : "#333";
  const subText = isDark ? "#aaa" : "#777";

  // 🔹 Load data
  const loadStockData = async (reset = false) => {
    if (reset) setPage(1);
    const currentPage = reset ? 1 : page;
    const res = await dataBarangAPI.getStockGrouped(
      "combined",
      currentPage,
      50
    );
    const stockData: StockItemGrouped[] = res.data ?? [];

    if (res.success) {
      const newData = reset ? stockData : [...data, ...stockData];
      setData(newData);
      setFiltered(newData);
      calculateSummary(newData);

      const cats = Array.from(new Set(newData.map((i) => i.kategori))).filter(
        Boolean
      );
      const whs = Array.from(
        new Set(newData.flatMap((i) => i.gudang_list.map((g) => g.nama_gudang)))
      ).filter(Boolean);

      setCategoryList(cats.map((c) => ({ label: c, value: c })));
      setWarehouseList(whs.map((g) => ({ label: g, value: g })));

      // pagination state
      setHasMore(stockData.length >= 50);
      setPage(currentPage + 1);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const calculateSummary = (items: StockItemGrouped[]) => {
    const totalItemsCount = items.length;
    const totalStok = items.reduce((sum, i) => sum + (i.stok_total || 0), 0);
    const totalGudangCount = new Set(
      items.flatMap((i) => i.gudang_list.map((g) => g.nama_gudang))
    ).size;

    setTotalItems(totalItemsCount);
    setTotalStock(totalStok);
    setTotalGudang(totalGudangCount);
  };

  useEffect(() => {
    loadStockData(true);
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    const q = text.toLowerCase();
    const filteredData = data.filter(
      (item) =>
        item.nama_item.toLowerCase().includes(q) ||
        item.no_item.toLowerCase().includes(q)
    );
    setFiltered(filteredData);
    calculateSummary(filteredData);
  };

  const handleFilter = () => {
    let filteredData = data;
    if (category)
      filteredData = filteredData.filter((item) => item.kategori === category);
    if (warehouse)
      filteredData = filteredData.filter((item) =>
        item.gudang_list.some((g) => g.nama_gudang === warehouse)
      );
    setFiltered(filteredData);
    calculateSummary(filteredData);
  };

  useEffect(() => {
    handleFilter();
  }, [category, warehouse]);

  const toggleExpand = (kode: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === kode ? null : kode);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStockData(true);
  }, []);

  const loadMore = () => {
    if (hasMore && !loading) {
      loadStockData(false);
    }
  };

  const SummaryCard = ({ icon, label, value, color, progress }: any) => (
    <Card style={[styles.summaryCard, { backgroundColor: cardColor }]}>
      <Card.Content style={styles.summaryContent}>
        <MaterialIcons name={icon} size={20} color={color} />
        <Text style={[styles.summaryLabel, { color: subText }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color }]}>
          {formatNumber(value)}
        </Text>
        <ProgressBar
          progress={progress}
          color={color}
          style={{ height: 5, borderRadius: 4, marginTop: 6 }}
        />
      </Card.Content>
    </Card>
  );

  const renderItem = ({ item }: { item: StockItemGrouped }) => {
    const isOpen = expanded === item.kode_item;
    return (
      <Card
        style={[
          styles.card,
          { backgroundColor: cardColor, borderColor: isDark ? "#333" : "#eee" },
        ]}
      >
        <TouchableOpacity onPress={() => toggleExpand(item.kode_item)}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: textColor }]}>
                {item.nama_item}
              </Text>
              <Text style={[styles.itemCode, { color: subText }]}>
                {item.no_item}
              </Text>
            </View>
            <View style={styles.rightInfo}>
              <Text style={[styles.stockText, { color: "#667eea" }]}>
                {item.stok_total} {item.satuan}
              </Text>
              <MaterialIcons
                name={isOpen ? "expand-less" : "expand-more"}
                size={22}
                color={subText}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.expandSection}>
            {item.gudang_list.length > 0 ? (
              item.gudang_list.map((g) => (
                <View key={g.kode_gudang} style={styles.gudangRow}>
                  <MaterialIcons name="warehouse" size={16} color="#667eea" />
                  <Text style={[styles.gudangName, { color: textColor }]}>
                    {g.nama_gudang}
                  </Text>
                  <Text style={[styles.gudangStock, { color: textColor }]}>
                    {g.stok_gudang}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyGudang, { color: subText }]}>
                Tidak ada data gudang
              </Text>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen
        options={{
          title: "Data Barang",
          //   headerRight: () => (
          //     <TouchableOpacity
          //       style={styles.headerButton}
          //       //   onPress={handleCreatePPI}
          //     >
          //       <MaterialIcons name="add" size={24} color="#667eea" />
          //     </TouchableOpacity>
          //   ),
        }}
      />
      {/* Summary */}
      <View style={styles.summaryRow}>
        <SummaryCard
          icon="inventory"
          label="Total Item"
          value={totalItems}
          color="#667eea"
          progress={Math.min(totalItems / 500, 1)}
        />
        <SummaryCard
          icon="stacked-bar-chart"
          label="Total Stok"
          value={totalStock}
          color="#4CAF50"
          progress={Math.min(totalStock / 10000, 1)}
        />
        <SummaryCard
          icon="warehouse"
          label="Gudang Aktif"
          value={totalGudang}
          color="#FF9800"
          progress={Math.min(totalGudang / 20, 1)}
        />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: cardColor }]}>
        <MaterialIcons name="search" size={20} color={subText} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Cari nama atau kode barang..."
          placeholderTextColor={subText}
          value={search}
          onChangeText={handleSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <MaterialIcons name="close" size={20} color={subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <DropDownPicker
          open={categoryOpen}
          value={category}
          items={categoryList}
          setOpen={setCategoryOpen}
          setValue={setCategory}
          placeholder="Kategori"
          containerStyle={{ flex: 1, marginRight: 6 }}
          style={[
            styles.dropdown,
            { backgroundColor: cardColor, borderColor: subText },
          ]}
          dropDownContainerStyle={{
            backgroundColor: cardColor,
            borderColor: subText,
          }}
          // listMode="SCROLLVIEW"
          listMode="MODAL"
        />
        <DropDownPicker
          open={warehouseOpen}
          value={warehouse}
          items={warehouseList}
          setOpen={setWarehouseOpen}
          setValue={setWarehouse}
          placeholder="Gudang"
          containerStyle={{ flex: 1, marginLeft: 6 }}
          style={[
            styles.dropdown,
            { backgroundColor: cardColor, borderColor: subText },
          ]}
          dropDownContainerStyle={{
            backgroundColor: cardColor,
            borderColor: subText,
          }}
          // listMode="SCROLLVIEW"
          listMode="MODAL"
        />
      </View>

      {/* List */}
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={{ color: subText }}>Memuat stok barang...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.kode_item}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#667eea"]}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={{ color: subText }}>Memuat data tambahan...</Text>
              </View>
            ) : (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ color: subText }}>Semua data sudah dimuat</Text>
              </View>
            )
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: {
    padding: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 10,
    elevation: 1,
  },
  summaryContent: {
    alignItems: "center",
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 12,
    borderRadius: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 4,
    zIndex: 999,
  },
  dropdown: {
    borderRadius: 8,
    height: 40,
  },
  card: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  itemName: { fontSize: 14, fontWeight: "bold" },
  itemCode: { fontSize: 12 },
  rightInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockText: { fontSize: 13, fontWeight: "bold" },
  expandSection: { marginTop: 8, borderTopWidth: 1, paddingTop: 8 },
  gudangRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  gudangName: { flex: 1, marginLeft: 6, fontSize: 13 },
  gudangStock: { fontWeight: "bold", fontSize: 13 },
  emptyGudang: { fontSize: 12, textAlign: "center", marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
