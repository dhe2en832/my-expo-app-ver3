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
  PPICreateRequest,
  OutstandingInvoice,
  PPIListItem,
  PPICreateResponse,
  PPIMasterDetailPayments,
  PPISummary,
  PpiCustomerList,
  StockItemGrouped,
  KompetitorList,
  KompetitorMasterDetail,
  KompetitorRequest,
  KompetitorCreateResponse,
  CatatanData,
  Perusahaan,
} from "./interface";
import apiClient from "./axiosConfig";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { update } from "lodash";
import { testNetworkConnection } from "@/utils/networkTest";
import { testLoginConnection } from "@/utils/tesLoginConnection";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ==================
// Login API Module
// ==================
// export const loginAPI = {
//   login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
//     try {
//       console.log("credentials ", credentials);
//       const response = await axios.post<LoginResponse>("/login", credentials);
//       if (response.data.success && response.data.data) {
//         const { token, user } = response.data.data;
//         await SecureStore.setItemAsync("auth_token", token);
//         await SecureStore.setItemAsync("user_data", JSON.stringify(user));
//         return {
//           success: true,
//           data: { token, user },
//           message: response.data.message,
//         };
//       } else {
//         return {
//           success: false,
//           message: response.data.message || "Login gagal",
//         };
//       }
//     } catch (error: any) {
//       // console.error("Login API error:", error);
//       // Alert.alert("Login API error : ", error.message);

//       if (error.response) {
//         const message =
//           error.response.data?.message || "Terjadi kesalahan pada server";
//         return { success: false, message };
//       } else if (error.request) {
//         await testNetworkConnection();
//         await testLoginConnection();
//         return {
//           success: false,
//           message: `Tidak ada koneksi ke server ${error.message}`,
//         };
//       } else {
//         return {
//           success: false,
//           message: error.message || "Error tidak dikenal",
//         };
//       }
//     }
//   },

//   logout: async (): Promise<void> => {
//     try {
//       const token = await SecureStore.getItemAsync("auth_token");
//       if (token) {
//         await axios.post(
//           "/login/logout",
//           {},
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           }
//         );
//       }
//     } catch (error) {
//       console.warn("Logout API warning:", error);
//     } finally {
//       await SecureStore.deleteItemAsync("auth_token");
//       await SecureStore.deleteItemAsync("user_data");
//     }
//   },

//   getStoredAuth: async (): Promise<{
//     token: string | null;
//     user: User | null;
//   }> => {
//     const token = await SecureStore.getItemAsync("auth_token");
//     const userData = await SecureStore.getItemAsync("user_data");
//     const user = userData ? JSON.parse(userData) : null;
//     return { token, user };
//   },
// };

// api/services/loginAPI.ts

