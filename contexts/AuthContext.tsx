// contexts/AuthContext.tsx
// untuk mengelola autentikasi user,splashscreen, dan penyimpanan token aman
import createContextHook from '@nkzw/create-context-hook';
import * as SecureStore from 'expo-secure-store';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { loginAPI, type User as ApiUser } from '@/api/services';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  territory: string;
  kodeSales: string;
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
            kodeSales: apiUser.kode_sales  || "",
          };
          console.log("Loaded stored user:", frontendUser);
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
          console.log("Login result:", result);
          if (result.success && result.data) {
            const { user: apiUser } = result.data;
            const frontendUser: User = {
              id: apiUser.userid,
              name: apiUser.nama_user,
              username: apiUser.userid,
              role: "Sales",
              territory: apiUser.kodecabang,
              kodeSales: apiUser.kode_sales || "",
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

// // contexts/AuthContext.tsx
// import createContextHook from '@nkzw/create-context-hook';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useState, useEffect, useMemo, useCallback } from 'react';

// interface User {
//   id: string;
//   name: string;
//   username: string;
//   role: string;
//   territory: string;
// }

// interface AuthContextType {
//   user: User | null;
//   isLoading: boolean;
//   login: (username: string, password: string) => Promise<void>;
//   logout: () => void;
// }

// export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);

//   useEffect(() => {
//     loadStoredUser();
//   }, []);


// const loadStoredUser = async () => {
//   try {
//     // Tunggu user dari AsyncStorage
//     const storedUser = await AsyncStorage.getItem('user');

//     // ✅ Tambahkan delay minimal 2 detik agar splash screen terlihat keren
//     await new Promise(resolve => setTimeout(resolve, 10000)); // 2000ms = 2 detik

//     if (storedUser) {
//       setUser(JSON.parse(storedUser));
//     }
//   } catch (error) {
//     console.error('Error loading stored user:', error);
//   } finally {
//     setIsLoading(false);
//   }
// };

//   const login = useCallback(async (username: string, password: string): Promise<void> => {
//     if (username === 'demo' && password === 'demo123') {
//       const mockUser: User = {
//         id: '1',
//         name: 'Asep',
//         username: 'demo',
//         role: 'Sales Representative',
//         territory: 'Jakarta Central',
//       };

//       setUser(mockUser);
//       await AsyncStorage.setItem('user', JSON.stringify(mockUser));
//       await AsyncStorage.setItem('token', 'mock-jwt-token');
//     } else {
//       throw new Error('Invalid credentials');
//     }
//   }, []);

//   const logout = useCallback(async () => {
//     setUser(null);
//     await AsyncStorage.removeItem('user');
//     await AsyncStorage.removeItem('token');
//   }, []);

//   return useMemo(() => ({
//     user,
//     isLoading,
//     login,
//     logout,
//   }), [user, isLoading, login, logout]);
// });