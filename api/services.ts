// services.ts
// Modul API untuk berinteraksi dengan backend
// Gunakan axios untuk HTTP requests
// Gunakan SecureStore untuk penyimpanan token aman
import {
  mockRKS,
  mockCustomers,
  RKS,
  Customer,
  AttendanceRecord,
  geofenceLocations,
  mockSalesOrders,
  SalesOrder,
  mockProducts,
  mockPayments,
  mockInvoices,
  Payment,
  mockBesiCompetitor,
  BesiCompetitor,
  mockTargets,
 
} from "./mockData";
import { calculateDistance, delay } from "../utils/helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { nanoid } from "nanoid/non-secure";
import { v4 as uuidv4 } from "uuid";
import { Alert } from "react-native";

import apiClient from './axiosConfig';
import * as SecureStore from 'expo-secure-store';
import { AxiosRequestConfig } from 'axios';

// Tipe data
export type LoginCredentials = {
  userid: string;
  password: string; // plain text dulu
  kodecabang: string;
};

export type User = {
  userid: string;
  kode_user: string;
  nama_user: string;
  kodecabang: string;
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: User;
  };
};

// ================
// Login API Module
// ================
export const loginAPI = {
  /**
   * Melakukan login ke backend
   * @returns {Promise<LoginResponse>}
   */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    console.log('Body request login:', credentials);
    try {
      const response = await apiClient.post<LoginResponse>('/login', credentials);
        console.log('Response login:', response.data);
      // Jika response dari backend sesuai format
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;

        // Simpan ke secure storage
        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(user));

        return {
          success: true,
          data: { token, user },
          message: response.data.message,
        };
      } else {
        // Backend kirim success: false
        return {
          success: false,
          message: response.data.message || 'Login gagal',
        };
      }
    } catch (error: any) {
      console.error('Login API error:', error);

      // Tangani error Axios
      if (error.response) {
        // Error dari backend (4xx, 5xx)
        const message = error.response.data?.message || 'Terjadi kesalahan pada server';
        return { success: false, message };
      } else if (error.request) {
        // Tidak ada respons (network error)
        return { success: false, message: 'Tidak ada koneksi ke server' };
      } else {
        // Error lain
        return { success: false, message: error.message || 'Error tidak dikenal' };
      }
    }
  },

  /**
   * Logout: hapus token & user dari secure storage
   */
  // logout: async (): Promise<void> => {
  //   await SecureStore.deleteItemAsync('auth_token');
  //   await SecureStore.deleteItemAsync('user_data');
  // },
/**
 * Logout: kirim request ke backend untuk blacklist token, lalu hapus dari secure storage
 */
