// components/PPIPhotoUpload.tsx
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
} from "react-native";
import { ActivityIndicator, Card } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { CameraPermission, PPIPhoto } from "@/api/interface";

interface PPIPhotoUploadProps {
  photos: PPIPhoto[];
  onPhotosChange: (photos: PPIPhoto[]) => void;
  maxPhotos?: number;
}

// ✅ Ekstrak CameraModal sebagai komponen terpisah di luar
interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  permission: CameraPermission | null;
  requestPermission: () => Promise<CameraPermission>;
  cameraRef: CameraView | null;
  onCameraRef: (ref: CameraView | null) => void;
  onTakePicture: () => void;
  capturing: boolean;
}

const CameraModal: React.FC<CameraModalProps> = ({
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
              <Text style={styles.cameraTitle}>
                Ambil Foto Bukti Pembayaran
              </Text>
              <Text style={styles.cameraSubtitle}>
                Pastikan foto jelas dan terbaca
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
              Aplikasi membutuhkan akses kamera untuk mengambil foto bukti
              pembayaran
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

const PPIPhotoUpload: React.FC<PPIPhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 10,
}) => {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Reset cameraRef saat modal ditutup (opsional, hindari memory leak)
  useEffect(() => {
    if (!cameraVisible) {
      setCameraRef(null);
    }
  }, [cameraVisible]);

  const launchCamera = useCallback(async () => {
    console.log("📸 launchCamera called");

    let currentPermission = permission;

    if (!currentPermission) {
      console.log("📸 Permission not yet determined, requesting...");
      const result = await requestPermission();
      currentPermission = result;
    }

    if (!currentPermission?.granted) {
      console.log("📸 Permission denied, showing alert");
      Alert.alert(
        "Izin Kamera Diperlukan",
        "Butuh akses kamera untuk mengambil foto. Silakan berikan izin di pengaturan perangkat."
      );
      return;
    }

    console.log("📸 Permission granted, opening camera");
    setCameraVisible(true);
  }, [permission, requestPermission]);

  const launchImageLibrary = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin diperlukan",
          "Butuh akses ke galeri untuk memilih foto"
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxPhotos - photos.length,
        base64: true,
      });
      if (!result.canceled && result.assets) {
        const newPhotos: PPIPhoto[] = result.assets.map((asset, index) => ({
          id: `ppi-photo-${Date.now()}-${index}`,
          uri: asset.uri,
          name: `bukti_pembayaran_ppi_${Date.now()}_${index}.jpg`,
          type: "image/jpeg",
          base64: asset.base64 || undefined,
          filename: `bukti_pembayaran_ppi_${Date.now()}_${index}.jpg`,
          timestamp: new Date().toISOString(),
        }));
        onPhotosChange([...photos, ...newPhotos]);
        Alert.alert(
          "Sukses",
          `${result.assets.length} foto berhasil dipilih dari galeri`
        );
      }
    } catch (error) {
      console.error("Error picking photos:", error);
      Alert.alert("Error", "Gagal memilih foto dari galeri");
    }
  }, [maxPhotos, photos.length, onPhotosChange]);

  const handleAddPhoto = useCallback(() => {
    console.log("🔄 handleAddPhoto called");
    Alert.alert("Pilih Sumber Foto", "Pilih metode untuk mengambil foto", [
      { text: "Buka Kamera", onPress: launchCamera },
      { text: "Pilih dari Galeri", onPress: launchImageLibrary },
      { text: "Batal", style: "cancel" },
    ]);
  }, [launchCamera, launchImageLibrary]);

  const takePicture = useCallback(async () => {
    if (cameraRef && !capturing) {
      setCapturing(true);
      try {
        console.log("📸 Taking picture...");
        const photo = await cameraRef.takePictureAsync({
          base64: true,
          quality: 0.8,
          exif: true,
        });
        if (photo.base64) {
          const newPhoto: PPIPhoto = {
            id: `photo_${Date.now()}`,
            uri: photo.uri,
            name: `bukti_pembayaran_ppi_${Date.now()}.jpg`,
            type: "image/jpeg",
            base64: photo.base64,
            filename: `bukti_pembayaran_ppi_${Date.now()}.jpg`,
            timestamp: new Date().toISOString(),
          };
          onPhotosChange([...photos, newPhoto]);
          setCameraVisible(false);
          Alert.alert(
            "✅ Foto Berhasil Diambil",
            `Foto bukti pembayaran berhasil diambil dari kamera\nTotal foto: ${
              photos.length + 1
            }/${maxPhotos}`,
            [{ text: "Lanjutkan" }]
          );
        }
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Gagal mengambil foto");
      } finally {
        setCapturing(false);
      }
    }
  }, [cameraRef, capturing, photos, onPhotosChange, maxPhotos]);

  const handleRemovePhoto = useCallback(
    (photoId: string) => {
      onPhotosChange(photos.filter((photo) => photo.id !== photoId));
    },
    [photos, onPhotosChange]
  );

  const handleRemoveAllPhotos = useCallback(() => {
    Alert.alert(
      "Hapus Semua Foto",
      "Apakah Anda yakin ingin menghapus semua foto?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => onPhotosChange([]),
        },
      ]
    );
  }, [onPhotosChange]);

  return (
    <>
      <Card style={styles.photoCard}>
        <Card.Content>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>Bukti Pembayaran</Text>
            <Text style={styles.photoSubtitle}>
              {photos.length}/{maxPhotos} foto
            </Text>
          </View>
          <View style={styles.photosContainer}>
            {photos.length < maxPhotos && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
              >
                <MaterialIcons name="add-a-photo" size={32} color="#667eea" />
                <Text style={styles.addPhotoText}>Tambah Foto</Text>
                <Text style={styles.addPhotoSubtext}>
                  Maks. {maxPhotos} foto
                </Text>
              </TouchableOpacity>
            )}
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(photo.id)}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.photoIndex}>{index + 1}</Text>
              </View>
            ))}
          </View>
          {photos.length > 0 && (
            <Text style={styles.photoHint}>
              Foto akan dikompresi menjadi file ZIP dan dilampirkan sebagai
              bukti pembayaran
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* ✅ Render CameraModal dengan props */}
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

const styles = StyleSheet.create({
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
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
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
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
  cameraSubtitle: {
    color: "white",
    fontSize: 14,
    opacity: 0.8,
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
    borderWidth: 3,
    borderColor: "white",
  },
  captureButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  closeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 40,
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
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: "#999",
    fontSize: 16,
  },
  photoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  photoSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  photosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#667eea",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
  },
  addPhotoText: {
    fontSize: 12,
    color: "#667eea",
    marginTop: 4,
    textAlign: "center",
  },
  addPhotoSubtext: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  photoIndex: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoHint: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
});

export default PPIPhotoUpload;
