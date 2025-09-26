// contexts/AuthContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useMemo, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  territory: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  // const loadStoredUser = async () => {
  //   try {
  //     // Tambahkan delay minimal agar splash screen terlihat
  //     const [storedUser] = await Promise.all([
  //       AsyncStorage.getItem('user'),
  //       new Promise(resolve => setTimeout(resolve, 1000)) // ✅ Minimal 1 detik
  //     ]);

  //     if (storedUser) {
  //       setUser(JSON.parse(storedUser));
  //     }
  //   } catch (error) {
  //     console.error('Error loading stored user:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
// contexts/AuthContext.tsx
const loadStoredUser = async () => {
  try {
    // Tunggu user dari AsyncStorage
    const storedUser = await AsyncStorage.getItem('user');

    // ✅ Tambahkan delay minimal 2 detik agar splash screen terlihat keren
    await new Promise(resolve => setTimeout(resolve, 10000)); // 2000ms = 2 detik

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  } catch (error) {
    console.error('Error loading stored user:', error);
  } finally {
    setIsLoading(false);
  }
};

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    if (username === 'demo' && password === 'demo123') {
      const mockUser: User = {
        id: '1',
        name: 'Asep',
        username: 'demo',
        role: 'Sales Representative',
        territory: 'Jakarta Central',
      };
      
      setUser(mockUser);
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      await AsyncStorage.setItem('token', 'mock-jwt-token');
    } else {
      throw new Error('Invalid credentials');
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
  }), [user, isLoading, login, logout]);
});