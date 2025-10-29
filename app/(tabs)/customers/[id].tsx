// app/customers/[id].tsx - IMPROVED WITH MULTIPLE PHOTOS
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
  Modal,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { customerAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
// import { CustomerList as CustomerListType } from "@/api/interface";
// import CustomerPhotoCamera from "@/components/CustomerPhotoCamera";
import { MobileCustomer } from "@/api/interface"; // ✅ Gunakan MobileCustomer
import CustomerPhotoCamera from "@/components/CustomerPhotoCamera";
import { MobileFTPUploader } from "@/utils/mobileFTPUploader";
import * as Location from "expo-location";

interface CustomerFormData {
  // nama_cust: string;
  // alamat_kirim1: string;
  // kota_kirim: string;
  // hp?: string;
  // email?: string;
  // kode_pos?: string;
  // propinsi_kirim?: string;
  namaPemilik: string;
  namaToko: string;
  alamat: string;
  kota: string;
  nomorHp: string;
  email: string;
  kode_pos: string;
  propinsi: string;
}

interface CustomerPhoto {
  id: string;
  type: "selfie" | "toko_depan" | "toko_samping" | "ktp" | "lainnya";
  uri: string;
  base64?: string;
  filename: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  watermarkData?: {
    customerName: string;
    salesName: string;
    locationText: string;
    accuracyText: string;
    checkType: string;
  };
}

export default function EditCustomer() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    kode_relasi?: string;
    nama_cust?: string;
    alamat_kirim1?: string;
    kota_kirim?: string;
    phone?: string;
    no_cust?: string;
    status_sumber?: string;
    propinsi_kirim?: string;
    lat_kirim?: string;
    long_kirim?: string;
    filegambar?: string;
  }>();

  const kode_cust = params.id;
  const kode_relasi = params.kode_relasi;

  const [formData, setFormData] = useState<CustomerFormData>({
    namaPemilik: "",
    namaToko: "",
    alamat: "",
    kota: "",
    nomorHp: "",
    email: "",
    kode_pos: "",
    propinsi: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<MobileCustomer | null>(null);
  const [originalData, setOriginalData] = useState<CustomerFormData | null>(
    null
  );

  // ✅ Photo States
  const [existingPhotos, setExistingPhotos] = useState<CustomerPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<CustomerPhoto[]>([]);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [photoPreviewLoading, setPhotoPreviewLoading] = useState(false);
  // ✅ Default photo types (sama seperti create)
  const defaultPhotoTypes: CustomerPhoto["type"][] = [
    "selfie",
    "toko_depan",
    "toko_samping",
    "ktp",
    "lainnya",
  ];

  useEffect(() => {
    resetForm(); // kosongkan state form dan foto
    loadCustomerData(); // fetch data baru
  }, [kode_cust]);

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    };
    getLocation();
  }, []);

  // Load customer data
  useEffect(() => {
    loadCustomerData();
  }, [kode_cust]);

  useEffect(() => {
    console.log("🔄 existingPhotos updated:", existingPhotos.length, "photos");
  }, [existingPhotos]);

  // ✅ Reset form data dan photos - PERBAIKAN
  const resetForm = () => {
    setFormData({
      namaPemilik: "",
      namaToko: "",
      alamat: "",
      kota: "",
      nomorHp: "",
      email: "",
      kode_pos: "",
      propinsi: "",
    });
    setExistingPhotos([]); // ✅ PASTIKAN INI DIKOSONGKAN
    setNewPhotos([]);
    setOriginalData(null);
    setCustomer(null);
    setSelectedPhoto(null);
  };

  const loadCustomerData = async () => {
    // ✅ Reset form sebelum load data baru - GUNAKAN FUNCTIONAL UPDATE
    resetForm();
    setPhotoPreviewLoading(true);

    if (!kode_cust) {
      Alert.alert("Error", "Kode customer tidak ditemukan");
      router.back();
      setPhotoPreviewLoading(false);
      return;
    }

    try {
      setLoading(true);

      // ✅ PASTIKAN existingPhotos KOSONG dengan functional update
      setExistingPhotos([]);

      const customerRes = await customerAPI.getDetailCustomerCombined(
        kode_cust
      );
      if (!customerRes.success || !customerRes.data) {
        throw new Error("Customer tidak ditemukan");
      }

      const customerData = customerRes.data;
      setCustomer(customerData);

      // Load dari params
      const formData: CustomerFormData = {
        namaPemilik: customerData.nama_cust?.split(" / ")[0] || "",
        namaToko: customerData.nama_cust?.includes(" / ")
          ? customerData.nama_cust.split(" / ")[1]
          : "",
        alamat: customerData.alamat_kirim1 || "",
        kota: customerData.kota_kirim || "",
        nomorHp: customerData.hp || "",
        email: "",
        kode_pos: "",
        propinsi: customerData.propinsi_kirim || "",
      };

      setFormData(formData);
      setOriginalData(formData);

      // ✅ Load existing photos hanya jika filegambar ada - PERBAIKI DENGAN TIMEOUT
      if (customerData.filegambar && customerData.filegambar.trim() !== "") {
        try {
          console.log("📥 Loading photos from:", customerData.filegambar);

          const previewRes = await customerAPI.previewCustomerPhotos(
            customerData.filegambar
          );

          console.log("📸 Preview response:", previewRes);

          if (
            previewRes.success &&
            previewRes.photos &&
            previewRes.photos.length > 0
          ) {
            // ✅ FILTER OUT METADATA FILE
            const photoFiles = previewRes.photos.filter(
              (photo) =>
                !photo.filename.includes("metadata.json") &&
                !photo.type.includes(".") &&
                photo.type !== "." &&
                photo.filename !== "metadata.json"
            );

            const existing: CustomerPhoto[] = photoFiles.map((photo, index) => {
              // ✅ HAPUS QUERY PARAMETER DARI URL
              const cleanUri = photo.url.split("?")[0];
              const originalUri = photo.url;
              return {
                id: `existing-${Date.now()}-${index}`,
                uri: originalUri, // ✅ GUNAKAN URL BERSIH
                type: photo.type as any,
                filename: photo.filename,
                timestamp: new Date().toISOString(),
              };
            });

            console.log(
              `✅ Loaded ${existing.length} existing photos after filtering`
            );

            // ✅ GUNAKAN setTimeout UNTUK MEMASTIKAN STATE UPDATE
            setTimeout(() => {
              setExistingPhotos(existing);
            }, 0);
          } else {
            console.log("ℹ️ No photos found in preview response");
            setExistingPhotos([]);
          }
        } catch (photoError: any) {
          console.warn("⚠️ Gagal memuat foto existing:", photoError.message);
          setExistingPhotos([]);
        }
      } else {
        console.log("ℹ️ No filegambar found for customer");
        setExistingPhotos([]);
      }
    } catch (error: any) {
      console.error("Error loading customer data:", error);
      Alert.alert("Error", "Gagal memuat data customer");
      setExistingPhotos([]);
    } finally {
      setLoading(false);
      setPhotoPreviewLoading(false);
    }
  };

  // ✅ Juga pastikan handleBack mereset form
  const handleBack = () => {
    if (hasChanges()) {
      Alert.alert(
        "Perubahan Belum Disimpan",
        "Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Keluar",
            style: "destructive",
            onPress: () => {
              resetForm(); // ✅ PASTIKAN RESET FORM
              router.back();
            },
          },
        ]
      );
    } else {
      resetForm(); // ✅ PASTIKAN RESET FORM MESKI TIDAK ADA PERUBAHAN
      router.back();
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!originalData) return false;

    return (
      formData.namaPemilik !== originalData.namaPemilik ||
      formData.namaToko !== originalData.namaToko ||
      formData.alamat !== originalData.alamat ||
      formData.kota !== originalData.kota ||
      formData.nomorHp !== originalData.nomorHp ||
      formData.email !== originalData.email ||
      formData.kode_pos !== originalData.kode_pos ||
      formData.propinsi !== originalData.propinsi ||
      newPhotos.length > 0
    );
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.namaPemilik.trim()) {
      Alert.alert("Error", "Nama pemilik harus diisi");
      return false;
    }
    if (!formData.alamat.trim()) {
      Alert.alert("Error", "Alamat harus diisi");
      return false;
    }
    return true;
  };

  // ✅ Handle photo selection from gallery (multiple)
  const handleAddPhotosFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin diperlukan",
          "Izin akses gallery diperlukan untuk menambah foto"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // ✅ Enable multiple selection
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: 10, // ✅ Max 10 photos
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotosList: CustomerPhoto[] = result.assets.map(
          (asset, index) => ({
            id: `gallery-${Date.now()}-${index}`,
            uri: asset.uri,
            type: "lainnya", // Default type
            filename: `gallery_${Date.now()}_${index}.jpg`,
            timestamp: new Date().toISOString(),
          })
        );

        setNewPhotos((prev) => [...prev, ...newPhotosList]);

        Alert.alert(
          "Foto Ditambahkan",
          `${result.assets.length} foto berhasil ditambahkan dari gallery`
        );
      }
    } catch (error) {
      console.error("Error picking photos:", error);
      Alert.alert("Error", "Gagal memilih foto");
    }
  };

  // ✅ Handle camera photos capture (multiple)
  const handleCameraPhotosCapture = (capturedPhotos: CustomerPhoto[]) => {
    setNewPhotos((prev) => [...prev, ...capturedPhotos]);
    setCameraVisible(false);
    console.log(
      `📸 ${capturedPhotos.length} foto berhasil diambil dari kamera`
    );
  };

  // ✅ Start camera session
  const startCameraSession = () => {
    if (!formData.namaPemilik.trim()) {
      Alert.alert(
        "Perhatian",
        "Isi nama customer terlebih dahulu sebelum mengambil foto"
      );
      return;
    }

    setCameraVisible(true);
  };

  // ✅ Handle photo removal
  const handleRemoveNewPhoto = (photoId: string) => {
    setNewPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  const handleRemoveExistingPhoto = (photoId: string) => {
    Alert.alert("Hapus Foto", "Yakin ingin menghapus foto ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          setExistingPhotos((prev) =>
            prev.filter((photo) => photo.id !== photoId)
          );
        },
      },
    ]);
  };

  // ✅ Handle photo view
  const handleViewPhoto = (photoUri: string) => {
    // console.log("🖼️ Viewing photo:", photoUri);
    // console.log("existingPhotos XXXXXXX ", existingPhotos);

    // ✅ COBA DUA VERSI URL: ASLI DAN CLEAN
    const urlsToTry = [
      photoUri, // URL asli dengan query parameter
      photoUri.split("?")[0], // URL tanpa query parameter (fallback)
    ];

    setSelectedPhoto(urlsToTry[0]); // Coba yang asli dulu
    setPhotoModalVisible(true);
  };

  // ✅ Get photo status (sama seperti create)
  const getPhotoStatus = () => {
    const allPhotos = [...existingPhotos, ...newPhotos];
    const completedTypes = allPhotos.map((photo) => photo.type);
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

  // ✅ Helper function untuk accuracy text (sama seperti di camera)
  const getAccuracyText = (accuracy: number) => {
    if (accuracy < 10) return `Akurasi: ${accuracy.toFixed(1)}m (Sangat Baik)`;
    if (accuracy < 25) return `Akurasi: ${accuracy.toFixed(1)}m (Baik)`;
    if (accuracy < 50) return `Akurasi: ${accuracy.toFixed(1)}m (Cukup)`;
    if (accuracy < 100) return `Akurasi: ${accuracy.toFixed(1)}m (Sedang)`;
    return `Akurasi: ${accuracy.toFixed(1)}m (Rendah)`;
  };

  let uploadedZipPath: string | null = null;
  // ✅ UPLOAD FOTO BARU SEBAGAI ZIP
  const uploadNewPhotos = async (): Promise<string | null> => {
    if (newPhotos.length === 0) return null;
    setUploadingPhotos(true);
    try {
      const photosWithWatermark = newPhotos.map((photo) => ({
        ...photo,
        // ✅ Pastikan watermarkData ada
        watermarkData: photo.watermarkData || {
          customerName: formData.namaPemilik,
          salesName: user?.namaSales || user?.nama_user || "Sales",
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

      // const photosData = await Promise.all(
      //   newPhotos.map(async (photo) => {
      //     const response = await fetch(photo.uri);
      //     const blob = await response.blob();
      //     const base64 = await new Promise<string>((resolve) => {
      //       const reader = new FileReader();
      //       reader.onload = () =>
      //         resolve((reader.result as string).split(",")[1]);
      //       reader.readAsDataURL(blob);
      //     });
      //     return {
      //       type: photo.type,
      //       base64: `image/jpeg;base64,${base64}`,
      //     };
      //   })
      // );

      const kode_cabang = user?.kodeCabang;

      uploadedZipPath = await MobileFTPUploader.uploadCustomerPhotosAsZip(
        photosWithWatermark, // ✅ Kirim photos dengan watermark data
        kode_cust,
        kode_cabang?.toString() || "",
        formData.namaToko,
        user?.namaSales || user?.nama_user || "Sales",
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
    } catch (error) {
      console.error("Error uploading photos as ZIP:", error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
    setUploadingPhotos(false);
    return uploadedZipPath;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;
    if (!hasChanges()) {
      Alert.alert("Info", "Tidak ada perubahan yang disimpan");
      return;
    }
    setSaving(true);
    try {
      const updateData = {
        kode_cust,
        nama_relasi: formData.namaPemilik,
        nama_cust: formData.namaToko
          ? `${formData.namaPemilik} / ${formData.namaToko}`
          : formData.namaPemilik,
        alamat: formData.alamat,
        kota: formData.kota,
        propinsi: formData.propinsi,
        hp: formData.nomorHp,
        email: formData.email,
        kode_pos: formData.kode_pos,
        alamat_kirim1: formData.alamat,
        kota_kirim: formData.kota,
        propinsi_kirim: formData.propinsi,
        userid: user?.userid || "MOBILE_USER",
      };

      let finalZipPath = customer?.photo_path || "";
      if (newPhotos.length > 0) {
        const newZipPath = await uploadNewPhotos();
        if (newZipPath) {
          finalZipPath = newZipPath;
        }
      }

      const updateRes = await customerAPI.updateCustomerWithPhotos({
        ...updateData,
        photo_path: finalZipPath,
        photo_count: existingPhotos.length + newPhotos.length,
      });

      if (updateRes.success) {
        Alert.alert("Sukses", "Data customer berhasil diperbarui");
        setOriginalData(formData);
        if (newPhotos.length > 0 && finalZipPath) {
          const previewRes = await customerAPI.previewCustomerPhotos(
            finalZipPath
          );
          if (previewRes.success && previewRes.photos) {
            const updatedExisting: CustomerPhoto[] = previewRes.photos.map(
              (photo) => ({
                id: `existing-${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 9)}`,
                uri: photo.url,
                type: photo.type as any,
                filename: photo.filename,
                timestamp: new Date().toISOString(),
              })
            );
            setExistingPhotos(updatedExisting);
          }
        }
        setNewPhotos([]);
        router.back();
      } else {
        throw new Error(updateRes.error || "Gagal update customer");
      }
    } catch (error: any) {
      console.error("Error saving customer:", error);
      Alert.alert("Error", error.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  // Handle back with confirmation if there are changes
  const photoStatus = getPhotoStatus();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat data customer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Edit Pelanggan",
            headerLeft: () => (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleBack}
              >
                <MaterialIcons name="arrow-back" size={24} color="#667eea" />
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Customer Info Header */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                Edit data customer {formData.namaPemilik}
              </Text>
              <Text style={styles.infoSubtext}>
                Kode: {kode_cust} {kode_relasi && `• Relasi: ${kode_relasi}`}
              </Text>
              {params.no_cust && (
                <Text style={styles.infoSubtext}>
                  No: {params.no_cust} • Status:{" "}
                  {params.status_sumber || "Existing"}
                </Text>
              )}
            </View>
          </View>

          {/* Sales Info */}
          <View style={styles.salesInfo}>
            <Text style={styles.salesLabel}>Sales:</Text>
            <Text style={styles.salesName}>
              {user?.namaSales || user?.nama_user || "Sales"}
            </Text>
          </View>

          {/* ✅ Enhanced Photo Section */}
          <View style={styles.photoSection}>
            <View style={styles.photoSectionHeader}>
              <Text style={styles.photoSectionTitle}>Dokumentasi Foto</Text>
              <View style={styles.photoStatus}>
                <Text style={styles.photoStatusText}>
                  {photoStatus.completed} foto
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
              Foto yang disarankan: Selfie, Toko Depan, Toko Samping, KTP
            </Text>

            {/* Photo Action Buttons */}
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={startCameraSession}
                disabled={!formData.namaPemilik}
              >
                <MaterialIcons name="photo-camera" size={20} color="#fff" />
                <Text style={styles.photoButtonText}>Ambil Foto Baru</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoButton, styles.galleryButton]}
                onPress={handleAddPhotosFromGallery}
              >
                <MaterialIcons name="photo-library" size={20} color="#fff" />
                <Text style={styles.photoButtonText}>Pilih dari Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* ✅ Loading saat download ZIP */}
            {photoPreviewLoading && (
              <View style={styles.photoLoadingContainer}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.photoLoadingText}>Memuat foto...</Text>
              </View>
            )}

            {/* Upload Progress */}
            {uploadingPhotos && (
              <View style={styles.uploadProgress}>
                <Text style={styles.uploadProgressText}>
                  Mengupload {newPhotos.length} foto...
                </Text>
                <ActivityIndicator size="small" color="#667eea" />
              </View>
            )}

            {/* Existing Photos */}

            {!loading && !photoPreviewLoading && existingPhotos.length > 0 && (
              <View style={styles.photosContainer}>
                <Text style={styles.photosTitle}>
                  Foto Existing ({existingPhotos.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {existingPhotos.map((photo) => (
                    <View key={photo.id} style={styles.photoItem}>
                      <TouchableOpacity
                        onPress={() => handleViewPhoto(photo.uri)}
                      >
                        {/* ✅ GUNAKAN IMAGE UNTUK FOTO EXISTING JUGA */}
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoImage}
                          onError={(e) => {
                            console.log("❌ Error loading image:", photo.uri);
                            // Fallback ke placeholder jika error
                            const fallbackUri = photo.uri.split("?")[0];
                          }}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemoveExistingPhoto(photo.id)}
                      >
                        <MaterialIcons name="delete" size={14} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>
                        {photo.type.replace("_", " ")}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {!loading &&
              !photoPreviewLoading &&
              existingPhotos.length === 0 &&
              customer?.photos && (
                <View style={styles.infoBox}>
                  <MaterialIcons name="info" size={20} color="#2196F3" />
                  <Text style={styles.infoText}>
                    Foto tersedia tapi belum bisa dimuat. Coba refresh halaman.
                  </Text>
                </View>
              )}

            {/* New Photos */}
            {newPhotos.length > 0 && (
              <View style={styles.photosContainer}>
                <Text style={styles.photosTitle}>
                  Foto Baru ({newPhotos.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {newPhotos.map((photo) => (
                    <View key={photo.id} style={styles.photoItem}>
                      <TouchableOpacity
                        onPress={() => handleViewPhoto(photo.uri)}
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoImage}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemoveNewPhoto(photo.id)}
                      >
                        <MaterialIcons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>
                        {photo.type.replace("_", " ")}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {!photoPreviewLoading &&
              existingPhotos.length === 0 &&
              newPhotos.length === 0 && (
                <View style={styles.noPhotos}>
                  <MaterialIcons name="photo-library" size={48} color="#ccc" />
                  <Text style={styles.noPhotosText}>Belum ada foto</Text>
                  <Text style={styles.noPhotosSubtext}>
                    Tambahkan foto untuk dokumentasi customer yang lengkap
                  </Text>
                </View>
              )}
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Customer *</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama customer"
              value={formData.namaPemilik}
              onChangeText={(text) => handleInputChange("namaPemilik", text)}
              editable={!saving}
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
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kota *</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kota"
              value={formData.kota}
              onChangeText={(text) => handleInputChange("kota", text)}
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Propinsi</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan propinsi"
              value={formData.propinsi}
              onChangeText={(text) => handleInputChange("propinsi", text)}
              editable={!saving}
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
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email"
              value={formData.email}
              onChangeText={(text) => handleInputChange("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kode Pos</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kode pos"
              value={formData.kode_pos}
              onChangeText={(text) => handleInputChange("kode_pos", text)}
              keyboardType="numeric"
              editable={!saving}
            />
          </View>

          {/* Change Indicator */}
          {hasChanges() && (
            <View style={styles.changesIndicator}>
              <MaterialIcons name="warning" size={16} color="#FF9800" />
              <Text style={styles.changesText}>
                Ada perubahan yang belum disimpan
                {newPhotos.length > 0 && ` (${newPhotos.length} foto baru)`}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleBack}
              disabled={saving || uploadingPhotos}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (!hasChanges() || saving || uploadingPhotos) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasChanges() || saving || uploadingPhotos}
            >
              {saving || uploadingPhotos ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Simpan
                  {newPhotos.length > 0 && ` +${newPhotos.length}foto`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ✅ Customer Photo Camera Component */}
        <CustomerPhotoCamera
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          onPhotosCapture={handleCameraPhotosCapture}
          customerName={formData.namaPemilik || "Customer"}
          salesName={user?.namaSales || user?.nama_user || "Sales"}
          photoTypes={defaultPhotoTypes}
          initialPhotos={[]} // Start fresh for new photos
        />

        {/* ✅ Photo Modal */}
        <Modal
          visible={photoModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPhotoModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lihat Foto</Text>
                <TouchableOpacity
                  onPress={() => setPhotoModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.photoContainer}>
                {selectedPhoto ? (
                  <Image
                    source={{ uri: selectedPhoto }}
                    style={styles.fullPhoto}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.noPhotoText}>Foto tidak tersedia</Text>
                )}
              </View>

              <Text style={styles.photoInfo}>
                {selectedPhoto || "Tidak ada informasi foto"}
              </Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoText: {
    color: "#1976d2",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoSubtext: {
    color: "#1976d2",
    fontSize: 12,
    opacity: 0.8,
  },
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
  salesName: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  // ✅ Enhanced Photo Section Styles
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
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  photoStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoStatusText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  photoSectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  photoActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#667eea",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  galleryButton: {
    backgroundColor: "#4CAF50",
  },
  photoButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  uploadProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  uploadProgressText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "500",
  },
  photosContainer: {
    marginBottom: 16,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  photoItem: {
    alignItems: "center",
    marginHorizontal: 6,
    position: "relative",
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoText: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  photoLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
    textTransform: "capitalize",
  },
  removePhotoButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#f44336",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  noPhotos: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noPhotosText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    marginBottom: 4,
  },
  noPhotosSubtext: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
  },
  photoLoadingContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  photoLoadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 0,
    width: "95%",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  photoContainer: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  fullPhoto: {
    width: "100%",
    height: "100%",
  },
  noPhotoText: {
    fontSize: 16,
    color: "#666",
  },
  photoInfo: {
    padding: 12,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  // Existing Styles
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
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
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  changesIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  changesText: {
    marginLeft: 8,
    color: "#856404",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#667eea",
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  headerButton: {
    padding: 4,
  },
});