logout: async (): Promise<void> => {
  try {
    // Ambil token saat ini
    const token = await SecureStore.getItemAsync('auth_token');
    
    if (token) {
      // Kirim request ke endpoint logout
      await apiClient.post('/login/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.warn('Logout API warning (token may be invalid):', error);
    // Tetap lanjutkan logout di client meski API gagal
  } finally {
    // Hapus token & user dari penyimpanan lokal
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
  }
},
  /**
   * Cek apakah user sudah login (untuk auto-login saat app dibuka)
   */
  getStoredAuth: async (): Promise<{ token: string | null; user: User | null }> => {
    const token = await SecureStore.getItemAsync('auth_token');
    const userData = await SecureStore.getItemAsync('user_data');
    const user = userData ? JSON.parse(userData) : null;
    return { token, user };
  },
};


// BATAS DARI SINI KE BAWAH ADALAH MOCK API
// Gunakan apiClient dari axiosConfig.ts untuk API nyata  
const STORAGE_KEY = "competitor_besi_queue";

export const competitorBesiAPI = {
  getAll: async (rksId?: string) => {
    await delay(500);
    const data = rksId
      ? mockBesiCompetitor.filter((item) => item.rksId === rksId)
      : mockBesiCompetitor;
    return { success: true, data };
  },

  getById: async (id: string) => {
    await delay(300);
    const item = mockBesiCompetitor.find((x) => x.id === id);
    return item ? { success: true, data: item } : { success: false };
  },

  addEntry: async (entry: Omit<BesiCompetitor, "id" | "timestamp">) => {
    try {
      await delay(2000); // simulasi request
      const record: BesiCompetitor = {
        ...entry,
        id: nanoid(),
        timestamp: new Date().toISOString(),
      };
      mockBesiCompetitor.push(record);
      return { success: true, record };
    } catch (err) {
      console.error("addEntry error:", err);
      return { success: false };
    }
  },

  updateEntry: async (id: string, updates: Partial<BesiCompetitor>) => {
    await delay(500);
    const index = mockBesiCompetitor.findIndex((x) => x.id === id);
    if (index === -1) return { success: false };
    mockBesiCompetitor[index] = { ...mockBesiCompetitor[index], ...updates };
    return { success: true, data: mockBesiCompetitor[index] };
  },

  deleteEntry: async (id: string) => {
    await delay(300);
    const index = mockBesiCompetitor.findIndex((x) => x.id === id);
    if (index === -1) return { success: false };
    mockBesiCompetitor.splice(index, 1);
    return { success: true };
  },
};

export const rksAPI = {
  async getRKS(userId: string, date?: string) {
    await delay(300);
    let list = mockRKS.filter((r) => r.userId === userId);
    if (date) list = list.filter((r) => r.scheduledDate === date);
    return { success: true, rks: list };
  },

  async checkIn(
    rksId: string,
    data: { latitude: number; longitude: number; accuracy: number; photo: string }
  ) {
    await delay(400);
    const rks = mockRKS.find((r) => r.id === rksId);
    // if (!rks) throw new Error("RKS not found");
    if (!rks) {
      // ❌ JANGAN THROW
      // throw new Error("RKS not found");
      // ✅ GANTI DENGAN:
      return { success: false, error: "RKS tidak ditemukan" };
    }
    // Hitung apakah berada di radius customer (geofence)
    let isWithinGeofence = false;
    if (rks.customerLocation && rks.radius) {
      const distance = calculateDistance(
        data.latitude,
        data.longitude,
        rks.customerLocation.latitude,
        rks.customerLocation.longitude
      );
      isWithinGeofence = distance <= rks.radius;
    }

    rks.checkIn = {
      timestamp: new Date().toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      photo: data.photo,
      isWithinGeofence,
    };
    rks.status = "incomplete";
    return { success: true, rks };
  },

  async checkOut(
    rksId: string,
    data: { latitude: number; longitude: number; accuracy: number }
  ) {
    await delay(400);
    const rks = mockRKS.find((r) => r.id === rksId);
    if (!rks || !rks.checkIn) throw new Error("Check-in not found");

    rks.checkOut = {
      timestamp: new Date().toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
    };

    // Hitung durasi kunjungan
    const start = new Date(rks.checkIn.timestamp).getTime();
    const end = new Date(rks.checkOut.timestamp).getTime();
    rks.duration = Math.round((end - start) / 60000);

    rks.status = "completed";
    return { success: true, rks };
  },

  async addUnscheduledVisit(
    userId: string,
    data: {
      customerId: string;
      customerName: string;
      customerAddress: string;
      latitude: number;
      longitude: number;
      accuracy: number;
      photo: string;
    }
  ) {
    await delay(400);
    const newRks: RKS = {
      id: Date.now().toString(),
      userId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      scheduledDate: new Date().toISOString().split("T")[0],
      scheduledTime: new Date().toISOString().split("T")[1].slice(0, 5),
      status: "additional",
      checkIn: {
        timestamp: new Date().toISOString(),
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        photo: data.photo,
        isWithinGeofence: true,
      },
      createdBy: userId,
      createdAt: new Date().toISOString(),
      salesId: userId,
    };
    mockRKS.push(newRks);
    return { success: true, rks: newRks };
  },

  async addNewCustomerVisit(
    userId: string,
    data: {
      name: string;
      address: string;
      phone: string;
      type: "regular" | "vip" | "new";
      coordinates?: { latitude: number; longitude: number };
      photo?: string;
    }
  ) {
    await delay(300);

    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: data.name,
      address: data.address,
      phone: data.phone,
      creditLimit: 0,
      outstanding: 0,
      territory: "Unassigned",
      type: data.type,
      coordinates: data.coordinates,
      photo: data.photo,
    };  
    mockCustomers.push(newCustomer);

    const newRks: RKS = {
      id: Date.now().toString(),
      userId,
      customerId: newCustomer.id,
      customerName: newCustomer.name,
      customerAddress: newCustomer.address,
      scheduledDate: new Date().toISOString().split("T")[0],
      scheduledTime: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      coordinates: newCustomer.coordinates,
      status: "new-customer",
      createdBy: userId,
      createdAt: new Date().toISOString(),
      salesId: userId,
    };

    mockRKS.push(newRks);
    return { success: true, rks: newRks };
  },

  async updateRKS(rks: RKS) {
    const index = mockRKS.findIndex((r) => r.id === rks.id);
    if (index >= 0) {
      mockRKS[index] = rks;
    }
    return { success: true, rks };
  },

  async updateRRSafe(rks: RKS) {
    try {
      return await this.updateRKS(rks);
    } catch (err) {
      console.error("updateRRSafe error:", err);
      return { success: false, rks };
    }
  },
};

