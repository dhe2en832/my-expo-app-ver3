// app/besi-competitor/[id].tsx
import React, { useEffect, useState } from "react";
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
import { BesiCompetitor } from "../../api/mockData";
import * as ImagePicker from "expo-image-picker";

export default function EditBesiCompetitor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<BesiCompetitor | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState<"camera" | "library" | null>(null);

  // 🔹 Ambil data lama
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const resp = await competitorBesiAPI.getById(id);
      if (resp.success && resp.data) {
        setData(resp.data);
        setName(resp.data.name);
        setQuantity(String(resp.data.quantity));
        setCustomerName(resp.data.customerName);
        setPhoto(resp.data.photo);
      } else {
        Alert.alert("Error", "Data tidak ditemukan");
      }
    };

    fetchData();
  }, [id]);

  // 🔹 Ambil foto
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
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
        });
      }

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal membuka kamera/galeri");
    } finally {
      setLoadingPhoto(null);
    }
  };

  // 🔹 Handle update
  const handleUpdate = async () => {
    if (!name || !quantity) {
      Alert.alert("Error", "Nama dan jumlah wajib diisi");
      return;
    }

    if (!id) return;

    setLoadingSubmit(true);
    try {
      const result = await competitorBesiAPI.updateEntry(id, {
        name,
        quantity: Number(quantity),
        customerName,
        photo,
      });

      if (result.success) {
        Alert.alert("Sukses", "Data berhasil diperbarui");
        router.back();
      } else {
        Alert.alert("Error", "Gagal memperbarui data");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Terjadi kesalahan saat memperbarui data");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!data) {
    return (
      <View style={styles.container}>
        <Text>Memuat data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Edit Besi Kompetitor" }} />

      <Text style={styles.title}>Edit Besi Kompetitor</Text>

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

      <TextInput
        style={styles.input}
        value={customerName}
        editable={false}
      />

      {/* Tombol ambil foto */}
      <View style={styles.photoRow}>
        <TouchableOpacity
          onPress={() => pickImage("library")}
          style={[styles.photoButton, { marginRight: 8 }]}
          disabled={loadingPhoto !== null}
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
          disabled={loadingPhoto !== null}
        >
          {loadingPhoto === "camera" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.photoButtonText}>Kamera</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview foto */}
      {photo && <Image source={{ uri: photo }} style={styles.photo} />}

      <TouchableOpacity
        style={[styles.button, { marginTop: 20 }]}
        onPress={handleUpdate}
        disabled={loadingPhoto !== null}
      >
        <Text style={styles.buttonText}>Simpan</Text>
      </TouchableOpacity>

      {loadingSubmit && (
        <Modal transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "#fff", marginTop: 12 }}>Menyimpan...</Text>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
