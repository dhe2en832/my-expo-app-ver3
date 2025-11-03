import Constants from "expo-constants";
import { Alert } from "react-native";

// utils/networkTest.ts
export const testLoginConnection = async (): Promise<boolean> => {
  try {
    const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || "http://faspro.ddns.net:3000/api";
    const testURL = `${API_BASE_URL}/login`;

    // ✅ Data dummy untuk test login
    const testCredentials = {
      userid: "administrator", // ganti dengan userid yang ada di database
      password: "", // ganti dengan password yang benar
      kodecabang: "01" // ganti dengan kode cabang yang valid
    };

    Alert.alert("🔍 LOGIN TEST",
      `Testing login to:\n${testURL}\n\nWith data:\nUser: ${testCredentials.userid}\nCabang: ${testCredentials.kodecabang}`
    );

    const response = await fetch(testURL, {
      method: "POST", // ✅ METHOD POST
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testCredentials), // ✅ TAMBAH BODY
    });

    // console.log("📨 Login Response Status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    // console.log("✅ LOGIN RESPONSE:", data);

    if (data.success) {
      Alert.alert(
        "✅ LOGIN SUCCESS",
        `User: ${data.data.user.nama_user}\nRole: ${data.data.user.role}`
      );
    } else {
      Alert.alert(
        "❌ LOGIN FAILED",
        `Message: ${data.message}`
      );
    }

    return data.success;

  } catch (error: any) {
    console.error("❌ LOGIN FAILED:", error);

    Alert.alert(
      "❌ LOGIN ERROR",
      `Error: ${error.message}\n\nURL: ${Constants.expoConfig?.extra?.API_BASE_URL || "http://faspro.ddns.net:3000/api"}/login`
    );

    return false;
  }
};