import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  RefreshControl,
  StyleSheet,
  PanResponder,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, ActivityIndicator, SegmentedButtons } from "react-native-paper";
import DropDownPicker from "react-native-dropdown-picker";
import { BarChart } from "react-native-chart-kit";
import { Stack } from "expo-router";
import { salesAPI, salesReportAPI } from "@/api/services";
import { useAuth } from "@/contexts/AuthContext";
import * as SecureStore from "expo-secure-store";
import { setStorageItem } from "@/utils/storage";

// --- TIPE DATA ---
interface SalesDetail {
  kode_sales: string;
  nama_sales: string;
}

type SalesDropdownItem = {
  label: string;
  value: string;
};

export default function TargetRealisasiScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<"nilai" | "ton" | "qty">("nilai");

  const isSalesSupervisor = user?.salesRole === "Sales Supervisor";
  const [salesList, setSalesList] = useState<SalesDropdownItem[]>([]);
  const [salesFilter, setSalesFilter] = useState("");
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [tahunOpen, setTahunOpen] = useState(false);
  const [bulanOpen, setBulanOpen] = useState(false);

  const tahunList = Array.from({ length: 5 }, (_, i) => ({
    label: `${2023 + i}`,
    value: `${2023 + i}`,
  }));

  const bulanList = [
    { label: "Januari", value: "1" },
    { label: "Februari", value: "2" },
    { label: "Maret", value: "3" },
    { label: "April", value: "4" },
    { label: "Mei", value: "5" },
    { label: "Juni", value: "6" },
    { label: "Juli", value: "7" },
    { label: "Agustus", value: "8" },
    { label: "September", value: "9" },
    { label: "Oktober", value: "10" },
    { label: "November", value: "11" },
    { label: "Desember", value: "12" },
  ];

  // --- Load Sales List ---
  const loadSalesList = async () => {
    try {
      const res = await salesAPI.getSalesDetail();
      if (res.success && Array.isArray(res.data)) {
        const items: SalesDropdownItem[] = [
          { label: "Semua Sales", value: "" },
          ...res.data.map((item) => ({
            label: item.nama_sales,
            value: item.kode_sales,
          })),
        ];
        setSalesList(items);
      }
    } catch (err) {
      console.error("Error loading sales list:", err);
    }
  };

  useEffect(() => {
    const updateActivity = async () => {
      const now = Date.now();
      // await SecureStore.setItemAsync("last_active", Date.now().toString());
      await setStorageItem("last_active", now.toString());
    };
    updateActivity();
  }, []);

  useEffect(() => {
    if (isSalesSupervisor) loadSalesList();
  }, [isSalesSupervisor]);

  // --- Load Data ---
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await salesReportAPI.getTargetRealisasiCombined(
        tahun,
        bulan,
        salesFilter
      );
      if (res.success) setData(res.data || []);
    } catch (err) {
      console.error("Gagal load data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!salesDropdownOpen && !tahunOpen && !bulanOpen) {
      loadData();
    }
  }, [tahun, bulan, salesFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [tahun, bulan, salesFilter]);

  // --- Swipe Metric dengan PanResponder ---
  const metrics = ["nilai", "ton", "qty"] as const;
  const metricIndex = metrics.indexOf(metric);
  const pan = useState(new Animated.ValueXY())[0];

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 30 && Math.abs(gesture.dy) < 10,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -50 && metricIndex < metrics.length - 1) {
        setMetric(metrics[metricIndex + 1]);
      } else if (gesture.dx > 50 && metricIndex > 0) {
        setMetric(metrics[metricIndex - 1]);
      }
    },
  });

  // --- Keys Dinamis ---
  const keyTarget = useMemo(
    () =>
      metric === "nilai"
        ? "nilai_target"
        : metric === "ton"
        ? "ton_target"
        : "qty_target",
    [metric]
  );
  const keyRealisasi = useMemo(
    () =>
      metric === "nilai"
        ? "nilai_real"
        : metric === "ton"
        ? "ton_real"
        : "qty_real",
    [metric]
  );
  const keyPersen = useMemo(
    () =>
      metric === "nilai"
        ? "persen_nilai"
        : metric === "ton"
        ? "persen_ton"
        : "persen_qty",
    [metric]
  );

  const totalTarget = data.reduce((sum, d) => sum + (d[keyTarget] || 0), 0);
  const totalReal = data.reduce((sum, d) => sum + (d[keyRealisasi] || 0), 0);
  const persen = totalTarget ? (totalReal / totalTarget) * 100 : 0;

  const chartData = {
    labels: data.map((d) => d.nama_sales),
    datasets: [
      { data: data.map((d) => d[keyTarget] || 0), color: () => "#90caf9" },
      { data: data.map((d) => d[keyRealisasi] || 0), color: () => "#4caf50" },
    ],
  };

  const screenWidth = Dimensions.get("window").width - 32;
  const metricLabel =
    metric === "nilai"
      ? "Nilai (Rp)"
      : metric === "ton"
      ? "Tonase (kg)"
      : "Qty (unit)";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Target & Realisasi Penjualan" }} />

      {/* Filter Tahun & Bulan */}
      <View style={styles.filterWrapper}>
        <View style={{ flex: 1, marginRight: 8, zIndex: tahunOpen ? 30 : 10 }}>
          <DropDownPicker
            open={tahunOpen}
            value={tahun}
            items={tahunList}
            setOpen={setTahunOpen}
            setValue={setTahun}
            placeholder="Tahun"
            // listMode="SCROLLVIEW"
            listMode="MODAL"
            scrollViewProps={{ nestedScrollEnabled: true }}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8, zIndex: bulanOpen ? 30 : 20 }}>
          <DropDownPicker
            open={bulanOpen}
            value={bulan}
            items={bulanList}
            setOpen={setBulanOpen}
            setValue={setBulan}
            placeholder="Bulan"
            // listMode="SCROLLVIEW"
            listMode="MODAL"
            scrollViewProps={{ nestedScrollEnabled: true }}
            style={styles.dropdown}
            dropDownContainerStyle={[styles.dropdownList, { zIndex: 3000 }]}
          />
        </View>
      </View>

      {/* Filter Sales */}
      {isSalesSupervisor && salesList.length > 0 && (
        <View
          style={[
            styles.dropdownContainer,
            { zIndex: salesDropdownOpen ? 4000 : 1 },
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
            // listMode="SCROLLVIEW"
            listMode="MODAL"
            scrollViewProps={{ nestedScrollEnabled: true }}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList}
            closeAfterSelecting
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" color="#667eea" />
          <Text style={{ marginTop: 12 }}>Memuat data...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          {...panResponder.panHandlers}
          nestedScrollEnabled={true}
        >
          <View style={styles.metricHeader}>
            <Text style={styles.metricText}>{metricLabel}</Text>
            <Text style={styles.swipeHint}>↔ Geser untuk ganti metrik</Text>
          </View>

          <SegmentedButtons
            style={{ marginHorizontal: 12, marginBottom: 8 }}
            value={metric}
            onValueChange={(v) => setMetric(v as any)}
            buttons={[
              { value: "nilai", label: "Nilai" },
              { value: "ton", label: "Ton" },
              { value: "qty", label: "Qty" },
            ]}
          />

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <SummaryCard label="Target" value={totalTarget} metric={metric} />
            <SummaryCard label="Realisasi" value={totalReal} metric={metric} />
          </View>

          <Card style={[styles.card, { margin: 12 }]}>
            <Card.Content>
              <Text style={styles.label}>Pencapaian Total</Text>
              <Text
                style={[
                  styles.value,
                  { color: persen >= 100 ? "#4caf50" : "#ff9800" },
                ]}
              >
                {persen.toFixed(2)}%
              </Text>
            </Card.Content>
          </Card>

          {/* Chart */}
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <BarChart
              data={chartData}
              width={screenWidth}
              height={260}
              yAxisLabel={metric === "nilai" ? "Rp " : ""}
              yAxisSuffix=""
              fromZero
              chartConfig={{
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                color: () => "#667eea",
                labelColor: () => "#333",
                barPercentage: 0.6,
              }}
              verticalLabelRotation={-45}
              showValuesOnTopOfBars
            />
          </View>

          {/* Detail Per Sales */}
          <View style={{ paddingHorizontal: 12, paddingBottom: 24 }}>
            {data.map((d, idx) => (
              <Card key={idx} style={styles.detailCard}>
                <Card.Content>
                  <View style={styles.detailRow}>
                    <Text style={styles.salesName}>{d.nama_sales}</Text>
                    <Text
                      style={[
                        styles.persenText,
                        {
                          color:
                            (d[keyPersen] || 0) >= 100 ? "#4caf50" : "#ff9800",
                        },
                      ]}
                    >
                      {d[keyPersen]?.toFixed(2)}%
                    </Text>
                  </View>
                  <Text style={styles.detailText}>
                    Target: {formatValue(d[keyTarget], metric)}
                  </Text>
                  <Text style={styles.detailText}>
                    Realisasi: {formatValue(d[keyRealisasi], metric)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- Helper Components ---
const SummaryCard = ({
  label,
  value,
  metric,
}: {
  label: string;
  value: number;
  metric: string;
}) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatValue(value, metric)}</Text>
    </Card.Content>
  </Card>
);

const formatValue = (val: number, metric: string) => {
  if (metric === "nilai") return `Rp ${val.toLocaleString()}`;
  return val.toLocaleString();
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  filterWrapper: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
  },
  dropdownContainer: {
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  dropdown: {
    borderColor: "#cbd5e1",
    borderRadius: 12,
    height: 48,
    backgroundColor: "#fff",
  },
  dropdownList: {
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#fff",
    zIndex: 9999,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  metricHeader: { alignItems: "center", marginTop: 12, marginBottom: 8 },
  metricText: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  swipeHint: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 10,
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "#fff",
    elevation: 2,
  },
  label: { fontSize: 12, color: "#64748b" },
  value: { fontSize: 16, fontWeight: "700", marginTop: 4, color: "#1e293b" },
  detailCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  salesName: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  persenText: { fontWeight: "bold", fontSize: 14 },
  detailText: { fontSize: 13, color: "#475569" },
});
