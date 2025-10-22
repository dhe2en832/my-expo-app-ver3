// app/customers/create.tsx - FIX TypeScript Errors
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineQueue } from "../../../contexts/OfflineContext";
import { customerAPI, salesAPI } from "@/api/services";
import { CustomerPhoto, MobileCustomer } from "@/api/interface";
import * as Location from "expo-location";
import CustomerPhotoCamera from "@/components/CustomerPhotoCamera";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { MobileFTPUploader } from "@/utils/mobileFTPUploader";

export default function CreateCustomer() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    forRKS?: string;
    onSuccess?: string;
  }>();

  // ✅ DETEKSI JIKA INI UNTUK RKS NOO
  const isForRKS = params.forRKS === "true";

  const [formData, setFormData] = useState({
    namaPemilik: "",
    namaToko: "",
    alamat: "",
    kota: "",
    nomorHp: "",
  });

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(true);
  // const [namaSales, setNamaSales] = useState<string>("");
  const [photos, setPhotos] = useState<CustomerPhoto[]>([]);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [photoSessionActive, setPhotoSessionActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // const getNamaSales = async () => {
  //   if (!user?.kodeSales) return "";

  //   try {
  //     const salesRes = await salesAPI.getSalesList(user.kodeSales);
  //     // console.log("📋 Sales data:", salesRes);

  //     if (salesRes.success && salesRes.data && salesRes.data.length > 0) {
  //       const salesData = salesRes.data[0];
  //       return salesData.nama_sales || user.name || "Sales";
  //     }
  //   } catch (error) {
  //     console.error("Error getting sales data:", error);
  //   }

  //   return user.name || "Sales";
  // };

  // ✅ Default photo types untuk customer baru
  const defaultPhotoTypes: CustomerPhoto["type"][] = [
    "selfie",
    "toko_depan",
    "toko_samping",
    "ktp",
  ];

  // ✅ Get current location saat component mount
  useEffect(() => {
    getCurrentLocation();
    // loadRKS();
  }, []);

  // const loadRKS = async () => {
  //   const salesName = user?.namaSales; //await getNamaSales();
  //   setNamaSales(salesName);
  // };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);

      // Request location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Lokasi Diperlukan",
          "Aplikasi membutuhkan akses lokasi untuk membuat customer baru."
        );
        setLocationLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      setLocation(location);
      setLocationLoading(false);
    } catch (error) {
      console.error("Error getting location:", error);
      setLocationLoading(false);
      Alert.alert("Error", "Gagal mendapatkan lokasi saat ini");
    }
  };

  // ✅ FUNCTION: Handle photo capture dari camera component
  const handlePhotosCapture = (capturedPhotos: CustomerPhoto[]) => {
    setPhotos(capturedPhotos);
    setPhotoSessionActive(false);
    console.log(`📸 ${capturedPhotos.length} foto berhasil diambil`);
  };

  // ✅ FUNCTION: Start photo session
  const startPhotoSession = () => {
    if (!formData.namaPemilik.trim()) {
      Alert.alert(
        "Perhatian",
        "Isi nama pemilik terlebih dahulu sebelum mengambil foto"
      );
      return;
    }

    if (locationLoading) {
      Alert.alert(
        "Perhatian",
        "Sedang mendapatkan lokasi GPS, tunggu sebentar..."
      );
      return;
    }

    if (!location) {
      Alert.alert("Error", "Lokasi GPS tidak tersedia. Pastikan GPS aktif.");
      return;
    }

    setCameraVisible(true);
    setPhotoSessionActive(true);
  };

  // ✅ FUNCTION: Remove individual photo
  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  // ✅ FUNCTION: Get photo status
  const getPhotoStatus = () => {
    const completedTypes = photos.map((photo) => photo.type);
    const remainingTypes = defaultPhotoTypes.filter(
      (type) => !completedTypes.includes(type)
    );

    return {
      completed: completedTypes.length,
      total: defaultPhotoTypes.length,
      remaining: remainingTypes.length,
      isComplete: remainingTypes.length === 0,
    };
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ✅ FUNCTION BARU: Upload photos ke FTP secara terpisah - FIX TYPE ERRORS
  // const uploadPhotosToFTP = async (
  //   kode_cust: string,
  //   kode_cabang: string
  // ): Promise<string[]> => {
  //   if (photos.length === 0) return [];

  //   setIsUploading(true);
  //   setUploadProgress(0);

  //   try {
  //     console.log(`📤 Mulai upload ${photos.length} photos ke FTP...`);

  //     const uploadedPaths = await MobileFTPUploader.uploadCustomerPhotos(
  //       photos,
  //       kode_cust,
  //       kode_cabang,
  //     );

  //     console.log(`✅ Semua photos berhasil diupload:`, uploadedPaths);
  //     return uploadedPaths;
  //   } catch (error: any) {
  //     console.error("❌ Gagal upload photos:", error);
  //     throw new Error(`Upload foto gagal: ${error.message}`);
  //   } finally {
  //     setIsUploading(false);
  //     setUploadProgress(0);
  //   }
  // };

  const handleSubmit = async () => {
    // Validasi form
    if (!formData.namaPemilik.trim() || !formData.alamat.trim()) {
      Alert.alert("Error", "Nama pemilik dan alamat harus diisi");
      return;
    }

    if (!user?.kodeSales) {
      Alert.alert("Error", "Data sales tidak ditemukan");
      return;
    }

    // ✅ Validasi foto jika untuk RKS NOO
    if (isForRKS) {
      const photoStatus = getPhotoStatus();
      if (!photoStatus.isComplete) {
        Alert.alert(
          "Foto Belum Lengkap",
          `Anda belum mengambil semua foto yang diperlukan. \n\nFoto yang masih diperlukan: ${photoStatus.remaining} dari ${photoStatus.total} foto.`,
          [
            { text: "Lanjutkan Ambil Foto", onPress: startPhotoSession },
            { text: "Tetap Lanjutkan", onPress: () => proceedWithSubmission() },
          ]
        );
        return;
      }
    }

    proceedWithSubmission();
  };

  // ✅ UPDATE: proceedWithSubmission dengan optimized flow - FIX TYPE ERRORS
  // Di dalam CreateCustomer component - UPDATE proceedWithSubmission
  const proceedWithSubmission = async () => {
    setLoading(true);

    try {
      if (!user?.kodeSales) {
        throw new Error("Kode sales tidak tersedia");
      }

      // Step 1: Buat customer dulu tanpa photos (hanya data dasar)
      const customerData: Partial<MobileCustomer> & {
        photos?: any[];
        latitude?: number;
        longitude?: number;
        accuracy?: number | null;
      } = {
        nama_relasi: formData.namaPemilik,
        alamat: formData.alamat,
        kota: formData.kota || "",
        propinsi: "",
        hp: formData.nomorHp || "",
        email: "",
        kode_sales: user.kodeSales,
        alamat_kirim1: formData.alamat,
        kota_kirim: formData.kota || "",
        userid: user.userid || "MOBILE_USER",
        // ✅ Photos sementara dikosongkan - akan diupload sebagai ZIP terpisah
        photos: [],
        // ✅ GPS data - handle null accuracy
        ...(location && {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        }),
      };

      console.log("📤 Step 1: Membuat customer data dasar...");

      const result = await customerAPI.createMobileCustomerWithRelasi(
        customerData
      );

      // ✅ FIX: Handle API response type properly
      if (!result.success || !result.data) {
        const errorMessage = result.error || "Gagal membuat customer di server";
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "❌ Error create customer",
            body: errorMessage,
            sound: "new-notification.mp3",
          },
          trigger: null,
        });
        throw new Error(errorMessage);
      }

      const customerResult = result.data;
      const { kode_relasi, kode_cust, no_cust } = customerResult;

      console.log("✅ Customer berhasil dibuat:", { kode_cust, kode_relasi });

      // Step 2: Upload photos ke FTP sebagai ZIP jika ada
      let uploadedZipPath: string | null = null;
      if (photos.length > 0 && kode_cust) {
        console.log("📤 Step 2: Upload photos sebagai ZIP ke FTP...");

        // ✅ FIX: Handle kodeCabang yang mungkin undefined dengan fallback yang aman
        const kode_cabang = user.kodeCabang;
        // (user as any).kodeCabang || user.kodeSales?.substring(0, 3) || "DEF";
        // Siapkan location data untuk watermark
        const locationData = location
          ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || 0,
            }
          : null;

        try {
          // ✅ PREPARE PHOTOS DATA DENGAN WATERMARK INFO
          const photosWithWatermark = photos.map((photo) => ({
            ...photo,
            // ✅ Pastikan watermarkData ada
            watermarkData: photo.watermarkData || {
              customerName: formData.namaPemilik,
              salesName: user.namaSales || user.nama_user || "Sales",
              locationText: location
                ? `📍 ${location.coords.latitude.toFixed(
                    6
                  )}, ${location.coords.longitude.toFixed(6)}`
                : "Lokasi tidak tersedia",
              accuracyText: location?.coords.accuracy
                ? getAccuracyText(location.coords.accuracy)
                : "Akurasi tidak tersedia",
              checkType: "NOO_CUSTOMER",
            },
          }));

          console.log(
            "🖼️ Photos dengan watermark data:",
            photosWithWatermark.map((p) => ({
              type: p.type,
              hasWatermarkData: !!p.watermarkData,
            }))
          );

          // ✅ UPLOAD SEMUA PHOTOS SEBAGAI ZIP
          uploadedZipPath = await MobileFTPUploader.uploadCustomerPhotosAsZip(
            photosWithWatermark, // ✅ Kirim photos dengan watermark data
            kode_cust,
            kode_cabang,
            formData.namaToko,
            user.namaSales || user.nama_user || "Sales",
            location
              ? {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  accuracy: location.coords.accuracy || 0,
                }
              : null
          );
          // Step 3: Update customer dengan ZIP path
          if (uploadedZipPath) {
            console.log("📤 Step 3: Update customer dengan ZIP path...");

            try {
              const updateResult = await customerAPI.updateCustomerPhotos(
                kode_cust,
                [uploadedZipPath] // Kirim array dengan single ZIP path
              );

              if (!updateResult.success) {
                console.warn(
                  "⚠️ Gagal update ZIP path, tapi customer sudah dibuat"
                );
              } else {
                console.log("✅ ZIP path berhasil diupdate di database");
              }
            } catch (updateError: any) {
              console.warn("⚠️ Error update ZIP path:", updateError);
              // Continue anyway karena customer sudah dibuat
            }
          }
        } catch (uploadError: any) {
          console.error("❌ FE ZIP upload failed:", uploadError);

          // Tetap lanjut meski upload gagal, customer sudah tersimpan
          Alert.alert(
            "Upload Foto Gagal",
            "Customer berhasil dibuat, tetapi upload foto gagal. Foto dapat diupload ulang nanti.",
            [{ text: "OK" }]
          );
        }
      }

      // ✅ Helper function untuk accuracy text (sama seperti di camera)
      const getAccuracyText = (accuracy: number) => {
        if (accuracy < 10)
          return `Akurasi: ${accuracy.toFixed(1)}m (Sangat Baik)`;
        if (accuracy < 25) return `Akurasi: ${accuracy.toFixed(1)}m (Baik)`;
        if (accuracy < 50) return `Akurasi: ${accuracy.toFixed(1)}m (Cukup)`;
        if (accuracy < 100) return `Akurasi: ${accuracy.toFixed(1)}m (Sedang)`;
        return `Akurasi: ${accuracy.toFixed(1)}m (Rendah)`;
      };

      // ✅ FIX: Handle null accuracy untuk RKS params
      const rksCustomerData = {
        kode_relasi: kode_relasi || "",
        kode_cust: kode_cust || "",
        no_cust: no_cust || "",
        nama_cust: formData.namaToko
          ? `${formData.namaPemilik} / ${formData.namaToko}`
          : formData.namaPemilik,
        alamat_kirim1: formData.alamat,
        kota_kirim: formData.kota || "Tidak diketahui",
        phone: formData.nomorHp || "",
        kode_sales: user.kodeSales,
        mobile_created: "Y",
        photos: uploadedZipPath ? [uploadedZipPath] : [], // ✅ ZIP path
        latitude: customerData.latitude?.toString() || "",
        longitude: customerData.longitude?.toString() || "",
        accuracy: (customerData.accuracy ?? 0).toString(),
        photo_count: photos.length,
        photo_path: uploadedZipPath || "", // ✅ ZIP path
      };

      console.log("🎯 Persistent customer created:", rksCustomerData);

      if (isForRKS) {
        router.push({
          pathname: "/(tabs)/rks",
          params: {
            newNooCustomer: JSON.stringify(rksCustomerData),
          },
        });
      } else {
        router.push({
          pathname: "/customers",
          params: {
            successMessage:
              "Customer berhasil dibuat" +
              (uploadedZipPath
                ? ` dengan ${photos.length} foto dalam ZIP`
                : ""),
          },
        });
      }
    } catch (error: any) {
      console.error("Error creating customer:", error);
      Alert.alert("Error", error.message || "Gagal membuat customer");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (photos.length > 0) {
      Alert.alert(
        "Batalkan Pembuatan Customer?",
        "Semua foto yang sudah diambil akan hilang. Yakin ingin membatalkan?",
        [
          { text: "Lanjutkan Edit", style: "cancel" },
          {
            text: "Ya, Batalkan",
            style: "destructive",
            onPress: () => {
              if (isForRKS) {
                router.back();
              } else {
                router.push("/customers");
              }
            },
          },
        ]
      );
    } else {
      if (isForRKS) {
        router.back();
      } else {
        router.push("/customers");
      }
    }
  };

  const photoStatus = getPhotoStatus();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Pelangan Baru",
          }}
        />

        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Info untuk RKS NOO */}
          {isForRKS && (
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                Customer akan langsung masuk ke proses check-in RKS
              </Text>
            </View>
          )}

          {/* GPS Status */}
          <View
            style={[
              styles.gpsStatus,
              locationLoading
                ? styles.gpsStatusLoading
                : location
                ? styles.gpsStatusReady
                : styles.gpsStatusError,
            ]}
          >
            <MaterialIcons
              name="location-on"
              size={16}
              color={
                locationLoading ? "#FF9800" : location ? "#4CAF50" : "#F44336"
              }
            />
            <Text style={styles.gpsStatusText}>
              {locationLoading
                ? "Mendapatkan lokasi..."
                : location
                ? `Lokasi siap (Akurasi: ${location.coords.accuracy?.toFixed(
                    1
                  )}m)`
                : "Lokasi tidak tersedia"}
            </Text>
            {locationLoading && (
              <ActivityIndicator size="small" color="#FF9800" />
            )}
          </View>

          {/* Sales Info */}
          <View style={styles.salesInfo}>
            <Text style={styles.salesLabel}>Sales:</Text>
            <Text style={styles.salesName}>
              {user?.namaSales || user?.nama_user || "Sales"}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Pemilik *</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama pemilik"
              value={formData.namaPemilik}
              onChangeText={(text) => handleInputChange("namaPemilik", text)}
              editable={!loading && !isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Toko</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama toko (opsional)"
              value={formData.namaToko}
              onChangeText={(text) => handleInputChange("namaToko", text)}
              editable={!loading && !isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alamat *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Masukkan alamat lengkap"
              value={formData.alamat}
              onChangeText={(text) => handleInputChange("alamat", text)}
              multiline
              numberOfLines={3}
              editable={!loading && !isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kota</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kota"
              value={formData.kota}
              onChangeText={(text) => handleInputChange("kota", text)}
              editable={!loading && !isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor HP</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nomor HP"
              value={formData.nomorHp}
              onChangeText={(text) => handleInputChange("nomorHp", text)}
              keyboardType="phone-pad"
              editable={!loading && !isUploading}
            />
          </View>

          {/* ✅ Photo Session Section */}
          <View style={styles.photoSection}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.photoSectionTitle}>Dokumentasi Foto</Text>
              <View style={styles.photoStatus}>
                <Text style={styles.photoStatusText}>
                  {photoStatus.completed}/{photoStatus.total} foto
                </Text>
                {photoStatus.isComplete && (
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#4CAF50"
                  />
                )}
              </View>
            </View>

            <Text style={styles.photoSectionSubtitle}>
              Foto yang diperlukan: Selfie, Toko Depan, Toko Samping, KTP
            </Text>

            {/* Upload Progress Indicator */}
            {isUploading && (
              <View style={styles.uploadProgressContainer}>
                <Text style={styles.uploadProgressText}>
                  Mengupload foto... {Math.round(uploadProgress * 100)}%
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${uploadProgress * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Photo Action Buttons */}
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  (!formData.namaPemilik ||
                    locationLoading ||
                    !location ||
                    isUploading) &&
                    styles.photoButtonDisabled,
                ]}
                onPress={startPhotoSession}
                disabled={
                  !formData.namaPemilik ||
                  locationLoading ||
                  !location ||
                  isUploading
                }
              >
                <MaterialIcons name="photo-camera" size={24} color="#fff" />
                <Text style={styles.photoButtonText}>
                  {photos.length === 0 ? "Ambil Foto" : "Tambah/Edit Foto"}
                </Text>
              </TouchableOpacity>

              {photos.length > 0 && !isUploading && (
                <TouchableOpacity
                  style={styles.clearPhotosButton}
                  onPress={() => setPhotos([])}
                >
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                  <Text style={styles.clearPhotosText}>Hapus Semua</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Photos Preview */}
            {photos.length > 0 && (
              <View style={styles.photosPreview}>
                <Text style={styles.photosPreviewTitle}>Foto Terambil:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {photos.map((photo) => (
                    <View key={photo.id} style={styles.photoPreviewItem}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photoPreviewImage}
                      />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(photo.id)}
                        disabled={isUploading}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.photoPreviewLabel}>
                        {getPhotoTypeLabel(photo.type)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading || isUploading}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!formData.namaPemilik.trim() ||
                  !formData.alamat.trim() ||
                  isUploading) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                loading ||
                isUploading ||
                !formData.namaPemilik.trim() ||
                !formData.alamat.trim()
              }
            >
              {loading || isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isForRKS ? "Lanjut Check-in" : "Simpan Customer"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ✅ Customer Photo Camera Component */}
        <CustomerPhotoCamera
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          onPhotosCapture={handlePhotosCapture}
          customerName={formData.namaPemilik || "Customer Baru"}
          salesName={user?.namaSales || user?.nama_user || "Sales"}
          photoTypes={defaultPhotoTypes}
          initialPhotos={photos}
        />
      </View>
    </SafeAreaView>
  );
}

// ✅ Helper functions
const getPhotoTypeLabel = (type: CustomerPhoto["type"]): string => {
  const labels = {
    selfie: "Selfie",
    toko_depan: "Toko Depan",
    toko_samping: "Toko Samping",
    ktp: "KTP",
    lainnya: "Lainnya",
  };
  return labels[type];
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  formContainer: { flex: 1, padding: 16 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: { marginLeft: 8, color: "#1976d2", fontSize: 14, flex: 1 },
  gpsStatus: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  gpsStatusLoading: { backgroundColor: "#fff3cd" },
  gpsStatusReady: { backgroundColor: "#e8f5e8" },
  gpsStatusError: { backgroundColor: "#fdecea" },
  gpsStatusText: { marginLeft: 8, fontSize: 14, fontWeight: "600", flex: 1 },
  salesInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  salesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginRight: 8,
  },
  salesName: { fontSize: 14, color: "#4CAF50", fontWeight: "bold" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  photoSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  photoSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  photoSectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  photoStatus: { flexDirection: "row", alignItems: "center" },
  photoStatusText: { fontSize: 14, color: "#666", marginRight: 4 },
  photoSectionSubtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  uploadProgressContainer: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadProgressText: {
    fontSize: 14,
    color: "#2196F3",
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2196F3",
    borderRadius: 3,
  },
  photoActions: { flexDirection: "row", alignItems: "center" },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#667eea",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  photoButtonDisabled: { backgroundColor: "#ccc", opacity: 0.6 },
  photoButtonText: { color: "#fff", fontWeight: "600", marginLeft: 8 },
  clearPhotosButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  clearPhotosText: { color: "#F44336", fontWeight: "600", marginLeft: 4 },
  photosPreview: { marginTop: 16 },
  photosPreviewTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  photoPreviewItem: { alignItems: "center", marginHorizontal: 5 },
  photoPreviewImage: { width: 80, height: 80, borderRadius: 8 },
  removePhotoButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#f44336",
    borderRadius: 10,
    padding: 4,
  },
  photoPreviewLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: { backgroundColor: "#f5f5f5", marginRight: 8 },
  cancelButtonText: { color: "#666", fontWeight: "600", fontSize: 16 },
  submitButton: { backgroundColor: "#667eea", marginLeft: 8 },
  submitButtonDisabled: { backgroundColor: "#ccc", opacity: 0.6 },
  submitButtonText: { color: "white", fontWeight: "600", fontSize: 16 },
});
