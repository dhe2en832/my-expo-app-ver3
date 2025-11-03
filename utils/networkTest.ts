// utils/networkTest.ts
import { Alert, Platform } from "react-native";
import Constants from "expo-constants";

export const testNetworkConnection = async () => {
  try {
    const API_BASE_URL =
      Constants.expoConfig?.extra?.API_BASE_URL ||
      "http://faspro.ddns.net:3000/api";

    // const testURLs = [
    //   "http://faspro.ddns.net:3000/api",
    //   "http://faspro.ddns.net:3000/health", // tanpa /api
    //   "http://192.168.1.9:3000/api/health", // IP lokal
    // ];

    // console.log("📋 ALL CONSTANTS:", {
    //   expoConfig: Constants.expoConfig,
    //   manifest: Constants.manifest,
    //   extra: Constants.expoConfig?.extra,
    //   manifestExtra: Constants.manifest?.extra,
    //   installationId: Constants.installationId,
    //   platform: Constants.platform,
    // });

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    // Debug function untuk lihat semua constants
    Alert.alert("🔍 Testing connection to:", API_BASE_URL);
    Alert.alert("📱 Platform:", Platform.OS);
    Alert.alert(
      "🏷️ Environment:",
      Constants.expoConfig?.extra?.APP_ENV || "unknown"
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    Alert.alert("✅ API Connection Successful:", data);
    return true;
  } catch (error: any) {
    console.error("❌ API Connection Failed:", error);
    Alert.alert("💡 Debug Info:");
    Alert.alert("- Error Message:", error.message);
    Alert.alert("- Error Type:", error.name);

    return false;
  }
};
