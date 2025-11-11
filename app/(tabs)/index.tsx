//my-expo-app/app/(tabs)/index.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ShoppingCart,
  DollarSign,
  Package,
  Target,
  TrendingUp,
  Users,
  Calendar,
  UserCheck,
  BarChart3,
  LogOut,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import ProgressBar from "@/components/ProgressBar";
import { getGreeting, getFirstName } from "@/utils/helpers";
import { CustomerList as CustomerListType } from "@/api/interface";
import {
  customerAPI,
  DashboardActivity,
  dashboardAPI,
  salesReportAPI,
} from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, PaperProvider } from "react-native-paper";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Calculate responsive dimensions
const ACTION_ITEM_SIZE = (SCREEN_WIDTH - 40 - 24) / 4;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - 40 - 12) / 2;

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.statCard, { width: STAT_CARD_WIDTH }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[color, `${color}DD`]}
      style={styles.statGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.statHeader}>
        <View style={styles.statIconContainer}>{icon}</View>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

interface QuickActionProps {
  title: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({
  title,
  icon,
  color = "#667eea",
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.quickAction, { width: ACTION_ITEM_SIZE }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
      {icon}
    </View>
    <Text style={styles.quickActionText} numberOfLines={1}>
      {title}
    </Text>
  </TouchableOpacity>
);

interface ActivityItemProps {
  title: string;
  time: string;
  type: "success" | "warning" | "info";
  icon: React.ReactNode;
  amount?: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  title,
  time,
  type,
  icon,
  amount,
}) => (
  <View style={styles.activityItem}>
    <View
      style={[
        styles.activityIcon,
        {
          backgroundColor:
            type === "success"
              ? "#10B98115"
              : type === "warning"
              ? "#F59E0B15"
              : "#3B82F615",
        },
      ]}
    >
      {icon}
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
    {amount && (
      <Text
        style={[
          styles.activityAmount,
          type === "success" && styles.successAmount,
          type === "warning" && styles.warningAmount,
        ]}
      >
        {amount}
      </Text>
    )}
  </View>
);

export default function HomeScreen() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const namaUserSales = user?.namaSales;
  // console.log("namaUserSales indexxxx ", namaUserSales);
  const handleLogout = () => {
    logout();
    router.replace("/login");
  };
  // 🚫 Jangan render apapun jika auth belum selesai
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  // 🚫 Redirect ke login jika tidak ada user
  if (!user) {
    router.replace("/login");
    return null;
  }

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const [customers, setCustomers] = useState<CustomerListType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summarySo, setSummarySo] = useState<any>(null);
  const [activitiesSo, setActivitiesSo] = useState<any[]>([]);
  const [summaryPpi, setSummaryPpi] = useState<any>(null);
  const [activitiesPpi, setActivitiesPpi] = useState<any[]>([]);
  const [summaryRks, setSummaryRks] = useState<any>(null);
  const [activitiesRks, setActivitiesRks] = useState<any[]>([]);
  const [dailyActivities, setDailyActivities] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [tahun, setTahun] = useState(() => String(new Date().getFullYear()));
  const [bulan, setBulan] = useState(() => {
    const month = new Date().getMonth() + 1;
    return month < 10 ? `0${month}` : String(month); // format 01–12
  });
  const [salesFilter, setSalesFilter] = useState("");
  const limit = 50;

  const fetchCustomers = useCallback(
    async (pageNumber = 1, append = false) => {
      if (!user) return;
      console.log("fetchCustomers");
      if (!user?.kodeSales) {
        setError("Data sales tidak ditemukan");
        setLoading(false);
        return;
      }

      try {
        // append ? setLoadingMore(true) : setLoading(true);
        setError(null);

        // ✅ Type assertion untuk handle response dengan benar
        const res = await customerAPI.getCombinedCustomerList(
          // user.kodeSales,
          pageNumber,
          limit
        );
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
        // setLoading(false);
        // setRefreshing(false);
        // setLoadingMore(false);
      }
    },
    [user?.kodeSales]
  );

  const fetchDashboardActivities = useCallback(() => {
    if (!user) return;
    const run = async () => {
      console.log("fetchDashboardActivities");
      setLoading(true);
      try {
        // ✅ Gabungkan semua aktivitas dari 3 sumber
        const allActivities = [
          ...(activitiesSo || []),
          ...(activitiesPpi || []),
          ...(activitiesRks || []),
        ];

        // ✅ Urutkan aktivitas berdasarkan waktu terbaru
        // allActivities.sort((a, b) => b.time.localeCompare(a.time));

        // ✅ Format icon berdasarkan tipe (frontend rendering)
        const formatted = allActivities.map((item: any) => {
          switch (item.type) {
            case "success":
              return {
                ...item,
                icon: <CheckCircle2 color="#10B981" size={16} />,
              };
            case "payment":
              return {
                ...item,
                icon: <DollarSign color="#10B981" size={16} />,
              };
            case "order":
              return {
                ...item,
                icon: <ShoppingCart color="#10B981" size={16} />,
              };
            case "rks":
              return { ...item, icon: <MapPin color="#3B82F6" size={16} /> };
            case "warning":
              return {
                ...item,
                icon: <AlertCircle color="#F59E0B" size={16} />,
              };
            default:
              return {
                ...item,
                icon: <CheckCircle2 color="#9CA3AF" size={16} />,
              };
          }
        });

        setDailyActivities(formatted);
      } catch (err) {
        console.error("❌ Gagal memuat aktivitas dashboard:", err);
        setDailyActivities([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [activitiesSo, activitiesPpi, activitiesRks]);

  // -------------------------------------------------------
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await salesReportAPI.getTargetRealisasiCombined(
        tahun,
        bulan,
        user?.kodeSales
      );
      if (res.success) {
        // console.log("XXXX", res.data[0]);
        // console.log("XXXX", res.data[0].nilai_real);
        setData(res.data || []);
      }
    } catch (err) {
      console.error("Gagal load data:", err);
    } finally {
      setLoading(false);
      // setRefreshing(false);
    }
  };

  const loadDashboardAll = useCallback(() => {
    if (!user) return;
    const run = async () => {
      console.log("loadDashboardAll");
      setLoading(true);

      try {
        const resSo = await dashboardAPI.getDashboardSummarySo();
        if (resSo.success) {
          setSummarySo(resSo.data.summary);
          setActivitiesSo(resSo.data.activities);
        }

        const resPpi = await dashboardAPI.getDashboardSummaryPpi();
        if (resPpi.success) {
          setSummaryPpi(resPpi.data.summary);
          setActivitiesPpi(resPpi.data.activities);
        }

        // ⚠️ sebelumnya salah panggil getDashboardSummaryPpi dua kali
        const resRks = await dashboardAPI.getDashboardSummaryRks?.();
        if (resRks?.success) {
          setSummaryRks(resRks.data.summary);
          setActivitiesRks(resRks.data.activities);
        }

        // ✅ Panggil aktivitas setelah semua data selesai
        await fetchDashboardActivities();
      } catch (err) {
        console.error("❌ loadDashboardAll error:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [fetchDashboardActivities]);

  useEffect(() => {
    if (user) {
      fetchCustomers();
      loadData();
    }
  }, [fetchCustomers, user]);

  useEffect(() => {
    if (user) {
      loadDashboardAll();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardActivities();
    }
  }, [user, activitiesSo, activitiesPpi, activitiesRks]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers(); // Refresh setiap kali focus
      fetchDashboardActivities();
      loadDashboardAll();
    }, [])
  );

  const todayStats = [
    {
      title: "Penjualan Hari Ini",
      value:
        "Rp " +
        (summarySo?.penjualan_hari_ini
          ? summarySo.penjualan_hari_ini.toLocaleString("id-ID")
          : "0"),
      subtitle: (() => {
        const persen =
          typeof summarySo?.persentase_perubahan === "number"
            ? summarySo.persentase_perubahan
            : 0; // ✅ fallback ke 0 jika undefined / null

        const formatted = persen.toFixed(2);

        return persen >= 0
          ? `+${formatted}% dari kemarin`
          : `${formatted}% dari kemarin`;
      })(),
      icon: <TrendingUp color="white" size={20} />,
      color: "#10B981",
      progress: Math.min(
        ((summarySo?.penjualan_hari_ini || 0) / (data?.[0]?.nilai_real || 1)) *
          100,
        100
      ),

      target: `Rp ${(data?.[0]?.nilai_real ?? 0).toLocaleString("id-ID")}`,
      route: "/sales-order",
    },
    {
      title: "Tagihan Tertagih",
      value:
        "Rp " +
        (summaryPpi?.tagihan_tertagih_hari_ini?.toLocaleString("id-ID") || "0"),
      subtitle: (() => {
        const persen = summaryPpi?.persentase_perubahan ?? 0;
        const formatted = persen.toFixed(2);
        return persen >= 0
          ? `+${formatted}% dari kemarin`
          : `${formatted}% dari kemarin`;
      })(),
      icon: <DollarSign color="white" size={20} />,
      color: "#3B82F6",
      progress: Math.min(
        (summaryPpi?.tagihan_tertagih_hari_ini / 18200000) * 100 || 0,
        100
      ),
      target: "Rp 18.200.000",
      route: "/collection",
    },
    {
      title: "Kunjungan Hari Ini",
      value: `${summaryRks?.kunjungan_hari_ini || 0}/${
        summaryRks?.total_kunjungan || 0
      }`,
      subtitle: (() => {
        const persen = summaryRks?.persentase_perubahan ?? 0;
        const formatted = persen.toFixed(2);
        return persen >= 0
          ? `+${formatted}% dari kemarin`
          : `${formatted}% dari kemarin`;
      })(),
      icon: <UserCheck color="white" size={20} />,
      color: "#8B5CF6",
      progress: summaryRks?.progress || 0,
      target: `${summaryRks?.total_kunjungan || 0} kunjungan`,
      route: "/rks",
    },
    {
      title: "Pelanggan Aktif",
      value: total.toString(),
      subtitle: "+2 bulan ini",
      icon: <Users color="white" size={20} />,
      color: "#F59E0B",
      progress: 80,
      target: "30 pelanggan",
      route: "/customers",
    },
  ];

  const quickActions = [
    {
      title: "Absensi",
      icon: <UserCheck color="#10B981" size={20} />,
      color: "#10B981",
      route: "/attendance",
    },
    {
      title: "Pelanggan",
      icon: <Users color="#3B82F6" size={20} />,
      color: "#3B82F6",
      route: "/customers",
    },
    {
      title: "RKS",
      icon: <Target color="#8B5CF6" size={20} />,
      color: "#8B5CF6",
      route: "/rks",
    },
    {
      title: "Pesanan",
      icon: <ShoppingCart color="#EF4444" size={20} />,
      color: "#EF4444",
      route: "/sales-order",
    },
    {
      title: "Tagihan",
      icon: <DollarSign color="#F59E0B" size={20} />,
      color: "#F59E0B",
      route: "/ppi",
    },
    {
      title: "Stok Barang",
      icon: <Package color="#06B6D4" size={20} />,
      color: "#06B6D4",
      route: "/stock",
    },
    {
      title: "Kompetitor",
      icon: <FolderKanban color="#6366F1" size={20} />,
      color: "#6366F1",
      route: "/data-kompetitor",
    },
    {
      title: "Target",
      icon: <BarChart3 color="#EC4899" size={20} />,
      color: "#EC4899",
      route: "/sales-report/target-realisasi",
    },
    {
      title: "Laporan",
      icon: <TrendingUp color="#6366F1" size={20} />,
      color: "#6366F1",
      route: "/reports",
    },
  ];

  // console.log("user?.namaCabang ", user?.namaCabang);
  return (
    <PaperProvider>
      {/* <SafeAreaView style={styles.safeArea}> */}
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* COMPACT FIXED HEADER - DIUBAH LAYOUT */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerMain}>
          {/* Bagian Kiri: Salam dan Nama Pengguna */}
          <View style={styles.headerLeft}>
            {/* <Text style={styles.greeting}>{user?.namaCabang},</Text> */}
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>
              {namaUserSales}
              {/* {user?.namaSales ? getFirstName(user.name) : "Admin"} */}
            </Text>
          </View>

          {/* Bagian Kanan: Logout dan Waktu */}
          <View style={styles.headerRight}>
            {/* Tombol Logout di Posisi Atas Kanan */}
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <LogOut size={16} color="#DC2626" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* Tanggal dan Waktu di Bawah Logout */}
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeRow}>
                <Calendar size={12} color="#667eea" />
                <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
              </View>
              <View style={styles.dateTimeRow}>
                <Clock size={12} color="#667eea" />
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* SCROLLABLE CONTENT - TIDAK BERUBAH */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Grid Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
          <View style={styles.statsGrid}>
            {todayStats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                color={stat.color}
                onPress={() => router.push(stat.route)}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aksi Cepat</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                title={action.title}
                icon={action.icon}
                color={action.color}
                onPress={() => router.push(action.route)}
              />
            ))}
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Harian</Text>
          <View style={styles.progressSection}>
            {todayStats.slice(0, 2).map((stat, index) => (
              <View key={index} style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>{stat.title}</Text>
                  <Text style={styles.progressPercentage}>
                    {stat.progress}%
                  </Text>
                </View>
                <ProgressBar
                  progress={stat.progress}
                  showPercentage={false}
                  progressColor={stat.color}
                  height={6}
                />
                <View style={styles.progressFooter}>
                  <Text style={styles.progressCurrent}>{stat.value}</Text>
                  <Text style={styles.progressTarget}>dari {stat.target}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Aktivitas Harian Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            {/* <TouchableOpacity>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity> */}
          </View>
          <View style={styles.activityCard}>
            {loading ? (
              <ActivityIndicator size="small" color="#667eea" />
            ) : dailyActivities.length > 0 ? (
              dailyActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  title={activity.title}
                  time={activity.time}
                  type={activity.type}
                  icon={activity.icon}
                  amount={activity.amount}
                />
              ))
            ) : (
              <Text
                style={{ color: "#9CA3AF", textAlign: "center", marginTop: 10 }}
              >
                Belum ada aktivitas hari ini.
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      {/* </SafeAreaView> */}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // COMPACT FIXED HEADER - DIUBAH
  fixedHeader: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    justifyContent: "center",
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },

  // HEADER RIGHT - DIUBAH LAYOUT
  headerRight: {
    alignItems: "flex-end",
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 8, // Memberi jarak dengan tanggal di bawahnya
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  dateTimeContainer: {
    alignItems: "flex-end",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#374151",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#374151",
  },

  // SCROLLABLE CONTENT - TIDAK BERUBAH
  scrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // SECTION STYLES - TIDAK BERUBAH
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
  },

  // STATS GRID - TIDAK BERUBAH
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  statGradient: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statSubtitle: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    textAlign: "right",
    maxWidth: 70,
  },
  statValue: {
    fontSize: SCREEN_WIDTH < 375 ? 14 : 15,
    fontWeight: "700",
    color: "white",
    marginTop: 4,
  },
  statTitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginTop: 2,
  },

  // QUICK ACTIONS - TIDAK BERUBAH
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  quickAction: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 8,
    height: 70,
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },

  // PROGRESS SECTION - TIDAK BERUBAH
  progressSection: {
    gap: 12,
  },
  progressCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  progressCurrent: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressTarget: {
    fontSize: 11,
    color: "#6B7280",
  },

  // ACTIVITY SECTION - TIDAK BERUBAH
  activityCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  activityAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  successAmount: {
    color: "#10B981",
  },
  warningAmount: {
    color: "#F59E0B",
  },

  bottomSpacing: {
    height: 20,
  },
});
