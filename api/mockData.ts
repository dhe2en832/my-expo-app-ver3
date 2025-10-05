
// api/mockData.ts
// Mock Data for Sales App

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  creditLimit: number;
  outstanding: number;
  territory: string;
  type: 'regular' | 'vip' | 'new';
  lastVisit?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // Radius pelanggan untuk geofence (meter)
  photo?: string; // Foto pelanggan
}

export interface ProductLocation {
  locationId: string;
  locationName: string;
  stock: number;
  minStock: number;
  lastUpdated: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  basePrice: number;
  stock?: number;
  minStock?: number;
  description?: string;
  image?: string;
  barcode?: string;
  locations: ProductLocation[];
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  date: string;
  dueDate: string;
  items: SalesOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'draft' | 'submitted' | 'approved' | 'processed' | 'cancelled' | 'rejected';
  notes?: string;
  signature?: string;
  createdBy: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  isOverdue:boolean;
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
  image?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'outstanding' | 'partial' | 'paid' | 'overdue';
  salesOrderId?: string;
  createdDate: string;
  isOverdue:boolean;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  method: 'cash' | 'transfer' | 'check' | 'card';
  date: string;
  receiptPhoto?: string;
  notes?: string;
  reference?: string;
  status?: 'paid' | 'partial' | 'outstanding' | 'overdue';
  customerId?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  };
  photo: string;
  shift: 'morning' | 'afternoon' | 'night';
  isWithinGeofence: boolean;
  notes?: string;
}

export interface StockLocation {
  id: string;
  name: string;
  type: 'warehouse' | 'van' | 'store';
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  minStock: number;
  lastUpdated: string;
  lastCountDate?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  oldQuantity: number;
  newQuantity: number;
  adjustment: number;
  reason: string;
  date: string;
  photo?: string;
  notes?: string;
  createdBy: string;
}

// Target interface (sudah ada, pastikan ini)
export interface Target {
  id: string;
  userId: string;
  customerId?: string;     // opsional → jika target per customer
  territory?: string;      // opsional → jika target per wilayah
  period: string; // format: YYYY-MM (monthly), YYYY-W## (weekly), YYYY (yearly), YYYY-MM-DD (daily)
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  salesTarget: number;      // nominal
  salesTargetUnits: number; // unit (opsional, bisa dihitung dari SO)
  collectionTarget: number; // nominal tagihan yang harus ditagih
  visitTarget: number;
  salesRealization: number;
  salesRealizationUnits: number;
  collectionRealization: number;
  visitRealization: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'sales' | 'manager' | 'admin';
  territory: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
}

export interface BesiCompetitor  {
  id: string;
  rksId: string;
  name: string;
  quantity: number;
  customerName: string;
  photo?: string;
  timestamp: string;
  // offline?: boolean; // 🔹 tanda kalau masuk offline queue
  notes?: string;    // opsional, misal catatan tambahan
}

