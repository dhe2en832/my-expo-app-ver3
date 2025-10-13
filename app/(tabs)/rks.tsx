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
  Button,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useWindowDimensions } from "react-native";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
// --- API & Interfaces ---
import { rksAPI, customerAPI, fasmapAPI, salesAPI } from "../../api/services";
import { RKSList, MobileRKS } from "../../api/interface";
import { useAuth } from "../../contexts/AuthContext";
import { useOfflineQueue } from "../../contexts/OfflineContext";
// --- Database lokal ---
import {
  insertRKSLocal,
  updateRKSLocal,
  getPendingRKSLocal,
  getAllLocalRKS,
} from "../../utils/database";
import { getLocationWithRetry } from "@/utils/location";
import * as Notifications from "expo-notifications";
import { calculateDistance } from "@/utils/helpers";

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
  namaSales?: string;
  rowid?: number;
};

type RangeKey = "today" | "week" | "month";
type CustomDate = { month: number; year: number };

// ✅ Simple Map Component tanpa react-native-maps
const SimpleLocationMap = ({
  latitude,
  longitude,
  style,
}: {
  latitude: number;
  longitude: number;
  style?: any;
}) => {
  const openInMaps = () => {
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error opening maps:", err)
    );
  };

  return (
    <TouchableOpacity
      style={[styles.simpleMapContainer, style]}
      onPress={openInMaps}
    >
      <View style={styles.simpleMap}>
        <Text style={styles.simpleMapText}>
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
        <Text style={styles.simpleMapSubtext}>
          Tap untuk buka di Google Maps
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ✅ Custom Camera Component dengan Real-time Location Tracking dan Simple Map
const CustomCameraWithOverlay = ({
  visible,
  onClose,
  onCapture,
  customerName,
  namaSales,
  checkType = "checkin",
  onCameraClose,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (photo: {
    base64: string;
    location: Location.LocationObject;
  }) => void;
  customerName: string;
  namaSales: string;
  checkType?: "checkin" | "checkout";
  onCameraClose: () => void;
}) => {
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [timestamp, setTimestamp] = useState(new Date());
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Real-time location tracking
  useEffect(() => {
    if (visible) {
      setTimestamp(new Date());
      setLocationLoading(true);

      let isMounted = true;

      const startLocationTracking = async () => {
        try {
          // Request high accuracy location
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (newLocation) => {
              if (isMounted) {
                console.log("📍 Location updated:", newLocation.coords);
                setLocation(newLocation);
                setLocationLoading(false);
              }
            }
          );

          if (isMounted) {
            setLocationSubscription(subscription);
          }

          // Also get initial location immediately
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          if (isMounted) {
            setLocation(initialLocation);
            setLocationLoading(false);
          }
        } catch (error) {
          console.error("Error starting location tracking:", error);
          if (isMounted) {
            setLocationLoading(false);
          }
        }
      };

      startLocationTracking();

      return () => {
        isMounted = false;
        if (locationSubscription) {
          locationSubscription.remove();
        }
      };
    } else {
      // Cleanup when camera closes
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      setLocation(null);
      setLocationLoading(true);
    }
  }, [visible]);

  const takePicture = async () => {
    if (cameraRef && location && !locationLoading) {
      setCapturing(true);
      try {
        const photo = await cameraRef.takePictureAsync({
          base64: true,
          quality: 0.7,
          exif: true,
        });

        if (photo.base64 && location) {
          onCapture({
            base64: photo.base64,
            location: location,
          });
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        // Alert.alert("Error", "Gagal mengambil foto");
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Gagal mengambil foto",
            body: "Gagal mengambil foto",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
      } finally {
        setCapturing(false);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleClose = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    onCameraClose();
    onClose();
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.cameraContainer}>
          <Text>Meminta izin kamera...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.cameraContainer}>
          <Text style={styles.message}>Butuh izin untuk mengakses kamera</Text>
          <Button title="Berikan Izin" onPress={requestPermission} />
        </View>
      </Modal>
    );
  }

  const formatLocation = () => {
    if (!location) return "Mendapatkan lokasi...";
    const lat = location.coords.latitude.toFixed(6);
    const lon = location.coords.longitude.toFixed(6);
    return `📍 ${lat}, ${lon}`;
  };

  const formatTimestamp = () => {
    return timestamp.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getAccuracyStatus = () => {
    if (!location) return { text: "Mencari sinyal...", color: "#FF9800" };

    const accuracy = location.coords.accuracy || 999;

    if (accuracy < 10)
      return {
        text: `Akurasi: ${accuracy.toFixed(1)}m (Sangat Baik)`,
        color: "#4CAF50",
      };
    if (accuracy < 25)
      return {
        text: `Akurasi: ${accuracy.toFixed(1)}m (Baik)`,
        color: "#8BC34A",
      };
    if (accuracy < 50)
      return {
        text: `Akurasi: ${accuracy.toFixed(1)}m (Cukup)`,
        color: "#FFC107",
      };
    if (accuracy < 100)
      return {
        text: `Akurasi: ${accuracy.toFixed(1)}m (Sedang)`,
        color: "#FF9800",
      };
    return {
      text: `Akurasi: ${accuracy.toFixed(1)}m (Rendah)`,
      color: "#F44336",
    };
  };

  const accuracyStatus = getAccuracyStatus();
  const isCaptureDisabled = !location || locationLoading;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={(ref) => setCameraRef(ref)}
        >
          {/* OVERLAY GEOTAGGING DENGAN REAL-TIME INFO DAN SIMPLE MAP */}
          <View style={styles.cameraOverlay}>
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermarkTitle}>RKS MOBILE APP</Text>
              <Text style={styles.watermarkText}>{customerName}</Text>
              <Text style={styles.watermarkText}>Sales: {namaSales}</Text>
              <Text style={styles.watermarkText}>{formatTimestamp()}</Text>
              <Text style={styles.watermarkText}>{formatLocation()}</Text>

              {/* Accuracy Display */}
              <View
                style={[
                  styles.accuracyContainer,
                  { backgroundColor: accuracyStatus.color },
                ]}
              >
                <Text style={styles.accuracyText}>{accuracyStatus.text}</Text>
                {locationLoading && (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={styles.accuracyLoader}
                  />
                )}
              </View>

              {/* ✅ Simple Map Display */}
              {/* {location && (
                <SimpleLocationMap
                  latitude={location.coords.latitude}
                  longitude={location.coords.longitude}
                  style={styles.simpleMapContainer}
                />
              )} */}

              <Text style={styles.watermarkType}>
                {checkType === "checkin" ? "CHECK-IN" : "CHECK-OUT"}
              </Text>
            </View>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                isCaptureDisabled && styles.captureButtonDisabled,
              ]}
              onPress={takePicture}
              disabled={isCaptureDisabled}
            >
              <View style={styles.captureInner}>
                {locationLoading && (
                  <ActivityIndicator size="small" color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <MaterialIcons name="flip-camera-ios" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Capture Disabled Overlay */}
          {isCaptureDisabled && (
            <View style={styles.captureDisabledOverlay}>
              <Text style={styles.captureDisabledText}>
                {capturing ? "Menyimpan foto..." : "Menunggu lokasi siap..."}
              </Text>
            </View>
          )}
        </CameraView>
      </View>
    </Modal>
  );
};