// Attendance API
export const attendanceAPI = {
  async checkIn(data: {
    photo: string;
    location: { latitude: number; longitude: number; accuracy: number };
    address: string;
    shift: "morning" | "afternoon" | "night";
  }) {
    await delay(2000);

    const isWithinGeofence = geofenceLocations.some((fence) => {
      const distance = calculateDistance(
        data.location.latitude,
        data.location.longitude,
        fence.latitude,
        fence.longitude
      );
      return distance <= fence.radius;
    });

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      userId: "1",
      type: "check-in",
      timestamp: new Date().toISOString(),
      location: {
        ...data.location,
        address: data.address,
      },
      photo: data.photo,
      shift: data.shift,
      isWithinGeofence,
      notes: !isWithinGeofence ? "Outside geofence area" : undefined,
    };

    // console.log("Check-in recorded:", record);
    return { success: true, record };
  },

  async checkOut(data: {
    photo: string;
    location: { latitude: number; longitude: number; accuracy: number };
    address: string;
  }) {
    await delay(2000);

    const isWithinGeofence = geofenceLocations.some((fence) => {
      const distance = calculateDistance(
        data.location.latitude,
        data.location.longitude,
        fence.latitude,
        fence.longitude
      );
      return distance <= fence.radius;
    });

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      userId: "1",
      type: "check-out",
      timestamp: new Date().toISOString(),
      location: {
        ...data.location,
        address: data.address,
      },
      photo: data.photo,
      shift: "morning",
      isWithinGeofence,
      notes: !isWithinGeofence ? "Outside geofence area" : undefined,
    };

    console.log("Check-out recorded:", record);
    return { success: true, record };
  },

  async getTodayRecords(userId: string) {
    await delay(500);

    const mockRecords: AttendanceRecord[] = [
      {
        id: "1",
        userId,
        type: "check-in",
        timestamp: new Date().toISOString().replace(/T.*/, "T08:30:00Z"),
        location: {
          latitude: -6.2088,
          longitude: 106.8456,
          accuracy: 5,
          address: "Jl. Sudirman No. 123, Jakarta",
        },
        photo:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        shift: "morning",
        isWithinGeofence: true,
      },
    ];

    return { success: true, records: mockRecords };
  },
};

