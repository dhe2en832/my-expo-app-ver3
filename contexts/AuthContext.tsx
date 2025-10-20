// contexts/AuthContext.tsx
// untuk mengelola autentikasi user,splashscreen, dan penyimpanan token aman
import createContextHook from "@nkzw/create-context-hook";
import * as SecureStore from "expo-secure-store";
import { useState, useEffect, useMemo, useCallback } from "react";
import { loginAPI, salesAPI, type User as ApiUser } from "@/api/services";

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  territory: string | "";
  kodeSales: string | "";
  namaSales?: string | ""; // ← tambahkan properti namaSales (opsional)
}

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
            id: apiUser.userid,
            name: apiUser.nama_user,
            username: apiUser.userid,
            role: "Sales",
            territory: apiUser.kodecabang,
            kodeSales: apiUser.kode_sales || "",
            namaSales: apiUser.nama_sales || "", // ← inisialisasi namaSales
          };
          console.log("Loaded stored user auth:", frontendUser);
          setUser(frontendUser);
        }
      } catch (error) {
        console.error("Error loading auth ", error);
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

          // console.log("Login result:", result);
          if (result.success && result.data) {
            const { user: apiUser } = result.data;
            const salesRes = await salesAPI.getSalesList(apiUser.kode_sales);
            // console.log("salesRes:", salesRes.data[0]?.nama_sales);
            const frontendUser: User = {
              id: apiUser.userid,
              name: apiUser.nama_user,
              username: apiUser.userid,
              role: "Sales",
              territory: apiUser.kodecabang,
              kodeSales: apiUser.kode_sales || "",
              namaSales: salesRes.data[0]?.nama_sales || "",
              // salesRes.success && salesRes.data.length > 0
              //   ? salesRes.data[0]?.nama_sales
              //   : "", // ← inisialisasi namaSales
            };

            setUser(frontendUser);
            return true;
          } else {
            console.warn("Login API failed:", result.message);
            return false; // ← pastikan return false!
          }
        } catch (error) {
          console.error("Login exception:", error);
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
