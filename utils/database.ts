// utils/database.ts
import * as SQLite from 'expo-sqlite';

// ✅ Buka database
const db = SQLite.openDatabaseSync('myapp_offline.db');

// === 🔹 Tipe Data untuk Kejelasan ===
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_deleted: number;
}

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_deleted: number;
}

interface QueueItem {
  id: string;
  type: string;
  data: string; // akan di-parse jadi objek nanti
  endpoint: string;
  method: string;
  timestamp: string;
  retryCount: number;
}

// === Inisialisasi Database ===
export const initDatabase = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at TEXT,
      updated_at TEXT,
      is_deleted INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      address TEXT,
      created_at TEXT,
      updated_at TEXT,
      is_deleted INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT DEFAULT 'POST',
      timestamp TEXT NOT NULL,
      retryCount INTEGER DEFAULT 0
    );
  `);
};

// === Fungsi Customer ===
export const saveCustomers = async (customers: Customer[]) => {
  for (const cust of customers) {
    await db.runAsync(
      `INSERT OR REPLACE INTO customers (id, name, phone, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      cust.id,
      cust.name,
      cust.phone,
      cust.address,
      cust.created_at,
      cust.updated_at
    );
  }
};

export const getCustomers = async (): Promise<Customer[]> => {
  const results = await db.getAllAsync(
    'SELECT * FROM customers WHERE is_deleted = 0 ORDER BY name ASC;'
  );
  // ✅ TypeScript aman: hasil sudah bertipe Customer[]
  return results as Customer[];
};

// === Fungsi Supplier ===
export const saveSuppliers = async (suppliers: Supplier[]) => {
  for (const supp of suppliers) {
    await db.runAsync(
      `INSERT OR REPLACE INTO suppliers (id, name, contact, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      supp.id,
      supp.name,
      supp.contact,
      supp.address,
      supp.created_at,
      supp.updated_at
    );
  }
};

export const getSuppliers = async (): Promise<Supplier[]> => {
  const results = await db.getAllAsync(
    'SELECT * FROM suppliers WHERE is_deleted = 0 ORDER BY name ASC;'
  );
  return results as Supplier[];
};

// === Fungsi Antrian ===
export const addQueueItem = async (item: Omit<QueueItem, 'data'> & { data: any }) => {
  await db.runAsync(
    `INSERT INTO offline_queue (id, type, data, endpoint, method, timestamp, retryCount)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    item.id,
    item.type,
    JSON.stringify(item.data),
    item.endpoint,
    item.method || 'POST',
    item.timestamp,
    item.retryCount
  );
};

export const getUnsyncedQueue = async (): Promise<(Omit<QueueItem, 'data'> & { data: any })[]> => {
  const results = await db.getAllAsync(
    'SELECT * FROM offline_queue ORDER BY timestamp ASC;'
  );
  
  // ✅ Parse 'data' dan beri tipe eksplisit
  return (results as QueueItem[]).map(row => ({
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  }));
};

export const removeQueueItems = async (ids: string[]) => {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM offline_queue WHERE id IN (${placeholders});`;
  await db.runAsync(query, ...ids);
};