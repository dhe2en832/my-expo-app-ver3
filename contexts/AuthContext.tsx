// contexts/AuthContext.tsx
// untuk mengelola autentikasi user,splashscreen, dan penyimpanan token aman
import createContextHook from "@nkzw/create-context-hook";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect, useMemo, useCallback } from "react";
import { loginAPI, salesAPI, User, type User as ApiUser } from "@/api/services";
import { Alert } from "react-native";
import { fcmService } from "@/utils/fcmMobileService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { testNetworkConnection } from "@/utils/networkTest";
import { router } from "expo-router";

// interface User {
//   id: string;
//   name: string;
//   username: string;
//   role: string;
//   territory: string | "";
//   kodeSales: string | "";
//   namaSales?: string | ""; // ← tambahkan properti namaSales (opsional)
//   anakBuah: string[];
// }

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    userid: string,
    password: string,
    kodecabang: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(
  () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
      loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
      try {
        const MAX_INACTIVE_TIME = 5 * 60 * 1000; // 5 menit

        const [token, userData, lastActiveStr] = await Promise.all([
          SecureStore.getItemAsync("auth_token"),
          SecureStore.getItemAsync("user_data"),
          SecureStore.getItemAsync("last_active"),
        ]);

        let sessionValid = false;

        if (token && userData && lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          const now = Date.now();
          if (!isNaN(lastActive) && now - lastActive <= MAX_INACTIVE_TIME) {
            sessionValid = true;
            // Perbarui timestamp agar session tetap hidup
            await SecureStore.setItemAsync("last_active", now.toString());
          }
        }

        if (sessionValid && userData) {
          const apiUser = JSON.parse(userData) as ApiUser;
          const frontendUser: User = {
            kodeCabang: apiUser.kodeCabang,
            namaCabang: apiUser.namaCabang,
            keterangan: apiUser.keterangan,
            pusat: apiUser.pusat,
            kode_user: apiUser.kode_user,
            userid: apiUser.userid,
            nama_user: apiUser.nama_user,
            kodeSales: apiUser.kodeSales || "",
            namaSales: apiUser.namaSales || "",
            salesRole: apiUser.salesRole || "",
            anakBuah: apiUser.anakBuah,
          };
          setUser(frontendUser);
        } else {
          // Session expired atau tidak valid → clear semua
          await SecureStore.deleteItemAsync("auth_token");
          await SecureStore.deleteItemAsync("user_data");
          await SecureStore.deleteItemAsync("last_active");
          setUser(null);
        }
      } catch (error: any) {
        Alert.alert("Error fungsi loadStoredAuth : ", error.message);
        // Clear on error
        await SecureStore.deleteItemAsync("auth_token");
        await SecureStore.deleteItemAsync("user_data");
        await SecureStore.deleteItemAsync("last_active");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const login = useCallback(
      async (
        userid: string,
        password: string,
        kodecabang: string
      ): Promise<boolean> => {
        try {
          const result = await loginAPI.login({ userid, password, kodecabang });
          // console.log("result login XXXX", result);
          if (result.success && result.data) {
            const { user: apiUser } = result.data;
            // const salesRes = await salesAPI.getSalesList(apiUser.kode_sales);

            const frontendUser: User = {
              kodeCabang: apiUser.kodeCabang,
              namaCabang: apiUser.namaCabang,
              keterangan: apiUser.keterangan,
              pusat: apiUser.pusat,
              kode_user: apiUser.kode_user,
              userid: apiUser.userid,
              nama_user: apiUser.nama_user || "",
              kodeSales: apiUser.kodeSales || "",
              namaSales: apiUser.namaSales || "", // ← inisialisasi namaSales
              salesRole: apiUser.salesRole || "",
              anakBuah: apiUser.anakBuah,
            };
            // console.log("frontendUser : ", frontendUser);
            setUser(frontendUser);
            return true;
          } else {
            // console.warn("Login API failed:", result.message);
            Alert.alert("Error login : ", result.message);

            return false; // ← pastikan return false!
          }
        } catch (error: any) {
          // console.error("Login exception:", error);
          // Alert.alert("Error fungsi auth async login: ", error);
          return false; // ← jangan throw, return false!
        }
      },
      []
    );

    const logout = useCallback(async () => {
      try {
        // Unregister FCM token dari server
        await fcmService.unregisterTokenFromServer();
      } catch (error) {
        console.warn("Error during FCM unregistration:", error);
      } finally {
        // Clear local storage dan state
        await SecureStore.deleteItemAsync("auth_token");
        await SecureStore.deleteItemAsync("user_data");
        await SecureStore.deleteItemAsync("last_active");
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("userData");
        setUser(null);
        // Navigate ke login
        // router.replace("/login");
        // await loginAPI.logout();
      }
    }, []);

    return useMemo(
      () => ({ user, isLoading, login, logout }),
      [user, isLoading, login, logout]
    );
  }
);