// Sales Order API
export const salesOrderAPI = {
  async getOrders(filters?: { status?: string; customerId?: string; dateFrom?: string; dateTo?: string }) {
    await delay(1000);
    // In real app: GET /api/sales-orders with query params
    
    let orders = [...mockSalesOrders];
    
    if (filters?.status) {
      orders = orders.filter(order => order.status === filters.status);
    }
    if (filters?.customerId) {
      orders = orders.filter(order => order.customerId === filters.customerId);
    }
    
    return { success: true, orders };
  },

  async getOrder(id: string) {
    await delay(500);
    // In real app: GET /api/sales-orders/${id}
    
    const order = mockSalesOrders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    
    return { success: true, order };
  },
  
  createOrder: async (orderData: Omit<SalesOrder, 'id' | 'orderNumber' | 'status' | 'createdBy'>) => {
    await delay(2000);
    const newOrder: SalesOrder = {
      ...orderData,
      id: Date.now().toString(),
      orderNumber: `SO-${String(mockSalesOrders.length + 1).padStart(4, '0')}`,
      status: 'draft',
      createdBy: '1'
    };
    
    // Tambahkan ke mock data
    mockSalesOrders.push(newOrder);
    
    console.log('Order created:', newOrder);
    return { success: true, order: newOrder };
  },

  updateOrder: async (id: string, orderData: Partial<SalesOrder>) => {
    await delay(1500);
    
    // Cari dan update order
    const index = mockSalesOrders.findIndex(order => order.id === id);
    if (index !== -1) {
      mockSalesOrders[index] = {
        ...mockSalesOrders[index],
        ...orderData
      };
    }
    
    console.log('Order updated:', id, orderData);
    return { success: true };
  },    
  
  submitForApproval: async (id: string) => {
    await delay(1000);
    
    // Update status
    const index = mockSalesOrders.findIndex(order => order.id === id);
    if (index !== -1) {
      mockSalesOrders[index] = {
        ...mockSalesOrders[index],
        status: 'submitted'
      };
    }
    
    console.log('Order submitted for approval:', id);
    return { success: true };
  },

  async approveOrder(id: string, approvedBy: string) {
    await delay(1000);
    // In real app: POST /api/sales-orders/${id}/approve
    
    console.log('Order approved:', id, 'by:', approvedBy);
    return { success: true };
  },

  async rejectOrder(id: string, reason: string, rejectedBy: string) {
    await delay(1000);
    // In real app: POST /api/sales-orders/${id}/reject
    
    console.log('Order rejected:', id, 'reason:', reason, 'by:', rejectedBy);
    return { success: true };
  },

  deleteOrder: async (id: string) => {
    await delay(500);
    
    // Hapus order
    const index = mockSalesOrders.findIndex(order => order.id === id);
    if (index !== -1) {
      mockSalesOrders.splice(index, 1);
    }
    
    console.log('Order deleted:', id);
    return { success: true };
  },    

  async exportToCSV(filters?: any) {
    await delay(2000);
    // In real app: GET /api/sales-orders/export with query params
    
    const csvData = mockSalesOrders.map(order => ({
      'Order Number': order.orderNumber,
      'Customer': order.customerName,
      'Date': order.date,
      'Total': order.total,
      'Status': order.status
    }));
    
    console.log('CSV export generated:', csvData);
    return { success: true, csvData };
  }
};

export const customerAPI = {
  async getCustomers(filters?: { territory?: string; type?: string }) {
    await delay(1000);
    // In real app: GET /api/customers with query params
    
    let customers = [...mockCustomers];
    
    if (filters?.territory) {
      customers = customers.filter(customer => customer.territory === filters.territory);
    }
    if (filters?.type) {
      customers = customers.filter(customer => customer.type === filters.type);
    }
    
    return { success: true, customers };
  },

  async getCustomer(id: string) {
    await delay(500);
    // In real app: GET /api/customers/${id}
    
    const customer = mockCustomers.find(c => c.id === id);
    if (!customer) throw new Error('Customer not found');
    
    return { success: true, customer };
  }
};

