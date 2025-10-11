// utils/customerSync.ts
import { NewCustomerPayload, CustomerFormData } from "../api/interface";

/**
 * Convert form data ke NewCustomerPayload dengan default values
 */
export function customerFormToPayload(data: CustomerFormData): NewCustomerPayload {
  return {
    name: data.name,
    address: data.address,
    phone: data.phone,
    city: data.city,
    kode_sales: data.kode_sales,
    store_name: data.store_name || data.name, // Default ke name jika tidak ada
    latitude: data.latitude ,//?? -6.2088, // Default koordinat (bisa disesuaikan)
    longitude: data.longitude, // ?? 106.8456,
  };
}

/**
 * Validate customer data
 */
export function validateCustomerData(data: Partial<NewCustomerPayload>): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) errors.push("Nama pelanggan harus diisi");
  if (!data.address?.trim()) errors.push("Alamat harus diisi");
  if (!data.phone?.trim()) errors.push("Nomor telepon harus diisi");
  if (!data.city?.trim()) errors.push("Kota harus diisi");
  if (!data.kode_sales?.trim()) errors.push("Kode sales harus diisi");
  if (!data.store_name?.trim()) errors.push("Nama toko harus diisi");
  if (typeof data.latitude !== "number") errors.push("Latitude tidak valid");
  if (typeof data.longitude !== "number") errors.push("Longitude tidak valid");

  return errors;
}

// ============= CONTOH PENGGUNAAN =============
/*
// Di form component
const handleSubmit = (formData: CustomerFormData) => {
  // Convert form data ke payload
  const payload = customerFormToPayload(formData);

  // Validate
  const errors = validateCustomerData(payload);
  if (errors.length > 0) {
    console.error("Validation errors:", errors);
    return;
  }

  // Submit ke server
  await createCustomer(payload);
};

// Atau jika Anda ingin membuat customer tanpa beberapa field:
const minimalCustomer: Partial<NewCustomerPayload> = {
  name: "Toko A",
  address: "Jl. Merdeka No. 1",
  phone: "08123456789",
  city: "Jakarta",
  kode_sales: "S001",
  store_name: "Toko A",
  latitude: -6.2088,
  longitude: 106.8456,
};

// Validate sebelum submit
const errors = validateCustomerData(minimalCustomer);
*/