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
  kodeCabang: string;
  namaCabang: string;
  keterangan: string;
  pusat: string;
  kode_user: string;
  userid: string;
  nama_user: string;
  kodeSales: string | "";
  namaSales: string | ""; // ← tambahkan properti namaSales (opsional)
  salesRole: string | "";
  anakBuah: string[];
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
  MobileCustomer,
  APIResponse,
  CustomerList,
  CustomerEditFormData,
  SalesOrderList,
  SalesOrderListResponse,
  StockItem,
  ProductListResponse,
  ProductList,
  TerminList,
} from "./interface";
import apiClient from "./axiosConfig";
import { Alert } from "react-native";

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
      // console.error("Login API error:", error);
      Alert.alert("Login API error : ", error.message);

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
      const res = await apiClient.get<{
        success: boolean;
        data?: RKSHeader | RKSHeader[];
      }>(`/rks/headers/${kode_sales}`);

      // pastikan ambil satu objek
      const header = Array.isArray(res.data.data)
        ? res.data.data[0] ?? null
        : res.data.data ?? null;

      return { success: true, data: header };
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
      console.log("📤 Mengirim data check-in ke server...");
      const res = await apiClient.post<{ success: boolean; data?: MobileRKS }>(
        `/rks-mobile`,
        data
      );
      console.log("✅ Response createMobileRKS:", res.data);
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      console.error(
        "❌ Error createMobileRKS:",
        err.response?.data || err.message
      );
      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Gagal membuat kunjungan",
      };
    }
  },
  updateMobileRKS: async (id: string, data: Partial<MobileRKS>) => {
    try {
      console.log("📤 Mengirim data check-out ke server...");
      const res = await apiClient.patch<{ success: boolean; data?: MobileRKS }>(
        `/rks-mobile/${id}`,
        data
      );
      console.log("✅ Response updateMobileRKS:", res.data);
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      console.error(
        "❌ Error updateMobileRKS:",
        err.response?.data || err.message
      );
      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Gagal memperbarui kunjungan",
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
  getMaxRowId: async (
    kode_rks: string
  ): Promise<{ success: boolean; maxRowId?: number; error?: string }> => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: RKSDetail[] }>(
        `/rks/details/${kode_rks}`
      );

      if (res.data.success && res.data.data && res.data.data.length > 0) {
        // Cari rowid maksimum dari array RKSDetail
        const maxRowId = Math.max(
          ...res.data.data.map((detail) => detail.rowid || 0)
        );
        return { success: true, maxRowId };
      } else {
        // Jika tidak ada data, return 0 sebagai default
        return { success: true, maxRowId: 0 };
      }
    } catch (err: any) {
      console.error("Error getting max rowid:", err);
      return {
        success: false,
        error: err.message || "Gagal mengambil max rowid",
      };
    }
  },
  getRKSListCombined: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{ success: boolean; data?: RKSList[] }>(
        `/rks/combined-list/${kode_sales}`
      );
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS List",
      };
    }
  },
  getCustomerListRksUnschedule: async (
    kode_sales: string
  ): Promise<APIResponse<Customer[]>> => {
    try {
      const res = await apiClient.get(`/rks/cust-list/${kode_sales}`);
      return {
        success: true,
        data: res.data.data || [],
        message: res.data.message || "Berhasil",
      };
    } catch (err: any) {
      return {
        success: false,
        data: [],
        message: err.response?.data?.message || "Gagal mengambil Customer List",
        error: err,
      };
    }
  },
  // ✅ 1️⃣ Ambil header RKS hari ini untuk sales tertentu
  getTodayRKSHeader: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: { kode_rks: string };
      }>(`/rks/today-headers/${kode_sales}`);
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil header RKS hari ini",
      };
    }
  },

  // ✅ 2️⃣ Ambil header RKS *unscheduled* untuk hari ini
  getTodayUnscheduledRKS: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: { kode_rks: string };
      }>(`/rks/unscheduled-headers/${kode_sales}`);
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS tidak terjadwal hari ini",
      };
    }
  },

  getTodayNooRKS: async (kode_sales: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: { kode_rks: string };
      }>(`/rks/noo-headers/${kode_sales}`);
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil RKS tidak terjadwal hari ini",
      };
    }
  },

  // ✅ 3️⃣ Ambil max rowid dari kode_rks (bisa master atau mobile)
  getMaxRowId2: async (kode_rks: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: { max_rowid: number };
      }>(`/rks/max-rowid/${kode_rks}`);
      return { success: true, data: res.data.data?.max_rowid || 0 };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil max rowid",
      };
    }
  },
};

