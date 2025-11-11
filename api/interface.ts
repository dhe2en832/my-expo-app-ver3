// myExpoApp/api/interface.ts

import { AxiosError } from "axios";
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
  baru?: "Y" | "N"; // Flag untuk Customer Baru
  mobile_created?: string;
  createdDate?: string; // Tanggal dibuat (untuk unscheduled)
  // ✅ TAMBAHAN untuk tracking
  isSyncing?: boolean; // Untuk loading state
  lastUpdated?: string; // Timestamp terakhir update
  durasi_menit: string | null;
  durasi_format: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  total: number;
  sum_netto_mu: number;
  sum_bayar_mu: number;
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
  baru?: "Y" | "N";
  durasi_menit: string;
  durasi_format: string;
  total: number;
  sum_netto_mu: number;
  sum_bayar_mu: number;
}

// Tambahkan interface untuk consistent API response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T | null;
  message?: string; // ✅ Tambahkan message property
  error?: any;
  meta?: {
    total?: number;
    [key: string]: any; // fleksibel untuk meta tambahan
  };
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
  durasi_menit: string;
  durasi_format: string;
  checkin_time: string;
  checkout_time: string;
  total: number;
  sum_netto_mu: number;
  sum_bayar_mu: number;
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
  photo_count: number;
}

export interface CustomerList {
  kode_relasi: string;
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  hp: string;
  alamat: string;
  kota: string;
  alamat_kirim1: string;
  alamat_kirim2?: string;
  kota_kirim: string;
  propinsi_kirim: string;
  lat_kirim?: string;
  long_kirim?: string;
  kode_sales?: string;
  filegambar: string;
  status_sumber: string;
  created_at: string;
  sort_order: number;
  kode_termin: string;
  nama_termin: string;
}

export interface FasMap {
  kode_cust: string;
  latitude: string;
  longitude: string;
  created_at?: string;
  updated_at?: string;
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

export interface MobileCustomer {
  id?: string;
  kode_relasi?: string;
  kode_cust?: string;
  no_cust?: string;
  nama_relasi?: string;
  alamat?: string;
  kota?: string;
  propinsi?: string;
  hp?: string;
  email?: string;
  kode_sales?: string;
  alamat_kirim1?: string;
  kota_kirim?: string;
  userid?: string;
  mobile_status?: string;
  // ✅ ADD: Optional fields untuk photos & GPS
  photos?: any[];
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null; // ✅ t
  photo_path?: string;
  photo_count?: number;
}

export interface CustomerEditFormData {
  kode_relasi: string;
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  hp: string;
  alamat_kirim1: string;
  kota_kirim: string;
  propinsi_kirim: string;
  lat_kirim: string;
  long_kirim: string;
  kode_sales: string;
  filegambar: string;
  status_sumber: string;
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

// ✅ ENHANCED: CustomerPhoto interface dengan field lengkap
export interface CustomerPhoto {
  id: string;
  type: "selfie" | "toko_depan" | "toko_samping" | "ktp" | "lainnya";
  uri: string;
  base64?: string;
  filename: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  watermarkData?: {
    customerName: string;
    salesName: string;
    locationText: string;
    accuracyText: string;
    checkType: string;
  };
}

// ✅ NEW: Customer Photo Session untuk tracking
export interface CustomerPhotoSession {
  id: string;
  customerName: string;
  salesName: string;
  photos: CustomerPhoto[];
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  createdAt: string;
}

// ✅ UPDATE: NewCustomerPayload untuk multiple photos
export interface NewCustomerPayload {
  name: string;
  store_name: string;
  address: string;
  phone: string;
  city: string;
  latitude: string;
  longitude: string;
  kode_sales: string;
  photos?: CustomerPhoto[]; // ✅ Changed from single photo to array
  customer_name?: string;
  accuracy?: number;
}

// ✅ NEW: Props untuk CustomerPhotoCamera component
export interface CustomerPhotoCameraProps {
  visible: boolean;
  onClose: () => void;
  onPhotosCapture: (photos: CustomerPhoto[]) => void;
  customerName: string;
  salesName: string;
  photoTypes: CustomerPhoto["type"][];
  initialPhotos?: CustomerPhoto[];
}

// ===================
// INTERFACE Sales Order
// ===================

// ✅ Sales Order List Interface dari API

export interface SalesList {
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

export interface SalesOrderList {
  id: string;
  kode_so: string;
  no_so: string;
  tgl_so: string;
  kode_sales: string;
  nama_sales: string;
  kode_cust: string;
  nama_cust: string;
  alamat: string;
  status: string;
  sumber_data: string;
  sort_date: string;
  sort_order: number;
}

export interface SalesOrderListType extends SalesOrderList {
  // Field dari API
  kode_so: string;
  tgl_so: string;
  kode_sales: string;
  nama_sales: string;
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  alamat: string;
  status: string;
  sumber_data: string;
  sort_date: string;
  sort_order: number;

