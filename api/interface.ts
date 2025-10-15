// myExpoApp/api/interface.ts

import { Animated } from "react-native";

// ✅ Tipe item untuk tampilan
export interface RKSItem {
  id: string;
  kode_rks: string;
  kode_cust: string;
  no_cust?: string;
  customerName: string;
  customerAddress: string;
  scheduledDate: string;
  status: "scheduled" | "checked-in" | "completed";
  checkIn?: MobileRKS;
  checkOut?: MobileRKS;
  fasmap?: { latitude: string; longitude: string };
  radius?: number;
  namaSales?: string;
  rowid?: number;
  isUnscheduled?: "Y" | "N"; // Flag untuk RKS tidak terjadwal
  createdDate?: string; // Tanggal dibuat (untuk unscheduled)
  // ✅ TAMBAHAN untuk tracking
  isSyncing?: boolean; // Untuk loading state
  lastUpdated?: string; // Timestamp terakhir update
}

// Tambahkan interface untuk consistent API response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string; // ✅ Tambahkan message property
  error?: any;
}

export interface RKSList {
  rks_kode_rks: string;
  rks_tanggal: string;
  rks_kode_sales: string;
  detail_kode_cust: string;
  no_cust: string;
  nama_cust: string;
  alamat: string;
  rencana: "Y" | "T";
  kunjung: "Y" | "T";
  baru: "Y" | "T";
  detail_rowid: number;
  sales_nama_sales: string; // ✅ Tambahan untuk nama sales
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
  status: "active" | "inactive";
}

export interface RKSDetail {
  kode_rks: string;
  tanggal: string; // YYYY-MM-DD
  kode_cust: string;
  rowid: number;
  rencana: "Y" | "T";
  kunjung: "Y" | "T";
  baru: "Y" | "T";
  ket?: string;
  ket1?: string;
  ket2?: string;
}

export interface salesList {
  kode_sales: string;
  no_sales: string;
  nama_sales: string;
  alamat: string;
  jabatan: string;
  aktif: string;
  userid: string;
  komisi: string;
  opname: string;
  internal: string;
}

export interface SalesDetail {
  kode_sales: string;
  no_sales: string;
  nama_sales: string;
  alamat: string;
  jabatan: string;
  aktif: string;
  userid: string;
  komisi: string;
  opname: string;
  internal: string;
}

export interface Customer {
  kode_cust: string;
  no_cust?: string;
  kode_relasi: string;
  nama_cust: string;
  alamat_kirim1: string;
  alamat_kirim2?: string;
  kota_kirim: string;
  propinsi_kirim: string;
  lat_kirim?: string;
  long_kirim?: string;
  kode_sales?: string;
  rks: "Y" | "N";
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
  kode_sales: string;
  nama_sales: string; // ✅ Tambahan field nama_sales
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
  status: "pending" | "synced";
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  rowid?: number;
  // ✅ TAMBAHAN untuk unscheduled RKS
  is_unscheduled?: "Y" | "N";
}

// Payload untuk check-in
export interface CheckInPayload {
  kode_rks: string;
  kode_cust: string;
  userid: string;
  kode_sales: string;
  nama_sales: string; // ✅ Tambahan field nama_sales
  checkin_time: string;
  latitude_in: string;
  longitude_in: string;
  accuracy_in: number;
  photo_in: string;
  status: "pending";
  customer_name?: string;
}

// Payload untuk check-out
export interface CheckOutPayload {
  checkout_time: string;
  latitude_out: string;
  longitude_out: string;
  accuracy_out: number;
  photo_out: string;
  status: "pending";
  customer_name?: string;
  nama_sales?: string; // ✅ Tambahan field nama_sales
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
  customer_name?: string;
}

export interface CustomerFormData {
  name: string;
  address: string;
  phone: string;
  city: string;
  kode_sales: string;
  store_name?: string;
  latitude: string;
  longitude: string;
  customer_name?: string;
}

// ✅ Interface untuk payload create mobile RKS dengan watermark
export interface CreateMobileRKSPayload {
  kode_rks: string;
  kode_cust: string;
  userid: string;
  kode_sales: string;
  nama_sales: string; // ✅ Tambahan field nama_sales
  checkin_time: string;
  latitude_in: string;
  longitude_in: string;
  accuracy_in: number;
  photo_in: string;
  status: "pending";
  customer_name?: string;
}

