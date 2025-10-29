// app/data-kompetitor/[id].tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput as RNTextInput,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { kompetitorAPI, customerAPI } from "@/api/services";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  CustomerList,
  KompetitorCreateRequest,
  KompetitorPhoto,
} from "@/api/interface";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/helpers";
import { MobileFTPUploader } from "@/utils/mobileFTPUploader";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";

// --- CUSTOMER MODAL ---
const CustomerSelectionModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: CustomerList) => void;
  selectedCustomer: Partial<CustomerList> | null;
}> = ({ visible, onClose, onCustomerSelect, selectedCustomer }) => {
  const [customers, setCustomers] = useState<CustomerList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerAPI.getCombinedCustomerList(1, 100);
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadCustomers();
      setSearchQuery("");
    }
  }, [visible, loadCustomers]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.nama_cust.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.no_cust.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.alamat_kirim1 &&
        c.alamat_kirim1.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pilih Customer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Cari customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.kode_cust}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.customerItem,
                  selectedCustomer?.kode_cust === item.kode_cust &&
                    styles.customerItemSelected,
                ]}
                onPress={() => {
                  onCustomerSelect(item);
                  onClose();
                }}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {item.nama_cust}
                  </Text>
                  <Text style={styles.customerCode}>{item.no_cust}</Text>
                  <Text style={styles.customerAddress} numberOfLines={2}>
                    {item.alamat_kirim1}
                  </Text>
                </View>
                {selectedCustomer?.kode_cust === item.kode_cust && (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#667eea"
                  />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.modalList}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// --- STATUS CHIP ---
const StatusChip: React.FC<{ status: "active" | "inactive" }> = ({
  status,
}) => {
  const isActive = status === "active";
  return (
    <View
      style={[
        styles.statusChip,
        isActive ? styles.statusActive : styles.statusInactive,
      ]}
    >
      <Text style={styles.statusText}>{isActive ? "Aktif" : "Nonaktif"}</Text>
    </View>
  );
};

// --- PRODUK ITEM ---
interface ProductItem {
  id: string;
  nama_produk: string;
  merek_produk: string;
  harga: string;
  keterangan: string;
  status: "active" | "inactive";
  photos: KompetitorPhoto[]; // ✅ Foto langsung di dalam produk
}

// --- CAMERA MODAL INTERNAL ---
const CameraModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  permission: any | null;
  requestPermission: () => Promise<any>;
  cameraRef: CameraView | null;
  onCameraRef: (ref: CameraView | null) => void;
  onTakePicture: () => void;
  capturing: boolean;
}> = ({
  visible,
  onClose,
  permission,
  requestPermission,
  cameraRef,
  onCameraRef,
  onTakePicture,
  capturing,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cameraContainer}>
        {permission?.granted ? (
          <CameraView style={styles.camera} facing="back" ref={onCameraRef}>
            <View style={styles.cameraOverlay}>
              <Text style={styles.cameraTitle}>Ambil Foto Produk</Text>
              <Text style={styles.cameraSubtitle}>
                Pastikan produk terlihat jelas
              </Text>
            </View>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={30} color="#fff" />
                <Text style={styles.closeButtonText}>Tutup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  capturing && styles.captureButtonDisabled,
                ]}
                onPress={onTakePicture}
                disabled={capturing}
              >
                <View style={styles.captureInner}>
                  {capturing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="camera" size={30} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.placeholder} />
            </View>
            {capturing && (
              <View style={styles.capturingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.capturingText}>Mengambil foto...</Text>
              </View>
            )}
          </CameraView>
        ) : (
          <View style={styles.permissionContainer}>
            <MaterialIcons name="photo-camera" size={64} color="#999" />
            <Text style={styles.permissionTitle}>Izin Kamera Ditolak</Text>
            <Text style={styles.permissionText}>
              Aplikasi membutuhkan akses kamera untuk mengambil foto
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>
                Berikan Izin Kamera
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

// --- PRODUK PHOTO UPLOAD ---
const ProdukPhotoUpload: React.FC<{
  photos: KompetitorPhoto[];
  onPhotosChange: (photos: KompetitorPhoto[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}> = ({ photos, onPhotosChange, maxPhotos = 3, disabled = false }) => {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!cameraVisible) {
      setCameraRef(null);
    }
  }, [cameraVisible]);

  const launchCamera = useCallback(async () => {
    let currentPermission = permission;
    if (!currentPermission) {
      const result = await requestPermission();
      currentPermission = result;
    }
    if (!currentPermission?.granted) {
      Alert.alert(
        "Izin Kamera Diperlukan",
        "Butuh akses kamera untuk mengambil foto."
      );
      return;
    }
    setCameraVisible(true);
  }, [permission, requestPermission]);

  const launchImageLibrary = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin diperlukan", "Butuh akses galeri untuk memilih foto");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        if (photos.length >= maxPhotos) {
          Alert.alert(`Maksimal ${maxPhotos} foto`);
          return;
        }
        const asset = result.assets[0];
        const newPhoto: KompetitorPhoto = {
          id: `photo-${Date.now()}`,
          uri: asset.uri,
          type: "image/jpeg",
          base64: asset.base64 || undefined,
          filename: `temp_${Date.now()}.jpg`,
          timestamp: new Date().toISOString(),
          productId: "",
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error("Error picking photos:", error);
      Alert.alert("Error", "Gagal memilih foto dari galeri");
    }
  }, [photos, maxPhotos, onPhotosChange]);

  const pickImage = () => {
    if (disabled) return;
    Alert.alert("Pilih Sumber Foto", "Pilih metode untuk mengambil foto", [
      { text: "Buka Kamera", onPress: launchCamera },
      { text: "Pilih dari Galeri", onPress: launchImageLibrary },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const takePicture = useCallback(async () => {
    if (cameraRef && !capturing) {
      setCapturing(true);
      try {
        const photo = await cameraRef.takePictureAsync({
          base64: true,
          quality: 0.8,
        });
        if (photo.base64) {
          if (photos.length >= maxPhotos) {
            Alert.alert(`Maksimal ${maxPhotos} foto`);
            setCameraVisible(false);
            return;
          }
          const newPhoto: KompetitorPhoto = {
            id: `photo-${Date.now()}`,
            uri: photo.uri,
            type: "image/jpeg",
            base64: photo.base64,
            filename: `temp_${Date.now()}.jpg`,
            timestamp: new Date().toISOString(),
            productId: "",
          };
          onPhotosChange([...photos, newPhoto]);
          setCameraVisible(false);
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Gagal mengambil foto");
      } finally {
        setCapturing(false);
      }
    }
  }, [cameraRef, capturing, photos, onPhotosChange, maxPhotos]);

  const removePhoto = (id: string) => {
    if (disabled) return;
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  return (
    <>
      <View style={styles.photoUploadContainer}>
        <Text style={styles.photoUploadLabel}>
          Foto Produk ({photos.length}/{maxPhotos})
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContent}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              {!disabled && (
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(photo.id)}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {!disabled && photos.length < maxPhotos && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <MaterialIcons name="add-a-photo" size={28} color="#667eea" />
              <Text style={styles.addPhotoText}>Tambah Foto</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
      <CameraModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        permission={permission}
        requestPermission={requestPermission}
        cameraRef={cameraRef}
        onCameraRef={setCameraRef}
        onTakePicture={takePicture}
        capturing={capturing}
      />
    </>
  );
};

// --- PRODUK CARD ---
const ProductCard: React.FC<{
  product: ProductItem;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}> = ({ product, onEdit, onRemove, disabled }) => (
  <View style={styles.productCard}>
    <View style={styles.productHeader}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.nama_produk}
        </Text>
        {product.merek_produk ? (
          <Text style={styles.productBrand} numberOfLines={1}>
            Merek: {product.merek_produk}
          </Text>
        ) : null}
      </View>
      <StatusChip status={product.status} />
    </View>
    <View style={styles.productDetails}>
      <View style={styles.detailRow}>
        <MaterialIcons name="attach-money" size={14} color="#666" />
        <Text style={styles.detailValue}>
          {formatCurrencyInput(parseCurrencyInput(product.harga))}
        </Text>
      </View>
      {product.keterangan ? (
        <View style={styles.detailRow}>
          <MaterialIcons name="notes" size={14} color="#666" />
          <Text style={styles.detailValue} numberOfLines={2}>
            {product.keterangan}
          </Text>
        </View>
      ) : null}
      {product.photos.length > 0 && (
        <View style={styles.detailRow}>
          <MaterialIcons name="photo-camera" size={14} color="#666" />
          <Text style={styles.detailValue}>
            {product.photos.length} foto bukti
          </Text>
        </View>
      )}
    </View>
    {!disabled && (
      <View style={styles.productActions}>
        <TouchableOpacity
          onPress={() => onEdit(product.id)}
          style={styles.actionButton}
        >
          <MaterialIcons name="edit" size={16} color="#667eea" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onRemove(product.id)}
          style={styles.actionButton}
        >
          <MaterialIcons name="delete" size={16} color="#f44336" />
          <Text style={styles.actionText}>Hapus</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// --- PRODUK MODAL ---
const ProductModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (product: ProductItem) => void;
  initialData?: ProductItem;
  disabled: boolean;
}> = ({ visible, onClose, onSave, initialData, disabled }) => {
  const [form, setForm] = useState<ProductItem>(
    initialData || {
      id: Date.now().toString(),
      nama_produk: "",
      merek_produk: "",
      harga: "",
      keterangan: "",
      status: "active",
      photos: [],
    }
  );

  useEffect(() => {
    if (visible) {
      setForm(
        initialData || {
          id: Date.now().toString(),
          nama_produk: "",
          merek_produk: "",
          harga: "",
          keterangan: "",
          status: "active",
          photos: [],
        }
      );
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!form.nama_produk.trim()) {
      Alert.alert("Error", "Nama produk wajib diisi");
      return;
    }
    if (!form.harga.trim() || parseCurrencyInput(form.harga) <= 0) {
      Alert.alert("Error", "Harga harus valid");
      return;
    }
    if (form.photos.length === 0) {
      Alert.alert("Error", "Foto bukti wajib diupload");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {initialData ? "Edit Produk" : "Tambah Produk"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.modalScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Produk *</Text>
              <RNTextInput
                style={styles.input}
                value={form.nama_produk}
                onChangeText={(v) => setForm({ ...form, nama_produk: v })}
                placeholder="Contoh: Minyak Goreng Bimoli 1L"
                editable={!disabled}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Merek Produk</Text>
              <RNTextInput
                style={styles.input}
                value={form.merek_produk}
                onChangeText={(v) => setForm({ ...form, merek_produk: v })}
                placeholder="Contoh: Bimoli"
                editable={!disabled}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Harga Kompetitor *</Text>
              <RNTextInput
                style={styles.input}
                value={formatCurrencyInput(parseCurrencyInput(form.harga))}
                onChangeText={(v) => setForm({ ...form, harga: v })}
                placeholder="0"
                keyboardType="numeric"
                editable={!disabled}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Keterangan</Text>
              <RNTextInput
                style={[styles.input, styles.textArea]}
                value={form.keterangan}
                onChangeText={(v) => setForm({ ...form, keterangan: v })}
                placeholder="Catatan tambahan..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!disabled}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() =>
                    !disabled && setForm({ ...form, status: "active" })
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      form.status === "active" && styles.radioSelected,
                    ]}
                  />
                  <Text style={styles.radioLabel}>Aktif</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() =>
                    !disabled && setForm({ ...form, status: "inactive" })
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      form.status === "inactive" && styles.radioSelected,
                    ]}
                  />
                  <Text style={styles.radioLabel}>Nonaktif</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ProdukPhotoUpload
                photos={form.photos}
                onPhotosChange={(photos) => setForm({ ...form, photos })}
                maxPhotos={3}
                disabled={disabled}
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={handleSave}
            disabled={disabled}
          >
            <Text style={styles.saveButtonText}>
              {initialData ? "Simpan Perubahan" : "Tambah Produk"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// --- MAIN COMPONENT ---
export default function KompetitorEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type SimpleCustomer = Partial<
    Pick<CustomerList, "kode_cust" | "no_cust" | "nama_cust" | "alamat_kirim1">
  >;

  const [selectedCustomer, setSelectedCustomer] =
    useState<SimpleCustomer | null>(null);

  // const [selectedCustomer, setSelectedCustomer] = useState<CustomerList | null>(
  //   null
  // );
  const [keteranganUmum, setKeteranganUmum] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | undefined>(
    undefined
  );
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );

  // --- Get location ---
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

  // --- Load data ---
  const loadKompetitorData = useCallback(async () => {
    if (!id) {
      Alert.alert("Error", "ID kompetitor tidak ditemukan");
      router.back();
      return;
    }

    try {
      const res = await kompetitorAPI.getKompetitorDetail(id);
      if (res.success && res.data) {
        const data = res.data;
        const header = data.master;
        const details = data.details;

        setSelectedCustomer({
          kode_cust: header.kode_cust,
          nama_cust: header.nama_cust,
        });
        setKeteranganUmum(header.catatan || "");

        // Load ZIP preview once
        let allPreviewPhotos: { filename: string; url: string }[] = [];
        if (header.file_zip_path) {
          const previewRes = await kompetitorAPI.previewKompetitorPhotos(
            header.file_zip_path
          );
          if (previewRes.success && previewRes.photos) {
            allPreviewPhotos = previewRes.photos;
          }
        }

        // Build products with embedded photos
        const productItems: ProductItem[] = details.map((d, idx) => {
          const productId = d.id?.toString() || `prod-${idx}`;
          let filenames: string[] = [];

          if (d.photo_filenames) {
            try {
              if (typeof d.photo_filenames === "string") {
                const parsed = JSON.parse(d.photo_filenames);
                filenames = Array.isArray(parsed) ? parsed : [parsed];
              } else if (Array.isArray(d.photo_filenames)) {
                filenames = d.photo_filenames;
              }
            } catch (e) {
              filenames = d.photo_filenames
                .split(",")
                .map((f: string) => f.trim());
            }
          }

          const productPhotos: KompetitorPhoto[] = filenames
            .map((filename) => {
              const preview = allPreviewPhotos.find(
                (p) => p.filename === filename
              );
              return preview
                ? {
                    id: `existing-${productId}-${filename}`,
                    uri: preview.url,
                    filename,
                    timestamp: new Date().toISOString(),
                    type: "image/jpeg",
                    productId,
                  }
                : null;
            })
            .filter(Boolean) as KompetitorPhoto[];

          return {
            id: productId,
            nama_produk: d.nama_produk || "",
            merek_produk: d.merek_produk || "",
            harga: d.harga?.toString() || "0",
            keterangan: d.keterangan || "",
            status: "active",
            photos: productPhotos,
          };
        });

        setProducts(productItems);
      }
    } catch (err: any) {
      console.error("❌ Load error:", err);
      Alert.alert("Error", "Gagal memuat data kompetitor");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadKompetitorData();
  }, [loadKompetitorData]);

  // --- Product handlers ---
  const openAddProduct = () => {
    setEditingProduct(undefined);
    setShowProductModal(true);
  };

  const openEditProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setEditingProduct(product);
      setShowProductModal(true);
    }
  };

  const handleSaveProduct = (product: ProductItem) => {
    if (editingProduct) {
      setProducts(products.map((p) => (p.id === product.id ? product : p)));
    } else {
      setProducts([...products, product]);
    }
  };

  const removeProduct = (id: string) => {
    if (products.length <= 1) {
      Alert.alert("Peringatan", "Minimal harus ada 1 produk.");
      return;
    }
    setProducts(products.filter((p) => p.id !== id));
  };

  // Di [id].tsx
  const fetchImageAsBase64 = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data.split(",")[1]); // Hanya bagian base64
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- Save handler ---
  const handleSave = async () => {
    if (!selectedCustomer?.kode_cust) {
      Alert.alert("Error", "Pilih customer terlebih dahulu");
      return;
    }
    if (products.length === 0) {
      Alert.alert("Error", "Minimal harus ada 1 produk");
      return;
    }

    // Validasi produk
    const invalidProduct = products.find(
      (p) =>
        !p.nama_produk.trim() ||
        !p.harga.trim() ||
        parseCurrencyInput(p.harga) <= 0 ||
        p.photos.length === 0
    );
    if (invalidProduct) {
      Alert.alert("Error", "Lengkapi semua field produk dengan benar.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // ✅ 1. Siapkan mapping filename per produk
      const productPhotoFilenames: { [index: number]: string[] } = {};
      let allPhotosWithBase64: KompetitorPhoto[] = [];

      // ✅ 2. Proses setiap produk & semua fotonya
      for (const [idx, product] of products.entries()) {
        const productId = product.id;
        const filenames = product.photos.map(
          (_, i) => `kompetitor_${productId}_${i + 1}.jpg`
        );
        productPhotoFilenames[idx] = filenames;

        // ✅ 3. Pastikan semua foto punya base64 (download jika existing)
        for (const [photoIdx, photo] of product.photos.entries()) {
          let base64 = photo.base64;

          // Jika foto existing (dari URL) dan belum punya base64 → download
          if (!base64 && photo.uri) {
            try {
              const response = await fetch(photo.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              const base64Data = await new Promise<string>(
                (resolve, reject) => {
                  reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.split(",")[1]); // Ambil bagian base64 saja
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                }
              );
              base64 = base64Data;
            } catch (err) {
              console.error("Gagal download foto existing:", err);
              Alert.alert(
                "Error",
                `Gagal memproses foto: ${photo.filename || photo.uri}`
              );
              return;
            }
          }

          allPhotosWithBase64.push({
            ...photo,
            base64,
            filename: filenames[photoIdx],
            productId,
            type: "data_kompetitor",
            watermarkData: {
              customerName: selectedCustomer.nama_cust || "",
              salesName: user?.nama_user || "Sales",
              locationText: location
                ? `📍 ${location.coords.latitude.toFixed(
                    6
                  )}, ${location.coords.longitude.toFixed(6)}`
                : "Lokasi tidak tersedia",
              accuracyText: location?.coords.accuracy
                ? location.coords.accuracy < 10
                  ? `Akurasi: ${location.coords.accuracy.toFixed(
                      1
                    )}m (Sangat Baik)`
                  : location.coords.accuracy < 25
                  ? `Akurasi: ${location.coords.accuracy.toFixed(1)}m (Baik)`
                  : location.coords.accuracy < 50
                  ? `Akurasi: ${location.coords.accuracy.toFixed(1)}m (Cukup)`
                  : location.coords.accuracy < 100
                  ? `Akurasi: ${location.coords.accuracy.toFixed(1)}m (Sedang)`
                  : `Akurasi: ${location.coords.accuracy.toFixed(1)}m (Rendah)`
                : "Akurasi tidak tersedia",
              checkType: "KOMPPETITOR_HARGA",
            },
          });
        }
      }

      // ✅ 4. Upload SEMUA foto (existing + baru) sebagai satu ZIP
      let fileZipPath = "";
      if (allPhotosWithBase64.length > 0) {
        const zipFileName = `KOM_${selectedCustomer.kode_cust}_${
          new Date().toISOString().split("T")[0]
        }_${Date.now()}`;
        fileZipPath = await MobileFTPUploader.uploadKompetitorPhotosAsZip(
          allPhotosWithBase64,
          selectedCustomer.kode_cust,
          user?.kodeCabang || "DEF",
          zipFileName,
          productPhotoFilenames
        );
      }

      // ✅ 5. Simpan ke database
      const KompetitorCreateRequest: KompetitorCreateRequest = {
        header: {
          kode_kompetitor: id!,
          kode_rks: "",
          kode_cust: selectedCustomer.kode_cust,
          nama_cust: selectedCustomer.nama_cust,
          kode_sales: user?.kodeSales || "",
          nama_sales: user?.nama_user || "",
          tanggal_input: new Date().toISOString().split("T")[0],
          catatan: keteranganUmum,
          status: "submitted",
          file_zip_path: fileZipPath,
          created_by: user?.nama_user || "",
          created_at: new Date().toISOString(),
          update_by: user?.nama_user || "",
          update_at: new Date().toISOString(),
        },
        details: products.map((p, idx) => ({
          kode_kompetitor: id!,
          nama_produk: p.nama_produk.trim(),
          merek_produk: p.merek_produk.trim(),
          harga: parseCurrencyInput(p.harga),
          foto_url: fileZipPath,
          keterangan: p.keterangan.trim(),
          photo_filenames: JSON.stringify(productPhotoFilenames[idx] || []),
          created_by: user?.nama_user || "",
          created_at: new Date().toISOString(),
          update_by: user?.nama_user || "",
          update_at: new Date().toISOString(),
        })),
      };

      const res = await kompetitorAPI.updateDataKompetitor(
        id,
        KompetitorCreateRequest
      );
      if (res.success) {
        // ✅ Reload data agar foto terbaru muncul saat edit ulang
        await loadKompetitorData();
        Alert.alert("Berhasil", "Data kompetitor berhasil diperbarui", [
          { text: "OK", onPress: () => router.back()},
        ]);
      } else {
        throw new Error(res.message || "Gagal memperbarui data");
      }
    } catch (err: any) {
      console.error("❌ Save error:", err);
      setError(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[styles.loadingContainer, { paddingBottom: insets.bottom }]}
        >
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat data kompetitor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Edit Data Kompetitor" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <MaterialIcons name="bar-chart" size={28} color="#667eea" />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Edit Data Kompetitor</Text>
                <Text style={styles.headerSubtitle}>
                  Perbarui data harga kompetitor
                </Text>
              </View>
            </View>
          </View>

          {/* Customer Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="business" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>Customer</Text>
            </View>
            <TouchableOpacity
              style={styles.customerSelector}
              onPress={() => setShowCustomerModal(true)}
              disabled={saving}
            >
              {selectedCustomer ? (
                <View style={styles.selectedCustomer}>
                  <View style={styles.customerAvatar}>
                    <MaterialIcons name="person" size={16} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.selectedCustomerName}>
                      {selectedCustomer.nama_cust}
                    </Text>
                    <Text style={styles.selectedCustomerCode}>
                      {selectedCustomer.no_cust}
                    </Text>
                    {selectedCustomer.alamat_kirim1 && (
                      <Text
                        style={styles.selectedCustomerAddress}
                        numberOfLines={2}
                      >
                        {selectedCustomer.alamat_kirim1}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Pilih Customer</Text>
              )}
              <MaterialIcons name="arrow-forward-ios" size={16} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Produk Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="inventory" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>Produk Kompetitor</Text>
              <View style={styles.produkCount}>
                <Text style={styles.produkCountText}>
                  {products.length} produk
                </Text>
              </View>
            </View>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="inventory-2" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>Belum ada produk</Text>
                <Text style={styles.emptySubtitle}>
                  Tambah produk untuk dianalisis
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={openAddProduct}
                >
                  <MaterialIcons name="add" size={16} color="#fff" />
                  <Text style={styles.addButtonText}>Tambah Produk</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.productsList}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={openEditProduct}
                    onRemove={removeProduct}
                    disabled={saving}
                  />
                ))}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={openAddProduct}
                >
                  <MaterialIcons name="add" size={16} color="#667eea" />
                  <Text style={styles.addButtonText}>Tambah Produk Lain</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Catatan Umum */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="notes" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>Catatan Umum</Text>
            </View>
            <RNTextInput
              style={[styles.input, styles.textArea]}
              value={keteranganUmum}
              onChangeText={setKeteranganUmum}
              placeholder="Catatan tambahan untuk seluruh entri..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#f44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={[styles.actionButtons, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <CustomerSelectionModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerSelect={setSelectedCustomer}
        selectedCustomer={selectedCustomer}
      />
      <ProductModal
        visible={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        disabled={saving}
      />
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  // ... (gunakan seluruh style dari create.tsx, termasuk kamera & photo upload)
  // Untuk efisiensi, style di sini mengikuti create.tsx secara penuh.
  // Jika Anda ingin, saya bisa lampirkan seluruh blok style, tapi biasanya sudah ada di file Anda.
  // Pastikan style berikut ada:
  cameraContainer: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  cameraOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  cameraTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cameraSubtitle: { color: "white", fontSize: 14, opacity: 0.8 },
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
  closeButton: { padding: 10 },
  closeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  captureButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: { width: 40 },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  capturingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    paddingHorizontal: 30,
  },
  permissionTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    color: "white",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  permissionButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  cancelButton: { paddingHorizontal: 24, paddingVertical: 12 },
  cancelButtonText: { color: "#999", fontSize: 16 },

  // Photo Upload Styles
  photoUploadContainer: { marginTop: 12 },
  photoUploadLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  photosContent: { paddingVertical: 8, gap: 12 },
  photoItem: { position: "relative" },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  removePhotoButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#f44336",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: "#667eea",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#667eea",
    marginTop: 4,
    textAlign: "center",
  },

  // cameraContainer: {
  //   flex: 1,
  //   backgroundColor: "black",
  // },
  // camera: {
  //   flex: 1,
  // },
  // cameraOverlay: {
  //   position: "absolute",
  //   top: 60,
  //   left: 0,
  //   right: 0,
  //   alignItems: "center",
  // },
  // cameraTitle: {
  //   color: "white",
  //   fontSize: 18,
  //   fontWeight: "bold",
  //   marginBottom: 8,
  // },
  // cameraSubtitle: {
  //   color: "white",
  //   fontSize: 14,
  //   opacity: 0.8,
  // },
  // cameraControls: {
  //   position: "absolute",
  //   bottom: 30,
  //   left: 0,
  //   right: 0,
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   alignItems: "center",
  //   paddingHorizontal: 30,
  // },
  // closeButton: {
  //   padding: 10,
  // },
  // closeButtonText: {
  //   color: "white",
  //   fontSize: 14,
  //   fontWeight: "bold",
  //   marginLeft: 5,
  // },
  // captureButton: {
  //   width: 70,
  //   height: 70,
  //   borderRadius: 35,
  //   backgroundColor: "rgba(255, 255, 255, 0.3)",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   borderWidth: 3,
  //   borderColor: "white",
  // },
  // captureButtonDisabled: {
  //   backgroundColor: "rgba(255, 255, 255, 0.1)",
  //   borderColor: "rgba(255, 255, 255, 0.5)",
  // },
  // captureInner: {
  //   width: 60,
  //   height: 60,
  //   borderRadius: 30,
  //   backgroundColor: "#fff",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  // placeholder: {
  //   width: 40,
  // },
  // capturingOverlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: "rgba(0, 0, 0, 0.7)",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   zIndex: 10,
  // },
  // capturingText: {
  //   color: "#fff",
  //   marginTop: 10,
  //   fontSize: 16,
  //   fontWeight: "600",
  // },
  // permissionContainer: {
  //   flex: 1,
  //   justifyContent: "center",
  //   alignItems: "center",
  //   backgroundColor: "black",
  //   paddingHorizontal: 30,
  // },
  // permissionTitle: {
  //   color: "white",
  //   fontSize: 20,
  //   fontWeight: "bold",
  //   marginTop: 20,
  //   marginBottom: 10,
  // },
  // permissionText: {
  //   color: "white",
  //   fontSize: 16,
  //   marginBottom: 20,
  //   textAlign: "center",
  //   lineHeight: 22,
  // },
  // permissionButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   backgroundColor: "#667eea",
  //   paddingHorizontal: 24,
  //   paddingVertical: 12,
  //   borderRadius: 8,
  //   marginBottom: 16,
  //   gap: 8,
  // },
  // permissionButtonText: {
  //   color: "white",
  //   fontSize: 16,
  //   fontWeight: "600",
  // },
  // cancelButton: {
  //   paddingHorizontal: 24,
  //   paddingVertical: 12,
  // },
  // cancelButtonText: {
  //   color: "#999",
  //   fontSize: 16,
  // },

  // --- Sisanya tetap gunakan style dari file asli [id].tsx ---

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  produkCount: {
    backgroundColor: "#667eea",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  produkCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  customerSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fafafa",
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedCustomer: {
    flex: 1,
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  selectedCustomerCode: {
    fontSize: 14,
    color: "#64748b",
  },
  selectedCustomerAddress: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#667eea",
    backgroundColor: "#f0f4ff",
    gap: 6,
  },
  addButtonText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  productBrand: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  productDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  productActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: "#667eea",
    fontWeight: "600",
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  statusActive: {
    backgroundColor: "#e8f5e8",
  },
  statusInactive: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#334155",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: "#667eea",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  modalList: {
    paddingHorizontal: 16,
  },
  customerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerItemSelected: {
    backgroundColor: "#f0f4ff",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  customerCode: {
    fontSize: 14,
    color: "#64748b",
  },
  customerAddress: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdecea",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#f44336",
    fontSize: 14,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  radioGroup: {
    flexDirection: "row",
    gap: 24,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  radioSelected: {
    borderColor: "#667eea",
    backgroundColor: "#667eea",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  // cancelButton: {
  //   backgroundColor: "#f5f5f5",
  // },
  // cancelButtonText: {
  //   color: "#666",
  //   fontSize: 16,
  //   fontWeight: "600",
  // },
  saveButton: {
    backgroundColor: "#667eea",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  photoSectionPerProduct: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  photosContainer: {
    marginBottom: 12,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  // photoItem: {
  //   alignItems: "center",
  //   marginHorizontal: 6,
  //   position: "relative",
  // },
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
  // removePhotoButton: {
  //   position: "absolute",
  //   top: -5,
  //   right: -5,
  //   backgroundColor: "#f44336",
  //   borderRadius: 10,
  //   width: 20,
  //   height: 20,
  //   justifyContent: "center",
  //   alignItems: "center",
  // },
  // addPhotoButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   padding: 8,
  //   borderWidth: 1,
  //   borderColor: "#667eea",
  //   borderRadius: 8,
  //   marginTop: 8,
  // },
  // addPhotoText: {
  //   color: "#667eea",
  //   marginLeft: 6,
  //   fontSize: 14,
  // },
  modalContentPhoto: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
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
  // ... (sisa style dari create.tsx: container, card, input, button, dll)
  // Pastikan Anda salin seluruh blok style dari create.tsx ke sini jika belum ada.
  // Untuk ringkas, tidak diulang di sini karena sudah tersedia di knowledge base.
});