// ===================
// FasMap API Module
// ===================
export const fasmapAPI = {
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
  /**
   * Ambil daftar customer gabungan (pending + existing) dengan pagination
   * Pending mobile customer muncul di atas
   * @param kode_sales - kode sales
   * @param page - halaman saat ini (default: 1)
   * @param limit - jumlah item per halaman (default: 50)
   */
  // Di file api/services.ts - TAMBAHKAN method ini
  updateCustomerPhotos: async (kode_cust: string, photoPaths: string[]) => {
    try {
      console.log("📤 Updating customer photo paths:", {
        kode_cust,
        photoCount: photoPaths.length,
      });

      const res = await apiClient.post<{
        success: boolean;
        message?: string;
        data?: {
          kode_cust: string;
          kode_relasi: string;
          photo_count: number;
          main_photo_path: string;
          all_photo_paths: string[];
        };
      }>("/customer-mobile/update-photos", {
        kode_cust,
        photo_paths: photoPaths,
      });

      console.log("✅ Response updateCustomerPhotos:", res.data);
      return {
        success: true,
        data: res.data.data,
        message: res.data.message,
      };
    } catch (err: any) {
      console.error(
        "❌ Error updateCustomerPhotos:",
        err.response?.data || err.message
      );
      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Gagal update photo paths",
      };
    }
  },
  // ✅ CREATE Mobile Customer dengan flow relasi -> cust (SAMA POLA)
  createMobileCustomerWithRelasi: async (
    data: Partial<MobileCustomer> & {
      photos?: any[];
      latitude?: number;
      longitude?: number;
      accuracy?: number | null; // ✅ FIX: Accept null
    }
  ) => {
    try {
      console.log(
        "📤 Sending to:",
        `${apiClient.defaults.baseURL}/customer-mobile`
      );
      console.log("📤 Mengirim data customer baru ke server...", {
        nama_relasi: data.nama_relasi,
        photoCount: data.photos?.length || 0,
        hasGPS: !!(data.latitude && data.longitude),
      });

      if (!data.nama_relasi || !data.alamat || !data.kode_sales) {
        throw new Error("Data required: nama_relasi, alamat, kode_sales");
      }

      const optimizedData = {
        ...data,
        photos: data.photos?.map((photo) => ({
          type: photo.type,
          base64: photo.base64?.substring(0, 500000), // ✅ Limit base64 size
          filename: photo.filename,
          timestamp: photo.timestamp,
          location: photo.location,
        })),
      };

      console.log("🔍 Sending optimized data, photo base64 truncated");

      const res = await apiClient.post<{
        success: boolean;
        data?: MobileCustomer;
      }>(`/customer-mobile`, data);

      console.log("✅ Response createMobileRKS:", res.data);
      return { success: true, data: res.data.data || null };
    } catch (err: any) {
      console.error(
        "❌ Error createMobileCustomerWithRelasi:",
        err.response?.data || err.message
      );
      let errorMessage = "Gagal membuat customer baru";
      if (err.code === "NETWORK_ERROR" || err.message === "Network Error") {
        errorMessage =
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else if (err.response?.status === 404) {
        errorMessage = "Endpoint tidak ditemukan. Periksa konfigurasi server.";
      } else if (err.response?.status === 413) {
        errorMessage =
          "Data foto terlalu besar. Coba kurangi jumlah atau ukuran foto.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      console.log("errorMessage ", errorMessage);
      return {
        success: false,
        error:
          errorMessage ||
          err.response?.data?.message ||
          err.message ||
          "Gagal membuat customer baru",
      };
    }
  },

  // ✅ SYNC Mobile Customers (SAMA POLA)
  syncMobileCustomers: async (records: any[]) => {
    try {
      console.log("📤 Mengirim data sync customer ke server...");
      const res = await apiClient.post<{
        success: boolean;
        syncedCount?: number;
        message?: string;
      }>("/customer-mobile/sync", { records });

      console.log("✅ Response syncMobileCustomers:", res.data);
      return {
        success: true,
        syncedCount: res.data.syncedCount || 0,
        message: res.data.message,
      };
    } catch (err: any) {
      console.error(
        "❌ Error syncMobileCustomers:",
        err.response?.data || err.message
      );
      return {
        success: false,
        error:
          err.response?.data?.message || err.message || "Gagal sync customer",
      };
    }
  },

  getPendingMobileCustomers: async (): // kode_sales: string
  Promise<APIResponse<any[]>> => {
    try {
      console.log("📤 Mengambil data customer pending...");

      // const res = await apiClient.get<{ success: boolean; data?: any[] }>(
      //   `/${kode_sales}`
      // );
      // const res = await apiClient.get(`/${kode_sales}`);
      const res = await apiClient.get(`/pending`);

      console.log("✅ Response getPendingMobileCustomers:", res.data);

      return {
        success: true,
        data: res.data.data || [],
        message: res.data.message || "Berhasil mengambil customer pending",
      };
    } catch (err: any) {
      console.error(
        "❌ Error getPendingMobileCustomers:",
        err.response?.data || err.message
      );

      return {
        success: false,
        data: [], // default array untuk keamanan tipe
        message:
          err.response?.data?.message ||
          err.message ||
          "Gagal mengambil data customer pending",
        error: err,
      };
    }
  },

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

  getCustomerList: async (
    kode_sales: string
  ): Promise<APIResponse<Customer[]>> => {
    try {
      const res = await apiClient.get(`/customer/list/${kode_sales}`);
      return {
        success: true,
        data: res.data.data || [],
        message: res.data.message || "Berhasil",
      };
    } catch (err: any) {
      return {
        success: false,
        data: [],
        message: err.response?.data?.message || "Gagal mengambil Customer List",
        error: err,
      };
    }
  },

  getCustomerDetail: async (
    kode_cust: string
  ): Promise<APIResponse<Customer>> => {
    try {
      const res = await apiClient.get(`/customer/${kode_cust}`);
      return { success: true, data: res.data.data };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        message: err.response?.data?.message || "Gagal mengambil data customer",
        error: err,
      };
    }
  },

  getCombinedCustomerList: async (
    // kode_sales: string,
    page: number = 1,
    limit: number = 50
  ): Promise<APIResponse<CustomerList[]>> => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: CustomerList[];
        meta?: { total: number; page: number; limit: number };
        message?: string;
        // }>(`/customer-mobile/combined-list/${kode_sales}`, {
      }>(`/customer-mobile/combined-list`, {
        params: { page, limit },
      });

      return {
        success: true,
        data: res.data.data || [],
        meta: res.data.meta || {
          total: res.data.data?.length || 0,
          page,
          limit,
        },
        message: res.data.message || "Berhasil",
      };
    } catch (err: any) {
      return {
        success: false,
        data: [],
        meta: { total: 0, page, limit },
        message: err.response?.data?.message || "Gagal mengambil Customer List",
        error: err,
      };
    }
  },

  getDetailCustomerCombined: async (
    kode_cust: string
  ): Promise<{
    success: boolean;
    data?: CustomerEditFormData;
    message?: string;
  }> => {
    try {
      const response = await apiClient.get(
        `/customer-mobile/combined-detail/${kode_cust}`
      );
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

  /**
   * Ambil daftar foto customer dari ZIP path (untuk preview di form edit)
   * @param zipPath - Path relatif ZIP di FTP (contoh: "mobile-images/01/NOO_photos/2025-10-17/CS25100001/...zip")
   * @returns Promise berisi daftar foto dengan URL sementara
   */
  previewCustomerPhotos: async (
    zipPath: string
  ): Promise<{
    success: boolean;
    photos?: { type: string; filename: string; url: string }[];
    error?: string;
  }> => {
    try {
      // Validasi input
      if (!zipPath || typeof zipPath !== "string") {
        return { success: false, error: "ZIP path tidak valid" };
      }

      console.log("📤 Meminta preview foto dari server:", { zipPath });

      // Kirim ke endpoint /api/ftp/preview-photos
      const response = await apiClient.post<{
        success: boolean;
        photos?: { type: string; filename: string; url: string }[];
        message?: string;
      }>("/ftp/preview-photos", { zipPath });

      if (response.data.success && response.data.photos) {
        console.log(
          "✅ Preview foto berhasil dimuat:",
          response.data.photos.length
        );
        return {
          success: true,
          photos: response.data.photos,
        };
      } else {
        const errorMsg = response.data.message || "Gagal memuat preview foto";
        console.warn("⚠️ Server response tidak sukses:", errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error("❌ Error previewCustomerPhotos:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      let errorMessage = "Gagal mengambil preview foto";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Waktu permintaan habis. Coba lagi nanti.";
      } else if (error.response?.status === 404) {
        errorMessage = "File foto tidak ditemukan di server";
      } else if (error.response?.status === 500) {
        errorMessage = "Server mengalami kesalahan internal";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update customer dengan data lengkap + path ZIP foto
   * Digunakan saat edit customer yang sudah ada
   */
  updateCustomerWithPhotos: async (data: {
    kode_cust: string;
    nama_relasi: string;
    nama_cust: string;
    alamat: string;
    kota: string;
    propinsi: string;
    hp: string;
    email: string;
    kode_pos: string;
    alamat_kirim1: string;
    kota_kirim: string;
    propinsi_kirim: string;
    userid: string;
    photo_path: string; // ✅ Path ZIP dari FTP
    photo_count: number; // ✅ Jumlah total foto
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      console.log("📤 Mengupdate customer dengan foto ZIP:", {
        kode_cust: data.kode_cust,
        photo_path: data.photo_path,
        photo_count: data.photo_count,
      });

      const res = await apiClient.put<{
        success: boolean;
        message?: string;
      }>("/customer-mobile/update-with-photos", data);

      if (res.data.success) {
        return {
          success: true,
          message: res.data.message || "Customer berhasil diperbarui",
        };
      } else {
        return {
          success: false,
          error: res.data.message || "Gagal memperbarui customer",
        };
      }
    } catch (err: any) {
      console.error("❌ Error updateCustomerWithPhotos:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      let errorMessage = "Gagal memperbarui customer";
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || "Data tidak valid";
      } else if (err.response?.status === 500) {
        errorMessage = "Server mengalami kesalahan internal";
      } else if (err.code === "ECONNABORTED") {
        errorMessage = "Waktu permintaan habis. Coba lagi nanti.";
      }

      return {
        success: false,
        error: errorMessage,
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
        // `/sales/list/${kode_sales}`
        `/sales/list`
      );
      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        data: [],
        error: err.message || "Gagal mengambil Sales List",
      };
    }
  },

  getSalesDetail: async () => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: SalesDetail[];
        // }>(`/sales/details/${kode_sales}`);
      }>(`/sales/list-by-kode`);

      return { success: true, data: res.data.data || [] };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil Sales detail",
      };
    }
  },
};

// ===================
// Sales Order API Module
// ===================
export const salesOrderAPI = {
  // Get Sales Order List
  getSalesOrderList: async (
    kodeSales: string,
    page: number = 1,
    limit: number = 50
  ): Promise<APIResponse<SalesOrderList[]>> => {
    try {
      const response = await apiClient.get<SalesOrderListResponse>(
        "/sales-order/list",
        {
          params: {
            kode_sales: kodeSales,
            page,
            limit,
          },
        }
      );

      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Sales Order List API Error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mengambil data sales order",
        data: [],
        meta: { total: 0, page: 1, limit },
      };
    }
  },
  // Get Sales Order Detail
  getSalesOrderDetail: async (kodeSO: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(`/sales-order/detail/${kodeSO}`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Sales Order Detail API Error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mengambil detail sales order",
        data: null,
      };
    }
  },

  // Submit Sales Order
  submitSalesOrder: async (kodeSO: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.post(`/sales-order/submit/${kodeSO}`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Submit Sales Order API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal submit sales order",
        data: null,
      };
    }
  },

  getSoDetailCombined: async (kodeSO: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(
        `/sales-order/combined-detail/${kodeSO}`
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Sales Order Detail Combined API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal mengambil detail sales order",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Create Sales Order
  createSalesOrder: async (
    orderData: any
  ): Promise<
    APIResponse<{
      kode_so: string;
      subtotal: number;
      diskon_detail: number;
      diskon_header: number;
      ppn: number;
      total: number;
    }>
  > => {
    try {
      console.log;
      const response = await apiClient.post("/sales-order/create", orderData);

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Create Sales Order API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal membuat Sales Order",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Update Sales Order
  updateSalesOrder: async (
    kodeSO: string,
    orderData: any
  ): Promise<APIResponse<{ kode_so: string }>> => {
    try {
      const response = await apiClient.patch(
        `/sales-order/update/${kodeSO}`,
        orderData
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Update Sales Order API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal memperbarui Sales Order",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Delete Sales Order
  deleteSalesOrder: async (kodeSO: string): Promise<APIResponse<null>> => {
    try {
      const response = await apiClient.delete(`/sales-order/delete/${kodeSO}`);

      return {
        success: response.data.success,
        data: null,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Delete Sales Order API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal menghapus Sales Order",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ SYNC: Get Ready to Sync Sales Orders
  getReadyToSyncSalesOrders: async (
    // kodeSales: string,
    page: number = 1,
    limit: number = 50
  ): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(
        // `/sales-order/sync/ready/${kodeSales}`,
        `/sales-order/sync/ready`,
        {
          params: { page, limit },
        }
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Get Ready to Sync API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal mengambil list SO ready sync",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ SYNC: Sync Single Sales Order to Bridge
  syncSalesOrderToBridge: async (kodeSO: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.post(
        `/sales-order/sync/bridge/${kodeSO}`
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Sync Sales Order API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal sync Sales Order",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ SYNC: Bulk Sync Sales Orders to Bridge
  bulkSyncSalesOrdersToBridge: async (
    kodeSOList: string[]
  ): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.post(`/sales-order/sync/bridge/bulk`, {
        kode_so_list: kodeSOList,
      });

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Bulk Sync Sales Order API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal bulk sync Sales Orders",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ SYNC: Check Sync Status
  checkSyncStatus: async (kodeSO: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(
        `/sales-order/sync/status/${kodeSO}`
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Check Sync Status API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal cek status sync",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ SYNC: Force Mark as Synced (Maintenance)
  forceMarkAsSynced: async (kodeSO: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.patch(
        `/sales-order/sync/force-sync/${kodeSO}`
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Force Mark as Synced API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal force mark as synced",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Get Sales Order List Combined
  getSalesOrderListCombined: async (
    // kodeSales: string,
    page: number = 1,
    limit: number = 50,
    filter?: string
  ): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(
        // `/sales-order/combined-list/${kodeSales}`,
        `/sales-order/combined-list`,
        {
          params: {
            page,
            limit,
            ...(filter && { filter }),
          },
        }
      );

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Get Sales Order List Combined API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal mengambil list sales order",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  approveSalesOrder: async (
    kode_so: string,
    status: "approved" | "rejected",
    catatan: string = ""
  ) => {
    try {
      const res = await apiClient.put<{
        success: boolean;
        data?: any;
        message?: string;
      }>(`/sales-order/approve/${kode_so}`, {
        status,
        catatan,
        approved_by: "", // Will be filled by backend from user context
        approved_at: new Date().toISOString(),
      });

      return {
        success: true,
        data: res.data.data,
        message:
          res.data.message ||
          `Sales Order berhasil ${
            status === "approved" ? "disetujui" : "ditolak"
          }`,
      };
    } catch (err: any) {
      return {
        success: false,
        error:
          err.message ||
          `Gagal ${
            status === "approved" ? "menyetujui" : "menolak"
          } Sales Order`,
      };
    }
  },

  // ✅ BULK APPROVE Sales Orders (NEW)
  bulkApproveSalesOrders: async (
    kode_so_list: string[],
    catatan: string = ""
  ) => {
    try {
      const res = await apiClient.put<{
        success: boolean;
        data?: {
          successful: Array<{ kode_so: string; success: boolean; data?: any }>;
          failed: Array<{ kode_so: string; success: boolean; error: string }>;
        };
        message?: string;
      }>("/sales-order/bulk-approve", {
        kode_so_list,
        catatan,
        approved_by: "",
        approved_at: new Date().toISOString(),
      });

      return {
        success: true,
        data: res.data.data,
        message: res.data.message || "Proses approval bulk selesai",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal melakukan bulk approval",
      };
    }
  },

  // ✅ GET Sales Orders Waiting Approval (NEW)
  getSalesOrdersWaitingApproval: async (
    page: number = 1,
    limit: number = 50
  ) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: any[];
        meta?: {
          total: number;
          page: number;
          limit: number;
          total_pages: number;
        };
        message?: string;
      }>(`/sales-order/waiting-approval?page=${page}&limit=${limit}`);

      return {
        success: true,
        data: res.data.data || [],
        meta: res.data.meta,
        message: res.data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        data: [],
        error:
          err.message ||
          "Gagal mengambil data Sales Order yang menunggu approval",
      };
    }
  },

  // ✅ GET Approval History (NEW)
  getApprovalHistory: async (kode_so: string) => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: Array<{
          id: number;
          kode_so: string;
          status: string;
          catatan: string;
          approved_by: string;
          approved_at: string;
          created_at: string;
        }>;
        message?: string;
      }>(`/sales-order/approval-history/${kode_so}`);

      return {
        success: true,
        data: res.data.data || [],
        message: res.data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Gagal mengambil history approval",
      };
    }
  },
};

// ===================
// Data Barang API Module
// ===================
export const dataBarangAPI = {
  // Get Product List
  getProductList: async (
    page: number = 1,
    limit: number = 50,
    search: string = ""
  ): Promise<APIResponse<ProductList[]>> => {
    try {
      const response = await apiClient.get<ProductListResponse>(
        "/data-barang/stock/list-combined",
        {
          params: {
            page,
            limit,
            search,
          },
        }
      );
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Product List API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal mengambil data produk",
        data: [],
        meta: { total: 0, page: 1, limit },
      };
    }
  },

  // Get Product by Kode
  getProductByKode: async (
    kodeItem: string
  ): Promise<APIResponse<ProductList>> => {
    try {
      const response = await apiClient.get(`/data-barang/stock/${kodeItem}`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Product Detail API Error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mengambil detail produk",
        data: null,
      };
    }
  },
};

// ===================
// Data Umum API Module
// ===================
export const dataUmumAPI = {
  // Get Product by Kode
  getTerminList: async (kodeItem: string): Promise<APIResponse<TerminList>> => {
    try {
      const response = await apiClient.get(`/umum/termin`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Termin List API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal mengambil termin List",
        data: null,
      };
    }
  },
  getTerminByKode: async (kodeTermin: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(`/umum/termin/${kodeTermin}`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Termin API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal mengambil termin",
        data: null,
      };
    }
  },
};

export default {
  loginAPI,
  rksAPI,
  customerAPI,
  fasmapAPI,
  salesAPI,
  salesOrderAPI,
  dataBarangAPI,
  dataUmumAPI,
};