// Product API
export const productAPI = {
  async getProducts(filters?: { category?: string; search?: string }) {
    await delay(1000);
    // In real app: GET /api/products with query params
    
    let products = [...mockProducts];
    
    if (filters?.category) {
      products = products.filter(product => product.category === filters.category);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(search) ||
        product.code.toLowerCase().includes(search)
      );
    }
    
    return { success: true, products };
  },

  async getProduct(id: string) {
    await delay(500);
    // In real app: GET /api/products/${id}
    
    const product = mockProducts.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    
    return { success: true, product };
  },

  async getSpecialPrice(customerId: string, productId: string) {
    await delay(500);
    // In real app: GET /api/products/${productId}/price?customerId=${customerId}
    
    const product = mockProducts.find(p => p.id === productId);
    if (!product) throw new Error('Product not found');
    
    // Mock special pricing logic
    const customer = mockCustomers.find(c => c.id === customerId);
    let price = product.basePrice;
    
    if (customer?.type === 'vip') {
      price = price * 0.95; // 5% discount for VIP
    }
    
    return { success: true, price, discount: product.basePrice - price };
  }
};

export const collectionAPI = {
  async getInvoices(filters?: { status?: string; customerId?: string }) {
    await delay(1000);
    // In real app: GET /api/invoices with query params
    
    let invoices = [...mockInvoices];
    
    if (filters?.status) {
      invoices = invoices.filter(invoice => invoice.status === filters.status);
    }
    if (filters?.customerId) {
      invoices = invoices.filter(invoice => invoice.customerId === filters.customerId);
    }
    
    return { success: true, invoices };
  },

  async getPayments(filters?: { status?: string; customerId?: string }) {
    await delay(1000);
    
    let payments = [...mockPayments]; // ← INI HANYA mockPayments
    
    if (filters?.status) {
      payments = payments.filter(p => p.status === filters.status);
    }
    if (filters?.customerId) {
      payments = payments.filter(p => p.customerId === filters.customerId);
    }
    
    return { success: true, payments };
  },   

  async recordPayment(paymentData: {
    invoiceId: string;
    amount: number;
    method: Payment['method'];
    receiptPhoto?: string;
    notes?: string;
  }) {
    await delay(2000);
    // In real app: POST /api/payments
    
    const invoice = mockInvoices.find(inv => inv.id === paymentData.invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payment: Payment = {
      id: Date.now().toString(),
      invoiceId: paymentData.invoiceId,
      customerName: invoice.customerName,
      amount: paymentData.amount,
      method: paymentData.method,
      date: new Date().toISOString().split('T')[0],
      receiptPhoto: paymentData.receiptPhoto,
      notes: paymentData.notes,
      reference: `REF-${Date.now()}`
    };

    // ✅ SIMPAN KE MOCK DATA
    mockPayments.push(payment);

    // ✅ UPDATE INVOICE PAID AMOUNT
    invoice.paidAmount += paymentData.amount;

      // Update status invoice
    if (invoice.paidAmount >= invoice.amount) {
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    }

    console.log('Payment recorded:', payment);
    return { success: true, payment };
  }
};

// Target API
export const targetAPI = {
  async getTargets(filters?: { userId?: string; period?: string; type?: string }) {
    await delay(500);
    let targets = [...mockTargets];
    if (filters?.userId) {
      targets = targets.filter(t => t.userId === filters.userId);
    }
    if (filters?.period) {
      targets = targets.filter(t => t.period === filters.period);
    }
    if (filters?.type) {
      targets = targets.filter(t => t.type === filters.type);
    }
    return { success: true, targets };
  },

  async getTargetById(id: string) {
    await delay(300);
    const target = mockTargets.find(t => t.id === id);
    return target ? { success: true, target } : { success: false };
  },

  // Simpan realisasi (offline-friendly)
  async updateRealization(id: string, updates: Partial<{
    salesRealization: number;
    salesRealizationUnits: number;
    collectionRealization: number;
    visitRealization: number;
  }>) {
    await delay(800);
    const index = mockTargets.findIndex(t => t.id === id);
    if (index === -1) return { success: false };
    mockTargets[index] = { ...mockTargets[index], ...updates };
    return { success: true, target: mockTargets[index] };
  },
};

