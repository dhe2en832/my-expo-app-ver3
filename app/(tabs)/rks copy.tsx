// myExpoApp/app/(tabs)/rks.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
// import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useWindowDimensions } from "react-native";
// --- API & Interfaces ---
import { rksAPI, customerAPI } from "../../api/services";
import { RKSList, MobileRKS } from "../../api/interface";
import { useAuth } from "../../contexts/AuthContext";
import { useOfflineQueue } from "../../contexts/OfflineContext";
// --- Database lokal ---
import {
  insertRKSLocal,
  updateRKSLocal,
  getPendingRKSLocal,
  getAllLocalRKS, // ✅ Ganti dengan ini
} from "../../utils/database";
import { getLocationWithRetry } from "@/utils/location";
import * as Notifications from "expo-notifications";

// ✅ Tipe item untuk tampilan
type RKSItem = {
  id: string;
  kode_rks: string;
  kode_cust: string;
  no_cust?: string;
  customerName: string;
  customerAddress: string;
  scheduledDate: string;
  status: "scheduled" | "checked-in" | "completed";
  checkIn?: MobileRKS;
  checkOut?: MobileRKS;
  fasmap?: { latitude: string; longitude: string };
  radius?: number;
};

type RangeKey = "today" | "week" | "month";
type CustomDate = { month: number; year: number };

