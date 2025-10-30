// my-expo-app/app/login.tsx
// screens/LoginScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { User, Lock, Building, Eye, EyeOff } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { initDatabase } from "@/utils/database";
import {
  performInitialFullSync, // <-- FUNGSI BARU: Untuk sync awal (Promise)
  startAutoSync, // <-- FUNGSI LAMA: Untuk background listener
  setSyncCallbacks, // <-- FUNGSI UNTUK MENGHUBUNGKAN STATE
} from "@/utils/autoSync";
import { SyncLoadingOverlay } from "@/components/SyncLoadingOverlay ";
import { fcmService } from "@/utils/fcmMobileService";

export default function LoginScreen() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [kodeCabang, setKodeCabang] = useState<string>("01");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const branchRef = useRef<TextInput>(null);

  // States untuk Sync Loading Overlay
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Menunggu Login");
  const [syncProgress, setSyncProgress] = useState(0);

  // --- EFFECT: Pasang Callback State Sekali Saja ---
  useEffect(() => {
    // Hubungkan state lokal (setSyncProgress, setSyncMessage) ke fungsi global di autoSync.ts
    setSyncCallbacks(setSyncProgress, setSyncMessage);

    // Opsional: Cleanup function (meski komponen ini jarang di-unmount)
    return () => {
      // Membersihkan callback jika komponen di-unmount
      setSyncCallbacks(
        () => {},
        () => {}
      );
    };
  }, []);

  const runInitAndSync = async () => {
    const startTime = Date.now();
    let unsubscribe: (() => void) | undefined;
    try {
      // Step 1: Initialize Database (0% - 10%)
      setIsSyncing(true); // <-- OVERLAY MUNCUL!
      setSyncMessage("Menginisialisasi database lokal...");
      setSyncProgress(0);

      await initDatabase();
      setSyncProgress(10); // Progres setelah database siap

      // Step 2: Sinkronisasi Data (10% - 90%)
      // Progress akan di-update secara REAL-TIME oleh performInitialFullSync
      setSyncMessage("Memulai sinkronisasi transaksi...");
      await performInitialFullSync(); // <-- TUNGGU & MONITOR PROGRESS NYATA

      // Step 3: Start Auto Sync Listener (untuk background)
      unsubscribe = startAutoSync();

      // Step 4: Completion and Timeout (90% - 100%)
      setSyncProgress(90);
      setSyncMessage("Penyelesaian dan optimasi...");

      // Jaga agar overlay muncul minimal 1.5 detik
      const minLoadingTime = 1500;
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

      await new Promise((resolve) => setTimeout(resolve, remainingTime));

      setSyncProgress(100);
      setSyncMessage("Sinkronisasi selesai");

      // Delay sebelum hide overlay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSyncing(false); // HIDE OVERLAY
    } catch (error: any) {
      console.error("[App] Error initializing DB/Sync:", error);
      // Handling error, pastikan overlay tetap hilang
      setSyncProgress(100);
      setSyncMessage("Terjadi kesalahan sinkronisasi. Coba lagi.");

      if (unsubscribe) unsubscribe(); // Hentikan listener jika terjadi error

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSyncing(false);
      Alert.alert("Error during Sync", error.message);
      throw error; // Re-throw error agar handleLogin tahu ada masalah
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !kodeCabang.trim()) {
      Alert.alert("Error", "Username and Branch Code are required");
      return;
    }

    setLoading(true); // Mulai loading button
    try {
      // 1. COBA LOGIN ke server
      const success = await login(username, password, kodeCabang);

      if (success) {
        // 2. Initialize FCM dan register token
        try {
          await fcmService.initialize();
          await fcmService.registerTokenWithServer();
          console.log("FCM token registered successfully");
        } catch (fcmError) {
          console.warn(
            "FCM registration failed, continuing without notifications:",
            fcmError
          );
          // Jangan gagalkan login hanya karena FCM error
        }

        // 2. LOGIN BERHASIL: Mulai proses SYNC (Overlay muncul di dalam runInitAndSync)
        await runInitAndSync();

        // 3. SYNC SELESAI: Navigasi ke halaman utama
        router.replace("/(tabs)");
      } else {
        // LOGIN GAGAL
        Alert.alert("Login Failed", "Invalid credentials or branch code");
        setLoading(false);
      }
    } catch (err) {
      // ERROR (koneksi/API/Sync Error)
      console.error("Login or Sync error:", err);
      Alert.alert(
        "Login Failed",
        "Unable to connect or sync data. Please check your connection."
      );
      // Loading button dihentikan hanya jika terjadi error atau login gagal
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Please contact your administrator.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* OVERLAY DI SINI */}
            {/* Tambahkan progress prop ke overlay */}
            <SyncLoadingOverlay
              isVisible={isSyncing}
              message={syncMessage}
              progress={syncProgress}
            />

            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>My Expo</Text>
                <Text style={styles.subtitle}>
                  Professional Sales Management
                </Text>
              </View>

              <View style={styles.form}>
                {/* Username */}
                <View style={styles.inputContainer}>
                  <User color="#666" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      passwordRef.current?.focus();
                    }}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <Lock color="#666" size={20} style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Password (optional)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      branchRef.current?.focus();
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff color="#666" size={20} />
                    ) : (
                      <Eye color="#666" size={20} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Kode Cabang */}
                <View style={styles.inputContainer}>
                  <Building color="#666" size={20} style={styles.inputIcon} />
                  <TextInput
                    ref={branchRef}
                    style={styles.input}
                    placeholder="Branch Code (e.g. 01)"
                    placeholderTextColor="#999"
                    value={kodeCabang}
                    onChangeText={setKodeCabang}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (loading || isSyncing) && styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loading || isSyncing} // <-- Disable saat loading/syncing
                >
                  <Text style={styles.loginButtonText}>
                    {loading
                      ? "Signing In..."
                      : isSyncing
                      ? "Syncing Data..."
                      : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>©batasku-faspro</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Ref untuk fokus input
const branchRef = React.createRef<TextInput>();

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  content: { flex: 1, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "bold", color: "white", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.8)" },
  form: { marginBottom: 24 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: "#333" },
  eyeIcon: { padding: 4 },
  loginButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: { backgroundColor: "#A5D6A7" },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "600" },
  footer: { alignItems: "center", marginTop: 16 },
  footerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginBottom: 4,
  },
});