export const loginAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      // console.log("🔑 Login credentials:", credentials);

      // ✅ GUNAKAN apiClient, BUKAN axios langsung
      const response = await apiClient.post<LoginResponse>(
        "/login",
        credentials
      );

      // Alert.alert("✅ Login response:", JSON.stringify(response, null, 2));

      // Alert.alert(
      //   "✅ Login response.data:",
      //   JSON.stringify(response.data, null, 2)
      // );

      // Alert.alert(
      //   "✅ Login response.data.data:",
      //   JSON.stringify(response.data.data, null, 2)
      // );

      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        await SecureStore.setItemAsync("auth_token", token);
        await SecureStore.setItemAsync("user_data", JSON.stringify(user));
        // Saat login sukses
        await SecureStore.setItemAsync("last_active", Date.now().toString());

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
      // try {
      //   await testNetworkConnection();
      // } finally {
      //   await testLoginConnection();
      // }

      // ✅ ERROR HANDLING YANG LEBIH BAIK
      if (error.response) {
        // Server responded dengan error status
        const message =
          error.response.data?.message || "Terjadi kesalahan pada server";
        console.log("🚨 Server error:", error.response.status, message);
        // Alert.alert(
        //   "🚨 Server error.response :",
        //   error.response.status,
        //   message
        // );
        return { success: false, message };
      } else if (error.request) {
        // Request dibuat tapi tidak ada response
        const message = error || "Login API error";
        console.log("🌐 Network error - No response received");
        Alert.alert(
          "🌐 Network error.request :",
          error.response.status,
          message
        );
        return {
          success: false,
          message:
            "Tidak ada koneksi ke server. Periksa koneksi internet dan pastikan server aktif.",
        };
      } else {
        // Other errors
        const message =
          error.request.data?.message || "Network error - No response received";
        console.log("⚡ Other error:", error.message);
        Alert.alert("⚡ Other server error :", error.response.status, message);

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
      await SecureStore.deleteItemAsync("last_active");
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      // setUser(null);
      // await loginAPI.logout();
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

  // Di salesOrderAPI tambahkan:
  createApprovalHistory: async (historyData: {
    kode_so: string;
    action: string;
    performed_by: string;
    status_before: string;
    status_after: string;
    notes?: string;
  }): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.post(
        "/sales-order/approval-history",
        historyData
      );
      return {
        success: true,
        data: response.data,
        message: "History berhasil dibuat",
      };
    } catch (error: any) {
      console.error("Error creating approval history:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal membuat history",
        error: error.response?.data || error.message,
      };
    }
  },

  approveSalesOrder: async (
    orderId: string,
    notes?: string,
    user?: any
  ): Promise<APIResponse<any>> => {
    try {
      // const { user } = useAuth();

      // 1. Update main SO table
      await apiClient.put(`/sales-order/approve/${orderId}`, {
        notes: notes || "",
        approved_by: user,
        approved_at: new Date().toISOString(),
      });

      // // 2. Create approval history record
      // await apiClient.post("/sales-order/approval-history", {
      //   kode_so: orderId,
      //   action: "approved",
      //   performed_by: user,
      //   notes: notes || "",
      //   status_before: "pending",
      //   status_after: "approved",
      // });

      return {
        success: true,
        message: "Sales Order berhasil disetujui",
      };
    } catch (error: any) {
      console.error("Error approving sales order:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal menyetujui sales order",
        error: error.response?.data || error.message,
      };
    }
  },

  rejectSalesOrder: async (
    orderId: string,
    notes?: string,
    user?: any
  ): Promise<APIResponse<any>> => {
    try {
      // const { user } = useAuth();

      // 1. Update main SO table
      await apiClient.put(`/sales-order/reject/${orderId}`, {
        notes: notes || "",
        rejected_by: user,
        rejected_at: new Date().toISOString(),
        rejection_notes: notes || "",
      });

      // 2. Create rejection history record
      // await apiClient.post("/sales-order/approval-history", {
      //   kode_so: orderId,
      //   action: "rejected",
      //   performed_by: user,
      //   notes: notes || "",
      //   status_before: "pending",
      //   status_after: "rejected",
      // });

      return {
        success: true,
        message: "Sales Order berhasil ditolak",
      };
    } catch (error: any) {
      console.error("Error rejecting sales order:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal menolak sales order",
        error: error.response?.data || error.message,
      };
    }
  },

  // Submit Sales Order
  submitSalesOrder: async (
    orderId: string,
    user: any
  ): Promise<APIResponse<any>> => {
    try {
      // const { user } = useAuth();

      // 1. Update status di main table
      const response = await apiClient.put(`/sales-order/submit/${orderId}`, {
        status: "pending",
        submitted_by: user,
        submitted_at: new Date().toISOString(),
      });

      // // 2. Create submission history record - SELALU JALANKAN
      // await apiClient.post("/sales-order/approval-history", {
      //   kode_so: orderId,
      //   action: "submitted",
      //   performed_by: user,
      //   status_before: "draft",
      //   status_after: "pending",
      // });

      return {
        success: true,
        data: response.data,
        message: "Sales Order berhasil disubmit",
      };
    } catch (error: any) {
      console.error("Error submitting sales order:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal submit sales order",
        error: error.response?.data || error.message,
      };
    }
  },

  updateSalesOrderStatus: async (
    orderId: string,
    status: "approved" | "rejected",
    notes?: string
  ): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.put(`/sales-order/${orderId}/status`, {
        status,
        notes: notes || "",
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        data: response.data,
        message: `Sales Order berhasil ${
          status === "approved" ? "disetujui" : "ditolak"
        }`,
      };
    } catch (error: any) {
      console.error("Error updating sales order status:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          `Gagal ${
            status === "approved" ? "menyetujui" : "menolak"
          } sales order`,
        error: error.response?.data || error.message,
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
  getStockData: async (
    view: "summary" | "perGudang" | "combined" = "summary",
    page: number = 1,
    limit: number = 50,
    filter: string = ""
  ): Promise<APIResponse<StockItem[]>> => {
    try {
      const response = await apiClient.get("data-barang/stock/data", {
        params: {
          view,
          page,
          limit,
          filter,
        },
      });

      return {
        success: true,
        message: "Berhasil mengambil data stok",
        data: response.data.data || [],
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Stock Data API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal mengambil data stok",
        data: [],
        meta: { total: 0, page: 1, limit },
      };
    }
  },
  getStockGrouped: async (
    view: "summary" | "perGudang" | "combined" = "combined",
    page: number = 1,
    limit: number = 50,
    filter: string = ""
  ): Promise<APIResponse<StockItemGrouped[]>> => {
    try {
      const response = await apiClient.get("data-barang/stock/data", {
        params: {
          view,
          page,
          limit,
          filter,
        },
      });

      const rawData = response.data.data || [];

      // 🧩 Kelompokkan per kode_item
      const groupedData: StockItemGrouped[] = Object.values(
        rawData.reduce((acc: Record<string, StockItemGrouped>, row: any) => {
          const kode = row.kode_item;

          if (!acc[kode]) {
            acc[kode] = {
              kode_item: row.kode_item,
              no_item: row.no_item,
              nama_item: row.nama_item,
              kategori: row.kategori,
              kelompok: row.kelompok,
              satuan: row.satuan,
              berat: row.berat,
              harga1: row.harga1,
              harga2: row.harga2,
              harga3: row.harga3,
              stok_total: row.stok || row.stok_total || 0,
              gudang_list: [],
            };
          }

          if (row.kode_gudang) {
            acc[kode].gudang_list.push({
              kode_gudang: row.kode_gudang,
              nama_gudang: row.gudang,
              stok_gudang: row.stok_gudang || 0,
            });
          }

          return acc;
        }, {})
      );

      return {
        success: true,
        message: "Berhasil mengambil dan mengelompokkan data stok",
        data: groupedData,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Stock Grouped API Error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mengambil data stok per item",
        data: [],
        meta: { total: 0, page: 1, limit },
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
  getAkunBank: async (): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.get(`/umum/akun-bank`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Akun Bank API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal mengambil akun bank",
        data: null,
      };
    }
  },
  getInfoPerusahaan: async (): Promise<APIResponse<Perusahaan>> => {
    try {
      const response = await apiClient.get(`/umum/perusahaan`);
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Data Perusahaan API Error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Gagal mengambil Data Perusahaan",
        data: null,
      };
    }
  },
};

// ===================
// PPI API Module
// ===================
export const ppiAPI = {
  // Di file api/services.ts - Perbaiki fungsi getPPISummary
  getPPISummary: async (params?: {
    kode_sales?: string;
    start_date?: string;
    end_date?: string;
    no_ppi?: string;
    nama_customer?: string;
  }): Promise<PPISummary> => {
    try {
      // Siapkan query parameters
      const queryParams: any = {};

      if (params?.kode_sales) {
        queryParams.kode_sales = params.kode_sales;
      }

      if (params?.start_date) {
        queryParams.start_date = params.start_date;
      }

      if (params?.end_date) {
        queryParams.end_date = params.end_date;
      }

      if (params?.no_ppi) {
        queryParams.no_ppi = params.no_ppi;
      }

      if (params?.nama_customer) {
        queryParams.nama_customer = params.nama_customer;
      }

      console.log("📊 Fetching PPI Summary with params:", queryParams);

      const response = await apiClient.get("/ppi-mobile/summary", {
        params: queryParams,
      });

      if (!response.data?.success) {
        throw new Error("Gagal memuat ringkasan PPI");
      }

      const summary = response.data.data;

      return {
        totalPiutang: summary.total_piutang ?? 0,
        totalTertagih: summary.total_tertagih_all ?? 0,
        tertagihFilter: summary.total_tertagih_filtered ?? 0,
        totalOutstanding: summary.outstanding ?? 0,
        draftCount: summary.draftCount ?? 0,
        pendingSyncCount: summary.pendingSyncCount ?? 0,
        syncedCount: summary.syncedCount ?? 0,
      };
    } catch (error) {
      console.error("❌ Error fetching PPI summary:", error);
      throw error;
    }
  },

  getOutstandingInvoices: async (
    kodeCust: string,
    params?: { page?: number; limit?: number; filter?: string }
  ): Promise<APIResponse<OutstandingInvoice[]>> => {
    try {
      const response = await apiClient.get(
        `/ppi-mobile/outstanding/${kodeCust}`,
        { params }
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Get Outstanding Invoices API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message ||
          "Gagal mengambil data outstanding invoices",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Get PPI List Combined (ERP + Mobile)
  getPPIList: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    filter?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<APIResponse<PPIListItem[]>> => {
    try {
      const response = await apiClient.get("/ppi-mobile/list-combined", {
        params,
      });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Get PPI List Combined API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal mengambil data list PPI",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Get PPI Master Detail Combined
  getPPIDetail: async (
    kodePPI: string
  ): Promise<APIResponse<PPIMasterDetailPayments>> => {
    try {
      const response = await apiClient.get(
        `/ppi-mobile/master-detail-combined/${kodePPI}`
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Get PPI Master Detail Combined API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal mengambil detail PPI",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  getPpiCustomerList: async (
    // kode_sales: string,
    page: number = 1,
    limit: number = 50
  ): Promise<APIResponse<PpiCustomerList[]>> => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data?: PpiCustomerList[];
        meta?: { total: number; page: number; limit: number };
        message?: string;
        // }>(`/customer-mobile/combined-list/${kode_sales}`, {
      }>(`/ppi-mobile/customer-list`, {
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

  // ✅ Create PPI
  createPPI: async (
    ppiData: PPICreateRequest
  ): Promise<APIResponse<PPICreateResponse>> => {
    try {
      const response = await apiClient.post("/ppi-mobile/create", ppiData);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Create PPI API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal membuat PPI",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Submit PPI for Sync (Future)
  submitPPI: async (kodePPI: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.post("/ppi-mobile/submit", {
        kode_ppi: kodePPI,
      });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Submit PPI API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal submit PPI",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Update PPI (Future)
  updatePPI: async (
    kodePPI: string,
    ppiData: Partial<PPICreateRequest>
  ): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.put(
        `/ppi-mobile/update/${kodePPI}`,
        ppiData
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Update PPI API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal update PPI",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Cancel PPI (Future)
  cancelPPI: async (kodePPI: string): Promise<APIResponse<any>> => {
    try {
      const response = await apiClient.put(`/ppi-mobile/cancel/${kodePPI}`);
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Cancel PPI API Error:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Gagal cancel PPI",
        error: error.response?.data?.error || error.message,
      };
    }
  },
};

// ===================
// Data Kompetitor API Module
// ===================
export const kompetitorAPI = {
  // ✅ Get PPI List Combined (ERP + Mobile)
  getKompetitorList: async (
    page: number = 1,
    limit: number = 50,
    search: string = "",
    kode_sales: string = ""
  ): Promise<APIResponse<KompetitorList[]>> => {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 50;
      const searchTerm = search || "";

      const response = await apiClient.get("/data-kompetitor/list", {
        params: {
          page: pageNum,
          limit: limitNum,
          search: searchTerm,
          kode_sales: kode_sales || undefined,
        },
      });

      // console.log("🔹 [SERVICE] Full API Response:", response.data);

      // ✅ Handle both meta and pagination fields
      const backendMeta = response.data.meta || response.data.pagination;

      let meta = null;
      if (backendMeta) {
        meta = backendMeta;
      } else {
        // Fallback
        const dataLength = response.data.data?.length || 0;
        meta = {
          page: pageNum,
          limit: limitNum,
          total: dataLength,
          pages: Math.ceil(dataLength / limitNum),
        };
      }

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: meta,
      };
    } catch (error: any) {
      console.error("Get Data Kompetitor API Error:", error);
      return {
        success: false,
        data: [],
        message:
          error.response?.data?.message ||
          "Gagal mengambil data list kompetitor",
        error: error.response?.data?.error || error.message,
        meta: { total: 0, page: 1, limit: Number(limit) || 50, pages: 0 },
      };
    }
  },

  getKompetitorDetail: async (
    kode_kompetitor: string
  ): Promise<{
    success: boolean;
    data?: KompetitorMasterDetail;
    photos?: { type: string; filename: string; url: string }[];
    message?: string;
    error?: string;
  }> => {
    try {
      console.log("📥 Memuat detail kompetitor:", kode_kompetitor);

      // Ambil detail kompetitor utama
      const response = await apiClient.get(
        `/data-kompetitor/detail/${kode_kompetitor}`
      );

      const kompetitorData = response.data?.data;
      if (!kompetitorData) {
        throw new Error("Data kompetitor tidak ditemukan");
      }

      // Jika ada path ZIP foto, ambil preview foto
      let photos: { type: string; filename: string; url: string }[] = [];
      const zipPath = kompetitorData?.file_zip_path; // pastikan field ini ada di DB/API

      if (zipPath && typeof zipPath === "string") {
        console.log("📸 Meminta preview foto kompetitor dari:", zipPath);

        try {
          const photoRes = await apiClient.post<{
            success: boolean;
            photos?: { type: string; filename: string; url: string }[];
            message?: string;
          }>("/ftp/preview-photos", { zipPath });

          if (photoRes.data.success && photoRes.data.photos) {
            photos = photoRes.data.photos;
            console.log("✅ Preview foto kompetitor berhasil:", photos.length);
          } else {
            console.warn(
              "⚠️ Gagal memuat foto kompetitor:",
              photoRes.data.message || "Unknown error"
            );
          }
        } catch (photoErr: any) {
          console.error(
            "❌ Error saat memuat foto kompetitor:",
            photoErr.message
          );
        }
      } else {
        console.log("ℹ️ Tidak ada ZIP foto kompetitor");
      }

      return {
        success: true,
        data: kompetitorData,
        photos,
        message: response.data?.message,
      };
    } catch (error: any) {
      console.error("❌ Error getKompetitorDetailCombined:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      let errorMessage = "Gagal mendapatkan detail kompetitor";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Waktu permintaan habis. Coba lagi nanti.";
      } else if (error.response?.status === 404) {
        errorMessage = "Data kompetitor tidak ditemukan";
      } else if (error.response?.status === 500) {
        errorMessage = "Server mengalami kesalahan internal";
      }

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  },

  previewKompetitorPhotos: async (
    zipPath: string
  ): Promise<{
    success: boolean;
    photos?: {
      type: string;
      filename: string;
      url: string;
      productId: string | null; // ✅ Bisa null untuk data lama
    }[];
    error?: string;
  }> => {
    try {
      // Validasi input
      if (!zipPath || typeof zipPath !== "string") {
        return { success: false, error: "ZIP path kompetitor tidak valid" };
      }

      console.log("📤 Meminta preview foto kompetitor dari server:", {
        zipPath,
      });

      // ✅ PERBAIKAN FINAL: GUNAKAN POST METHOD
      const response = await apiClient.post<{
        success: boolean;
        photos?: {
          type: string;
          filename: string;
          url: string;
          productId: string | null;
        }[];
        message?: string;
        error?: string;
      }>("/ftp/preview-kompetitor-photos", {
        zipPath, // ✅ Kirim di body, bukan query string
      });

      console.log("📥 Backend response:", response.data);

      if (response.data.success && response.data.photos) {
        console.log(
          "✅ Preview foto kompetitor berhasil dimuat:",
          response.data.photos.length,
          "foto"
        );
        return {
          success: true,
          photos: response.data.photos,
        };
      } else {
        const errorMsg =
          response.data.error ||
          response.data.message ||
          "Gagal memuat preview foto kompetitor";
        console.warn("⚠️ Server response tidak sukses:", errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      console.error("❌ Error previewKompetitorPhotos:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      let errorMessage = "Gagal mengambil preview foto kompetitor";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Waktu permintaan habis. Coba lagi nanti.";
      } else if (error.response?.status === 404) {
        errorMessage = "File foto kompetitor tidak ditemukan di server";
      } else if (error.response?.status === 500) {
        errorMessage = "Server mengalami kesalahan internal";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  },

  // ✅ Create Data Kompetitor
  createDataKompetitor: async (
    payLoadKompetitor: KompetitorRequest
  ): Promise<APIResponse<KompetitorCreateResponse>> => {
    try {
      const response = await apiClient.post(
        "/data-kompetitor/create",
        payLoadKompetitor
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Create Data Kompetitor API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal membuat Data Kompetitor",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  // ✅ Create Data Kompetitor
  updateDataKompetitor: async (
    kodeKompetitor: string,
    payLoadKompetitor: any //KompetitorRequest
  ): Promise<APIResponse<{ kodeKompetitor: string }>> => {
    try {
      console.log("payLoadKompetitor ", payLoadKompetitor);
      const response = await apiClient.patch(
        `/data-kompetitor/update/${kodeKompetitor}`,
        payLoadKompetitor
      );
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error,
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("Create Data Kompetitor API Error:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.message || "Gagal membuat Data Kompetitor",
        error: error.response?.data?.error || error.message,
      };
    }
  },

  updateKompetitorWithPhotos: async (data: {
    kode_kompetitor: string;
    kode_rks: string;
    kode_sales: string;
    nama_sales: string;
    kode_cust: string;
    nama_cust: string;
    tanggal_input: string;
    catatan: string;
    status: string;
    file_zip_path: string; // ✅ Path ZIP di FTP
    photo_count: number; // ✅ Jumlah total foto dalam ZIP
    updated_by: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      console.log("📤 Mengupdate data kompetitor dengan foto ZIP:", {
        kode_kompetitor: data.kode_kompetitor,
        file_zip_path: data.file_zip_path,
        photo_count: data.photo_count,
      });

      // PUT atau POST tergantung backend (disarankan PUT)
      const res = await apiClient.put<{
        success: boolean;
        message?: string;
      }>("/data-kompetitor/update-with-photos", data);

      if (res.data.success) {
        console.log("✅ Kompetitor berhasil diperbarui:", res.data.message);
        return {
          success: true,
          message: res.data.message || "Data kompetitor berhasil diperbarui",
        };
      } else {
        console.warn("⚠️ Gagal memperbarui kompetitor:", res.data.message);
        return {
          success: false,
          error: res.data.message || "Gagal memperbarui data kompetitor",
        };
      }
    } catch (err: any) {
      console.error("❌ Error updateKompetitorWithPhotos:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      let errorMessage = "Gagal memperbarui data kompetitor";
      if (err.response?.status === 400) {
        errorMessage =
          err.response.data?.message || "Data kompetitor tidak valid";
      } else if (err.response?.status === 404) {
        errorMessage = "Data kompetitor tidak ditemukan";
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

  updateKompetitorPhotos: async (
    kode_kompetitor: string,
    photoPaths: string[]
  ) => {
    try {
      console.log("📤 Updating kompetitor photo paths:", {
        kode_kompetitor,
        photoCount: photoPaths.length,
      });

      const res = await apiClient.post<{
        success: boolean;
        message?: string;
        data?: {
          kode_kompetitor: string;
          kode_rks: string;
          photo_count: number;
          main_photo_path: string;
          all_photo_paths: string[];
        };
      }>("/data-kompetitor/update-photos", {
        kode_kompetitor,
        photo_paths: photoPaths,
      });

      console.log("✅ Response updateKompetitorPhotos:", res.data);
      return {
        success: true,
        data: res.data.data,
        message: res.data.message,
      };
    } catch (err: any) {
      console.error(
        "❌ Error updateKompetitorPhotos:",
        err.response?.data || err.message
      );

      return {
        success: false,
        error:
          err.response?.data?.message ||
          err.message ||
          "Gagal update photo paths kompetitor",
      };
    }
  },
};

// ===================================================================
// 🔹 Service API untuk Sales Report (ERP + Mobile)
// ===================================================================

// 🧩 Type Definition
export interface SalesRealisasiItem {
  nama_sales: string;
  qty_target: number;
  qty_real: number;
  ton_target: number;
  ton_real: number;
  nilai_target: number;
  nilai_real: number;
  persen_qty: number;
  persen_ton: number;
  persen_nilai: number;
}

export interface SalesRealisasiSummary {
  total_sales: number;
  total_target_qty: number;
  total_real_qty: number;
  total_target_ton: number;
  total_real_ton: number;
  total_target_nilai: number;
  total_real_nilai: number;
  avg_persen_qty: number;
  avg_persen_ton: number;
  avg_persen_nilai: number;
}

export interface SalesRealisasiResponse {
  success: boolean;
  data: SalesRealisasiItem[];
  meta: {
    tahun: number;
    bulan: number;
    total_sales: number;
  };
}

export const salesReportAPI = {
  getTargetRealisasiCombined: async (
    tahun: string,
    bulan: string,
    sales: string
  ) => {
    try {
      const res = await apiClient.get(
        "/sales-report/target-realisasi-combined",
        {
          params: { tahun, bulan, sales },
        }
      );
      return res.data;
    } catch (err: any) {
      console.error("getTargetRealisasiCombined error:", err);
      return { success: false, data: [] };
    }
  },

  // getTargetRealisasiSummary: async (
  //   tahun?: number,
  //   bulan?: number
  // ): Promise<SalesRealisasiSummary> => {
  //   const { data } = await salesReportAPI.getTargetRealisasiCombined(
  //     tahun,
  //     bulan
  //   );

  //   const summary = data.reduce(
  //     (acc, curr) => {
  //       acc.total_target_qty += curr.qty_target;
  //       acc.total_real_qty += curr.qty_real;
  //       acc.total_target_ton += curr.ton_target;
  //       acc.total_real_ton += curr.ton_real;
  //       acc.total_target_nilai += curr.nilai_target;
  //       acc.total_real_nilai += curr.nilai_real;
  //       acc.avg_persen_qty += curr.persen_qty;
  //       acc.avg_persen_ton += curr.persen_ton;
  //       acc.avg_persen_nilai += curr.persen_nilai;
  //       return acc;
  //     },
  //     {
  //       total_sales: data.length,
  //       total_target_qty: 0,
  //       total_real_qty: 0,
  //       total_target_ton: 0,
  //       total_real_ton: 0,
  //       total_target_nilai: 0,
  //       total_real_nilai: 0,
  //       avg_persen_qty: 0,
  //       avg_persen_ton: 0,
  //       avg_persen_nilai: 0,
  //     }
  //   );

  //   // rata-rata persentase
  //   if (summary.total_sales > 0) {
  //     summary.avg_persen_qty /= summary.total_sales;
  //     summary.avg_persen_ton /= summary.total_sales;
  //     summary.avg_persen_nilai /= summary.total_sales;
  //   }

  //   return summary;
  // },
};

// ===================
// Data Catatan API Module
// ===================

export const mobileCatatanService = {
  /**
   * 🟢 CREATE catatan
   */
  create: async (data: CatatanData) => {
    try {
      const res = await apiClient.post("/rks-mobile/catatan/create", data);
      return res.data;
    } catch (err: any) {
      console.error(
        "❌ mobileCatatanService.create error:",
        err.response?.data || err
      );
      throw err;
    }
  },

  /**
   * 🟡 UPDATE catatan
   */
  update: async (data: CatatanData) => {
    try {
      const res = await apiClient.post("/rks-mobile/catatan/update", data);
      return res.data;
    } catch (err: any) {
      console.error(
        "❌ mobileCatatanService.update error:",
        err.response?.data || err
      );
      throw err;
    }
  },

  /**
   * 🔵 GET DETAIL catatan
   */
  getDetail: async (id_catatan: string | number) => {
    try {
      const res = await apiClient.get("/rks-mobile/catatan/detail", {
        params: { id_catatan },
      });
      return res.data;
    } catch (err: any) {
      console.error(
        "❌ mobileCatatanService.getDetail error:",
        err.response?.data || err
      );
      throw err;
    }
  },

  /**
   * 🟣 GET LIST catatan
   * Filter opsional: kode_sales, kode_cust, tanggal, search
   */
  getList: async (filters?: {
    kode_sales?: string;
    kode_cust?: string;
    tanggal?: string;
    search?: string;
  }) => {
    try {
      const res = await apiClient.get("/rks-mobile/catatan/list", {
        params: filters || {},
      });
      return res.data;
    } catch (err: any) {
      console.error(
        "❌ mobileCatatanService.getList error:",
        err.response?.data || err
      );
      throw err;
    }
  },
};

// ===================
// Data Dashboar Summary SO
// ===================
// 🧱 Struktur data summary dari backend
export interface DashboardSummaryData {
  penjualan_hari_ini: number;
  penjualan_kemarin: number;
  persentase_perubahan: number;
  pelanggan_aktif: number;
  tagihan_tertagih: number;
  kunjungan_hari_ini?: number;
}

export interface DashboardActivity {
  title: string;
  time: string;
  type: string;
  // type: "success" | "warning" | "info" | "payment" | "order" | "rks" | "error";
  amount?: string;
  icon?: React.ReactNode;
}

interface DashboardSummary {
  penjualan_hari_ini?: number;
  tagihan_tertagih_hari_ini?: number;
  kunjungan_hari_ini?: number;
  total_kunjungan?: number;
  persentase_perubahan?: number;
  progress?: number;
}

export interface DashboardResponse {
  success: boolean;
  data: {
    summary: DashboardSummaryData;
    activities: DashboardActivity[];
  };
}

export interface TagihanSummary {
  tagihan_tertagih_hari_ini: number;
  tagihan_kemarin: number;
  persentase_perubahan: number;
}

export interface TagihanActivity {
  title: string;
  time: string;
  type: "success" | "info" | "warning" | "error";
  amount?: string;
}

export interface TagihanResponse {
  success: boolean;
  data: {
    summary: TagihanSummary;
    activities: TagihanActivity[];
  };
}

export interface KunjunganSummary {
  kunjungan_hari_ini: number;
  total_kunjungan: number;
  progress: number;
  persentase_perubahan: number;
}

export interface KunjunganActivity {
  title: string;
  time: string;
  type: "success" | "info" | "warning";
  icon?: string;
  amount?: string;
}

export interface KunjunganResponse {
  success: boolean;
  data: {
    summary: KunjunganSummary;
    activities: KunjunganActivity[];
  };
}
// =======================================================
// 🚀 DASHBOARD SERVICE
// =======================================================
export const dashboardAPI = {
  async getDashboardSummarySo(): Promise<DashboardResponse> {
    try {
      const res = await apiClient.get<DashboardResponse>(
        "/dashboard/summary/so"
      );
      if (!res.data.success) {
        throw new Error("Gagal mengambil data dashboard");
      }
      return res.data;
    } catch (error: any) {
      console.error("❌ dashboardAPI.getDashboardSummary error:", error);
      return {
        success: false,
        data: {
          summary: {
            penjualan_hari_ini: 0,
            penjualan_kemarin: 0,
            persentase_perubahan: 0,
            pelanggan_aktif: 0,
            tagihan_tertagih: 0,
          },
          activities: [],
        },
      };
    }
  },

  async getDashboardSummaryPpi(): Promise<TagihanResponse> {
    try {
      const res = await apiClient.get<TagihanResponse>(
        "/dashboard/summary/ppi"
      );
      if (!res.data.success) {
        throw new Error("Gagal mengambil data tagihan");
      }
      return res.data;
    } catch (error: any) {
      console.error("❌ tagihanAPI.getTagihanSummary error:", error);
      return {
        success: false,
        data: {
          summary: {
            tagihan_tertagih_hari_ini: 0,
            tagihan_kemarin: 0,
            persentase_perubahan: 0,
          },
          activities: [],
        },
      };
    }
  },

  async getDashboardSummaryRks(): Promise<KunjunganResponse> {
    try {
      const res = await apiClient.get<KunjunganResponse>(
        "/dashboard/summary/rks"
      );
      return res.data;
    } catch (error: any) {
      console.error("❌ kunjunganAPI.getKunjunganSummary error:", error);
      return {
        success: false,
        data: {
          summary: {
            kunjungan_hari_ini: 0,
            total_kunjungan: 0,
            progress: 0,
            persentase_perubahan: 0,
          },
          activities: [],
        },
      };
    }
  },

  async addActivity(activity: DashboardActivity) {
    try {
      const res = await apiClient.post("/dashboard/activity", activity);
      return res.data;
    } catch (error: any) {
      console.error("❌ dashboardAPI.addActivity error:", error);
      throw error;
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
  ppiAPI,
  salesReportAPI,
  kompetitorAPI,
  mobileCatatanService,
  dashboardAPI,
};
