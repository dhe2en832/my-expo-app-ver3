import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { mobileCatatanService } from "@/api/services";

export default function CatatanCreate() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id_catatan?: string;
    kode_rks?: string;
    kode_cust?: string;
    nama_cust?: string;
    no_cust?: string;
    rowid?: string;
  }>();

  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const [customerInfo, setCustomerInfo] = useState({
    kode_rks: "",
    id_rks: "",
    kode_cust: "",
    nama_cust: "",
    no_cust: "",
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const initialized = useRef(false);

  // ✅ Inisialisasi data dari params
  useEffect(() => {
    if (!initialized.current) {
      setCustomerInfo({
        kode_rks: params.kode_rks || "",
        id_rks: params.rowid || "",
        kode_cust: params.kode_cust || "",
        nama_cust: params.nama_cust || "",
        no_cust: params.no_cust || "",
      });

      // Jika ada id_catatan, maka mode edit
      if (params?.id_catatan) {
        setIsEditing(true);
        loadCatatanDetail(params.id_catatan);
      }

      initialized.current = true;
    }

    // Animation on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [params]);

  // Update character count
  useEffect(() => {
    setCharCount(catatan.length);
  }, [catatan]);

  // 🔍 Ambil detail catatan kalau edit
  const loadCatatanDetail = async (id: string) => {
    try {
      setLoading(true);
      const data = await mobileCatatanService.getDetail(id);
      setCatatan(data?.isi_catatan || "");
      setCustomerInfo({
        kode_rks: data?.kode_rks || "",
        id_rks: data?.id_rks || "",
        kode_cust: data?.kode_cust || "",
        nama_cust: data?.nama_cust || "",
        no_cust: data?.no_cust || "",
      });
    } catch (err) {
      console.error("❌ Gagal memuat detail catatan:", err);
      Alert.alert("Gagal", "Tidak dapat memuat data catatan.");
    } finally {
      setLoading(false);
    }
  };

  // 💾 Simpan / Update catatan
  const handleSave = async () => {
    if (!catatan.trim()) {
      Alert.alert("Peringatan", "Isi catatan tidak boleh kosong.");
      return;
    }

    if (catatan.length < 10) {
      Alert.alert("Peringatan", "Catatan minimal 10 karakter.");
      return;
    }

    const payload = {
      kode_rks: customerInfo.kode_rks,
      id_rks: customerInfo.id_rks,
      kode_cust: customerInfo.kode_cust,
      nama_cust: customerInfo.nama_cust,
      isi_catatan: catatan,
      kode_sales: user?.kodeSales || "",
      nama_sales: user?.nama_user || "",
      created_by: user?.kode_user || "USR-DUMMY",
      updated_by: user?.kode_user || "USR-DUMMY",
    };

    setLoading(true);
    try {
      if (isEditing) {
        console.log("✏️ Updating catatan:", payload);
        await mobileCatatanService.update(payload);
        Alert.alert("Berhasil", "Catatan berhasil diperbarui.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        console.log("📝 Creating catatan:", payload);
        await mobileCatatanService.create(payload);
        Alert.alert("Berhasil", "Catatan berhasil disimpan.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (err) {
      console.error("❌ Error saving catatan:", err);
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan catatan.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => router.back(), [router]);

  const getCharCountColor = () => {
    if (charCount === 0) return "#6b7280";
    if (charCount < 10) return "#ef4444";
    if (charCount < 50) return "#f59e0b";
    return "#10b981";
  };

  // Custom Button Component untuk kontrol penuh
  // Custom Button Component dengan TypeScript types
  interface CustomButtonProps {
    onPress: () => void;
    disabled: boolean;
    loading: boolean;
    isEditing: boolean;
  }

  const CustomButton = ({
    onPress,
    disabled,
    loading,
    isEditing,
  }: CustomButtonProps) => {
    return (
      <TouchableOpacity
        style={[styles.customButton, disabled && styles.customButtonDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <View style={styles.buttonInner}>
            <ActivityIndicator animating size="small" color="#fff" />
            <Text style={styles.customButtonText}>
              {isEditing ? "Memperbarui..." : "Menyimpan..."}
            </Text>
          </View>
        ) : isEditing ? (
          <View style={styles.buttonInner}>
            <MaterialIcons name="save" size={18} color="#fff" />
            <Text style={styles.customButtonText}>Perbarui Catatan</Text>
          </View>
        ) : (
          <View style={styles.buttonInner}>
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.customButtonText}>Simpan Catatan</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: isEditing ? "EDIT CATATAN" : "CATATAN BARU",
            headerTitleStyle: styles.headerTitle,
            headerStyle: styles.header,
            headerLeft: () => (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleBack}
              >
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header Info Card */}
            <Card style={styles.headerCard}>
              <Card.Content style={styles.headerCardContent}>
                <View style={styles.iconContainer}>
                  <FontAwesome5
                    name={isEditing ? "edit" : "sticky-note"}
                    size={20}
                    color="#4f46e5"
                  />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitleText}>
                    {isEditing ? "Edit Catatan" : "Buat Catatan Baru"}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {isEditing
                      ? "Perbarui catatan kunjungan Anda"
                      : "Tuliskan detail kunjungan atau informasi penting"}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Customer Info Card */}
            {customerInfo.nama_cust && (
              <Card style={styles.customerCard}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name="person" size={20} color="#4f46e5" />
                    <Text style={styles.cardTitle}>Informasi Customer</Text>
                  </View>
                  <Divider style={styles.divider} />

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Nama Customer</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {customerInfo.nama_cust || "Tanpa Nama"}
                      </Text>
                    </View>

                    {customerInfo.no_cust ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Nomor</Text>
                        <Text style={styles.infoValue}>
                          {customerInfo.no_cust}
                        </Text>
                      </View>
                    ) : null}

                    {customerInfo.kode_rks ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Kode RKS</Text>
                        <Text style={styles.infoValue}>
                          {customerInfo.kode_rks}
                        </Text>
                      </View>
                    ) : null}

                    {customerInfo.kode_cust ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Kode Customer</Text>
                        <Text style={styles.infoValue}>
                          {customerInfo.kode_cust}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Form Card */}
            <Card style={styles.formCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <MaterialIcons name="description" size={20} color="#4f46e5" />
                  <Text style={styles.cardTitle}>Isi Catatan</Text>
                </View>
                <Divider style={styles.divider} />

                <View style={styles.inputContainer}>
                  <TextInput
                    label="Tulis catatan Anda di sini..."
                    value={catatan}
                    onChangeText={setCatatan}
                    mode="outlined"
                    multiline
                    numberOfLines={8}
                    style={styles.textArea}
                    placeholder="Contoh: Kunjungan rutin untuk maintenance, customer menyampaikan kebutuhan... ✍️"
                    outlineColor="#e5e7eb"
                    activeOutlineColor="#4f46e5"
                  />

                  <View style={styles.charCounter}>
                    <Text
                      style={[styles.charText, { color: getCharCountColor() }]}
                    >
                      {charCount} karakter
                    </Text>
                    {charCount > 0 && charCount < 10 && (
                      <Text style={styles.warningText}>
                        {" "}
                        (Minimal 10 karakter)
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>💡 Tips:</Text>
                  <Text style={styles.tipsText}>
                    • Tulis dengan jelas dan detail{"\n"}• Sertakan informasi
                    penting{"\n"}• Gunakan bahasa yang profesional
                  </Text>
                </View>

                {/* Custom Button untuk kontrol layout yang lebih baik */}
                <CustomButton
                  onPress={handleSave}
                  disabled={loading || catatan.length < 10}
                  loading={loading}
                  isEditing={isEditing}
                />
              </Card.Content>
            </Card>

            {/* Sales Info */}
            <Card style={styles.salesCard}>
              <Card.Content>
                <View style={styles.salesInfo}>
                  <MaterialIcons name="badge" size={16} color="#6b7280" />
                  <Text style={styles.salesText}>
                    Dicatat oleh: {user?.nama_user || "Sales"} •{" "}
                    {new Date().toLocaleDateString("id-ID")}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Spacer untuk menghindari navigation bar Android */}
            <View style={styles.bottomSpacer} />
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#4f46e5",
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  headerButton: {
    padding: 4,
    marginHorizontal: 8,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: Platform.OS === "android" ? 30 : 16,
  },

  // Header Card
  headerCard: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },

  // Customer Card
  customerCard: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  divider: {
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },

  // Form Card
  formCard: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textArea: {
    height: 160,
    textAlignVertical: "top",
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "#fafafa",
  },
  charCounter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
  },
  charText: {
    fontSize: 12,
    fontWeight: "500",
  },
  warningText: {
    fontSize: 12,
    color: "#ef4444",
  },

  // Tips Container
  tipsContainer: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369a1",
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 12,
    color: "#0c4a6e",
    lineHeight: 16,
  },

  // CUSTOM BUTTON STYLES - SOLUSI UNTUK TEKS TENGGELAM
  customButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    minWidth: "100%",
  },
  customButtonDisabled: {
    backgroundColor: "#9ca3af",
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  customButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    includeFontPadding: false,
    lineHeight: 20,
  },

  // Sales Card
  salesCard: {
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  salesInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  salesText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 6,
    fontStyle: "italic",
  },

  // Bottom Spacer untuk Android
  bottomSpacer: {
    height: Platform.OS === "android" ? 20 : 0,
  },
});
