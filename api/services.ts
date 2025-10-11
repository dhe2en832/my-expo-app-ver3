// my-expo-app/api/services.ts
import axios from "./axiosConfig";
import * as SecureStore from "expo-secure-store";
import { AxiosRequestConfig } from "axios";
import * as FileSystem from "expo-file-system";

// --- Tipe Data Login ---
export type LoginCredentials = {
  userid: string;
  password: string;
  kodecabang: string;
};

export type User = {
  userid: string;
  kode_user: string;
  nama_user: string;
  kodecabang: string;
  kode_sales: string;
  nama_sales: string; // ✅ Tambahan field nama_sales
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
  };
};

// --- Tipe Data RKS & Lainnya ---
import {
  RKSHeader,
  RKSDetail,
  Customer,
  FasMap,
  MobileRKS,
  NewCustomerPayload,
  RKSList,
  SaveFasMapPayload,
  SalesDetail,
  salesList,
} from "./interface";
import apiClient from "./axiosConfig";

// ==================
// Login API Module
// ==================
export const loginAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await axios.post<LoginResponse>("/login", credentials);
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        await SecureStore.setItemAsync("auth_token", token);
        await SecureStore.setItemAsync("user_data", JSON.stringify(user));
        return {
          success: true,
          data: { token, user },
          message: response.data.message,
        };
      } else {
        return {
          success: false,
          message: response.data.message || "Login gagal",
        };
      }
    } catch (error: any) {
      console.error("Login API error:", error);
      if (error.response) {
        const message =
          error.response.data?.message || "Terjadi kesalahan pada server";
        return { success: false, message };
      } else if (error.request) {
        return { success: false, message: "Tidak ada koneksi ke server" };
      } else {
        return {
          success: false,
          message: error.message || "Error tidak dikenal",
        };
      }
    }
  },

  logout: async (): Promise<void> => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        await axios.post(
          "/login/logout",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch (error) {
      console.warn("Logout API warning:", error);
    } finally {
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("user_data");
    }
  },

  getStoredAuth: async (): Promise<{
    token: string | null;
    user: User | null;
  }> => {
    const token = await SecureStore.getItemAsync("auth_token");
    const userData = await SecureStore.getItemAsync("user_data");
    const user = userData ? JSON.parse(userData) : null;
    return { token, user };
  },
};

// ===================
// RKS Master Module
// ===================
export const rksAPI = {
  // --- RKS ---
  getRKSList: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: RKSList[] }>(
        `/rks/list/${kode_sales}`
      );
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS List",
      };
    }
  },
  getRKSHeaders: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: RKSHeader[] }>(
        `/rks/headers/${kode_sales}`
      );
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS header",
      };
    }
  },

  getRKSDetails: async (kode_rks: string) => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: RKSDetail[] }>(
        `/rks/details/${kode_rks}`
      );
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS detail",
      };
    }
  },

  // --- Customer ---
  getCustomer: async (kode_cust: string) => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: Customer }>(
        `/customer/${kode_cust}`
      );
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      if (err.response?.status === 404) {
        return { success: true, error: null };
      }
      return {
        success: false,
        error: err.message || "Gagal mengambil data customer",
      };
    }
  },

  // --- Mobile RKS ---
  createMobileRKS: async (data: Partial<MobileRKS>) => {
    try {
      const res = await apiClient.post<{ success: boolean; data?: MobileRKS }>(
        `/rks-mobile`,
        data
      );
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal membuat kunjungan",
      };
    }
  },

  updateMobileRKS: async (id: string, data: Partial<MobileRKS>) => {
    try {
      const res = await apiClient.patch<{ success: boolean; data?: MobileRKS }>(
        `/rks-mobile/${id}`,
        data
      );
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal memperbarui kunjungan",
      };
    }
  },

  syncRKS: async (records: MobileRKS[]) => {
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>(
        `/rks-mobile/sync`,
        { records }
      );
      return { success: true, message: res.data.message || "Sync berhasil" };
    } catch (err: any) {
      return { success: false, error: err.message || "Gagal sync kunjungan" };
    }
  },
};

// ===================
// FasMap API Module
// ===================
export const fasmapAPI = {
  // ✅ Get fasmap untuk customer
  getFasMap: async (
    kode_cust: string
  ): Promise<{
    success: boolean;
    data?: FasMap;
    message?: string;
  }> => {
    try {
      const response = await apiClient.get(`/fasmap/${kode_cust}`);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error getting fasmap:", error);
      if (error.response?.status === 404) {
        return {
          success: true,
          data: undefined,
        };
      }
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mendapatkan data fasmap",
      };
    }
  },

  // ✅ Save fasmap baru
  saveFasMap: async (
    payload: SaveFasMapPayload
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> => {
    try {
      const response = await apiClient.post("/fasmap", payload);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error saving fasmap:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal menyimpan fasmap",
      };
    }
  },

  // ✅ Check if fasmap exists
  checkFasMapExists: async (
    kode_cust: string
  ): Promise<{
    success: boolean;
    exists: boolean;
    fasmap?: FasMap;
    message?: string;
  }> => {
    try {
      const response = await apiClient.get(`/fasmap/check/${kode_cust}`);
      return {
        success: true,
        exists: response.data.data?.exists || false,
        fasmap: response.data.data?.fasmap,
      };
    } catch (error: any) {
      console.error("Error checking fasmap:", error);
      return {
        success: false,
        exists: false,
        message: error.response?.data?.message || "Gagal mengecek fasmap",
      };
    }
  },
};

// ===================
// Customer API Module
// ===================
export const customerAPI = {
  createNewCustomer: async (payload: NewCustomerPayload) => {
    try {
      const res = await apiClient.post<{ success: boolean; data?: any }>(
        "/customer-mobile",
        payload
      );
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal membuat customer baru",
      };
    }
  },

  // ✅ Get customer details
  getCustomer: async (
    kode_cust: string
  ): Promise<{
    success: boolean;
    data?: Customer;
    message?: string;
  }> => {
    try {
      const response = await apiClient.get(`/customer/${kode_cust}`);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error getting customer:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mendapatkan data customer",
      };
    }
  },
};

// ===================
// Sales API Module
// ===================
export const salesAPI = {
  getSalesList: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: salesList[] }>(
        `/sales/list/${kode_sales}`
      );
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS List",
      };
    }
  },

  // ✅ Get customer details
  getSalesDetail: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: SalesDetail[];
      }>(`/sales/details/${kode_sales}`);
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil Sales detail",
      };
    }
  },
};

// ✅ Export semua service
export default {
  loginAPI,
  rksAPI,
  customerAPI,
  fasmapAPI,
  salesAPI,
};