// ✅ Interface untuk payload update mobile RKS dengan watermark
export interface UpdateMobileRKSPayload {
  checkout_time: string;
  latitude_out: string;
  longitude_out: string;
  accuracy_out: number;
  photo_out: string;
  status: "pending";
  customer_name?: string;
  nama_sales?: string; // ✅ Tambahan field nama_sales
}

// ✅ Interface untuk save fasmap
export interface SaveFasMapPayload {
  kode_cust: string;
  latitude: string;
  longitude: string;
}

// ✅ Interface untuk camera component props
export interface CameraOverlayProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photo: string) => void;
  customerName: string;
  namaSales: string; // ✅ Tambahan field nama_sales
  checkType?: "checkin" | "checkout";
}

// ✅ Interface untuk fasmap modal props
export interface FasMapModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  customerName: string;
  namaSales: string; // ✅ Tambahan field nama_sales
  location: { latitude: number; longitude: number };
}

// ✅ Interface untuk camera permission
export interface CameraPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: "undetermined" | "granted" | "denied";
}

// ✅ Interface untuk location data
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// ✅ Interface untuk photo result
export interface PhotoResult {
  base64?: string;
  uri: string;
  width: number;
  height: number;
}

// ✅ Interface untuk map view
export interface MapViewProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  style?: any;
}

// ✅ 4. Interface untuk Post Check-in Actions
export interface PostCheckInAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export interface PostCheckInActionsModalProps {
  visible: boolean;
  onClose: () => void;
  customerName: string;
  onOpenOrder?: () => void;
  onCustomerVisit?: () => void;
  onPayment: () => void;
  onStockCheck: () => void;
  onNotes?: () => void;
  onSO?: () => void;
  onCompetitorData?: () => void;
}

// ✅ 5. Interface untuk Customer Search Response
export interface CustomerSearchResponse {
  success: boolean;
  data?: Customer[];
  message?: string;
  error?: any;
}

// ✅ 7. Interface untuk FAB Actions
export interface FABAction {
  id: string;
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
}

// ✅ 9. Interface untuk Modal Props
export interface PostCheckInModalProps {
  visible: boolean;
  onClose: () => void;
  customerName: string;
  onOpenOrder: () => void;
  onCustomerVisit: () => void;
  onPayment: () => void;
  onStockCheck: () => void;
  onNotes?: () => void;
}

export interface UnscheduledVisitModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: Customer) => void;
  customerList: Customer[];
  loading: boolean;
}

// ✅ 10. Interface untuk Enhanced FAB
export interface EnhancedFABProps {
  fabOpen: boolean;
  fabAnim: Animated.Value;
  actions: FABAction[];
  onMainPress?: () => void;
  // tooltipAnim: Animated.Value;
  pan: Animated.ValueXY;
  isAnyCheckedIn?: boolean;
  // ✅ Opsional: individual animations untuk sub actions
  subActionAnims?: Animated.Value[];
}

// ✅ Tambahkan interface untuk gesture state jika diperlukan
export interface GestureState {
  dx: number;
  dy: number;
  moveX: number;
  moveY: number;
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  numberActiveTouches: number;
}

// Update API functions interface
export interface RKSAPI {
  getRKSList(kode_sales: string): Promise<APIResponse<RKSList[]>>;
  createMobileRKS(data: any): Promise<APIResponse<MobileRKS>>; // ✅ Return APIResponse
  updateMobileRKS(id: string, data: any): Promise<APIResponse<MobileRKS>>;
  syncRKS(records: any[]): Promise<APIResponse<{ syncedCount: number }>>;
}

export interface CustomerAPI {
  getCustomerList(kode_sales: string): Promise<APIResponse<Customer[]>>;
  searchCustomers(
    query: string,
    kode_sales: string
  ): Promise<APIResponse<Customer[]>>;
  getCustomerDetail(kode_cust: string): Promise<APIResponse<Customer>>;
}

export type RangeKey = "today" | "week" | "month";
export interface CustomDate {
  month: number;
  year: number;
}

// ✅ 18. Interface untuk FasMap Modal
export interface FasMapModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  customerName: string;
  namaSales: string;
  location: { latitude: number; longitude: number };
  accuracy: number;
}

// ✅ 20. Interface untuk Filter State
export interface FilterState {
  range: RangeKey;
  customDate: CustomDate | null;
  searchQuery: string;
}
