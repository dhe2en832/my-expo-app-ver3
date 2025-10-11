// myExpoApp/utils/database.ts
import * as SQLite from "expo-sqlite";
import { MobileRKS } from "../api/interface";

// Buka database SQLite lokal
const db = SQLite.openDatabaseSync("sales_mobile.db");

/**
 * Inisialisasi tabel lokal saat app pertama kali dijalankan
 */
export const initDatabase = async (): Promise<void> => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tb_mobile_rks_local (
      id TEXT PRIMARY KEY,
      kode_rks TEXT NOT NULL,
      kode_cust TEXT NOT NULL,
      userid TEXT NOT NULL,
      checkin_time TEXT NOT NULL,
      checkout_time TEXT,
      latitude_in TEXT NOT NULL,
      longitude_in TEXT NOT NULL,
      latitude_out TEXT,
      longitude_out TEXT,
      accuracy_in INTEGER NOT NULL,
      accuracy_out INTEGER,
      photo_in TEXT,
      photo_out TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'pending',
      customer_name TEXT, -- ✅ Tambahan untuk watermark
      fasmap_latitude TEXT, -- ✅ Tambahan untuk fasmap data
      fasmap_longitude TEXT -- ✅ Tambahan untuk fasmap data
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tb_mobile_cust_local (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      store_name TEXT,
      address TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      latitude TEXT,
      longitude TEXT,
      photo TEXT,
      kode_sales TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ✅ Tabel untuk menyimpan data fasmap lokal
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tb_fasmap_local (
      kode_cust TEXT PRIMARY KEY,
      latitude TEXT NOT NULL,
      longitude TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
};

/**
 * Simpan record RKS ke database lokal (SQLite)
 */
export const insertRKSLocal = async (
  rks: MobileRKS & {
    customer_name?: string;
    fasmap_latitude?: string;
    fasmap_longitude?: string;
  }
): Promise<void> => {
  await db.runAsync(
    `INSERT INTO tb_mobile_rks_local (
      id, kode_rks, kode_cust, userid, checkin_time, checkout_time,
      latitude_in, longitude_in, latitude_out, longitude_out,
      accuracy_in, accuracy_out, photo_in, photo_out, duration, status,
      customer_name, fasmap_latitude, fasmap_longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rks.id,
      rks.kode_rks,
      rks.kode_cust,
      rks.userid,
      rks.checkin_time,
      rks.checkout_time ?? null,
      rks.latitude_in,
      rks.longitude_in,
      rks.latitude_out ?? null,
      rks.longitude_out ?? null,
      rks.accuracy_in,
      rks.accuracy_out ?? null,
      rks.photo_in ?? null,
      rks.photo_out ?? null,
      rks.duration ?? null,
      rks.status,
      rks.customer_name ?? null,
      rks.fasmap_latitude ?? null,
      rks.fasmap_longitude ?? null,
    ]
  );
};

/**
 * Update record RKS lokal (misal: saat check-out atau sync berhasil)
 */
export const updateRKSLocal = async (
  id: string,
  updates: Partial<
    MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    }
  >
): Promise<void> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.checkout_time !== undefined) {
    fields.push("checkout_time = ?");
    values.push(updates.checkout_time ?? null);
  }
  if (updates.latitude_out !== undefined) {
    fields.push("latitude_out = ?");
    values.push(updates.latitude_out ?? null);
  }
  if (updates.longitude_out !== undefined) {
    fields.push("longitude_out = ?");
    values.push(updates.longitude_out ?? null);
  }
  if (updates.accuracy_out !== undefined) {
    fields.push("accuracy_out = ?");
    values.push(updates.accuracy_out ?? null);
  }
  if (updates.photo_out !== undefined) {
    fields.push("photo_out = ?");
    values.push(updates.photo_out ?? null);
  }
  if (updates.duration !== undefined) {
    fields.push("duration = ?");
    values.push(updates.duration ?? null);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.customer_name !== undefined) {
    fields.push("customer_name = ?");
    values.push(updates.customer_name ?? null);
  }
  if (updates.fasmap_latitude !== undefined) {
    fields.push("fasmap_latitude = ?");
    values.push(updates.fasmap_latitude ?? null);
  }
  if (updates.fasmap_longitude !== undefined) {
    fields.push("fasmap_longitude = ?");
    values.push(updates.fasmap_longitude ?? null);
  }

  if (fields.length === 0) return;

  values.push(id);

  const query = `UPDATE tb_mobile_rks_local SET ${fields.join(
    ", "
  )} WHERE id = ?`;
  await db.runAsync(query, values);
};

/**
 * Ambil semua record RKS lokal yang belum disinkronkan (status = 'pending')
 */
export const getPendingRKSLocal = async (): Promise<
  Array<
    MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    }
  >
> => {
  const results = await db.getAllAsync<
    MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    }
  >("SELECT * FROM tb_mobile_rks_local WHERE status = ?", ["pending"]);
  return results;
};

/**
 * Hapus record lokal (opsional, jika ingin cleanup setelah sync)
 */
export const deleteRKSLocal = async (id: string): Promise<void> => {
  await db.runAsync("DELETE FROM tb_mobile_rks_local WHERE id = ?", [id]);
};

// ✅ Simpan customer baru ke SQLite
export const insertCustomerLocal = async (customer: {
  id: string;
  nama_cust: string;
  store_name?: string;
  alamat: string;
  phone?: string;
  city?: string;
  latitude: string;
  longitude: string;
  photo: string; // base64
  kode_sales: string;
}): Promise<void> => {
  await db.runAsync(
    `INSERT INTO tb_mobile_cust_local (
      id, name, store_name, address, phone, city, latitude, longitude, photo, kode_sales
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer.id,
      customer.nama_cust,
      customer.store_name || "",
      customer.alamat,
      customer.phone || "",
      customer.city || "",
      customer.latitude,
      customer.longitude,
      customer.photo,
      customer.kode_sales,
    ]
  );
};

// ✅ Ambil customer pending
export const getPendingCustomersLocal = async (): Promise<
  Array<{
    id: string;
    name: string;
    store_name?: string;
    address: string;
    phone?: string;
    city?: string;
    latitude: string;
    longitude: string;
    photo: string;
    kode_sales: string;
  }>
> => {
  const results = await db.getAllAsync(
    "SELECT * FROM tb_mobile_cust_local WHERE status = ?",
    ["pending"]
  );
  return results as Array<{
    id: string;
    name: string;
    store_name?: string;
    address: string;
    phone?: string;
    city?: string;
    latitude: string;
    longitude: string;
    photo: string;
    kode_sales: string;
  }>;
};

// ✅ Update status setelah sync
export const updateCustomerLocalStatus = async (
  id: string,
  status: "pending" | "synced"
): Promise<void> => {
  await db.runAsync("UPDATE tb_mobile_cust_local SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
};

// ✅ Ambil semua RKS lokal
export const getAllLocalRKS = async (): Promise<
  Array<
    MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    }
  >
> => {
  const results = await db.getAllAsync<
    MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    }
  >("SELECT * FROM tb_mobile_rks_local");
  return results;
};

// ✅ Ambil RKS lokal by ID
export const getRKSLocalById = async (
  id: string
): Promise<
  | (MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    })
  | null
