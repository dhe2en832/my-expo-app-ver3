// contexts/AuthContext.tsx
// untuk mengelola autentikasi user,splashscreen, dan penyimpanan token aman
import createContextHook from "@nkzw/create-context-hook";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect, useMemo, useCallback } from "react";
import { loginAPI, salesAPI, User, type User as ApiUser } from "@/api/services";
import { Alert } from "react-native";

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
        // Tunggu secure store + minimal delay 1 detik untuk UX splash
        const [token, userData] = await Promise.all([
          SecureStore.getItemAsync("auth_token"),
          SecureStore.getItemAsync("user_data"),
          new Promise((resolve) => setTimeout(resolve, 7000)), // ← minimal splash 1 detik
        ]);

        if (token && userData) {
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
            namaSales: apiUser.namaSales || "", // ← inisialisasi namaSales
            salesRole: apiUser.salesRole || "",
            anakBuah: apiUser.anakBuah,
            // jabatan: apiUser.jabatan,
          };
          // console.log("Loaded stored user auth:", frontendUser);
          setUser(frontendUser);
        }
      } catch (error: any) {
        console.error("Error loading auth ", error);
        Alert.alert("Error fungsi loadStoredAuth : ", error.message);
      } finally {
        setIsLoading(false); // ← setelah delay + load, baru selesai loading
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
            console.warn("Login API failed:", result.message);
            Alert.alert("Error result login : ", result.message);

            return false; // ← pastikan return false!
          }
        } catch (error: any) {
          console.error("Login exception:", error);
          Alert.alert("Error fungsi auth async login: ", error.message);
          return false; // ← jangan throw, return false!
        }
      },
      []
    );

    const logout = useCallback(async () => {
      await loginAPI.logout();
      setUser(null);
    }, []);

    return useMemo(
      () => ({ user, isLoading, login, logout }),
      [user, isLoading, login, logout]
    );
  }
);
