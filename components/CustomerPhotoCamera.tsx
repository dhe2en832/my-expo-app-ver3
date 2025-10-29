// components/CustomerPhotoCamera.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { CustomerPhoto, CustomerPhotoCameraProps } from "@/api/interface";

const CustomerPhotoCamera: React.FC<CustomerPhotoCameraProps> = ({
  visible,
  onClose,
  onPhotosCapture,
  customerName,
  salesName,
  photoTypes,
  initialPhotos = [],
}) => {
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<
    CustomerPhoto["type"]
  >(photoTypes[0]);
  const [capturedPhotos, setCapturedPhotos] =
    useState<CustomerPhoto[]>(initialPhotos);
  // const [locationSubscription, setLocationSubscription] =
  useState<Location.LocationSubscription | null>(null);

  // Real-time location tracking
  // useEffect(() => {
  //   if (visible) {
  //     setLocationLoading(true);
  //     let isMounted = true;

  //     const startLocationTracking = async () => {
  //       try {
  //         const subscription = await Location.watchPositionAsync(
  //           {
  //             accuracy: Location.Accuracy.BestForNavigation,
  //             timeInterval: 1000,
  //             distanceInterval: 1,
  //           },
  //           (newLocation) => {
  //             if (isMounted) {
  //               setLocation(newLocation);
  //               setLocationLoading(false);
  //             }
  //           }
  //         );

  //         if (isMounted) {
  //           setLocationSubscription(subscription);
  //         }

  //         // Get initial location
  //         const initialLocation = await Location.getCurrentPositionAsync({
  //           accuracy: Location.Accuracy.BestForNavigation,
  //         });
  //         if (isMounted) {
  //           setLocation(initialLocation);
  //           setLocationLoading(false);
  //         }
  //       } catch (error) {
  //         console.error("Error starting location tracking:", error);
  //         if (isMounted) setLocationLoading(false);
  //       }
  //     };

  //     startLocationTracking();

  //     return () => {
  //       isMounted = false;
  //       if (locationSubscription) {
  //         locationSubscription.remove();
  //       }
  //     };
  //   }
  // }, [visible]);

  // HAPUS baris ini:
  // const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (visible) {
      // ✅ RESET STATE
      setCurrentPhotoType(photoTypes[0]);
      setCapturedPhotos([]); // selalu mulai dari kosong
      setLocation(null);
      setLocationLoading(true);
      setCapturing(false);

      let isMounted = true;
      let subscription: Location.LocationSubscription | null = null;

      const startLocationTracking = async () => {
        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (newLocation) => {
              if (isMounted) {
                setLocation(newLocation);
                setLocationLoading(false);
              }
            }
          );

          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          if (isMounted) {
            setLocation(initialLocation);
            setLocationLoading(false);
          }
        } catch (error) {
          console.error("Error starting location tracking:", error);
          if (isMounted) setLocationLoading(false);
        }
      };

      startLocationTracking();

      return () => {
        isMounted = false;
        if (subscription) {
          subscription.remove();
        }
      };
    }
  }, [visible, photoTypes]);

  const takePicture = async () => {
    if (cameraRef && location && !locationLoading && !capturing) {
      setCapturing(true);
      try {
        const photo = await cameraRef.takePictureAsync({
          base64: true,
          quality: 0.8,
          exif: true,
        });

        if (photo.base64) {
          // ✅ PREPARE DATA UNTUK ZIP UPLOAD
          const newPhoto: CustomerPhoto = {
            id: `photo_${Date.now()}_${currentPhotoType}`,
            type: currentPhotoType,
            uri: photo.uri,
            base64: photo.base64, // ✅ Base64 akan diupload sebagai ZIP
            filename: `${currentPhotoType}_${Date.now()}.jpg`,
            timestamp: new Date().toISOString(),
            location: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || 999,
            },
            // ✅ WATERMARK DATA untuk diproses di backend
            watermarkData: {
              customerName,
              salesName,
              locationText: `📍 ${location.coords.latitude.toFixed(
                6
              )}, ${location.coords.longitude.toFixed(6)}`,
              accuracyText: getAccuracyText(location.coords.accuracy || 999),
              checkType: "NOO_CUSTOMER",
            },
          };

          setCapturedPhotos((prev) => [...prev, newPhoto]);

          // Auto move to next photo type if available
          const currentIndex = photoTypes.indexOf(currentPhotoType);
          if (currentIndex < photoTypes.length - 1) {
            setCurrentPhotoType(photoTypes[currentIndex + 1]);
          }

          // ✅ SHOW SUCCESS MESSAGE dengan info ZIP
          Alert.alert(
            "✅ Foto Berhasil Diambil",
            `Foto ${getPhotoTypeLabel(
              currentPhotoType
            )} siap untuk diupload sebagai ZIP\n\n` +
              `Watermark akan ditambahkan:\n` +
              `• ${customerName}\n` +
              `• ${salesName}\n` +
              `• ${new Date().toLocaleString("id-ID")}\n` +
              `• ${newPhoto.watermarkData?.locationText}\n` +
              `• ${newPhoto.watermarkData?.accuracyText}`,
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
  };

  // ✅ UPDATE: HandleSave untuk konfirmasi ZIP upload
  const handleSave = () => {
    if (capturedPhotos.length > 0) {
      Alert.alert(
        "Simpan Foto",
        `Anda akan mengupload ${capturedPhotos.length} foto sebagai ZIP file.\n\n` +
          `Semua foto akan dikompresi menjadi 1 file ZIP dengan watermark.`,
        [
          { text: "Edit Lagi", style: "cancel" },
          {
            text: "Upload sebagai ZIP",
            onPress: () => {
              console.log(
                `📦 Preparing ${capturedPhotos.length} photos for ZIP upload`
              );
              onPhotosCapture(capturedPhotos);
              onClose();
            },
          },
        ]
      );
    } else {
      onPhotosCapture(capturedPhotos);
      onClose();
    }
  };

  // const takePicture = async () => {
  //   if (cameraRef && location && !locationLoading && !capturing) {
  //     setCapturing(true);
  //     try {
  //       const photo = await cameraRef.takePictureAsync({
  //         base64: true,
  //         quality: 0.8,
  //         exif: true,
  //       });

  //       if (photo.base64) {
  //         const newPhoto: CustomerPhoto = {
  //           id: `photo_${Date.now()}_${currentPhotoType}`,
  //           type: currentPhotoType,
  //           uri: photo.uri,
  //           base64: photo.base64,
  //           filename: `${currentPhotoType}_${Date.now()}.jpg`,
  //           timestamp: new Date().toISOString(),
  //           location: {
  //             latitude: location.coords.latitude,
  //             longitude: location.coords.longitude,
  //             accuracy: location.coords.accuracy || 999,
  //           },
  //           watermarkData: {
  //             customerName,
  //             salesName,
  //             locationText: `📍 ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
  //             accuracyText: getAccuracyText(location.coords.accuracy || 999),
  //             checkType: "NOO_CUSTOMER",
  //           },
  //         };

  //         setCapturedPhotos(prev => [...prev, newPhoto]);

  //         // Auto move to next photo type if available
  //         const currentIndex = photoTypes.indexOf(currentPhotoType);
  //         if (currentIndex < photoTypes.length - 1) {
  //           setCurrentPhotoType(photoTypes[currentIndex + 1]);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error taking picture:", error);
  //     } finally {
  //       setCapturing(false);
  //     }
  //   }
  // };

  const getAccuracyText = (accuracy: number) => {
    if (accuracy < 10) return `Akurasi: ${accuracy.toFixed(1)}m (Sangat Baik)`;
    if (accuracy < 25) return `Akurasi: ${accuracy.toFixed(1)}m (Baik)`;
    if (accuracy < 50) return `Akurasi: ${accuracy.toFixed(1)}m (Cukup)`;
    if (accuracy < 100) return `Akurasi: ${accuracy.toFixed(1)}m (Sedang)`;
    return `Akurasi: ${accuracy.toFixed(1)}m (Rendah)`;
  };

  const getPhotoTypeLabel = (type: CustomerPhoto["type"]) => {
    const labels = {
      selfie: "Selfie dengan Customer",
      toko_depan: "Toko Tampak Depan",
      toko_samping: "Toko Tampak Samping",
      ktp: "Foto KTP (Scan)",
      lainnya: "Foto Lainnya",
    };
    return labels[type];
  };

  const getPhotoTypeIcon = (type: CustomerPhoto["type"]) => {
    const icons = {
      selfie: "👤",
      toko_depan: "🏪",
      toko_samping: "📸",
      ktp: "🆔",
      lainnya: "📎",
    };
    return icons[type];
  };

  const removePhoto = (photoId: string) => {
    setCapturedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  // const handleSave = () => {
  //   onPhotosCapture(capturedPhotos);
  //   onClose();
  // };

  const handleClose = () => {
    // if (subscription) {
    //   subscription.remove();
    // }
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
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Berikan Izin</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const isCaptureDisabled = !location || locationLoading;
  const completedTypes = capturedPhotos.map((photo) => photo.type);
  const remainingTypes = photoTypes.filter(
    (type) => !completedTypes.includes(type)
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={(ref) => setCameraRef(ref)}
        >
          {/* Watermark Overlay */}
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermarkTitle}>CUSTOMER NOO APP</Text>
            <Text style={styles.watermarkText}>{customerName}</Text>
            <Text style={styles.watermarkText}>Sales: {salesName}</Text>
            <Text style={styles.watermarkText}>
              {location
                ? `📍 ${location.coords.latitude.toFixed(
                    6
                  )}, ${location.coords.longitude.toFixed(6)}`
                : "Mendapatkan lokasi..."}
            </Text>
            {location && (
              <View
                style={[
                  styles.accuracyContainer,
                  {
                    backgroundColor: getAccuracyColor(
                      location.coords.accuracy || 999
                    ),
                  },
                ]}
              >
                <Text style={styles.accuracyText}>
                  {getAccuracyText(location.coords.accuracy || 999)}
                </Text>
                {locationLoading && (
                  <ActivityIndicator size="small" color="#fff" />
                )}
              </View>
            )}
            <Text style={styles.watermarkType}>
              {getPhotoTypeLabel(currentPhotoType)}{" "}
              {getPhotoTypeIcon(currentPhotoType)}
            </Text>
          </View>

          {/* Camera Controls */}
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
                {capturing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : locationLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="camera" size={30} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={() =>
                setFacing((current) => (current === "back" ? "front" : "back"))
              }
            >
              <MaterialIcons name="flip-camera-ios" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Photo Type Selector */}
          <View style={styles.photoTypeSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photoTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.photoTypeButton,
                    currentPhotoType === type && styles.photoTypeButtonActive,
                    completedTypes.includes(type) &&
                      styles.photoTypeButtonCompleted,
                  ]}
                  onPress={() => setCurrentPhotoType(type)}
                >
                  <Text style={styles.photoTypeIcon}>
                    {getPhotoTypeIcon(type)}
                  </Text>
                  <Text
                    style={[
                      styles.photoTypeText,
                      currentPhotoType === type && styles.photoTypeTextActive,
                      completedTypes.includes(type) &&
                        styles.photoTypeTextCompleted,
                    ]}
                  >
                    {getPhotoTypeLabel(type)}
                  </Text>
                  {completedTypes.includes(type) && (
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#4CAF50"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Captured Photos Preview */}
          {capturedPhotos.length > 0 && (
            <View style={styles.photosPreview}>
              <Text style={styles.photosPreviewTitle}>
                Foto Terambil ({capturedPhotos.length}/{photoTypes.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {capturedPhotos.map((photo) => (
                  <View key={photo.id} style={styles.photoPreviewItem}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoPreviewImage}
                    />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(photo.id)}
                    >
                      <MaterialIcons name="delete" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.photoPreviewLabel}>
                      {getPhotoTypeLabel(photo.type)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Save Button */}
          {remainingTypes.length === 0 && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Simpan Semua Foto</Text>
            </TouchableOpacity>
          )}
        </CameraView>
      </View>
    </Modal>
  );
};

const getAccuracyColor = (accuracy: number) => {
  if (accuracy < 10) return "#4CAF50";
  if (accuracy < 25) return "#8BC34A";
  if (accuracy < 50) return "#FFC107";
  if (accuracy < 100) return "#FF9800";
  return "#F44336";
};

const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  message: { textAlign: "center", paddingBottom: 10 },
  permissionButton: {
    backgroundColor: "#667eea",
    padding: 15,
    borderRadius: 8,
  },
  permissionButtonText: { color: "white", fontWeight: "600" },
  watermarkContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
    marginTop: 50,
  },
  watermarkTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  watermarkText: { color: "#fff", fontSize: 14, marginBottom: 3 },
  watermarkType: {
    color: "#ffeb3b",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },
  accuracyContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 5,
    alignSelf: "flex-start",
  },
  accuracyText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cameraControls: {
    position: "absolute",
    bottom: 150,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  closeButton: { padding: 10 },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonDisabled: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  flipButton: { padding: 10 },
  photoTypeSelector: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 10,
  },
  photoTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  photoTypeButtonActive: { backgroundColor: "#667eea" },
  photoTypeButtonCompleted: { backgroundColor: "rgba(76,175,80,0.3)" },
  photoTypeIcon: { fontSize: 16, marginRight: 6 },
  photoTypeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  photoTypeTextActive: { color: "#fff" },
  photoTypeTextCompleted: { color: "#4CAF50" },
  photosPreview: {
    position: "absolute",
    bottom: 220,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 10,
  },
  photosPreviewTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  photoPreviewItem: { alignItems: "center", marginHorizontal: 5 },
  photoPreviewImage: { width: 60, height: 60, borderRadius: 8 },
  removePhotoButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#f44336",
    borderRadius: 10,
    padding: 2,
  },
  photoPreviewLabel: {
    color: "#fff",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
  saveButton: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default CustomerPhotoCamera;