// ✅ Modal untuk konfirmasi simpan fasmap
const FasMapConfirmationModal = ({
  visible,
  onConfirm,
  onCancel,
  customerName,
  namaSales,
  location,
  accuracy,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  customerName: string;
  namaSales: string;
  location: { latitude: number; longitude: number };
  accuracy: number;
}) => {
  const getAccuracyStatus = (acc: number) => {
    if (acc < 10) return { text: "Sangat Baik", color: "#4CAF50" };
    if (acc < 25) return { text: "Baik", color: "#8BC34A" };
    if (acc < 50) return { text: "Cukup", color: "#FFC107" };
    if (acc < 100) return { text: "Sedang", color: "#FF9800" };
    return { text: "Rendah", color: "#F44336" };
  };

  const accuracyStatus = getAccuracyStatus(accuracy);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.fasmapModal}>
          <Text style={styles.fasmapTitle}>Simpan Lokasi Customer</Text>
          <Text style={styles.fasmapText}>
            Customer <Text style={styles.bold}>{customerName}</Text> belum
            memiliki titik lokasi di sistem.
          </Text>
          <Text style={styles.fasmapText}>
            Sales: <Text style={styles.bold}>{namaSales}</Text>
          </Text>
          <Text style={styles.fasmapText}>
            Apakah Anda ingin menyimpan lokasi saat ini sebagai titik lokasi
            utama?
          </Text>

          <View style={styles.locationInfoContainer}>
            <Text style={styles.locationCoordinate}>
              📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            <View
              style={[
                styles.accuracyBadge,
                { backgroundColor: accuracyStatus.color },
              ]}
            >
              <Text style={styles.accuracyBadgeText}>
                Akurasi: {accuracy.toFixed(1)}m ({accuracyStatus.text})
              </Text>
            </View>

            {/* ✅ Simple Map di Modal */}
            <SimpleLocationMap
              latitude={location.latitude}
              longitude={location.longitude}
              style={styles.modalSimpleMapContainer}
            />
          </View>

          <View style={styles.fasmapButtons}>
            <TouchableOpacity style={styles.fasmapCancel} onPress={onCancel}>
              <Text style={styles.fasmapCancelText}>Nanti</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fasmapConfirm} onPress={onConfirm}>
              <Text style={styles.fasmapConfirmText}>Simpan Lokasi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function RKSPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToQueue } = useOfflineQueue();
  const layout = useWindowDimensions();
  const [rksList, setRksList] = useState<RKSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"searching" | "ready" | "error">(
    "searching"
  );
  const [namaSales, setNamaSales] = useState<string>(""); // ✅ State untuk nama sales

  // ✅ State baru untuk camera dan fasmap
  const [cameraVisible, setCameraVisible] = useState(false);
  const [fasmapModalVisible, setFasmapModalVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<RKSItem | null>(null);
  const [checkType, setCheckType] = useState<"checkin" | "checkout">("checkin");

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

  useEffect(() => {
    checkGPSStatus();
    const interval = setInterval(checkGPSStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRange(tabToRange[index]);
    if (index !== 2) setCustomDate(null);
  }, [index]);

  // ✅ Reset state ketika camera ditutup
  const handleCameraClose = () => {
    console.log("🔄 Camera closed, resetting states...");
    setCheckingInId(null);
    setGettingLocation(null);
    setIsLoading(false);
    setCurrentCustomer(null);
    setCurrentLocation(null);
    setCurrentPhoto(null);
  };

  // ✅ Fungsi untuk mendapatkan nama sales dari API
  const getNamaSales = async () => {
    if (!user?.kodeSales) return "";

    try {
      const salesRes = await salesAPI.getSalesList(user.kodeSales);
      console.log("📋 Sales data:", salesRes);

      if (salesRes.success && salesRes.data && salesRes.data.length > 0) {
        // Ambil nama sales dari data pertama
        const salesData = salesRes.data[0];
        return salesData.nama_sales || user.name || "Sales";
      }
    } catch (error) {
      console.error("Error getting sales data:", error);
    }

    return user.name || "Sales";
  };

  const loadRKS = async () => {
    if (!user?.kodeSales) return;
    console.log("🚀 Mulai loadRKS...");
    setLoading(true);
    try {
      // ✅ Ambil nama sales terlebih dahulu
      const salesName = await getNamaSales();
      setNamaSales(salesName);

      const listRes = await rksAPI.getRKSList(user.kodeSales);
      if (!listRes.success) {
        // console.log("❌ Gagal ambil data");
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Gagal ambil data",
            body: "Gagal ambil data",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        setRksList([]);
        return;
      }

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

      const localVisits = await getAllLocalRKS();
      console.log("📁 Local visits:", localVisits);

      const items: RKSItem[] = rksArray.map((item) => {
        const scheduledDate = item.rks_tanggal.split(" ")[0];

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
            namaSales: salesName, // ✅ Gunakan nama sales dari API
            rowid: item.detail_rowid,
          };
        }

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
          namaSales: salesName, // ✅ Gunakan nama sales dari API
          rowid: item.detail_rowid,
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

  // ✅ FIX: Filter yang benar untuk tanggal
  const filterByRange = useCallback(
    (list: RKSItem[]) => {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set ke awal hari

      const safeParseDate = (str: string): Date => {
        if (!str) return new Date(NaN);
        const date = new Date(str);
        date.setHours(0, 0, 0, 0); // Normalisasi waktu ke 00:00:00
        return date;
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
        // ✅ FIX: Hanya tampilkan data dengan tanggal sama dengan hari ini
        return list.filter((r) => {
          const d = safeParseDate(r.scheduledDate);
          const todayStart = new Date(today);
          return (
            !isNaN(d.getTime()) && d.getTime() === todayStart.getTime() // ✅ Pastikan tanggal sama persis
          );
        });
      }

      if (range === "week") {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Minggu lalu
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sabtu minggu ini
        end.setHours(23, 59, 59, 999);

        return list.filter((r) => {
          const d = safeParseDate(r.scheduledDate);
          return !isNaN(d.getTime()) && d >= start && d <= end;
        });
      }

      // Range "month"
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

  // ✅ Fungsi untuk check fasmap sebelum check-in
  // const checkFasMapAndProceed = async (
  //   item: RKSItem,
  //   type: "checkin" | "checkout"
  // ) => {
  //   setCheckingInId(item.id);
  //   setGettingLocation(item.id);

  //   try {
  //     let { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== "granted") {
  //       Alert.alert(
  //         "Izin Lokasi Diperlukan",
  //         "Aplikasi membutuhkan akses lokasi untuk check-in. Silakan aktifkan izin lokasi di pengaturan device."
  //       );
  //       return;
  //     }

  //     const locationEnabled = await Location.hasServicesEnabledAsync();
  //     if (!locationEnabled) {
  //       Alert.alert(
  //         "Lokasi Dimatikan",
  //         "Silakan aktifkan GPS/lokasi di device Anda untuk melakukan check-in.",
  //         [
  //           { text: "Batal", style: "cancel" },
  //           {
  //             text: "Buka Pengaturan",
  //             onPress: () => Location.enableNetworkProviderAsync(),
  //           },
  //         ]
  //       );
  //       return;
  //     }

  //     let loc;
  //     try {
  //       loc = await getLocationWithRetry(2);
  //     } catch (locationError) {
  //       console.error("Location error:", locationError);
  //       await Notifications.scheduleNotificationAsync({
  //         content: {
  //           title: "📍 Lokasi Tidak Ditemukan",
  //           body: "Tidak dapat mendapatkan lokasi saat ini. Pastikan GPS aktif, terhubung internet, dan tidak berada dalam gedung.",
  //           sound: "new-notification.mp3",
  //         },
  //         trigger: null,
  //       });
  //       return;
  //     }

  //     const lat = loc.coords.latitude;
  //     const lon = loc.coords.longitude;
  //     const acc = loc.coords.accuracy ?? 999;

  //     setCurrentLocation({
  //       latitude: lat,
  //       longitude: lon,
  //       accuracy: acc,
  //     });
  //     setCurrentCustomer(item);
  //     setCheckType(type);
  //     setGettingLocation(null);

  //     // Cek apakah customer sudah punya fasmap
  //     if (type === "checkin") {
  //       const fasmapRes = await fasmapAPI.getFasMap(item.kode_cust);
  //       if (!fasmapRes.success || !fasmapRes.data) {
  //         // Customer belum punya fasmap, tampilkan modal konfirmasi
  //         setFasmapModalVisible(true);
  //         return;
  //       }
  //     }

  //     // Jika sudah punya fasmap atau checkout, langsung buka kamera
  //     setCameraVisible(true);
  //   } catch (error) {
  //     console.error("Error in checkFasMapAndProceed:", error);
  //     setCheckingInId(null);
  //     setGettingLocation(null);
  //   }
  // };

  const checkFasMapAndProceed = async (
    item: RKSItem,
    type: "checkin" | "checkout"
  ) => {
    setCheckingInId(item.id);
    setGettingLocation(item.id);

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

      let loc;
      try {
        loc = await getLocationWithRetry(2);
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

      setCurrentLocation({
        latitude: lat,
        longitude: lon,
        accuracy: acc,
      });
      setCurrentCustomer(item);
      setCheckType(type);
      setGettingLocation(null);

      // 1. Ambil data FasMap (Diperlukan untuk Check-in dan Validasi Jarak)
      const fasmapRes = await fasmapAPI.getFasMap(item.kode_cust);
      const customerLocData = fasmapRes.data;

      // 2. CEK: Jika Check-in tapi FasMap tidak ada
      if (type === "checkin" && (!fasmapRes.success || !customerLocData)) {
        // Customer belum punya fasmap, tampilkan modal konfirmasi
        setFasmapModalVisible(true);
        return;
      }

      // 3. VALIDASI JARAK (Hanya jika data FasMap ada)
      if (customerLocData) {
        // Konversi string koordinat dari FasMap menjadi float/number
        const customerLat = parseFloat(customerLocData.latitude);
        const customerLon = parseFloat(customerLocData.longitude);

        // Hitung jarak (Asumsi calculateDistance dan rks.radius tersedia di scope)
        const dist = calculateDistance(lat, lon, customerLat, customerLon);
        const allowed = 50; //rks.radius ?? 50; // Jarak maksimal diizinkan (default 50m)

        if (dist > allowed) {
          Alert.alert(
            "Diluar Jarak",
            `Anda berada ${Math.round(
              dist
            )} m dari lokasi customer. Jarak maksimal ${allowed} m.\n\nLanjutkan check-${type}?`,
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Lanjutkan",
                // JIKA LANJUTKAN, BUKA KAMERA
                onPress: () => setCameraVisible(true),
              },
            ]
          );
          return; // Hentikan eksekusi di sini, kelanjutan tergantung pada pilihan user di Alert
        }
      }

      // 4. Lanjutkan ke Kamera (Jika jarak OK atau Checkout tanpa FasMap)
      setCameraVisible(true);
    } catch (error) {
      console.error("Error in checkFasMapAndProceed:", error);
      setCheckingInId(null);
      setGettingLocation(null);
    }
  };

  // ✅ Handle konfirmasi simpan fasmap
  const handleFasMapConfirm = async () => {
    if (!currentCustomer || !currentLocation) return;

    try {
      // Simpan fasmap ke backend
      const fasmapRes = await fasmapAPI.saveFasMap({
        kode_cust: currentCustomer.kode_cust,
        latitude: currentLocation.latitude.toString(),
        longitude: currentLocation.longitude.toString(),
      });

      if (fasmapRes.success) {
        console.log("✅ Fasmap berhasil disimpan");
        setFasmapModalVisible(false);
        setCameraVisible(true);
      } else {
        Alert.alert("Error", "Gagal menyimpan lokasi customer");
        setFasmapModalVisible(false);
        handleCameraClose(); // Reset state
      }
    } catch (error) {
      console.error("Error saving fasmap:", error);
      Alert.alert("Error", "Gagal menyimpan lokasi customer");
      setFasmapModalVisible(false);
      handleCameraClose(); // Reset state
    }
  };

  const handleFasMapCancel = () => {
    setFasmapModalVisible(false);
    handleCameraClose(); // Reset state
  };

  // ✅ Handle capture photo dari custom camera
  const handlePhotoCapture = async (photoData: {
    base64: string;
    location: Location.LocationObject;
  }) => {
    setCurrentPhoto(photoData.base64);
    setCameraVisible(false);

    // Update location dengan data terbaru dari camera
    if (photoData.location) {
      setCurrentLocation({
        latitude: photoData.location.coords.latitude,
        longitude: photoData.location.coords.longitude,
        accuracy: photoData.location.coords.accuracy || 999,
      });
    }

    // Lanjutkan proses check-in/checkout
    if (checkType === "checkin") {
      await processCheckIn(photoData.base64, photoData.location);
    } else {
      await processCheckOut(photoData.base64, photoData.location);
    }
  };

  // ✅ Process check-in setelah foto diambil dengan proper accuracy handling
  const processCheckIn = async (
    photoBase64: string,
    locationData: Location.LocationObject
  ) => {
    if (!user?.id || !currentCustomer || !currentLocation) return;

    try {
      const accuracy = locationData.coords.accuracy || currentLocation.accuracy;

      const createRes = await rksAPI.createMobileRKS({
        kode_rks: currentCustomer.kode_rks,
        kode_cust: currentCustomer.kode_cust,
        userid: user.id,
        checkin_time: new Date().toISOString(),
        latitude_in: currentLocation.latitude.toString(),
        longitude_in: currentLocation.longitude.toString(),
        accuracy_in: accuracy,
        photo_in: photoBase64,
        rowid: currentCustomer.rowid,
        customer_name: currentCustomer.customerName,
        kode_sales: user.kodeSales,
        nama_sales: namaSales, // ✅ Gunakan nama sales dari state
        status: "pending",
      });

      if (!createRes.success || !createRes.data?.id) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Error Check-in",
            body: createRes.error || "Gagal membuat kunjungan",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        return;
      }

      const newCheckIn = createRes.data;
      await insertRKSLocal(newCheckIn);

      const updatedItem: RKSItem = {
        ...currentCustomer,
        id: newCheckIn.id,
        status: "checked-in",
        checkIn: newCheckIn,
        fasmap: {
          latitude: currentLocation.latitude.toString(),
          longitude: currentLocation.longitude.toString(),
        },
      };

      setRksList((prev) =>
        prev.map((x) => (x.id === currentCustomer.id ? updatedItem : x))
      );

      addToQueue("rks_checkin");

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Check In Berhasil",
          body: `Kunjungan telah dimulai. Akurasi: ${accuracy.toFixed(1)}m`,
          sound: "new-notification.mp3",
        },
        trigger: null,
      });
    } catch (err: any) {
      console.error("Check-in error:", err);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "❌ Gagal Check-in",
          body: "Gagal melakukan check-in: " + err.message,
          sound: "new-notification.mp3",
        },
        trigger: null,
      });
    } finally {
      handleCameraClose(); // Reset semua state
    }
  };

  // ✅ Process check-out setelah foto diambil dengan proper accuracy handling
  const processCheckOut = async (
    photoBase64: string,
    locationData: Location.LocationObject
  ) => {
    if (!currentCustomer?.checkIn || !currentLocation) return;

    try {
      const accuracy = locationData.coords.accuracy || currentLocation.accuracy;
      const checkout_time = new Date().toISOString();
      const checkInTime = new Date(currentCustomer.checkIn.checkin_time);
      const duration = Math.round(
        (new Date(checkout_time).getTime() - checkInTime.getTime()) / 60000
      );

      const checkoutRes = await rksAPI.updateMobileRKS(currentCustomer.id, {
        checkout_time,
        latitude_out: currentLocation.latitude.toString(),
        longitude_out: currentLocation.longitude.toString(),
        accuracy_out: accuracy,
        photo_out: photoBase64,
        status: "pending",
        customer_name: currentCustomer.customerName,
        nama_sales: namaSales, // ✅ Gunakan nama sales dari state
      });

      if (!checkoutRes.success || !checkoutRes.data) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Gagal Check-out",
            body: checkoutRes.error || "Gagal melakukan check-out",
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        return;
      }

      const updatedCheckOut: MobileRKS = {
        ...currentCustomer.checkIn,
        ...checkoutRes.data,
        id: currentCustomer.id,
        checkout_time,
        latitude_out: currentLocation.latitude.toString(),
        longitude_out: currentLocation.longitude.toString(),
        accuracy_out: accuracy,
        duration,
        status: "pending",
      };

      await updateRKSLocal(currentCustomer.id, updatedCheckOut);

      const updatedItem: RKSItem = {
        ...currentCustomer,
        status: "completed",
        checkOut: updatedCheckOut,
      };

      setRksList((prev) =>
        prev.map((x) => (x.id === currentCustomer.id ? updatedItem : x))
      );

      addToQueue("rks_checkout");

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Check Out Berhasil",
          body: `Kunjungan selesai. Akurasi: ${accuracy.toFixed(1)}m`,
          sound: "new-notification.mp3",
        },
        trigger: null,
      });
    } catch (err: any) {
      console.error("Check-out error:", err);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "❌ Gagal Check-out",
          body: "Gagal melakukan check-out: " + err.message,
          sound: "new-notification.mp3",
        },
        trigger: null,
      });
    } finally {
      handleCameraClose(); // Reset semua state
    }
  };

  // --- Check-in Logic (Updated) ---
  const handleCheckIn = async (item: RKSItem) => {
    await checkFasMapAndProceed(item, "checkin");
  };

  // --- Check-out Logic (Updated) ---
  const handleCheckOut = async (item: RKSItem) => {
    if (!item.checkIn) return;
    setIsLoading(true);
    await checkFasMapAndProceed(item, "checkout");
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

      {/* ✅ Custom Camera dengan Real-time Location Tracking dan Simple Map */}
      <CustomCameraWithOverlay
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCapture={handlePhotoCapture}
        customerName={currentCustomer?.customerName || ""}
        namaSales={namaSales} // ✅ Gunakan nama sales dari state
        checkType={checkType}
        onCameraClose={handleCameraClose}
      />

      {/* ✅ FasMap Confirmation Modal dengan Accuracy Info dan Simple Map */}
      <FasMapConfirmationModal
        visible={fasmapModalVisible}
        onConfirm={handleFasMapConfirm}
        onCancel={handleFasMapCancel}
        customerName={currentCustomer?.customerName || ""}
        namaSales={namaSales} // ✅ Gunakan nama sales dari state
        location={currentLocation || { latitude: 0, longitude: 0 }}
        accuracy={currentLocation?.accuracy || 999}
      />

      <CalendarModal />
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
  // ✅ Camera Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  watermarkContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  watermarkTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  watermarkText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 3,
  },
  watermarkType: {
    color: "#ffeb3b",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },
  // ✅ Accuracy Display Styles
  accuracyContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 5,
    alignSelf: "flex-start",
  },
  accuracyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  accuracyLoader: {
    marginLeft: 5,
  },
  accuracyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: "flex-start",
  },
  accuracyBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cameraControls: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  closeButton: {
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  flipButton: {
    padding: 10,
  },
  // ✅ Capture Disabled Overlay
  captureDisabledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  captureDisabledText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    borderRadius: 10,
  },
  // ✅ Simple Map Styles (menggantikan MapView styles)
  simpleMapContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  simpleMap: {
    height: 80,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#667eea",
    borderRadius: 8,
    padding: 10,
  },
  simpleMapText: {
    color: "#667eea",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  simpleMapSubtext: {
    color: "#667eea",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
  modalSimpleMapContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    height: 100,
  },
  // ✅ FasMap Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fasmapModal: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  fasmapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  fasmapText: {
    fontSize: 14,
    marginBottom: 10,
    color: "#666",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "bold",
    color: "#333",
  },
  locationInfoContainer: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  locationCoordinate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#667eea",
  },
  fasmapButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  fasmapCancel: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  fasmapCancelText: {
    color: "#666",
    fontWeight: "600",
  },
  fasmapConfirm: {
    flex: 1,
    padding: 12,
    backgroundColor: "#667eea",
    borderRadius: 8,
    marginLeft: 10,
    alignItems: "center",
  },
  fasmapConfirmText: {
    color: "white",
    fontWeight: "600",
  },
});
