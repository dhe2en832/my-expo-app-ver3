// app/(tabs)/rks.tsx
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rksAPI, attendanceAPI } from "../../api/services";
import { RKS, Customer, AttendanceRecord } from "@/api/mockData";
import { useOfflineQueue } from "@/contexts/OfflineContext";
import { calculateDistance, getCurrentShift } from "@/utils/helpers";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";

type RangeKey = "today" | "week" | "month";
type CustomDate = { month: number; year: number };

export default function RKSPage() {
  const router = useRouter();
  const [rksList, setRksList] = useState<RKS[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalType, setModalType] = useState<"unscheduled" | "baru" | null>(
    null
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    address: "",
    phone: "",
    type: "new" as Customer["type"],
  });
  const [memoModalVisible, setMemoModalVisible] = useState(false);
  const [selectedRksForMemo, setSelectedRksForMemo] = useState<RKS | null>(
    null
  );
  const [memoText, setMemoText] = useState("");
  const { addToQueue } = useOfflineQueue();
  const layout = useWindowDimensions();
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
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [unscheduledLoading, setUnscheduledLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [customDate, setCustomDate] = useState<CustomDate | null>(null);
  const fabAnim = useState(new Animated.Value(0))[0];
  const tooltipAnim = useState(new Animated.Value(0))[0];
  const pan = useState(new Animated.ValueXY({ x: 0, y: 0 }))[0];
  const { user } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      loadRKS();
    }, [])
  );

  useEffect(() => {
    setRange(tabToRange[index]);
    setCustomDate(null);
  }, [index]);

  const openMemoModal = (rks: RKS) => {
    setSelectedRksForMemo(rks);
    setMemoText(rks.activities?.notes || "");
    setMemoModalVisible(true);
  };

  const saveMemo = async (memoText: string) => {
    if (!selectedRksForMemo) return;
    const updatedRks: RKS = {
      ...selectedRksForMemo,
      activities: {
        ...selectedRksForMemo.activities,
        notes: memoText,
      },
      updatedAt: new Date().toISOString(),
    };
    try {
      const res = await rksAPI.updateRKS(updatedRks);
      if (res.success && res.rks) {
        const updatedItem = res.rks;
        setRksList((prev) =>
          prev.map((x) => (x.id === updatedItem.id ? updatedItem : x))
        );
      }
    } catch (err) {
      console.warn("API memo gagal, tersimpan di queue offline", err);
      addToQueue({
        type: "rks_update",
        data: updatedRks,
        endpoint: "/api/rks/update",
      });
    } finally {
      setMemoModalVisible(false);
    }
  };

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    if (!fabOpen) {
      Animated.stagger(100, [
        Animated.spring(fabAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }),
        Animated.spring(fabAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }),
      ]).start();
      tooltipAnim.setValue(0);
      Animated.sequence([
        Animated.timing(tooltipAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(1200),
        Animated.timing(tooltipAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.spring(fabAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }
    setFabOpen(!fabOpen);
  };

  const unscheduledStyle = {
    transform: [
      { scale: fabAnim },
      {
        translateY: fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -70],
        }),
      },
    ],
    opacity: fabAnim,
  };
  const newCustomerStyle = {
    transform: [
      { scale: fabAnim },
      {
        translateY: fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -140],
        }),
      },
    ],
    opacity: fabAnim,
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.extractOffset();
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => {
      pan.flattenOffset();
    },
  });

  const loadRKS = async () => {
    if (!user?.kodeSales) {
      console.warn("User tidak punya kode_sales");
      return;
    }
    setLoading(true);
    try {
      const res = await rksAPI.getRKS(user.kodeSales);
      if (res.success) {
        setRksList(res.rks);
      } else {
        setRksList([]);
      }
    } catch (err) {
      console.error("Error load RKS:", err);
      setRksList([]);
    } finally {
      setLoading(false);
    }
  };

  const isAnyCheckedIn = rksList.some((r) => r.checkIn && !r.checkOut);

  const filterByRange = useCallback(
    (list: RKS[]) => {
      const now = new Date();
      const safeParseDate = (str: string): Date => {
        if (!str) return new Date(NaN);
        if (str.includes(" ")) {
          const [datePart, timePart] = str.split(" ", 2);
          return new Date(`${datePart}T${timePart}`);
        }
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

  const takeSelfieFront = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Kamera", "Izin kamera diperlukan.");
        return null;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        cameraType: ImagePicker.CameraType.front,
        base64: false,
      });
      if (!res.canceled && res.assets?.[0]?.uri) return res.assets[0].uri;
      return null;
    } catch (err) {
      console.error("Take selfie error:", err);
      Alert.alert("Kamera", "Gagal membuka kamera.");
      return null;
    }
  };

  const appendAttendanceLocal = async (rec: AttendanceRecord) => {
    try {
      const raw = await AsyncStorage.getItem("attendanceHistory");
      const arr: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
      arr.unshift(rec);
      await AsyncStorage.setItem("attendanceHistory", JSON.stringify(arr));
      return arr;
    } catch (err) {
      console.warn("appendAttendanceLocal error:", err);
      return null;
    }
  };

  const askToUpdateGeofence = (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        "Update Lokasi Customer?",
        "Customer ini belum memiliki lokasi tetap. Apakah Anda ingin menyimpan lokasi saat ini sebagai lokasi utama customer?",
        [
          { text: "Tidak", onPress: () => resolve(false), style: "cancel" },
          { text: "Ya", onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    });
  };

  const handleCheckIn = async (rks: RKS) => {
    console.log("handleCheckIn for RKS:", rks);
    // throw new Error("handleCheckIn is disabled for testing");

    try {
      setCheckingInId(rks.id);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Dibutuhkan",
          "Aplikasi memerlukan akses lokasi untuk melakukan check-in."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const acc = loc.coords.accuracy ?? 999;

      // Cek apakah customer punya lokasi (geofence)
      const customerLoc = rks.customerLocation || rks.coordinates;
      const hasLocation = !!customerLoc;

      // Jika TIDAK ADA lokasi → tanya user
      if (!hasLocation) {
        const shouldUpdate = await askToUpdateGeofence();
        if (!shouldUpdate) {
          // ❌ User pilih "Tidak" → batalkan check-in
          return;
        }
        // Jika "Ya", lanjut ke proses check-in dengan flag updateGeofence = true
      }

      // Jika ini RKS master, buat record mobile dulu
      if (rks.id.startsWith("master_")) {
        const rowid = parseInt(rks.id.replace("master_", ""), 10);
        if (isNaN(rowid)) {
          Alert.alert("Error", "ID master tidak valid.");
          return;
        }
        const kodeRks = rks.kodeRks; // ✅ ini seharusnya ada jika interface RKS sudah benar
        const createResp = await rksAPI.createMobileFromMaster({
          customerId: rks.customerId,
          scheduledDate: rks.scheduledDate,
          salesId: rks.salesId,
          masterDetailRowId: rowid,
          kodeRks: rks.kodeRks,
        });
        // console.log("createResp:", createResp);
        if (!createResp.success || !createResp.rks) {
          Alert.alert("Error", createResp.error || "Gagal memulai kunjungan.");
          return;
        }
        // console.log("hasLocation:", hasLocation);
        // Lanjutkan check-in ke record mobile baru
        await proceedWithCheckIn(
          createResp.rks,
          lat,
          lon,
          acc,
          createResp.rks.id,
          !hasLocation // updateGeofence = true jika sebelumnya tidak punya lokasi
        );
        return;
      }

      // Jika ini RKS mobile (bukan master)
      if (!hasLocation) {
        // Ini seharusnya tidak terjadi, tapi antisipasi
        Alert.alert(
          "Lokasi customer tidak tersedia",
          "Tidak dapat melanjutkan check-in."
        );
        return;
      }

      const dist = calculateDistance(
        lat,
        lon,
        customerLoc.latitude,
        customerLoc.longitude
      );
      const allowed = rks.radius ?? 150;
      if (dist > allowed) {
        Alert.alert(
          "Diluar Jarak",
          `Anda berada ${Math.round(
            dist
          )} m dari lokasi customer. Jarak maksimal ${allowed} m.\nLanjutkan check-in?`,
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Lanjutkan",
              onPress: () =>
                proceedWithCheckIn(rks, lat, lon, acc, rks.id, false),
            },
          ]
        );
        return;
      }

      await proceedWithCheckIn(rks, lat, lon, acc, rks.id, false);
    } catch (err) {
      console.error("handleCheckIn error:", err);
      Alert.alert("Error", "Gagal melakukan check in.");
    } finally {
      setCheckingInId(null);
    }
  };

  // const proceedWithCheckIn = async (
  //   originalRks: RKS,
  //   lat: number,
  //   lon: number,
  //   acc: number,
  //   targetRksId: string,
  //   updateGeofence: boolean
  // ) => {
  //   try {
  //     const selfie = await takeSelfieFront();
  //     if (!selfie) return;

  //     const shift = getCurrentShift();
  //     const attendanceResp = await attendanceAPI.checkIn({
  //       photo: selfie,
  //       location: { latitude: lat, longitude: lon, accuracy: acc },
  //       address: originalRks.customerAddress || originalRks.customerName,
  //       shift,
  //     });

  //     const rksResp = await rksAPI.checkIn(targetRksId, {
  //       latitude: lat,
  //       longitude: lon,
  //       accuracy: acc,
  //       photo: selfie,
  //       updateGeofence, // ✅ Kirim flag ke backend
  //     });

  //     if (!rksResp.success) {
  //       Alert.alert("Error", rksResp.error || "Gagal check in.");
  //       return;
  //     }

  //     if (attendanceResp?.success && attendanceResp.record) {
  //       await appendAttendanceLocal(attendanceResp.record as AttendanceRecord);
  //     }

  //     setRksList((prev) => {
  //       let updated = prev.map((x) => {
  //         if (x.id === originalRks.id) {
  //           if (rksResp.rks && originalRks.id.startsWith("master_")) {
  //             return rksResp.rks;
  //           }
  //           if (rksResp.rks && x.id === rksResp.rks.id) {
  //             return rksResp.rks;
  //           }
  //         }
  //         return x;
  //       });
  //       if (originalRks.id.startsWith("master_") && rksResp.rks) {
  //         const exists = updated.some((x) => x.id === rksResp.rks.id);
  //         if (!exists) {
  //           updated = [rksResp.rks, ...updated];
  //         }
  //       }
  //       return updated;
  //     });

  //     addToQueue({
  //       type: "rks_checkin",
  //       data: {
  //         rksId: targetRksId,
  //         latitude: lat,
  //         longitude: lon,
  //         accuracy: acc,
  //         photo: "[local-uri]",
  //         updateGeofence,
  //       },
  //       endpoint: `/api/rks/${targetRksId}/checkin`,
  //     });

  //     Alert.alert("Check In berhasil", "Check In tersimpan.");
  //   } catch (err) {
  //     console.error("proceedWithCheckIn error:", err);
  //     Alert.alert("Error", "Gagal melakukan check in.");
  //   }
  // };

  // Perbaikan fungsi proceedWithCheckIn di rks.tsx

  const proceedWithCheckIn = async (
    originalRks: RKS,
    lat: number,
    lon: number,
    acc: number,
    targetRksId: string,
    updateGeofence: boolean
  ) => {
    try {
      const selfie = await takeSelfieFront();
      if (!selfie) return;

      const shift = getCurrentShift();

      // ✅ Hitung is_within_geofence untuk attendance
      let isWithinGeofence = false;
      const customerLoc =
        originalRks.customerLocation || originalRks.coordinates;
      if (customerLoc?.latitude && customerLoc?.longitude) {
        const distance = calculateDistance(
          lat,
          lon,
          customerLoc.latitude,
          customerLoc.longitude
        );
        const allowedRadius = originalRks.radius ?? 150;
        isWithinGeofence = distance <= allowedRadius;
      }

      // ✅ Check-in ke attendance dengan semua field yang diperlukan
      try {
        const attendanceResp = await attendanceAPI.checkIn({
          photo: selfie,
          location: { latitude: lat, longitude: lon, accuracy: acc },
          address: originalRks.customerAddress || originalRks.customerName,
          shift,
          is_within_geofence: isWithinGeofence, // ✅ DITAMBAHKAN
        });

        if (attendanceResp?.success && attendanceResp.record) {
          await appendAttendanceLocal(
            attendanceResp.record as AttendanceRecord
          );
        }
      } catch (attErr) {
        console.warn(
          "⚠️ Attendance check-in gagal, lanjutkan RKS check-in:",
          attErr
        );
        // ✅ Jangan throw error, biarkan RKS check-in tetap jalan
      }

      // ✅ Check-in RKS (tetap dilakukan meski attendance gagal)
      const rksResp = await rksAPI.checkIn(targetRksId, {
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        photo: selfie,
        updateGeofence,
      });

      if (!rksResp.success) {
        Alert.alert("Error", rksResp.error || "Gagal check in.");
        return;
      }

      // Update state RKS
      setRksList((prev) => {
        let updated = prev.map((x) => {
          if (x.id === originalRks.id) {
            if (rksResp.rks && originalRks.id.startsWith("master_")) {
              return rksResp.rks;
            }
            if (rksResp.rks && x.id === rksResp.rks.id) {
              return rksResp.rks;
            }
          }
          return x;
        });
        if (originalRks.id.startsWith("master_") && rksResp.rks) {
          const exists = updated.some((x) => x.id === rksResp.rks.id);
          if (!exists) {
            updated = [rksResp.rks, ...updated];
          }
        }
        return updated;
      });

      // Tambahkan ke offline queue
      addToQueue({
        type: "rks_checkin",
        data: {
          rksId: targetRksId,
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          photo: "[local-uri]",
          updateGeofence,
        },
        endpoint: `/api/rks/${targetRksId}/checkin`,
      });

      Alert.alert("Check In berhasil", "Check In tersimpan.");
    } catch (err) {
      console.log("🔍 Debugging attendance check-in:", {
        shift,
        isWithinGeofence,
        address: originalRks.customerAddress || originalRks.customerName,
        hasPhoto: !!selfie,
        location: { lat, lon, acc },
      });
      console.error("❌ proceedWithCheckIn error:", err);
      Alert.alert("Error", "Gagal melakukan check in.");
    }
  };
  // Declare shift and isWithinGeofence for debugging
  let shift: string | undefined = undefined;
  let isWithinGeofence: boolean | undefined = undefined;
  let selfie: string | undefined = undefined;
  // The above variables are only for debugging and will be set in proceedWithCheckIn
  const handleCheckOut = async (rks: RKS) => {
    try {
      if (!rks.checkIn) {
        Alert.alert(
          "Belum Check In",
          "Anda harus melakukan Check In terlebih dahulu."
        );
        return;
      }
      setCheckingInId(rks.id);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Dibutuhkan",
          "Aplikasi memerlukan akses lokasi."
        );
        return;
      }
      setIsLoading(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const acc = loc.coords.accuracy ?? 999;
      const checkInTime = new Date(rks.checkIn.timestamp);
      const now = new Date();
      const durationMin = Math.round(
        (now.getTime() - checkInTime.getTime()) / 60000
      );

      const rksResp = await rksAPI.checkOut(rks.id, {
        latitude: lat,
        longitude: lon,
        accuracy: acc,
      });
      if (!rksResp.success) {
        Alert.alert("Error", rksResp.error || "Gagal check out.");
        return;
      }
      if (rksResp.rks) {
        const updatedItem = rksResp.rks;
        setRksList((prev) =>
          prev.map((x) => (x.id === updatedItem.id ? updatedItem : x))
        );
      }
      const photoForCheckout =
        (rks.checkIn && (rks.checkIn.photo as any)) || "[no-photo]";
      const attendanceResp = await attendanceAPI.checkOut({
        photo: photoForCheckout,
        location: { latitude: lat, longitude: lon, accuracy: acc },
        address: rks.customerAddress || rks.customerName,
      });
      if (attendanceResp?.success && attendanceResp.record) {
        await appendAttendanceLocal(attendanceResp.record as AttendanceRecord);
      }
      addToQueue({
        type: "rks_checkout",
        data: { rksId: rks.id, latitude: lat, longitude: lon, accuracy: acc },
        endpoint: `/api/rks/${rks.id}/checkout`,
      });
      Alert.alert(
        "Check Out berhasil",
        `Durasi kunjungan: ${rksResp.rks?.duration || durationMin} menit`
      );
    } catch (err) {
      console.error("handleCheckOut error:", err);
      Alert.alert("Error", "Gagal melakukan check out.");
    } finally {
      setCheckingInId(null);
      setIsLoading(false);
    }
  };

  const handleUnscheduledVisit = async () => {
    if (!selectedCustomer) {
      Alert.alert("Pilih customer dulu");
      return;
    }
    try {
      setUnscheduledLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Dibutuhkan",
          "Aplikasi memerlukan akses lokasi."
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const acc = loc.coords.accuracy ?? 999;
      if (
        selectedCustomer.coordinates?.latitude != null &&
        selectedCustomer.coordinates?.longitude != null
      ) {
        const dist = calculateDistance(
          lat,
          lon,
          selectedCustomer.coordinates.latitude,
          selectedCustomer.coordinates.longitude
        );
        const allowed = 150;
        if (dist > allowed) {
          Alert.alert(
            "Diluar Jarak",
            `Anda berada ${Math.round(
              dist
            )} m dari lokasi customer. Jarak maksimal ${allowed} m.\nLanjutkan check-in?`,
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Lanjutkan",
                onPress: () => proceedWithUnscheduledVisit(lat, lon, acc),
              },
            ]
          );
          return;
        }
      }
      await proceedWithUnscheduledVisit(lat, lon, acc);
    } catch (err) {
      console.error("handleUnscheduledVisit error:", err);
      Alert.alert("Error", "Gagal membuat kunjungan tambahan.");
    } finally {
      setUnscheduledLoading(false);
    }
  };

  const proceedWithUnscheduledVisit = async (
    lat: number,
    lon: number,
    acc: number
  ) => {
    if (!selectedCustomer) return;
    try {
      const selfie = await takeSelfieFront();
      if (!selfie) return;
      const res = await rksAPI.addUnscheduledVisit(user?.kodeSales || "1", {
        customerId: selectedCustomer.id,
        customerNo: selectedCustomer.no,
        customerName: selectedCustomer.name,
        customerAddress: selectedCustomer.address,
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        photo: selfie,
      });
      if (res.success && res.rks) {
        setRksList((prev) => [res.rks as RKS, ...prev]);
        setModalType(null);
        setSelectedCustomer(null);
        const ares = await attendanceAPI.checkIn({
          photo: selfie,
          location: { latitude: lat, longitude: lon, accuracy: acc },
          address: selectedCustomer.address,
          shift: getCurrentShift(),
        });
        if (ares?.success && ares.record) {
          await appendAttendanceLocal(ares.record as AttendanceRecord);
        }
        addToQueue({
          type: "rks_additional",
          data: { rksId: res.rks.id, photo: "[local-uri]" },
          endpoint: `/api/rks/${res.rks.id}/additional`,
        });
        Alert.alert(
          "Sukses",
          "Kunjungan tambahan dibuat dan check-in tercatat."
        );
      } else {
        const errorMessage =
          (res as any).error || "Gagal membuat kunjungan tambahan.";
        Alert.alert("Error", errorMessage);
      }
    } catch (err) {
      console.error("proceedWithUnscheduledVisit error:", err);
      Alert.alert("Error", "Gagal membuat kunjungan tambahan.");
    }
  };

  const handleNewCustomerVisit = async () => {
    if (!newCustomer.name || !newCustomer.address) {
      Alert.alert("Nama dan alamat wajib diisi");
      return;
    }
    try {
      const res = await rksAPI.addNewCustomerVisit(user?.kodeSales || "1", {
        name: newCustomer.name,
        address: newCustomer.address,
        phone: newCustomer.phone,
        city: "",
      });
      if (res.success && res.rks) {
        setRksList((prev) => [res.rks as RKS, ...prev]);
        setModalType(null);
        setNewCustomer({ name: "", address: "", phone: "", type: "new" });
        Alert.alert(
          "Sukses",
          "Customer baru dibuat. Silakan lakukan Check In di daftar RKS."
        );
      }
    } catch (err) {
      console.error("handleNewCustomerVisit error:", err);
      Alert.alert("Error", "Gagal membuat customer baru.");
    }
  };

  const handleCreateOrder = () => {
    router.push("/sales-order");
  };
  const handleTagihan = (customerId: string, customerName: string) => {
    router.push({
      pathname: "/collection",
      params: { customerId, customerName },
    });
  };
  const handleOpenBesiKompetitor = (rks: {
    id: string;
    customerName: string;
  }) => {
    router.push({
      pathname: "/besi-kompetitor",
      params: { rksId: rks.id, customerName: rks.customerName },
    });
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const getDatePart = useCallback((str: string): string => {
    if (!str) return "";
    if (str.includes(" ")) return str.substring(0, 10);
    if (str.includes("T")) return str.split("T")[0];
    return str;
  }, []);

  const renderItem = ({ item }: { item: RKS }) => {
    const canCheckIn = !item.checkIn && item.status !== "new-customer";
    const canCheckOut = !!item.checkIn && !item.checkOut;
    const canViewActions = !!item.checkIn || item.status === "completed";
    const isToday = getDatePart(item.scheduledDate) === todayStr;
    const isAnotherCheckedIn = rksList.some(
      (r) => r.checkIn && !r.checkOut && r.id !== item.id
    );

    let statusText = "";
    let statusColor = "";
    if (item.status === "completed") {
      statusText = "Selesai";
      statusColor = "#4CAF50";
    } else if (item.status === "incomplete") {
      statusText = "Berlangsung";
      statusColor = "#ff9800";
    } else if (item.status === "new-customer") {
      statusText = "Cust. Baru (Blm In)";
      statusColor = "#3f51b5";
    } else if (item.status === "additional") {
      statusText = "Tambahan (In)";
      statusColor = "#00bcd4";
    } else {
      statusText = "Terjadwal";
      statusColor = "#666";
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
            }).format(
              item.scheduledDate.includes(" ")
                ? new Date(item.scheduledDate.replace(" ", "T"))
                : new Date(item.scheduledDate)
            )}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{statusText}</Text>
          </View>
        </View>
        <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          No. Cust : {item.customerId}
        </Text>
        <Text style={styles.title}>{item.customerName}</Text>
        <Text style={{ color: "#666", marginTop: 6 }}>
          {item.customerAddress}
        </Text>
        {item.duration != null && (
          <Text
            style={{
              color: "#666",
              marginTop: 4,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Durasi: {item.duration} menit
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {canCheckIn && isToday && (
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
              <LinearGradient
                colors={["#4CAF50", "#45a049"]}
                style={styles.primaryButtonGradient}
              >
                {checkingInId === item.id ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                      Sedang proses...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Check In bro</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
          {canCheckOut && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#f44336" }]}
              onPress={() => handleCheckOut(item)}
            >
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>
                Check Out
              </Text>
            </TouchableOpacity>
          )}
          {canViewActions && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#ff9800" }]}
                onPress={handleCreateOrder}
              >
                <MaterialIcons name="shopping-cart" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>
                  SO
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#607d8b" }]}
                onPress={() => openMemoModal(item)}
              >
                <MaterialIcons name="note" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>
                  Catatan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#3f51b5" }]}
                onPress={() => handleOpenBesiKompetitor(item)}
              >
                <MaterialIcons name="build" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>
                  Besi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#009688" }]}
                onPress={() =>
                  handleTagihan(item.customerId, item.customerName)
                }
              >
                <MaterialIcons name="receipt" size={20} color="#fff" />
                <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>
                  Tagihan
                </Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === "completed" && (
            <View style={[styles.disabledButton]}>
              <Text style={{ color: "#444" }}>Selesai</Text>
            </View>
          )}
          {canCheckIn && !isToday && (
            <View style={[styles.disabledButton]}>
              <Text style={{ color: "#444" }}>RKS Lampau</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const SceneList = () => {
    const filtered = filterByRange(rksList);
    if (loading)
      return (
        <View style={{ padding: 20 }}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      );
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
          color: string;
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
        <Calendar size={18} color={customDate ? "#fff" : "#667eea"} />
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

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={(i) => setIndex(i)}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />
      <CalendarModal />
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[styles.fabOption, unscheduledStyle]}>
          <Animated.View
            style={{ opacity: tooltipAnim, marginBottom: 4, right: 60 }}
          >
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>Kunjungan Tambahan</Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            style={styles.fabOptionButton}
            onPress={() => {
              setModalType("unscheduled");
              toggleFab();
            }}
            disabled={isAnyCheckedIn}
          >
            <MaterialIcons name="add-location" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.fabOption, newCustomerStyle]}>
          <Animated.View
            style={{ opacity: tooltipAnim, marginBottom: 4, right: 60 }}
          >
            <View style={[styles.tooltip, { backgroundColor: "#ff9800" }]}>
              <Text style={styles.tooltipText}>Customer Baru</Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            style={[styles.fabOptionButton, { backgroundColor: "#ff9800" }]}
            onPress={() => {
              setModalType("baru");
              toggleFab();
            }}
            disabled={isAnyCheckedIn}
          >
            <MaterialIcons name="person-add" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
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
      </Animated.View>

      {/* Modals (unscheduled, baru, memo) — tetap seperti asli */}

      <Modal
        visible={modalType === "unscheduled"}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView
          style={[styles.container, { paddingBottom: 24 }]}
          edges={["bottom", "left", "right"]}
        >
          {unscheduledLoading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text
                  style={{ marginTop: 12, color: "#333", fontWeight: "600" }}
                >
                  Memproses kunjungan...
                </Text>
              </View>
            </View>
          )}
          <View style={styles.header}>
            <Text style={styles.title}>Pilih Customer</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleUnscheduledVisit}
            >
              <Text style={styles.btnPrimaryText}>Mulai Kunjungan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, { backgroundColor: "#eee" }]}
              onPress={() => {
                setModalType(null);
                setSelectedCustomer(null);
              }}
            >
              <Text>Batal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={modalType === "baru"}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView
          style={[styles.container, { paddingBottom: 24 }]}
          edges={["bottom", "left", "right"]}
        >
          <Text style={styles.modalTitle}>Tambah Customer Baru</Text>
          <TextInput
            placeholder="Nama"
            style={styles.input}
            value={newCustomer.name}
            onChangeText={(t) => setNewCustomer({ ...newCustomer, name: t })}
          />
          <TextInput
            placeholder="Alamat"
            style={styles.input}
            value={newCustomer.address}
            onChangeText={(t) => setNewCustomer({ ...newCustomer, address: t })}
          />
          <TextInput
            placeholder="Nomor HP"
            style={styles.input}
            value={newCustomer.phone}
            onChangeText={(t) => setNewCustomer({ ...newCustomer, phone: t })}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleNewCustomerVisit}
            >
              <Text style={styles.btnPrimaryText}>Simpan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, { backgroundColor: "#eee" }]}
              onPress={() => setModalType(null)}
            >
              <Text>Batal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={memoModalVisible}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Catatan / Memo</Text>
          <TextInput
            style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            multiline
            placeholder="Tulis catatan di sini..."
            value={memoText}
            onChangeText={setMemoText}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => saveMemo(memoText)}
            >
              <Text style={styles.btnPrimaryText}>Simpan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, { backgroundColor: "#eee" }]}
              onPress={() => {
                setMemoModalVisible(false);
                setSelectedRksForMemo(null);
                setMemoText("");
              }}
            >
              <Text>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <Modal transparent animationType="fade">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <View
              style={{
                padding: 20,
                backgroundColor: "#fff",
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={{ marginTop: 10 }}>Sedang memproses...</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (semua style tetap sama seperti file asli Anda)
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
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
  fabOption: { position: "absolute", bottom: 0, right: 0 },
  fabOptionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 4,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    top: 10,
  },
  tooltipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tabLabel: { fontWeight: "600", fontSize: 16 },
  tabBar: { backgroundColor: "white" },
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingBox: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  headerRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    marginVertical: 8,
    padding: 14,
    borderRadius: 10,
    marginHorizontal: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "700" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "white",
  },
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
  btnSecondaryText: { color: "#333", fontWeight: "700" },
  primaryButton: { flex: 1, borderRadius: 8, overflow: "hidden" },
  primaryButtonGradient: {
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
  },
  primaryButtonText: { color: "white", fontWeight: "700" },
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
  dangerButton: { flex: 1, borderRadius: 8, overflow: "hidden" },
  disabledButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modalContainer: { flex: 1, padding: 16, backgroundColor: "#f7f9fc" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
  },
  customerItem: {
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 8,
    borderColor: "#eee",
    borderWidth: 1,
  },
  selectedCustomer: { backgroundColor: "#e8f5ff", borderColor: "#66a3ff" },
});