  // Field tambahan untuk UI
  tanggal: string;
  jumlah_item?: number; // Optional karena mungkin tidak ada di API
  total?: number; // Optional karena mungkin tidak ada di API
  created_at: string;

  // ✅ FIELD BARU YANG DIPERLUKAN
  subtotal?: number;
  ppn_percent?: number;
  ppn_value?: number;
  diskon_header?: number;
  diskon_header_percent?: number;
  uang_muka?: number;
  nilai_pajak?: number;
  synced?: "Y" | "N";
  is_notified?: "Y" | "N";
  is_unscheduled?: "Y" | "N";
  kode_termin?: string;
  kode_kirim?: string;
  cara_kirim?: "KG" | "KP" | "AG" | "AP";
  total_items?: number;
  summary_info?: string;
  can_sync?: boolean;

  // Approval fields
  approved_by?: string;
  approved_at?: string;
  approval_note?: string;
  waiting_approval_since?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_notes?: string;
  submitted_by?: string;
  submitted_at?: string;

  // Permissions flags
  can_approve?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface ApprovalRequest {
  orderId: string;
  notes?: string;
  approved_at?: string;
  rejected_at?: string;
}

// ✅ INTERFACE UNTUK APPROVAL RESPONSE
export interface ApprovalResponse {
  success: boolean;
  message: string;
  data?: {
    orderId: string;
    status: "approved" | "rejected";
    updated_at: string;
    approved_by?: string;
    rejected_by?: string;
  };
}

// ✅ Response untuk Sales Order List
export interface SalesOrderListResponse {
  success: boolean;
  message: string;
  data: SalesOrderList[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// Types untuk Sales Order
export interface SalesOrderHeader {
  kode_so: string;
  no_so: string;
  kode_sales: string;
  nama_sales: string;
  kode_cust: string;
  nama_cust: string;
  alamat?: string;
  kode_termin?: string;
  kode_kirim?: string;
  cara_kirim?: "KG" | "KP" | "AG" | "AP";
  status: "pending" | "approved" | "rejected";
  subtotal: number;
  ppn_percent: number;
  ppn_value: number;
  diskon_header: number;
  diskon_header_percent: number;
  uang_muka: number;
  total: number;
  synced: "Y" | "N";
  is_notified: "Y" | "N";
  is_unscheduled: "Y" | "N";
  sumber_data: "MOBILE" | "ERP";
  created_at: string;
  updated_at: string;
  keterangan?: string;
  tgl_so?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_notes?: string;
  kode_rks?: string;
  id_rks?: string;
}

export interface SalesOrderItem {
  kode_item: string;
  nama_item: string;
  diskripsi?: string;
  qty_std: number;
  harga: number;
  diskon: number;
  diskon_percent: number;
  diskon_value: number;
  subtotal: number;
  total: number;
  satuan?: string;
  berat: number;
  franco: "Y" | "N";
  rowid: number;
  synced: "Y" | "N";
  created_at: string;
  updated_at: string;
  stok?: number;
  no_item?: string;
  kategori?: string;
  kelompok?: string;
}

export interface SalesOrderDetailResponse {
  header: SalesOrderHeader;
  items: SalesOrderItem[];
  summary?: {
    subtotal: number;
    diskon_detail: number;
    diskon_header: number;
    ppn: number;
    uang_muka: number;
    total: number;
  };
}

export interface SyncStatus {
  kode_so: string;
  no_so: string;
  status: string;
  synced: "Y" | "N";
  is_notified: "Y" | "N";
  total_items: number;
  financial_summary: {
    subtotal: number;
    total: number;
    ppn_value: number;
    diskon_header: number;
    uang_muka: number;
  };
  can_sync: boolean;
  sync_ready: boolean;
  sync_status: "synced" | "ready_for_sync" | "waiting_approval" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface ReadyToSyncResponse {
  data: Array<{
    kode_so: string;
    no_so: string;
    kode_sales: string;
    nama_sales: string;
    kode_cust: string;
    customer_name: string;
    status: string;
    total: number;
    subtotal: number;
    ppn_value: number;
    diskon_header: number;
    uang_muka: number;
    created_at: string;
    total_items: number;
    synced: "Y" | "N";
    summary_info: string;
    can_sync: boolean;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    summary: {
      total_ready: number;
      total_items: number;
      total_value: number;
    };
  };
}

export interface BulkSyncResponse {
  successful: Array<{
    kode_so: string;
    success: boolean;
    data: any;
  }>;
  failed: Array<{
    kode_so: string;
    success: boolean;
    error: string;
  }>;
}

// ✅ Enhanced interface untuk edit
interface EditSalesOrderForm {
  // Basic Info
  kode_so: string;
  no_so: string;
  tgl_so: string;
  kode_sales: string;
  nama_sales: string;

  // Customer Info
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  alamat: string;
  kota_kirim?: string;
  hp?: string;

  // Pricing & Discounts
  subtotal: number;
  diskon_dokumen: number;
  persen_diskon_dokumen: number;
  total_setelah_diskon: number;

  // Tax
  include_ppn: boolean;
  ppn: number;
  include_pph: boolean;
  pph: number;

  // Payment
  uang_muka: number;
  total: number;

  // Items
  items: EditSalesOrderItem[];
  keterangan: string;
  status: string;
}

interface EditSalesOrderItem {
  id?: string;
  kode_item: string;
  no_item: string;
  nama_item: string;
  quantity: number;
  satuan: string;
  harga: number;
  diskon_item: number;
  persen_diskon_item: number;
  tipe_diskon_item: "amount" | "percent";
  harga_setelah_diskon: number;
  subtotal: number;
  is_deleted?: boolean; // Untuk soft delete
}
// ===================
// INTERFACE Data Barang
// ===================

export interface ProductList {
  kode_item: string;
  no_item: string;
  nama_item: string;
  stok: number;
  harga1: number;
  harga2: number;
  harga3: number;
  kode_gudang: string;
  gudang: string;
  stok_gudang: number;
  kategori: string;
  kelompok: string;
  satuan: string;
  berat: number;
}

export interface TerminList {
  kode_termin: string;
  nama_termin: string;
  hari: string;
  persen: string;
  tempo: string;
  cod: string;
  catatan: string;
  userid: string;
  tgl_update: string;
}

export interface StockItem {
  kode_item: string;
  no_item: string;
  nama_item: string;
  stok: number;
  harga1: number;
  harga2: number;
  harga3: number;
  kode_gudang: string;
  gudang: string;
  stok_gudang: number;
  kategori: string;
  kelompok: string;
  satuan: string;
  berat: number;
}

export interface ProductListResponse {
  success: boolean;
  message: string;
  data: ProductList[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface StockGudangItem extends StockItem {
  gudang: string;
  stok_gudang: number;
}

export interface StockGudang {
  kode_gudang: string;
  nama_gudang: string;
  stok_gudang: number;
}

export interface StockItemGrouped {
  kode_item: string;
  no_item: string;
  nama_item: string;
  kategori?: string;
  kelompok?: string;
  satuan?: string;
  berat?: number;
  harga1?: number;
  harga2?: number;
  harga3?: number;
  stok_total?: number;
  gudang_list: StockGudang[];
}

export interface ApprovalData {
  kode_so: string;
  status: "approved" | "rejected";
  catatan: string;
  approved_by: string;
  approved_at: string;
  previous_status: string;
}

export interface ApprovalHistory {
  id: number;
  kode_so: string;
  status: string;
  catatan: string;
  approved_by: string;
  approved_at: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export interface BulkApprovalResponse {
  successful: Array<{
    kode_so: string;
    success: boolean;
    data?: any;
  }>;
  failed: Array<{
    kode_so: string;
    success: boolean;
    error: string;
  }>;
}

export interface SalesOrderStats {
  total_orders: number;
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  total_synced: number;
  total_value: number;
  average_order_value: number;
  monthly_stats?: Array<{
    month: string;
    order_count: number;
    total_value: number;
  }>;
}

export interface ExportResponse {
  download_url: string;
  file_name: string;
  file_size: number;
  expires_at: string;
}

// ✅ User Permission Interface
export interface UserPermissions {
  permissions: string[];
  roles: string[];
  features: string[];
  can_approve_so: boolean;
  can_create_so: boolean;
  can_edit_so: boolean;
  can_delete_so: boolean;
  can_sync_so: boolean;
  can_view_reports: boolean;
  can_export_data: boolean;
}

// ===================
// PPI INTERFACE
// ===================

export interface OutstandingInvoice {
  kode_fj: string;
  no_fj: string;
  tgl_fj: string;
  jatuh_tempo: string;
  total_invoice: number;
  sudah_dibayar: number;
  sisa_hutang: number;
  mobile_allocated_amount: number;
  mobile_allocated_discount: number;
  sisa_setelah_alokasi: number;
  sudah_dibayar_setelah_alokasi: number;
  overdue_days: number;
  is_overdue: boolean;
  kode_mu: string;
  nama_cust: string;
  kode_cust: string;
  nama_sales: string;
  source: "ERP" | "MOBILE_ALLOCATED";
}

export interface PPIListItem {
  kode_ppi: string;
  no_ppi: string;
  tanggal_ppi: string;
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  jumlah_bayar: number;
  total_discount: number;
  cara_bayar: "cash" | "transfer" | "giro";
  no_giro?: string;
  bank?: string;
  status: string;
  sumber_data: "MOBILE" | "ERP";
  jumlah_faktur: number;
  list_faktur: string[];
  kode_sales: string;
  nama_sales: string;
  summary_info: string;
  status_badge: {
    color: string;
    text: string;
  };
}

export interface PPIMasterDetailPayments {
  header: {
    kode_ppi: string;
    no_ppi: string;
    tanggal_ppi: string;
    kode_cust: string;
    no_cust: string;
    nama_cust: string;
    alamat: string;
    kota: string;
    telepon: string;
    kode_sales: string;
    no_sales: string;
    nama_sales: string;
    jumlah_bayar: number;
    total_discount: number;
    cara_bayar: "cash" | "transfer" | "giro";
    no_giro?: string;
    bank?: string;
    tgl_jatuh_tempo?: string;
    status: string;
    sumber_data: "MOBILE" | "ERP";
    debet_rp?: number;
    kredit_rp?: number;
    jumlah_rp?: number;
    kode_akun_debet?: string;
    no_akun?: string;
    nama_akun?: string;
    kode_akun_piutang: string;
    nama_akun_piutang: string;
  };
  details: {
    kode_fj: string;
    no_fj: string;
    tgl_fj: string;
    netto_mu: number;
    lunas_mu: number;
    owing: number;
    bayar_mu: number;
    discount: number;
    sisa_setelah_bayar: number;
    kode_rks: string;
    id_rks: string;
  }[];
  payments: {
    metode_bayar: "cash" | "transfer" | "giro";
    jumlah_bayar: number;
    tgl_bayar: string;
    no_giro?: string;
    bank?: string;
    no_rekening?: string;
    tgl_jatuh_tempo?: string;
    keterangan?: string;
  }[];
  summary: {
    jumlah_faktur: number;
    jumlah_bayar: number;
    total_discount: number;
    sumber_data: "MOBILE" | "ERP";
  };
}

// api/interface.ts - UPDATE
export interface PPICreateRequest {
  header: {
    tanggal_ppi: string;
    kode_cust: string;
    nama_cust: string;
    cara_bayar: "cash" | "transfer" | "giro";
    no_giro?: string;
    bank?: string;
    tgl_jatuh_tempo?: string;
    kode_akun_debet?: string; // ✅ NEW FIELD untuk bank
    status?: "draft" | "submitted"; // ✅ NEW FIELD
    file_zip_path?: string; // ✅ Pindahkan ke header
    // total_dibayar: number; // ✅ TAMBAHKAN INI
    // total_discount: number; // ✅ SESUAI DDL
  };
  details: {
    kode_fj: string;
    no_fj: string;
    tgl_fj: string;
    // netto_mu: number;
    // lunas_mu: number;
    // owing: number;
    bayar_mu: number;
    discount: number;
    kode_rks: string;
    id_rks: string;
  }[];
  payments?: {
    metode_bayar: "cash" | "transfer" | "giro";
    jumlah_bayar: number;
    tgl_bayar: string;
    no_giro?: string;
    bank?: string;
    no_rekening?: string;
    tgl_jatuh_tempo?: string;
    keterangan?: string;
  }[];
}

export interface AkunBank {
  kode_akun: string;
  no_akun: string;
  nama_akun: string;
}

export interface PPICreateResponse {
  kode_ppi: string;
  no_ppi: string;
  total_dibayar: number;
  total_discount: number;
  jumlah_faktur: number;
  status: string;
}

export interface PPISummary {
  totalPiutang: number;
  totalTertagih: number;
  totalOutstanding: number;
  draftCount: number;
  pendingSyncCount: number;
  syncedCount: number;
}

export interface CustomerType {
  kode_cust: string;
  no_cust: string;
  nama_relasi: string;
  alamat_kirim1?: string;
  kota_kirim?: string;
  kode_termin?: string;
  nama_termin?: string;
  // tambahkan field lain sesuai kebutuhan
}

// --- DASHBOARD SUMMARY COMPONENT ---
export interface PPISummaryDashboardProps {
  summary: PPISummary | null;
  loading: boolean;
}

// --- STATUS OVERVIEW COMPONENT ---
export interface PPIStatusOverviewProps {
  summary: PPISummary | null;
}

// --- PPI LIST CONTENT COMPONENT ---
export interface PPIListContentProps {
  filter: string;
  baseFilteredPPI: PPIListItem[];
  searchQuery: string;
  onPPIPress: (ppi: PPIListItem) => void;
  onPrintPress: (ppi: PPIListItem) => void;
  onRefresh: () => void;
  refreshing: boolean;
  salesDropdownOpen: boolean;
}

export interface PpiCustomerList {
  // 🔹 Status & Identitas Umum
  status_sumber: "existing" | "baru"; // sumber data
  status_warna?: string; // hanya untuk existing ERP (Aktif, NOO, dst)
  kode_cust: string;
  kode_relasi: string;
  no_cust: string;
  nama_relasi: string; // alias dari nama_relasi
  hp?: string;

  // 🔹 Alamat & Lokasi
  alamat?: string;
  alamat_kirim1?: string;
  alamat_kirim2?: string;
  kota_kirim?: string;
  propinsi_kirim?: string;
  lat_kirim?: string;
  long_kirim?: string;

  // 🔹 Termin & Transaksi
  kode_termin?: string;
  nama_termin?: string;
  hari?: number;
  persen?: number;
  tempo?: number;
  cod?: string;

  // 🔹 Keuangan & Pajak
  kode_mu?: string;
  harga_def?: string;
  diskon_def?: string;
  kode_pajak?: string;
  kurs?: number;
  kurs_pajak?: number;
  nilai_pajak?: number;

  // 🔹 Akun & Subledger
  kode_akun_piutang?: string;
  nama_akun_piutang?: string;
  no_akun_piutang?: string;
  subledger?: string;

  // 🔹 Info Penjualan (Area & Salesman)
  kode_sales?: string;
  no_sales?: string;
  nama_sales?: string;
  wa_sales?: string;
  kode_salesman?: string;
  no_salesman?: string;
  nama_salesman?: string;
  wa_salesman?: string;

  // 🔹 Status Data
  aktif?: string;
  tipe?: string;
  kelas?: string;
  catatan?: string;
  filegambar?: string; // hanya untuk mobile pending
  created_at?: string; // hanya untuk mobile pending
  sort_order?: number; // urutan tampilan
}

// components/PPIPhotoUpload.tsx - UPDATE interface
export interface PPIPhoto {
  id: string;
  uri: string;
  name: string;
  type: string;
  filename: string;
  timestamp: string;
  base64?: string | null; // ✅ PERBAIKI: tambah null
}

// ==============================
// Interface Modul Data Kompetitor
// ==============================

// Data untuk List (ringkasan)
export interface KompetitorList {
  kode_kompetitor: string;
  tanggal_input: string;
  nama_kompetitor: string;
  kode_rks?: string | null;
  id_rks?: string | null;
  kode_cust?: string | null;
  nama_cust?: string | null;
  kode_sales?: string | null;
  nama_sales?: string | null;
  catatan?: string | null;
  status?: string;
  total_produk: number;
}

// Data detail produk (child)
export interface KompetitorDetailItem {
  id: number;
  nama_kompetitor: string;
  nama_produk: string;
  merek_produk?: string;
  harga?: number;
  foto_url?: string | null;
  keterangan?: string | null;
  photo_filenames?: string;
  created_by?: string;
  created_at?: string;
  update_by?: string | null;
  update_at?: string | null;
}

// Data master (parent)
export interface KompetitorMaster {
  kode_kompetitor: string;
  kode_rks: string;
  id_rks?: string;
  kode_cust: string;
  nama_cust: string;
  kode_sales: string;
  nama_sales: string;
  tanggal_input: string;
  catatan: string;
  status: string;
  file_zip_path: string;
}

// Master + Detail (untuk detail view)
export interface KompetitorMasterDetail {
  master: KompetitorMaster;
  details: KompetitorDetailItem[];
}

// Payload untuk create data kompetitor
export interface KompetitorRequest {
  header: {
    kode_rks?: string | null;
    id_rks?: string | null;
    kode_cust?: string | null;
    nama_cust?: string | null;
    catatan?: string | null;
  };
  details: {
    nama_kompetitor: string;
    nama_produk: string;
    merek_produk?: string | null;
    harga?: number;
    foto_url?: string | null; // opsional base64/url
    keterangan?: string | null;
  }[];
}

// Response untuk create
export interface KompetitorCreateResponse {
  success: boolean;
  data: KompetitorList[] | null;
  message?: string;
  error?: string;
  meta?: {
    // ✅ Ganti 'pagination' menjadi 'meta'
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface KompetitorPhoto {
  id: string;
  uri: string;
  // name: string;
  type: string;
  filename: string;
  timestamp: string;
  base64?: string | null; // ✅ PERBAIKI: tambah null
  productId?: string;
  watermarkData?: {
    customerName: string;
    salesName: string;
    locationText: string;
    accuracyText: string;
    checkType: string;
  };
}

export interface KompetitorCreateRequest {
  header: {
    kode_kompetitor: string;
    kode_rks: string;
    id_rks: string;
    kode_cust?: string;
    nama_cust?: string;
    kode_sales: string;
    nama_sales: string;
    tanggal_input: string;
    catatan: string;
    status: string;
    file_zip_path: string;
    created_by: string;
    created_at: string;
    update_by: string;
    update_at: string;
  };
  details: {
    // id: string;
    kode_kompetitor: string;
    nama_kompetitor: string;
    nama_produk: string;
    merek_produk: string;
    harga: number;
    foto_url: string;
    keterangan: string;
    photo_filenames?: string;
    created_by: string;
    created_at: string;
    update_by: string | null;
    update_at: string | null;
  }[];
}

export interface CatatanData {
  id_catatan?: number;
  kode_rks?: string;
  id_rks?: string;
  kode_cust: string;
  nama_cust?: string;
  no_cust?: string;
  isi_catatan: string;
  kode_sales?: string;
  nama_sales?: string;
  created_at?: string;
  updated_at?: string;
}
