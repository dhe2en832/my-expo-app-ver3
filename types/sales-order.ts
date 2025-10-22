export interface SalesOrderListType {
  id: string;
  no_so: string;
  tgl_so: string;
  created_at: string;
  sort_date: string;
  nama_cust: string;
  kode_cust: string;
  nama_sales: string;
  kode_sales: string;
  status: string;
  jumlah_item: number;
  total: number;
}

export interface SalesOrderDetailType extends SalesOrderListType {
  // tambahkan field detail lainnya
  items?: SalesOrderItemType[];
  customer_address?: string;
  // ... lainnya
}

export interface SalesOrderItemType {
  id: string;
  kode_barang: string;
  nama_barang: string;
  qty: number;
  harga: number;
  subtotal: number;
  // ... lainnya
}