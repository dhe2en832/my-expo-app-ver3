// app/besi-competitor/create.tsx 
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { competitorBesiAPI } from "../../api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useOfflineQueue } from "@/contexts/OfflineContext";

export default function CreateBesiCompetitor() {
  const router = useRouter();
  const { addToQueue } = useOfflineQueue();
  const { rksId, customerName } = useLocalSearchParams();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState<"camera" | "library" | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // 🔹 fungsi ambil gambar
    const pickImage = async (source: "camera" | "library") => {
    try {
      setLoadingPhoto(source);
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Izin Kamera", "Izin kamera diperlukan.");
            return null;
          }   
     let result;

      if (source === "camera") {
        result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.6,
              cameraType: ImagePicker.CameraType.back,
              base64: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // ⚠️ update sesuai warning
          quality: 0.5,
        });
      }

      if (!result.canceled) {
        // Alert.alert("Error", result.assets[0].uri);
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Gagal membuka kamera/galeri");
    } finally {
        setLoadingPhoto(null); // 🔹 selesai loading
      }
    };

       const handleSubmit = async () => {
        if (!name || !quantity) {
          Alert.alert("Error", "Nama dan jumlah wajib diisi");
          return;
        }
      
        setLoadingSubmit(true); // 🔹 overlay loading

      
        try {
      
          const resp = await competitorBesiAPI.addEntry({
            rksId: rksId as string,
            name,
            quantity: Number(quantity),
            customerName: customerName as string,
            photo,
          });
      
          if (!resp.success || !resp.record) {
            Alert.alert("Error", "Gagal menambahkan data");
            return;
          }
      
          // tambahkan ke offline queue seperti handleCheckIn
          addToQueue({
            type: "besi_entry",
            data: resp.record,
            endpoint: "/api/besi-competitor/add",
          });
      
          Alert.alert("Sukses", "Data berhasil ditambahkan");
          router.back();
        } catch (err) {
          console.error("handleSubmit error:", err);
          Alert.alert("Error", "Gagal menambahkan data");
        } finally {
            setLoadingSubmit(false);
        }
      };
      
      
  

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{
          title: "Besi Kompetitor <Baru>",
        }}
      />
      <Text style={styles.title}>Tambah Besi Kompetitor</Text>

      <TextInput
        style={styles.input}
        placeholder="Nama Material"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Jumlah"
        value={quantity}
        keyboardType="numeric"
        onChangeText={setQuantity}
      />

      {/* Field Customer otomatis terisi dan disabled */}
      <TextInput
        value={customerName as string}
        editable={false}
        style={[
          styles.input,
          { backgroundColor: "#f0f0f0", borderColor: "#ccc" },
        ]}
      />

      {/* 🔹 Tombol ambil foto */}
      <View style={styles.photoRow}>
        <TouchableOpacity
          onPress={() => pickImage("library")}
          style={[styles.photoButton, { marginRight: 8 }]}
          disabled={loadingPhoto !== null} // disable saat loading
        >
           {loadingPhoto === "library" ? (
            <ActivityIndicator color="#fff" />
            ) : (
            <Text style={styles.photoButtonText}>Album</Text>
            )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickImage("camera")}
          style={styles.photoButton}
          
          disabled={loadingPhoto !== null} // disable saat loading
        >
          {loadingPhoto === "camera" ? (
            <ActivityIndicator color="#fff" />
            ) : (
            <Text style={styles.photoButtonText}>Kamera</Text>
            )}
        </TouchableOpacity>
      </View>

      {/* 🔹 Preview foto */}
      {photo && <Image source={{ uri: photo }} style={styles.photo} />}

      <TouchableOpacity
        style={[styles.button, { marginTop: 20 }]}
        onPress={handleSubmit}
        disabled={loadingPhoto !== null}
      >
        <Text style={styles.buttonText}>Simpan</Text>
      </TouchableOpacity>

      {loadingSubmit  && (
        <Modal transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "#fff", marginTop: 12 }}>Menyimpan...</Text>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
      },    
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  button: { backgroundColor: "#667eea", padding: 12, borderRadius: 8 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  photoRow: { flexDirection: "row", marginTop: 12 },
  photoButton: {
    padding: 10,
    backgroundColor: "#667eea",
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  photoButtonText: { color: "#fff" },
  photo: { width: 120, height: 120, marginTop: 12, borderRadius: 8 },
});