// Interface untuk RKS (Rencana Kunjungan Sales)
export interface RKS {
  id: string;
  userId: string; // Sales yang ditugaskan
  customerId: string;
  customerName: string;
  customerAddress: string;
  scheduledDate: string; // Format: YYYY-MM-DD
  scheduledTime: string; // Format: HH:mm
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'planned' | 'completed' | 'not-visited' | 'additional' | 'new-customer' | 'incomplete';
  radius?: number; // Radius pelanggan untuk geofence (meter)
  customerLocation?: { latitude: number; longitude: number }; // Lokasi pelanggan  
  checkIn?: {
    timestamp: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    photo: string;
    isWithinGeofence: boolean;
  };
  checkOut?: {
    timestamp: string;
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  duration?: number; // Durasi kunjungan dalam menit
  activities?: {
    orders?: string[]; // ID Sales Order
    notes?: string;
    photos?: string[]; // URL atau base64 foto
    survey?: string; // Data survey dalam JSON string
    gps?: {
      latitude: number;
      longitude: number;
      accuracy: number;
    }; 
    checkIn?: {
      timestamp: string;
      gps: { latitude: number; longitude: number; accuracy: number };
      selfie: string; // URI foto selfie
    };
    checkOut?: {
      timestamp: string;
      gps: { latitude: number; longitude: number; accuracy: number };
    };    
  };
  createdBy: string; // Supervisor atau Sales
  createdAt: string;
  updatedAt?: string;
  salesId: string;
}

// Mock Data
export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'PT. Maju Jaya Sentosa',
    address: 'Jl. Sudirman No. 123, Jakarta Pusat',
    phone: '021-12345678',
    email: 'info@majujaya.com',
    creditLimit: 50000000,
    outstanding: 15000000,
    territory: 'Jakarta Central',
    type: 'vip',
    lastVisit: '2025-01-07',
    coordinates: { latitude: -6.2088, longitude: 106.8456 },
    photo: 'https://example.com/customer1.jpg', // atau URI lokal
  },
  {
    id: '2',
    name: 'CV. Berkah Sejahtera',
    address: 'Jl. Gatot Subroto No. 456, Jakarta Selatan',
    phone: '021-87654321',
    email: 'admin@berkahsejahtera.com',
    creditLimit: 30000000,
    outstanding: 8000000,
    territory: 'Jakarta South',
    type: 'regular',
    lastVisit: '2025-01-06',
    coordinates: { latitude: -6.2297, longitude: 106.8253 },
    photo: 'https://example.com/customer2.jpg', // atau URI lokal
  },
  {
    id: '3',
    name: 'Toko Sumber Rejeki',
    address: 'Jl. Raya Bogor No. 789, Depok',
    phone: '021-98765432',
    creditLimit: 20000000,
    outstanding: 5000000,
    territory: 'Depok',
    type: 'regular',
    lastVisit: '2025-01-05',
    coordinates: { latitude: -6.4025, longitude: 106.7942 },
    photo: 'https://example.com/customer3.jpg', // atau URI lokal
  }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Smartphone Galaxy Pro',
    code: 'SGP-001',
    category: 'Electronics',
    unit: 'PCS',
    basePrice: 8500000,
    stock: 150,
    minStock: 50,
    description: 'Latest smartphone with advanced features',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop',
    barcode: '1234567890123',
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 150,
        minStock: 50,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 25,
        minStock: 10,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
  {
    id: '2',
    name: 'Wireless Headphones',
    code: 'WH-002',
    category: 'Accessories',
    unit: 'PCS',
    basePrice: 1200000,
    stock: 80,
    minStock: 30,
    description: 'Premium wireless headphones with noise cancellation',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    barcode: '2345678901234',
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 80,
        minStock: 30,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 5,
        minStock: 10,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
  {
    id: '3',
    name: 'Laptop Gaming Elite',
    code: 'LGE-003',
    category: 'Computers',
    unit: 'PCS',
    basePrice: 15000000,
    stock: 25,
    minStock: 10,
    description: 'High-performance gaming laptop',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop',
    barcode: '3456789012345',
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 25,
        minStock: 10,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 3,
        minStock: 5,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
  {
    id: '4',
    name: 'Smart Watch Series X',
    code: 'SWX-004',
    category: 'Wearables',
    unit: 'PCS',
    basePrice: 3500000,
    stock: 60,
    minStock: 20,
    description: 'Advanced smartwatch with health monitoring',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    barcode: '4567890123456',
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 60,
        minStock: 20,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 8,
        minStock: 5,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
  {
    id: '5',
    name: 'Tablet Pro 12"',
    code: 'TP12-005',
    category: 'Tablets',
    unit: 'PCS',
    basePrice: 6500000,
    stock: 40,
    minStock: 15,
    description: 'Professional tablet for creative work',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&h=300&fit=crop',
    barcode: '5678901234567',
    locations: [
      {
        locationId: '1',
        locationName: 'Main Warehouse',
        stock: 40,
        minStock: 15,
        lastUpdated: '2025-01-08T10:00:00Z',
      },
      {
        locationId: '2',
        locationName: 'Van Stock',
        stock: 6,
        minStock: 5,
        lastUpdated: '2025-01-08T09:30:00Z',
      },
    ],
  },
];

export const mockStockLocations: StockLocation[] = [
  {
    id: '1',
    name: 'Main Warehouse',
    type: 'warehouse',
    address: 'Jl. Industri No. 100, Bekasi',
    coordinates: { latitude: -6.2441, longitude: 107.0000 }
  },
  {
    id: '2',
    name: 'Van Stock - Unit 1',
    type: 'van',
    address: 'Mobile Unit',
  },
  {
    id: '3',
    name: 'Store Jakarta Central',
    type: 'store',
    address: 'Jl. Thamrin No. 50, Jakarta Pusat',
    coordinates: { latitude: -6.1944, longitude: 106.8229 }
  }
];

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Asep',
    username: 'demo',
    email: 'john.doe@company.com',
    role: 'sales',
    territory: 'Jakarta Central',
    phone: '081234567890',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    isActive: true
  },
  {
    id: '2',
    name: 'Jane Smith',
    username: 'manager',
    email: 'jane.smith@company.com',
    role: 'manager',
    territory: 'Jakarta',
    phone: '081234567891',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    isActive: true
  }
];