> => {
  const results = await db.getAllAsync<
    MobileRKS & {
      customer_name?: string;
      fasmap_latitude?: string;
      fasmap_longitude?: string;
    }
  >("SELECT * FROM tb_mobile_rks_local WHERE id = ?", [id]);
  return results.length > 0 ? results[0] : null;
};

// ✅ Simpan fasmap ke lokal
export const insertFasMapLocal = async (fasmap: {
  kode_cust: string;
  latitude: string;
  longitude: string;
}): Promise<void> => {
  await db.runAsync(
    `INSERT OR REPLACE INTO tb_fasmap_local (kode_cust, latitude, longitude, updated_at)
     VALUES (?, ?, ?, datetime('now'))`,
    [fasmap.kode_cust, fasmap.latitude, fasmap.longitude]
  );
};

// ✅ Ambil fasmap by kode_cust
export const getFasMapLocal = async (
  kode_cust: string
): Promise<{
  kode_cust: string;
  latitude: string;
  longitude: string;
} | null> => {
  const results = await db.getAllAsync<{
    kode_cust: string;
    latitude: string;
    longitude: string;
  }>("SELECT * FROM tb_fasmap_local WHERE kode_cust = ?", [kode_cust]);
  return results.length > 0 ? results[0] : null;
};

// ✅ Ambil semua fasmap lokal
export const getAllFasMapLocal = async (): Promise<
  Array<{ kode_cust: string; latitude: string; longitude: string }>
> => {
  const results = await db.getAllAsync<{
    kode_cust: string;
    latitude: string;
    longitude: string;
  }>("SELECT * FROM tb_fasmap_local");
  return results;
};

// ✅ Hapus fasmap lokal
export const deleteFasMapLocal = async (kode_cust: string): Promise<void> => {
  await db.runAsync("DELETE FROM tb_fasmap_local WHERE kode_cust = ?", [
    kode_cust,
  ]);
};

// ✅ Update fasmap lokal
export const updateFasMapLocal = async (
  kode_cust: string,
  updates: { latitude?: string; longitude?: string }
): Promise<void> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.latitude !== undefined) {
    fields.push("latitude = ?");
    values.push(updates.latitude);
  }
  if (updates.longitude !== undefined) {
    fields.push("longitude = ?");
    values.push(updates.longitude);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(kode_cust);

  const query = `UPDATE tb_fasmap_local SET ${fields.join(
    ", "
  )} WHERE kode_cust = ?`;
  await db.runAsync(query, values);
};

// ✅ Simpan fasmap dengan fallback ke lokal jika offline
export const saveFasMapWithFallback = async (fasmap: {
  kode_cust: string;
  latitude: string;
  longitude: string;
}): Promise<boolean> => {
  try {
    // Coba simpan ke server
    const apiResult = await fetch("/api/fasmap/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fasmap),
    });

    if (apiResult.ok) {
      return true;
    } else {
      // Jika gagal, simpan ke lokal
      await insertFasMapLocal(fasmap);
      return false; // Menandakan data disimpan lokal
    }
  } catch (error) {
    // Jika error, simpan ke lokal
    await insertFasMapLocal(fasmap);
    return false; // Menandakan data disimpan lokal
  }
};

// ✅ Sync fasmap lokal ke server
export const syncFasMapLocal = async (): Promise<{
  success: boolean;
  syncedCount: number;
}> => {
  try {
    const localFasMaps = await getAllFasMapLocal();
    let syncedCount = 0;

    for (const fasmap of localFasMaps) {
      try {
        const apiResult = await fetch("/api/fasmap/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fasmap),
        });

        if (apiResult.ok) {
          await deleteFasMapLocal(fasmap.kode_cust);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Gagal sync fasmap untuk ${fasmap.kode_cust}:`, error);
      }
    }

    return { success: true, syncedCount };
  } catch (error) {
    console.error("Error sync fasmap:", error);
    return { success: false, syncedCount: 0 };
  }
};