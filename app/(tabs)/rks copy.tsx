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
  Easing,
  PanResponder
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rksAPI, attendanceAPI } from "../../api/services";
import { mockCustomers, RKS, Customer, AttendanceRecord } from "@/api/mockData";
import { useOfflineQueue } from "@/contexts/OfflineContext";
import { calculateDistance, getCurrentShift } from "@/utils/helpers";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { useWindowDimensions } from "react-native";
import { router, useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";

type RangeKey = "today" | "week" | "month";

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
        setRksList((prev) =>
          prev.map((x) => (x.id === res.rks.id ? res.rks : x))
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
        console.log("RKS loaded:", res.rks);
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
    // try {
    //   const kode_sales = await AsyncStorage.getItem("kode_sales");
    //   const res = await rksAPI.getRKS(kode_sales || "");
    //   // const res = await rksAPI.getRKS("1");
    //   if (res.success) {
    //     setRksList(res.rks);
    //   } else {
    //     setRksList([]);
    //   }
    // } catch (err) {
    //   console.error("Error load RKS:", err);
    //   setRksList([]);
    // } finally {
    //   setLoading(false);
    // }
  };

  const isAnyCheckedIn = rksList.some((r) => r.checkIn && !r.checkOut);

  const filterByRange = useCallback(
    (list: RKS[]) => {
      const now = new Date();
      if (range === "today") {
        const todayStr = now.toISOString().split("T")[0];
        return list.filter((r) => r.scheduledDate === todayStr);
      }
      if (range === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Sunday as start
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return list.filter((r) => {
          const d = new Date(r.scheduledDate);
          return d >= start && d <= end;
        });
      }
      // month
      return list.filter((r) => {
        const d = new Date(r.scheduledDate);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    },
    [range]
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

  const handleCheckIn = async (rks: RKS) => {
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

      const customerLoc = rks.customerLocation || rks.coordinates;
      if (!customerLoc) {
        Alert.alert(
          "Lokasi customer tidak tersedia",
          "Tidak dapat memvalidasi geofence."
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
          )} m dari lokasi customer. Jarak maksimal ${allowed} m.\n\nLanjutkan check-in?`,
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Lanjutkan",
              onPress: () => proceedWithCheckIn(rks, lat, lon, acc),
            },
          ]
        );
        return;
      }

      // Jika dalam radius, lanjutkan langsung
      await proceedWithCheckIn(rks, lat, lon, acc);
    } catch (err) {
      console.error("handleCheckIn error:", err);
      Alert.alert("Error", "Gagal melakukan check in.");
    } finally {
      setCheckingInId(null);
    }
  };

  // Fungsi helper untuk melanjutkan proses check-in
  const proceedWithCheckIn = async (
    rks: RKS,
    lat: number,
    lon: number,
    acc: number
  ) => {
    try {
      const selfie = await takeSelfieFront();
      if (!selfie) return;

      const shift = getCurrentShift();
      const attendanceResp = await attendanceAPI.checkIn({
        photo: selfie,
        location: { latitude: lat, longitude: lon, accuracy: acc },
        address: rks.customerAddress || rks.customerName,
        shift,
      });

      const rksResp = await rksAPI.checkIn(rks.id, {
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        photo: selfie,
      });

      if (!rksResp.success) {
        Alert.alert("Error", rksResp.error || "Gagal check in.");
        return;
      }

      if (attendanceResp?.success && attendanceResp.record) {
        await appendAttendanceLocal(attendanceResp.record as AttendanceRecord);
      }

      addToQueue({
        type: "rks_checkin",
        data: {
          rksId: rks.id,
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          photo: "[local-uri]",
        },
        endpoint: `/api/rks/${rks.id}/checkin`,
      });

      Alert.alert("Check In berhasil", "Check In tersimpan.");
    } catch (err) {
      console.error("proceedWithCheckIn error:", err);
      Alert.alert("Error", "Gagal melakukan check in.");
    }
  };

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
      const updateData: Partial<RKS> = {
        checkOut: {
          timestamp: new Date().toISOString(),
          latitude: lat,
          longitude: lon,
          accuracy: acc,
        },
        duration: durationMin,
        status: "completed",
      };
      const updatedRks = { ...rks, ...updateData };
      const updateResp = (await rksAPI.updateRRSafe)
        ? await rksAPI.updateRRSafe(updatedRks)
        : await rksAPI.updateRKS(updatedRks);
      if (updateResp?.success && updateResp.rks) {
        setRksList((prev) =>
          prev.map((x) => (x.id === rks.id ? updateResp.rks : x))
        );
      } else {
        setRksList((prev) =>
          prev.map((x) =>
            x.id === rks.id
              ? ({
                  ...x,
                  checkOut: updateData.checkOut,
                  duration: durationMin,
                  status: "completed",
                } as RKS)
              : x
          )
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
        `Durasi kunjungan: ${durationMin} menit`
      );
    } catch (err) {
      console.error("handleCheckOut error:", err);
      Alert.alert("Error", "Gagal melakukan check out.");
    } finally {
      setCheckingInId(null);
      setIsLoading(false);
    }
  };

  // const handleUnscheduledVisit = async () => {
  //   if (!selectedCustomer) {
  //     Alert.alert("Pilih customer dulu");
  //     return;
  //   }
  //   try {
  //     setUnscheduledLoading(true);
  //     let { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== 'granted') {
  //       Alert.alert("Izin Lokasi Dibutuhkan", "Aplikasi memerlukan akses lokasi.");
  //       return;
  //     }
  //     const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  //     const lat = loc.coords.latitude;
  //     const lon = loc.coords.longitude;
  //     const acc = loc.coords.accuracy ?? 999;
  //     const selfie = await takeSelfieFront();
  //     if (!selfie) return;
  //     const res = await rksAPI.addUnscheduledVisit("1", {
  //       customerId: selectedCustomer.id,
  //       customerName: selectedCustomer.name,
  //       customerAddress: selectedCustomer.address,
  //       latitude: lat,
  //       longitude: lon,
  //       accuracy: acc,
  //       photo: selfie,
  //     });
  //     if (res.success) {
  //       setRksList((prev) => [res.rks, ...prev]);
  //       setModalType(null);
  //       setSelectedCustomer(null);
  //       const ares = await attendanceAPI.checkIn({
  //         photo: selfie,
  //         location: { latitude: lat, longitude: lon, accuracy: acc },
  //         address: selectedCustomer.address,
  //         shift: getCurrentShift(),
  //       });
  //       if (ares?.success && ares.record) await appendAttendanceLocal(ares.record as AttendanceRecord);
  //       addToQueue({
  //         type: "rks_additional",
  //         data: { rksId: res.rks.id, photo: "[local-uri]" },
  //         endpoint: `/api/rks/${res.rks.id}/additional`,
  //       });
  //       Alert.alert("Sukses", "Kunjungan tambahan dibuat dan check-in tercatat.");
  //     }
  //   } catch (err) {
  //     console.error("handleUnscheduledVisit error:", err);
  //     Alert.alert("Error", "Gagal membuat kunjungan tambahan.");
  //   } finally {
  //     setUnscheduledLoading(false);
  //   }
  // };

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

      // Validasi jarak ke lokasi customer
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
        const allowed = 150; // radius default untuk kunjungan tidak terjadwal

        if (dist > allowed) {
          Alert.alert(
            "Diluar Jarak",
            `Anda berada ${Math.round(
              dist
            )} m dari lokasi customer. Jarak maksimal ${allowed} m.\n\nLanjutkan check-in?`,
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

      // Jika dalam radius (atau tidak ada koordinat customer), lanjutkan langsung
      await proceedWithUnscheduledVisit(lat, lon, acc);
    } catch (err) {
      console.error("handleUnscheduledVisit error:", err);
      Alert.alert("Error", "Gagal membuat kunjungan tambahan.");
    } finally {
      setUnscheduledLoading(false);
    }
  };

  // Fungsi helper untuk melanjutkan proses kunjungan tidak terjadwal
  const proceedWithUnscheduledVisit = async (
    lat: number,
    lon: number,
    acc: number
  ) => {
    if (!selectedCustomer) return; // safety check

    try {
      const selfie = await takeSelfieFront();
      if (!selfie) return;

      const res = await rksAPI.addUnscheduledVisit("1", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerAddress: selectedCustomer.address,
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        photo: selfie,
      });

      if (res.success && res.rks) {
        if (res.rks !== undefined) {
          setRksList((prev) => [res.rks as RKS, ...prev]);
        }
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
        // Gunakan type guard atau akses aman ke 'error'
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
      const res = await rksAPI.addNewCustomerVisit("1", {
        name: newCustomer.name,
        address: newCustomer.address,
        phone: newCustomer.phone,
        type: newCustomer.type,
      });
      if (res.success) {
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

  const handleNoo = () => {
    router.push("/customers");
  };

  // 🔑 LOGIKA UTAMA: CEK APAKAH HARI INI
  const todayStr = new Date().toISOString().split("T")[0];

  const renderItem = ({ item }: { item: RKS }) => {
    const canCheckIn = !item.checkIn;
    const canCheckOut = !!item.checkIn && !item.checkOut;
    const isAnyCheckedIn = rksList.some((r) => r.checkIn && !r.checkOut);
    const isToday = item.scheduledDate === todayStr;

    return (
      <View style={styles.card}>
        {/* Tanggal + Hari */}
        <Text style={{ color: "#555", fontSize: 13, fontWeight: "600" }}>
          {new Intl.DateTimeFormat("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(item.scheduledDate))}
        </Text>

        {/* ID Customer */}
        <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
          No. Cust : {item.customerId}
        </Text>

        {/* Nama Customer */}
        <Text style={styles.title}>{item.customerName}</Text>

        {/* Alamat */}
        <Text style={{ color: "#666", marginTop: 6 }}>
          {item.customerAddress}
        </Text>

        {/* Waktu (opsional) */}
        {item.scheduledTime ? (
          <Text style={{ color: "#666", marginTop: 4, fontSize: 13 }}>
            {item.scheduledTime}
          </Text>
        ) : null}

        {/* Tombol Aksi */}
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
                (!isToday ||
                  checkingInId !== null ||
                  (isAnyCheckedIn && !canCheckOut)) && { opacity: 0.5 },
              ]}
              onPress={() => handleCheckIn(item)}
              disabled={
                !isToday ||
                checkingInId !== null ||
                (isAnyCheckedIn && !canCheckOut)
              }
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
                  <Text style={styles.primaryButtonText}>Check In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {canCheckOut && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#f44336" }]}
                onPress={() => handleCheckOut(item)}
              >
                <MaterialIcons name="logout" size={20} color="#fff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 4 }]}>
                  Check Out
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#ff9800" }]}
                onPress={handleCreateOrder}
              >
                <MaterialIcons name="shopping-cart" size={20} color="#fff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 4 }]}>
                  SO
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#607d8b" }]}
                onPress={() => openMemoModal(item)}
              >
                <MaterialIcons name="note" size={20} color="#fff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 4 }]}>
                  Catatan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#3f51b5" }]}
                onPress={() => handleOpenBesiKompetitor(item)}
              >
                <MaterialIcons name="build" size={20} color="#fff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 4 }]}>
                  Besi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: "#009688" }]}
                onPress={() =>
                  handleTagihan(item.customerId, item.customerName)
                }
              >
                <MaterialIcons name="receipt" size={20} color="#fff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 4 }]}>
                  Tagihan
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!canCheckIn && !canCheckOut && (
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
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ color: "#999" }}>Tidak ada RKS pada rentang ini.</Text>
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Hari ini</Text>
            </View>
          )}
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={(i) => setIndex(i)}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />

      {/* Draggable FAB */}
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

      {/* Modal Unscheduled */}
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
          <FlatList
            data={mockCustomers}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.customerItem,
                  selectedCustomer?.id === item.id && styles.selectedCustomer,
                ]}
                onPress={() => setSelectedCustomer(item)}
              >
                <Text style={{ fontWeight: "600" }}>
                  No Customer : {item.id}
                </Text>
                <Text style={{ fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: "#666" }}>{item.address}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
            style={{ flex: 1 }}
          />
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

      {/* Modal New Customer */}
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

      {/* Modal Memo */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  fabOption: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
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
  tooltipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  tabBar: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  badge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingBox: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  headerRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "white" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: "#fff", marginVertical: 8, padding: 14, borderRadius: 10, marginHorizontal: 4, elevation: 2 },
  title: { fontSize: 16, fontWeight: "700" },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: "white" },
  btnPrimary: { backgroundColor: "#667eea", padding: 12, borderRadius: 10, flex: 1, alignItems: "center", marginLeft: 8 },
  btnPrimaryText: { color: "white", fontWeight: "700" },
  btnSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10, flex: 1, alignItems: "center", marginRight: 8 },
  btnSecondaryText: { color: "#333", fontWeight: "700" },
  primaryButton: { flex: 1, borderRadius: 8, overflow: "hidden" },
  primaryButtonGradient: { padding: 10, alignItems: "center", borderRadius: 8 },
  primaryButtonText: { color: "white", fontWeight: "700" },
  dangerButton: { flex: 1, borderRadius: 8, overflow: "hidden" },
  disabledButton: { padding: 10, borderRadius: 8, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center" },
  modalContainer: { flex: 1, padding: 16, backgroundColor: "#f7f9fc" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: "white", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#eee", marginBottom: 12 },
  customerItem: { padding: 12, backgroundColor: "white", borderRadius: 8, marginBottom: 8, borderColor: "#eee", borderWidth: 1 },
  selectedCustomer: { backgroundColor: "#e8f5ff", borderColor: "#66a3ff" },
});