// Helper: generate dates from today for N days
function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Generate RKS for next 60 days (~2 months)
const futureDates = generateDateRange(60);
const extendedMockRKS: RKS[] = [];

futureDates.forEach((date, index) => {
  const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Skip Sunday if you only want Monday–Saturday, or keep all 7 days
  // Here we include all days (Monday–Sunday)

  // Assign customer cyclically
  const customer = mockCustomers[index % mockCustomers.length];

  extendedMockRKS.push({
    id: `rks-${date}-${index}`,
    userId: '1',
    customerId: customer.id,
    customerName: customer.name,
    customerAddress: customer.address,
    scheduledDate: date,
    scheduledTime: '09:00',
    coordinates: customer.coordinates,
    status: 'planned',
    radius: 100,
    customerLocation: customer.coordinates,
    createdBy: '2',
    createdAt: new Date().toISOString(),
    salesId: '1',
  });
});

export const mockRKS = extendedMockRKS;

// Generate mock sales orders
export const generateMockSalesOrders = (): SalesOrder[] => {
  const orders: SalesOrder[] = [];
  const statuses: SalesOrder['status'][] = ['draft', 'submitted', 'approved', 'processed', 'cancelled'];

  for (let i = 1; i <= 20; i++) {
    const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: SalesOrderItem[] = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = product.basePrice;
      const discount = Math.floor(Math.random() * 10) * 1000;
      const total = quantity * unitPrice - discount;

      items.push({
        id: `${i}-${j}`,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        quantity,
        unit: product.unit,
        unitPrice,
        discount,
        total,
      });

      subtotal += total;
    }

    const discount = Math.floor(subtotal * 0.05);
    const tax = Math.floor((subtotal - discount) * 0.11);
    const total = subtotal - discount + tax;

    orders.push({
      id: i.toString(),
      orderNumber: `SO-${String(i).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address,
      date: new Date(2025, 0, Math.floor(Math.random() * 8) + 1).toISOString().split('T')[0],
      dueDate: new Date(2025, 0, Math.floor(Math.random() * 15) + 15).toISOString().split('T')[0],
      items,
      subtotal,
      discount,
      tax,
      total,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdBy: '1',
      notes: Math.random() > 0.7 ? 'Urgent delivery required' : undefined,
      isOverdue: false,
    });
  }

  return orders;
};

export const mockSalesOrders = generateMockSalesOrders();

// Generate mock invoices
export const generateMockInvoices = (): Invoice[] => {
  return mockSalesOrders
    .filter((order) => order.status === 'processed')
    .map((order, index) => ({
      id: (index + 1).toString(),
      invoiceNumber: `INV-${String(index + 1).padStart(4, '0')}`,
      customerId: order.customerId,
      customerName: order.customerName,
      amount: order.total,
      paidAmount: Math.random() > 0.5 ? Math.floor(order.total * (0.3 + Math.random() * 0.7)) : 0,
      dueDate: order.dueDate,
      status: Math.random() > 0.7 ? 'paid' : Math.random() > 0.5 ? 'partial' : 'outstanding',
      salesOrderId: order.id,
      createdDate: order.date,
      isOverdue: order.dueDate < new Date().toISOString().split('T')[0],
    }));
};

export const mockInvoices = generateMockInvoices();

// Generate mock payments
export const generateMockPayments = (): Payment[] => {
  const payments: Payment[] = [];
  const methods: Payment['method'][] = ['cash', 'transfer', 'check', 'card'];

  mockInvoices.forEach((invoice, index) => {
    if (invoice.paidAmount > 0) {
      payments.push({
        id: (index + 1).toString(),
        invoiceId: invoice.id,
        customerName: invoice.customerName,
        amount: invoice.paidAmount,
        method: methods[Math.floor(Math.random() * methods.length)],
        date: new Date(2025, 0, Math.floor(Math.random() * 8) + 1).toISOString().split('T')[0],
        reference: `REF-${String(index + 1).padStart(6, '0')}`,
        notes: Math.random() > 0.8 ? 'Pembayaran sebagian' : undefined,
        status: invoice.status,
        customerId: invoice.customerId,
      });
    }
  });

  return payments;
};

export const mockPayments = generateMockPayments();

// Generate mock targets
export const mockTargets: Target[] = [
  {
    id: '1',
    userId: '1',
    period: '2025-09',
    type: 'monthly',
    salesTarget: 100000000,
    salesTargetUnits: 120,
    collectionTarget: 80000000,
    visitTarget: 25,
    salesRealization: 50000000,
    salesRealizationUnits: 60,
    collectionRealization: 40000000,
    visitRealization: 18,
  },
  {
    id: '2',
    userId: '1',
    period: '2025-09-22',
    type: 'daily',
    salesTarget: 5000000,
    salesTargetUnits: 6,
    collectionTarget: 4000000,
    visitTarget: 2,
    salesRealization: 3000000,
    salesRealizationUnits: 3,
    collectionRealization: 2000000,
    visitRealization: 1,
  },
];

// Geofence locations for attendance
export const geofenceLocations = [
  {
    id: '1',
    name: 'Main Office',
    latitude: -6.2088,
    longitude: 106.8456,
    radius: 100, // meters
  },
  {
    id: '2',
    name: 'Warehouse',
    latitude: -6.2441,
    longitude: 107.0000,
    radius: 150,
  },
];

// Price lists for special customers
export const mockPriceLists = {
  '1': {
    // PT. Maju Jaya Sentosa (VIP)
    '1': 8000000, // Smartphone Galaxy Pro - 500k discount
    '2': 1100000, // Wireless Headphones - 100k discount
    '3': 14500000, // Laptop Gaming Elite - 500k discount
  },
  '2': {
    // CV. Berkah Sejahtera
    '1': 8250000, // Smartphone Galaxy Pro - 250k discount
    '4': 3300000, // Smart Watch Series X - 200k discount
  },
};

// Promotional offers
export const mockPromotions = [
  {
    id: '1',
    name: 'Promo Tahun Baru',
    description: 'Beli 2 gratis 1 untuk aksesoris tertentu',
    validFrom: '2025-01-01',
    validTo: '2025-01-31',
    productIds: ['2', '4'], // Wireless Headphones, Smart Watch
    discountType: 'buy2get1',
    isActive: true,
  },
  {
    id: '2',
    name: 'Obral Elektronik',
    description: 'Diskon 15% untuk semua elektronik',
    validFrom: '2025-01-01',
    validTo: '2025-01-15',
    productIds: ['1', '3'], // Smartphone, Laptop
    discountType: 'percentage',
    discountValue: 15,
    isActive: true,
  },
];

// Mock stock adjustments
export const mockAdjustments: StockAdjustment[] = [
  {
    id: '1',
    productId: '1',
    productName: 'Smartphone Galaxy Pro',
    locationId: '2',
    locationName: 'Van Stock',
    oldQuantity: 30,
    newQuantity: 25,
    adjustment: -5,
    reason: 'Barang rusak',
    date: new Date().toISOString(),
    createdBy: '1',
  },
  {
    id: '2',
    productId: '2',
    productName: 'Wireless Headphones',
    locationId: '1',
    locationName: 'Main Warehouse',
    oldQuantity: 75,
    newQuantity: 80,
    adjustment: 5,
    reason: 'Penambahan stok',
    date: new Date().toISOString(),
    createdBy: '1',
  },
  {
    id: '3',
    productId: '3',
    productName: 'Laptop Gaming Elite',
    locationId: '2',
    locationName: 'Van Stock',
    oldQuantity: 5,
    newQuantity: 3,
    adjustment: -2,
    reason: 'Pengembalian pelanggan',
    date: new Date().toISOString(),
    createdBy: '1',
  },
];

export const mockBesiCompetitor: BesiCompetitor[] = [
  {
    id: "1",
    rksId: "rks1",
    name: "Besi Siku",
    quantity: 10,
    customerName: "PT. Maju Jaya",
    photo: "https://via.placeholder.com/150",
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    rksId: "rks2",
    name: "Besi Beton",
    quantity: 20,
    customerName: "CV. Sejahtera",
    photo: "https://via.placeholder.com/150",
    timestamp: new Date().toISOString(),
  },
];




