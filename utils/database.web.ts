// myExpoApp/utils/database.web.ts

// ⚠️ SQLite tidak didukung di web → semua fungsi di-stub

/**
 * ✅ FIX: Reset table RKS lokal untuk menghapus cache/data lama
 */
export const resetRKSLocalTable = async (): Promise<void> => {
  console.warn("SQLite not supported on web – resetRKSLocalTable skipped");
};

/**
 * Inisialisasi tabel lokal saat app pertama kali dijalankan
 */
export const initDatabase = async (): Promise<void> => {
  console.warn("SQLite not supported on web – initDatabase skipped");
};

/**
 * Simpan record RKS ke database lokal (SQLite)
 */
export const insertRKSLocal = async (
  rks: any
): Promise<void> => {
  console.warn("SQLite not supported on web – insertRKSLocal skipped");
};

/**
 * Update record RKS lokal
 */
export const updateRKSLocal = async (
  id: string,
  updates: any
): Promise<void> => {
  console.warn("SQLite not supported on web – updateRKSLocal skipped");
};

/**
 * Ambil semua record RKS lokal yang belum disinkronkan
 */
export const getPendingRKSLocal = async (): Promise<any[]> => {
  console.warn("SQLite not supported on web – returning empty array");
  return [];
};

/**
 * Hapus record lokal
 */
export const deleteRKSLocal = async (id: string): Promise<void> => {
  console.warn("SQLite not supported on web – deleteRKSLocal skipped");
};

// ✅ Simpan customer baru ke SQLite
export const insertCustomerLocal = async (customer: any): Promise<void> => {
  console.warn("SQLite not supported on web – insertCustomerLocal skipped");
};

// ✅ Ambil customer pending
export const getPendingCustomersLocal = async (): Promise<any[]> => {
  console.warn("SQLite not supported on web – returning empty array");
  return [];
};

// ✅ Update status setelah sync
export const updateCustomerLocalStatus = async (
  id: string,
  status: "pending" | "synced"
): Promise<void> => {
  console.warn("SQLite not supported on web – updateCustomerLocalStatus skipped");
};

// ✅ Ambil semua RKS lokal
export const getAllLocalRKS = async (): Promise<any[]> => {
  console.warn("SQLite not supported on web – returning empty array");
  return [];
};

// ✅ Ambil RKS lokal by ID
export const getRKSLocalById = async (id: string): Promise<any | null> => {
  console.warn("SQLite not supported on web – returning null");
  return null;
};

// ✅ Ambil RKS lokal by rowid
export const getRKSLocalByRowId = async (rowid: number): Promise<any | null> => {
  console.warn("SQLite not supported on web – returning null");
  return null;
};

// ✅ Update rowid RKS lokal
export const updateRKSLocalRowId = async (id: string, rowid: number): Promise<void> => {
  console.warn("SQLite not supported on web – updateRKSLocalRowId skipped");
};

// ✅ Simpan fasmap ke lokal
export const insertFasMapLocal = async (fasmap: any): Promise<void> => {
  console.warn("SQLite not supported on web – insertFasMapLocal skipped");
};

// ✅ Ambil fasmap by kode_cust
export const getFasMapLocal = async (kode_cust: string): Promise<any | null> => {
  console.warn("SQLite not supported on web – returning null");
  return null;
};

// ✅ Ambil semua fasmap lokal
export const getAllFasMapLocal = async (): Promise<any[]> => {
  console.warn("SQLite not supported on web – returning empty array");
  return [];
};

// ✅ Hapus fasmap lokal
export const deleteFasMapLocal = async (kode_cust: string): Promise<void> => {
  console.warn("SQLite not supported on web – deleteFasMapLocal skipped");
};

// ✅ Update fasmap lokal
export const updateFasMapLocal = async (
  kode_cust: string,
  updates: any
): Promise<void> => {
  console.warn("SQLite not supported on web – updateFasMapLocal skipped");
};

// ✅ Simpan fasmap dengan fallback ke lokal jika offline
export const saveFasMapWithFallback = async (fasmap: any): Promise<boolean> => {
  console.warn("SQLite not supported on web – saveFasMapWithFallback returns false");
  return false;
};

// ✅ Sync fasmap lokal ke server
export const syncFasMapLocal = async (): Promise<{
  success: boolean;
  syncedCount: number;
}> => {
  console.warn("SQLite not supported on web – syncFasMapLocal returns failure");
  return { success: false, syncedCount: 0 };
};