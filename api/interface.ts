// myExpoApp/api/interface.ts

export interface RKSList {
  rks_kode_rks: string;
  rks_tanggal: string;
  rks_kode_sales: string;
  detail_kode_cust: string;
  no_cust: string;
  nama_cust: string;
  alamat: string;
  rencana: 'Y' | 'T';
  kunjung: 'Y' | 'T';
  baru: 'Y' | 'T';
  detail_rowid: number;
  sales_nama_sales: string;
  ket: string;
  ket1: string;
  ket2: string;
}

export interface RKSHeader {
  kode_rks: string;
  userid: string;
  nama_user: string;
  tgl_mulai: string; // YYYY-MM-DD
  tgl_akhir: string;
  status: 'active' | 'inactive';
}

export interface RKSDetail {
  kode_rks: string;
  tanggal: string; // YYYY-MM-DD
  kode_cust: string;
  rowid: number;
  rencana: 'Y' | 'T';
  kunjung: 'Y' | 'T';
  baru: 'Y' | 'T';
  ket?: string;
  ket1?: string;
  ket2?: string;
}

export interface Customer {
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  alamat_kirim1: string;
  alamat_kirim2?: string;
  kota_kirim: string;
  propinsi_kirim: string;
  lat_kirim?: string;
  long_kirim?: string;
  kode_sales?: string;
  rks: 'Y' | 'N';
}

export interface FasMap {
  kode_cust: string;
  latitude: string;
  longitude: string;
  created_at?: string;
  updated_at?: string;
}

export interface MobileRKS {
  id: string; // UUID atau auto-increment dari server
  kode_rks: string;
  kode_cust: string;
  userid: string;
  kode_sales:string
  checkin_time: string; // ISO string
  checkout_time?: string;
  latitude_in: string;
  longitude_in: string;
  latitude_out?: string;
  longitude_out?: string;
  accuracy_in: number;
  accuracy_out?: number;
  photo_in?: string; // base64 atau path
  photo_out?: string;
  duration?: number; // menit
  status: 'pending' | 'synced';
  created_at?: string;
  updated_at?: string;
}

// Payload untuk check-in
export interface CheckInPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  photo: string; // base64
}

// Payload untuk check-out
export interface CheckOutPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// Response dari /api/rks/sync
export interface SyncResponse {
  success: boolean;
  message?: string;
  syncedRecords?: MobileRKS[];
}

// Untuk validasi fasmap sebelum check-in
export interface FasMapValidationResult {
  exists: boolean;
  fasmap?: FasMap;
}

export interface NewCustomerPayload {
  name: string;
  store_name: string;
  address: string;
  phone: string;
  city: string;
  latitude: string;
  longitude: string;
  kode_sales: string;
  photo?: string; // base64 encoded photo
  // photo_out?: string; // base64 encoded photo
  // userid: string;
  kode_cust?: string; // Optional, jika ada
};


export interface CustomerFormData {
  name: string;
  address: string;
  phone: string;
  city: string;
  kode_sales: string;
  store_name?: string;
  latitude: string;
  longitude: string;
}