export default function RKSPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToQueue } = useOfflineQueue();
  const layout = useWindowDimensions();
  const [rksList, setRksList] = useState<RKSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState<string | null>(null); // ✅ NEW
  // Di dalam component RKSPage, tambahkan state:
  const [gpsStatus, setGpsStatus] = useState<"searching" | "ready" | "error">(
    "searching"
  );
  // --- Tab State ---
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "today", title: "Hari ini" },
    { key: "week", title: "Minggu ini" },
    { key: "month", title: "Bulan ini" },
  ]);
  const tabToRange: Record<number, RangeKey> = {
    0: "today",
    1: "week",
    2: "month",
  };
  const [range, setRange] = useState<RangeKey>("today");
  const [customDate, setCustomDate] = useState<CustomDate | null>(null);

  // --- FAB State ---
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useState(new Animated.Value(0))[0];
  const tooltipAnim = useState(new Animated.Value(0))[0];
  const pan = useState(new Animated.ValueXY({ x: 0, y: 0 }))[0];

  // --- Modal State ---
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Di dalam component RKSPage, tambahkan function:
  const checkGPSStatus = async () => {
    try {
      const status = await Location.getProviderStatusAsync();
      console.log("📡 GPS Status:", status);

      if (status.locationServicesEnabled && status.gpsAvailable) {
        setGpsStatus("ready");
      } else if (status.locationServicesEnabled && !status.gpsAvailable) {
        setGpsStatus("searching");
      } else {
        setGpsStatus("error");
      }
    } catch (error) {
      console.error("Error checking GPS status:", error);
      setGpsStatus("error");
    }
  };

  // Di dalam component RKSPage, tambahkan useEffect:
  useEffect(() => {
    checkGPSStatus(); // Cek sekali saat component mount

    // Cek status GPS setiap 5 detik
    const interval = setInterval(checkGPSStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRange(tabToRange[index]);
    if (index !== 2) setCustomDate(null);
  }, [index]);

  const loadRKS = async () => {
    if (!user?.kodeSales) return;
    console.log("🚀 Mulai loadRKS...");
    setLoading(true);
    try {
      // 1. Ambil data master dari server
      const listRes = await rksAPI.getRKSList(user.kodeSales);
      // console.log("✅ getRKSList response:", listRes);
      if (!listRes.success) {
        console.log("❌ Gagal ambil data");
        setRksList([]);
        return;
      }

      // ✅ Normalisasi data ke array
      const rawData = listRes.data;
      let rksArray: RKSList[] = [];
      if (Array.isArray(rawData)) {
        rksArray = rawData;
      } else if (rawData && typeof rawData === "object") {
        rksArray = [rawData];
      }

      if (rksArray.length === 0) {
        console.log("ℹ️ Tidak ada data RKS");
        setRksList([]);
        return;
      }

      // 2. Ambil semua kunjungan lokal (termasuk check-in/check-out offline)
      const localVisits = await getAllLocalRKS(); // ✅ pastikan fungsi ini ada
      console.log("📁 Local visits:", localVisits);
      // 3. Gabungkan & tentukan status
      const items: RKSItem[] = rksArray.map((item) => {
        const scheduledDate = item.rks_tanggal.split(" ")[0]; // '2025-10-11'

        const localMatch = localVisits.find(
          (r) =>
            r.kode_rks === item.rks_kode_rks &&
            r.kode_cust === item.detail_kode_cust
        );

        if (localMatch) {
          return {
            id: localMatch.id,
            kode_rks: item.rks_kode_rks,
            kode_cust: item.detail_kode_cust,
            no_cust: item.no_cust,
            customerName: item.nama_cust,
            customerAddress: item.alamat || "Alamat tidak tersedia",
            scheduledDate,
            status: localMatch.checkout_time ? "completed" : "checked-in",
            checkIn: localMatch,
            checkOut: localMatch.checkout_time ? localMatch : undefined,
            fasmap: undefined,
            radius: 150,
          };
        }

        // Status dari server: kunjung='Y' → completed, else scheduled
        const status = item.kunjung === "Y" ? "completed" : "scheduled";

        return {
          id: `master_${item.detail_rowid}_${item.rks_kode_rks}_${item.detail_kode_cust}`,
          kode_rks: item.rks_kode_rks,
          kode_cust: item.detail_kode_cust,
          no_cust: item.no_cust,
          customerName: item.nama_cust,
          customerAddress: item.alamat || "Alamat tidak tersedia",
          scheduledDate,
          status,
          fasmap: undefined,
          radius: 150,
        };
      });

      console.log("✅ Items siap tampil:", items.length);
      setRksList(items);
    } catch (err) {
      console.error("Error loading RKS:", err);
      setRksList([]);
    } finally {
      setLoading(false);
      console.log("⏹️ loadRKS selesai");
    }
  };

  const isAnyCheckedIn = rksList.some((r) => r.checkIn && !r.checkOut);

  const filterByRange = useCallback(
    (list: RKSItem[]) => {
      const now = new Date();
      const safeParseDate = (str: string): Date => {
        if (!str) return new Date(NaN);
        return new Date(str);
      };

      if (customDate) {
        return list.filter((r) => {
          const d = safeParseDate(r.scheduledDate);
          return (
            !isNaN(d.getTime()) &&
            d.getMonth() === customDate.month &&
            d.getFullYear() === customDate.year
          );
        });
      }

      if (range === "today") {
        const todayStr = now.toISOString().split("T")[0];
        return list.filter((r) => {
          const d = safeParseDate(r.scheduledDate);
          return (
            !isNaN(d.getTime()) && d.toISOString().split("T")[0] === todayStr
          );
        });
      }

      if (range === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return list.filter((r) => {
          const d = safeParseDate(r.scheduledDate);
          return !isNaN(d.getTime()) && d >= start && d <= end;
        });
      }

      return list.filter((r) => {
        const d = safeParseDate(r.scheduledDate);
        return (
          !isNaN(d.getTime()) &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    },
    [range, customDate]
  );

  // --- FAB Animation (nonaktif untuk sekarang, karena fokus RKS terjadwal) ---
  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    if (!fabOpen) {
      Animated.spring(fabAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    } else {
      Animated.spring(fabAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }
    setFabOpen(!fabOpen);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => pan.extractOffset(),
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => pan.flattenOffset(),
  });

  // --- Selfie ---
  const takeStorePhoto = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        // Alert.alert("Izin Kamera", "Izin kamera diperlukan.");
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📷 Izin Kamera",
            body: "Izin kamera diperlukan.",
            sound: true, // ✅ Mainkan sound
            // data: { screen: 'rks' }, // Optional data
          },
          trigger: null, // Tampilkan segera
        });
        return null;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        cameraType: ImagePicker.CameraType.front,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        if (asset.base64 && asset.base64.length > 100) {
          return `image/jpeg;base64,${asset.base64}`;
        }
        if (asset.uri) {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: "base64",
          });
          if (base64 && base64.length > 100) {
            return `image/jpeg;base64,${base64}`;
          }
        }
      }
      return null;
    } catch (err) {
      console.error("Store photo error:", err);
      Alert.alert("Error", "Gagal mengambil foto.");
      return null;
    }
  };

  // --- Check-in Logic ---
  const handleCheckIn = async (item: RKSItem) => {
    if (!user?.id) {
      Alert.alert("Error", "User tidak dikenali.");
      return;
    }
    setCheckingInId(item.id);
    setGettingLocation(item.id); // ✅ Tampilkan loading location

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Aplikasi membutuhkan akses lokasi untuk check-in. Silakan aktifkan izin lokasi di pengaturan device."
        );
        return;
      }

      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        Alert.alert(
          "Lokasi Dimatikan",
          "Silakan aktifkan GPS/lokasi di device Anda untuk melakukan check-in.",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Buka Pengaturan",
              onPress: () => Location.enableNetworkProviderAsync(),
            },
          ]
        );
        return;
      }

      // ✅ Dapatkan lokasi dengan retry function
      let loc;
      try {
        loc = await getLocationWithRetry(2); // 2x retry
      } catch (locationError) {
        console.error("Location error:", locationError);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📍 Lokasi Tidak Ditemukan",
            body: "Tidak dapat mendapatkan lokasi saat ini. Pastikan GPS aktif, terhubung internet, dan tidak berada dalam gedung.",
            sound: "new-notification.mp3", // ✅ Custom sound
          },
          trigger: null,
        });
        return;
      }

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const acc = loc.coords.accuracy ?? 999;
      console.log("📍 Lokasi didapat:", { lat, lon, accuracy: acc });

      // ✅ Sembunyikan loading location sebelum ambil foto
      setGettingLocation(null);

      const photo = await takeStorePhoto();
      if (!photo) {
        Alert.alert("Foto Diperlukan", "Foto toko diperlukan untuk check-in.");
        return;
      }

      const createRes = await rksAPI.createMobileRKS({
        kode_rks: item.kode_rks,
        kode_cust: item.kode_cust,
        userid: user.id,
        kode_sales: user.kodeSales,
        checkin_time: new Date().toISOString(),
        latitude_in: lat.toString(),
        longitude_in: lon.toString(),
        accuracy_in: acc,
        photo_in: photo,
        status: "pending",
      });

      if (!createRes.success || !createRes.data?.id) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Error Check-in",
            body: "Gagal membuat kunjungan",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        return;
      }

      const newCheckIn = createRes.data;
      await insertRKSLocal(newCheckIn);

      const updatedItem: RKSItem = {
        ...item,
        id: newCheckIn.id,
        status: "checked-in",
        checkIn: newCheckIn,
        fasmap: { latitude: lat.toString(), longitude: lon.toString() },
      };

      setRksList((prev) =>
        prev.map((x) => (x.id === item.id ? updatedItem : x))
      );

      addToQueue("rks_checkin");

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Check In Berhasil",
          body: "Kunjungan telah dimulai.",
          sound: "new-notification.mp3",
        },
        trigger: null,
      });
    } catch (err: any) {
      console.error("Check-in error:", err);

      if (
        err.message.includes("location") ||
        err.message.includes("Location") ||
        err.message.includes("Timeout")
      ) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📍 Lokasi Tidak Ditemukan",
            body: "Tidak dapat mengakses lokasi device. Pastikan GPS aktif, izin lokasi diberikan, dan coba di area terbuka.",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Gagal Check-in",
            body: "Gagal melakukan check-in: " + err.message,
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
      }
    } finally {
      setCheckingInId(null);
      setGettingLocation(null); // ✅ PASTIKAN loading dimatikan
    }
  };

  const handleCheckOut = async (item: RKSItem) => {
    if (!item.checkIn) return;
    setIsLoading(true);
    setGettingLocation(item.id); // ✅ Tampilkan loading location

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Aplikasi membutuhkan akses lokasi untuk check-out. Silakan aktifkan izin lokasi di pengaturan device."
        );
        return;
      }

      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        Alert.alert(
          "Lokasi Dimatikan",
          "Silakan aktifkan GPS/lokasi di device Anda untuk melakukan check-out.",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Buka Pengaturan",
              onPress: () => Location.enableNetworkProviderAsync(),
            },
          ]
        );
        return;
      }

      // ✅ Dapatkan lokasi dengan retry function
      let loc;
      try {
        loc = await getLocationWithRetry(2); // 2x retry
      } catch (locationError) {
        console.error("Location error:", locationError);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📍 Lokasi Tidak Ditemukan",
            body: "Tidak dapat mendapatkan lokasi saat ini. Pastikan GPS aktif, terhubung internet, dan tidak berada dalam gedung.",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        return;
      }

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const acc = loc.coords.accuracy ?? 999;
      console.log("📍 Lokasi checkout didapat:", { lat, lon, accuracy: acc });

      // ✅ Sembunyikan loading location sebelum ambil foto
      setGettingLocation(null);

      const checkout_time = new Date().toISOString();
      const checkInTime = new Date(item.checkIn.checkin_time);
      const duration = Math.round(
        (new Date(checkout_time).getTime() - checkInTime.getTime()) / 60000
      );

      const photo = await takeStorePhoto();
      if (!photo) return;

      const checkoutRes = await rksAPI.updateMobileRKS(item.id, {
        checkout_time,
        latitude_out: lat.toString(),
        longitude_out: lon.toString(),
        accuracy_out: acc,
        photo_out: photo,
        status: "pending",
      });

      if (!checkoutRes.success || !checkoutRes.data) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Gagal Check-out",
            body: "Gagal melakukan check-out",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        return;
      }

      const updatedCheckOut: MobileRKS = {
        ...item.checkIn,
        ...checkoutRes.data,
        id: item.id,
        checkout_time,
        latitude_out: lat.toString(),
        longitude_out: lon.toString(),
        accuracy_out: acc,
        duration,
        status: "pending",
      };

      await updateRKSLocal(item.id, updatedCheckOut);

      const updatedItem: RKSItem = {
        ...item,
        status: "completed",
        checkOut: updatedCheckOut,
      };

      setRksList((prev) =>
        prev.map((x) => (x.id === item.id ? updatedItem : x))
      );

      addToQueue("rks_checkout");

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Check Out Berhasil",
          body: "Kunjungan selesai.",
          sound: "new-notification.mp3",
        },
        trigger: null,
      });
    } catch (err: any) {
      console.error("Check-out error:", err);

      if (
        err.message.includes("location") ||
        err.message.includes("Location") ||
        err.message.includes("Timeout")
      ) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📍 Gagal Mendapatkan Lokasi",
            body: "Tidak dapat mengakses lokasi device. Pastikan GPS aktif, izin lokasi diberikan, dan coba di area terbuka.",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Gagal Check-out",
            body: "Gagal melakukan check-out: " + err.message,
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
      }
    } finally {
      setIsLoading(false);
      setGettingLocation(null); // ✅ PASTIKAN loading dimatikan
    }
  };

  const renderItem = ({ item }: { item: RKSItem }) => {
    const isToday =
      item.scheduledDate === new Date().toISOString().split("T")[0];
    const canCheckIn = item.status === "scheduled" && isToday;
    const canCheckOut = item.status === "checked-in";
    const isAnotherCheckedIn = rksList.some(
      (r) => r.checkIn && !r.checkOut && r.id !== item.id
    );
    const isGettingLocation = gettingLocation === item.id;
    let statusText = "";
    let statusColor = "#666";
    if (item.status === "completed") {
      statusText = "Selesai";
      statusColor = "#4CAF50";
    } else if (item.status === "checked-in") {
      statusText = "Berlangsung";
      statusColor = "#ff9800";
    } else {
      statusText = "Terjadwal";
    }

    return (
      <View style={styles.card}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#555", fontSize: 13, fontWeight: "600" }}>
            {new Intl.DateTimeFormat("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(item.scheduledDate))}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{statusText}</Text>
          </View>
        </View>
        <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          No. Cust : {item.no_cust}
        </Text>
        <Text style={styles.title}>{item.customerName}</Text>
        <Text style={{ color: "#666", marginTop: 6 }}>
          {item.customerAddress}
        </Text>
        {item.checkIn?.duration != null && (
          <Text
            style={{
              color: "#666",
              marginTop: 4,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Durasi: {item.checkIn.duration} menit
          </Text>
        )}
        {/* ✅ LOADING ANIMATION UNTUK LOKASI */}
        {isGettingLocation && (
          <View style={styles.locationLoadingContainer}>
            <ActivityIndicator size="small" color="#667eea" />
            <Text style={styles.locationLoadingText}>
              Mendapatkan lokasi GPS...{" "}
              {gpsStatus === "searching" && "(Mencari sinyal)"}
            </Text>
          </View>
        )}
        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {canCheckIn && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (checkingInId !== null || isAnotherCheckedIn) && {
                  opacity: 0.5,
                },
              ]}
              onPress={() => handleCheckIn(item)}
              disabled={checkingInId !== null || isAnotherCheckedIn}
            >
              {checkingInId === item.id ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                    Sedang proses...
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Check In</Text>
              )}
            </TouchableOpacity>
          )}
          {canCheckOut && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#f44336" }]}
                onPress={() => handleCheckOut(item)}
              >
                <MaterialIcons name="logout" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>
                  Check Out
                </Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === "completed" && (
            <View style={[styles.disabledButton]}>
              <Text style={{ color: "#444" }}>Selesai</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const SceneList = () => {
    const filtered = filterByRange(rksList);
    if (loading) {
      return (
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      );
    }
    if (filtered.length === 0) {
      const emptyMessage = customDate
        ? `Tidak ada RKS pada ${customDate.year}/${customDate.month + 1}.`
        : "Tidak ada RKS pada rentang ini.";
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ color: "#999" }}>{emptyMessage}</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />
    );
  };

  const renderScene = SceneMap({
    today: SceneList,
    week: SceneList,
    month: SceneList,
  });

  const renderTabBar = (props: any) => (
    <View>
      <TabBar
        {...props}
        indicatorStyle={{ backgroundColor: "#667eea", height: 3 }}
        style={styles.tabBar}
        labelStyle={styles.tabLabel}
        activeColor="#667eea"
        inactiveColor="#666"
        pressColor="#f0f0f0"
        renderLabel={({
          route,
          focused,
        }: {
          route: { key: string; title: string };
          focused: boolean;
        }) => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[styles.tabLabel, { color: focused ? "#667eea" : "#666" }]}
            >
              {route.title}
            </Text>
            {route.key === "today" && (
              <View style={styles.smallBadge}>
                <Text style={styles.badgeText}>Hari ini</Text>
              </View>
            )}
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.customFilterButton}
        onPress={() => setCalendarVisible(true)}
      >
        <MaterialIcons
          name="calendar-today"
          size={18}
          color={customDate ? "#fff" : "#667eea"}
        />
        <Text
          style={[styles.customFilterText, customDate && { color: "#fff" }]}
        >
          {customDate
            ? `Filter: ${customDate.month + 1}/${customDate.year}`
            : "Filter Bulan/Tahun"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const CalendarModal = () => {
    const today = new Date();
    const [tempMonth, setTempMonth] = useState(
      customDate?.month ?? today.getMonth()
    );
    const [tempYear, setTempYear] = useState(
      customDate?.year ?? today.getFullYear()
    );
    const handleSave = () => {
      setCustomDate({ month: tempMonth, year: tempYear });
      setCalendarVisible(false);
      setIndex(2);
    };
    const handleClear = () => {
      setCustomDate(null);
      setCalendarVisible(false);
      setIndex(0);
    };
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const years = Array.from(
      { length: 11 },
      (_, i) => today.getFullYear() - 5 + i
    );
    return (
      <Modal visible={calendarVisible} animationType="fade" transparent={true}>
        <View style={styles.centeredView}>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 10,
              padding: 20,
              width: "90%",
            }}
          >
            <Text style={styles.modalTitle}>Pilih Bulan & Tahun</Text>
            <View style={{ marginVertical: 10 }}>
              <Text style={{ marginBottom: 6, fontWeight: "600" }}>Bulan:</Text>
              <View style={styles.pickerContainer}>
                {months.map((month, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.pickerItem,
                      tempMonth === idx && styles.pickerItemSelected,
                    ]}
                    onPress={() => setTempMonth(idx)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        tempMonth === idx && styles.pickerItemTextSelected,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ marginVertical: 10 }}>
              <Text style={{ marginBottom: 6, fontWeight: "600" }}>Tahun:</Text>
              <View style={styles.pickerContainer}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      tempYear === year && styles.pickerItemSelected,
                    ]}
                    onPress={() => setTempYear(year)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        tempYear === year && styles.pickerItemTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.btnSecondary,
                  { flex: 0, paddingHorizontal: 12 },
                ]}
                onPress={handleClear}
              >
                <Text style={{ color: "#333" }}>Hapus Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 0, paddingHorizontal: 12 }]}
                onPress={handleSave}
              >
                <Text style={styles.btnPrimaryText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // const useFocusEffect = (callback: () => void) => {
  //   useEffect(() => {
  //     const onFocus = () => callback();
  //     onFocus();
  //   }, [user?.kodeSales]);
  // };

  // useFocusEffect(() => {
  //   console.log("RKSPage focused, reloading RKS...");
  //   loadRKS();
  // });

  useFocusEffect(
    React.useCallback(() => {
      console.log("RKSPage focused, reloading RKS...");
      if (user?.kodeSales) {
        console.log("ADA KODE SALES...");
        loadRKS();
      } else {
        console.log("TIDAK ADA KODE SALES...");
        setRksList([]);
        setLoading(false);
      }
    }, [user?.kodeSales])
  );

  if (loading && rksList.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ GPS STATUS INDICATOR */}
      <View
        style={[
          styles.gpsStatusContainer,
          {
            backgroundColor:
              gpsStatus === "ready"
                ? "#e8f5e8"
                : gpsStatus === "searching"
                ? "#fff3cd"
                : "#fdecea",
          },
        ]}
      >
        <View
          style={[
            styles.gpsStatusDot,
            {
              backgroundColor:
                gpsStatus === "ready"
                  ? "#4CAF50"
                  : gpsStatus === "searching"
                  ? "#FF9800"
                  : "#F44336",
            },
          ]}
        />
        <Text style={styles.gpsStatusText}>
          GPS:{" "}
          {gpsStatus === "ready"
            ? "Siap"
            : gpsStatus === "searching"
            ? "Mencari sinyal..."
            : "Tidak tersedia"}
        </Text>
        {gpsStatus === "error" && (
          <TouchableOpacity
            style={styles.gpsRetryButton}
            onPress={checkGPSStatus}
          >
            <MaterialIcons name="refresh" size={16} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={(i) => setIndex(i)}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />
      <CalendarModal />
      {/* FAB sementara disembunyikan karena fokus RKS terjadwal */}
      {/* <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.fabMain}
          onPress={toggleFab}
          disabled={isAnyCheckedIn}
        >
          <MaterialIcons
            name={fabOpen ? "close" : "add"}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      </Animated.View> */}
      {isLoading && (
        <View style={styles.overlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={{ marginTop: 10 }}>Memproses...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    marginVertical: 8,
    borderRadius: 10,
    marginHorizontal: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "700" },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  smallBadge: {
    backgroundColor: "#f44336",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    includeFontPadding: false,
  },
  tabBar: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tabLabel: {
    fontWeight: "600",
    fontSize: 16,
  },
  customFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f0f4ff",
  },
  customFilterText: { marginLeft: 8, color: "#667eea", fontWeight: "600" },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#4CAF50",
    padding: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    marginBottom: 8,
  },
  actionButtonText: { color: "white", fontWeight: "700", fontSize: 12 },
  disabledButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    alignItems: "center",
  },
  fabMain: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 4,
  },
  pickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 2,
    borderRadius: 6,
    backgroundColor: "#f5f7fb",
  },
  pickerItemSelected: { backgroundColor: "#667eea" },
  pickerItemText: { fontSize: 14, color: "#333" },
  pickerItemTextSelected: { color: "#fff", fontWeight: "600" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  btnPrimary: {
    backgroundColor: "#667eea",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginLeft: 8,
  },
  btnPrimaryText: { color: "white", fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginRight: 8,
  },
  // ✅ GPS STATUS STYLES
  gpsStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  gpsStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  gpsStatusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  gpsRetryButton: {
    padding: 4,
  },

  // ✅ LOCATION LOADING STYLES
  locationLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f4ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  locationLoadingText: {
    marginLeft: 8,
    color: "#667eea",
    fontSize: 12,
    fontWeight: "600",
  },
});
