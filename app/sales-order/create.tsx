// app/sales-order/create.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { salesOrderAPI, customerAPI, dataBarangAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomerList, ProductList, StockItem } from "@/api/interface";
import apiClient from "@/api/axiosConfig";

// ✅ Interface untuk cart item (UPDATED dengan field baru)
interface CartItem {
  id: string;
  kode_item: string;
  no_item: string;
  nama_item: string;
  harga: number;
  quantity: number;
  subtotal: number;
  stok: number;
  satuan?: string;
  kategori?: string;
  kelompok?: string;
  diskon_percent: number;
  diskon_value: number;
  berat: number;
  franco: "Y" | "N";
  diskripsi?: string;
}

// ✅ Interface untuk form data (UPDATED dengan field baru)
interface SalesOrderForm {
  kode_cust: string;
  nama_cust: string;
  alamat: string;
  tanggal_so: string;
  keterangan: string;
  kode_termin?: string;
  kode_kirim?: string;
  cara_kirim?: "KG" | "KP" | "AG" | "AP";
  ppn_percent: number;
  diskon_header: number;
  diskon_header_percent: number;
  uang_muka: number;
  items: CartItem[];
}

export default function CreateSalesOrder() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ State untuk form (UPDATED dengan field baru)
  const [form, setForm] = useState<SalesOrderForm>({
    kode_cust: "",
    nama_cust: "",
    alamat: "",
    tanggal_so: new Date().toISOString().split("T")[0], // Today
    keterangan: "",
    kode_termin: "",
    kode_kirim: "",
    cara_kirim: undefined,
    ppn_percent: 11, // Default PPN 11%
    diskon_header: 0,
    diskon_header_percent: 0,
    uang_muka: 0,
    items: [],
  });

  // ✅ State untuk modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ✅ State untuk data
  const [customers, setCustomers] = useState<CustomerList[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerList[]>(
    []
  );
  const [products, setProducts] = useState<StockItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StockItem[]>([]);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  // ✅ Update filter products
  useEffect(() => {
    if (!searchProduct.trim()) {
      setFilteredProducts(products);
    } else {
      const query = searchProduct.toLowerCase();
      setFilteredProducts(
        products.filter(
          (product) =>
            product.nama_item?.toLowerCase().includes(query) ||
            product.kode_item?.toLowerCase().includes(query) ||
            product.no_item?.toLowerCase().includes(query)
        )
      );
    }
  }, [products, searchProduct]);

  // ✅ Load customers
  useEffect(() => {
    if (showCustomerModal && user?.kodeSales) {
      loadCustomers();
    }
  }, [showCustomerModal, user?.kodeSales]);

  // ✅ Load products
  useEffect(() => {
    if (showProductModal) {
      loadProducts();
    }
  }, [showProductModal]);

  // ✅ Filter customers
  useEffect(() => {
    if (!searchCustomer.trim()) {
      setFilteredCustomers(customers);
    } else {
      const query = searchCustomer.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (customer) =>
            customer.nama_cust?.toLowerCase().includes(query) ||
            customer.kode_cust?.toLowerCase().includes(query) ||
            customer.alamat_kirim1?.toLowerCase().includes(query)
        )
      );
    }
  }, [customers, searchCustomer]);

  // ✅ Filter products
  useEffect(() => {
    if (!searchProduct.trim()) {
      setFilteredProducts(products);
    } else {
      const query = searchProduct.toLowerCase();
      setFilteredProducts(
        products.filter(
          (product) =>
            product.nama_item?.toLowerCase().includes(query) ||
            product.kode_item?.toLowerCase().includes(query) ||
            product.kategori?.toLowerCase().includes(query)
        )
      );
    }
  }, [products, searchProduct]);

  // ✅ Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getCombinedCustomerList(
        user!.kodeSales,
        1,
        100
      );

      if (res.success && res.data) {
        setCustomers(res.data);
      } else {
        setError("Gagal memuat data customer");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat customer");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await dataBarangAPI.getProductList(1, 100, searchProduct);

      if (res.success && res.data) {
        const productData: ProductList[] = res.data.map((item: any) => ({
          kode_item: item.kode_item,
          no_item: item.no_item,
          nama_item: item.nama_item,
          stok: item.stok || 0,
          harga1: item.harga1 || 0,
          harga2: item.harga2 || 0,
          harga3: item.harga3 || 0,
          kode_gudang: item.kode_gudang,
          gudang: item.gudang,
          stok_gudang: item.stok_gudang,
          satuan: item.satuan || "",
          kategori: item.kategori,
          kelompok: item.kelompok,
          // diskripsi: item.nama_item,
          berat: item.berat || 0,
        }));
        setProducts(productData);
      } else {
        setError(res.message || "Gagal memuat data produk");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Select customer
  const handleSelectCustomer = (customer: CustomerList) => {
    setForm((prev) => ({
      ...prev,
      kode_cust: customer.kode_cust,
      nama_cust: customer.nama_cust || "",
      alamat: customer.alamat_kirim1 || "",
      kode_termin: customer.kode_termin || "",
    }));
    setShowCustomerModal(false);
    setSearchCustomer("");
  };

  // ✅ Add product to cart (UPDATED dengan field baru)
  const handleAddProduct = (product: ProductList) => {
    // Cek stok tersedia
    if (product.stok <= 0) {
      Alert.alert("Stok Habis", "Produk ini tidak tersedia di stok");
      return;
    }

    const existingItem = form.items.find(
      (item) => item.kode_item === product.kode_item
    );

    if (existingItem) {
      // Cek apakah quantity melebihi stok
      if (existingItem.quantity + 1 > product.stok) {
        Alert.alert("Stok Tidak Cukup", `Stok tersedia: ${product.stok}`);
        return;
      }

      // Update quantity jika produk sudah ada di cart
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.kode_item === product.kode_item
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.harga,
              }
            : item
        ),
      }));
    } else {
      // Add new product to cart dengan field baru
      const newItem: CartItem = {
        id: Date.now().toString(),
        kode_item: product.kode_item,
        no_item: product.no_item,
        nama_item: product.nama_item,
        harga: product.harga1 || 0,
        quantity: 1,
        subtotal: product.harga1 || 0,
        stok: product.stok,
        satuan: product.satuan,
        kategori: product.kategori,
        kelompok: product.kelompok,
        diskon_percent: 0,
        diskon_value: 0,
        berat: product.berat || 0,
        franco: "N",
        diskripsi: product.nama_item,
      };

      setForm((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
    }

    setShowProductModal(false);
    setSearchProduct("");
  };

  // ✅ Update cart item quantity - TAMBAH VALIDASI STOK
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = form.items.find((item) => item.id === itemId);
    if (!item) return;

    // Validasi stok
    if (newQuantity > item.stok) {
      Alert.alert("Stok Tidak Cukup", `Stok tersedia: ${item.stok}`);
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.harga,
            }
          : item
      ),
    }));
  };

  // ✅ Update item discount
  const updateItemDiscount = (itemId: string, discountPercent: number) => {
    const item = form.items.find((item) => item.id === itemId);
    if (!item) return;

    const discountValue = item.quantity * item.harga * (discountPercent / 100);
    const newSubtotal = item.quantity * item.harga - discountValue;

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              diskon_percent: discountPercent,
              diskon_value: discountValue,
              subtotal: newSubtotal,
            }
          : item
      ),
    }));
  };

  // ✅ Remove item from cart
  const removeItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  // ✅ Calculate totals (UPDATED dengan perhitungan baru)
  const calculateSubtotal = () => {
    return form.items.reduce(
      (total, item) => total + item.quantity * item.harga,
      0
    );
  };

  const calculateTotalDiscountDetail = () => {
    return form.items.reduce((total, item) => total + item.diskon_value, 0);
  };

  const calculateTotalAfterDetailDiscount = () => {
    return calculateSubtotal() - calculateTotalDiscountDetail();
  };

  const calculateDiscountHeader = () => {
    if (form.diskon_header_percent > 0) {
      return (
        calculateTotalAfterDetailDiscount() * (form.diskon_header_percent / 100)
      );
    }
    return form.diskon_header;
  };

  const calculateSubtotalAfterDiscount = () => {
    return calculateTotalAfterDetailDiscount() - calculateDiscountHeader();
  };

  const calculatePPN = () => {
    return calculateSubtotalAfterDiscount() * (form.ppn_percent / 100);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotalAfterDiscount() + calculatePPN() - form.uang_muka;
  };

  // ✅ Validate form
  const validateForm = (): boolean => {
    if (!form.kode_cust) {
      Alert.alert("Error", "Pilih customer terlebih dahulu");
      return false;
    }

    if (form.items.length === 0) {
      Alert.alert("Error", "Tambahkan minimal 1 produk");
      return false;
    }

    return true;
  };

  // ✅ Prepare order data untuk API (UPDATED dengan field baru)
  const prepareOrderData = () => {
    const subtotal = calculateSubtotal();
    const totalDiscountDetail = calculateTotalDiscountDetail();
    const discountHeader = calculateDiscountHeader();
    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    const ppnValue = calculatePPN();
    const grandTotal = calculateGrandTotal();

    return {
      header: {
        kode_sales: user?.kodeSales,
        nama_sales: user?.namaSales || "",
        kode_cust: form.kode_cust,
        customer_name: form.nama_cust,
        customer_address: form.alamat,
        kode_termin: form.kode_termin,
        kode_kirim: form.kode_kirim,
        cara_kirim: form.cara_kirim,
        ppn_percent: form.ppn_percent,
        ppn_value: ppnValue,
        diskon_header: discountHeader,
        diskon_header_percent: form.diskon_header_percent,
        uang_muka: form.uang_muka,
        subtotal: subtotal,
        total: grandTotal,
        status: "pending",
        is_unscheduled: "N",
      },
      details: form.items.map((item, index) => ({
        kode_item: item.kode_item,
        nama_item: item.nama_item,
        diskripsi: item.diskripsi,
        qty_std: item.quantity,
        harga: item.harga,
        diskon: item.diskon_value,
        diskon_percent: item.diskon_percent,
        diskon_value: item.diskon_value,
        total: item.subtotal,
        subtotal: item.quantity * item.harga,
        satuan: item.satuan,
        berat: item.berat,
        franco: item.franco,
        rowid: index + 1,
      })),
    };
  };

  // ✅ Save as draft
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      const orderData = prepareOrderData();
      orderData.header.status = "pending"; // Draft status

      const res = await salesOrderAPI.createSalesOrder(orderData);

      if (res.success) {
        Alert.alert("Berhasil", "Sales Order berhasil disimpan sebagai draft", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        setError(res.message || "Gagal menyimpan draft");
      }
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan draft");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Submit order
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    Alert.alert(
      "Konfirmasi",
      "Apakah Anda yakin ingin submit Sales Order ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setSaving(true);
              setError(null);

              const orderData = prepareOrderData();
              orderData.header.status = "pending"; // Tetap pending, nanti di-approve

              const res = await salesOrderAPI.createSalesOrder(orderData);

              if (res.success) {
                Alert.alert("Berhasil", "Sales Order berhasil disubmit", [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                setError(res.message || "Gagal submit sales order");
              }
            } catch (err: any) {
              setError(err.message || "Gagal submit sales order");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ Render cart item (UPDATED dengan diskon)
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemHeader}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.nama_item}
        </Text>
        <TouchableOpacity
          onPress={() => removeItem(item.id)}
          style={styles.removeButton}
        >
          <MaterialIcons name="close" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>

      <Text style={styles.productCode}>
        {item.kode_item} • {item.no_item}
      </Text>
      <Text style={styles.productCategory}>
        {item.kategori} • {item.kelompok}
      </Text>
      <Text style={styles.productPrice}>{formatCurrency(item.harga)}</Text>

      {/* Discount Input */}
      <View style={styles.discountContainer}>
        <Text style={styles.discountLabel}>Diskon Item:</Text>
        <View style={styles.discountInputContainer}>
          <TextInput
            style={styles.discountInput}
            value={item.diskon_percent.toString()}
            onChangeText={(text) => {
              const percent = parseFloat(text) || 0;
              if (percent >= 0 && percent <= 100) {
                updateItemDiscount(item.id, percent);
              }
            }}
            placeholder="0"
            keyboardType="numeric"
          />
          <Text style={styles.discountPercent}>%</Text>
        </View>
        <Text style={styles.discountValue}>
          {formatCurrency(item.diskon_value)}
        </Text>
      </View>

      <View style={styles.quantityContainer}>
        <View style={styles.quantityLeft}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <Text style={styles.stockInfo}>Stok: {item.stok}</Text>
        </View>

        <View style={styles.quantityControls}>
          <TouchableOpacity
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            style={styles.quantityButton}
          >
            <MaterialIcons name="remove" size={16} color="#667eea" />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
            style={styles.quantityButton}
          >
            <MaterialIcons name="add" size={16} color="#667eea" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtotal}>{formatCurrency(item.subtotal)}</Text>
      </View>
    </View>
  );

  // ✅ Render customer item
  const renderCustomerItem = ({ item }: { item: CustomerList }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => handleSelectCustomer(item)}
    >
      <Text style={styles.customerName} numberOfLines={1}>
        {item.nama_cust}
      </Text>
      <Text style={styles.customerCode}>{item.kode_cust}</Text>
      <Text style={styles.customerAddress} numberOfLines={2}>
        {item.alamat_kirim1}
      </Text>
      {item.kode_termin && (
        <Text style={styles.customerTermin}>Termin: {item.kode_termin}</Text>
      )}
    </TouchableOpacity>
  );

  // ✅ Render product item
  const renderProductItem = ({ item }: { item: ProductList }) => (
    <TouchableOpacity
      style={[styles.productItem, item.stok <= 0 && styles.outOfStockItem]}
      onPress={() => item.stok > 0 && handleAddProduct(item)}
      disabled={item.stok <= 0}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.nama_item}
        </Text>
        <Text style={styles.productCode}>
          {item.kode_item} • {item.no_item}
        </Text>
        <Text style={styles.productCategory}>
          {item.kategori} • {item.kelompok}
        </Text>
        {item.nama_item && (
          <Text style={styles.productDetail} numberOfLines={2}>
            {item.nama_item}
          </Text>
        )}
      </View>

      <View style={styles.productPriceInfo}>
        <Text style={styles.productPrice}>{formatCurrency(item.harga1)}</Text>
        <Text
          style={[
            styles.productStock,
            item.stok <= 0 ? styles.outOfStockText : styles.inStockText,
          ]}
        >
          Stok: {item.stok}
        </Text>
        {item.berat > 0 && (
          <Text style={styles.productWeight}>Berat: {item.berat}kg</Text>
        )}
        {item.stok <= 0 && (
          <Text style={styles.outOfStockLabel}>Stok Habis</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // ✅ Render payment summary
  const renderPaymentSummary = () => (
    <View style={styles.paymentSummary}>
      <Text style={styles.summaryTitle}>Ringkasan Pembayaran</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal:</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(calculateSubtotal())}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Diskon Detail:</Text>
        <Text style={styles.summaryValue}>
          -{formatCurrency(calculateTotalDiscountDetail())}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal setelah diskon detail:</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(calculateTotalAfterDetailDiscount())}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Diskon Header:</Text>
        <Text style={styles.summaryValue}>
          -{formatCurrency(calculateDiscountHeader())}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal setelah diskon:</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(calculateSubtotalAfterDiscount())}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>PPN ({form.ppn_percent}%):</Text>
        <Text style={styles.summaryValue}>
          +{formatCurrency(calculatePPN())}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Uang Muka:</Text>
        <Text style={styles.summaryValue}>
          -{formatCurrency(form.uang_muka)}
        </Text>
      </View>

      <View style={[styles.summaryRow, styles.grandTotalRow]}>
        <Text style={styles.grandTotalLabel}>Grand Total:</Text>
        <Text style={styles.grandTotalValue}>
          {formatCurrency(calculateGrandTotal())}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Buat Sales Order",
          headerBackTitle: "Kembali",
        }}
      />

      <ScrollView style={styles.scrollView}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>

          <TouchableOpacity
            style={styles.customerSelector}
            onPress={() => setShowCustomerModal(true)}
          >
            {form.nama_cust ? (
              <View>
                <Text style={styles.selectedCustomerName}>
                  {form.nama_cust}
                </Text>
                <Text style={styles.selectedCustomerCode}>
                  {form.kode_cust}
                </Text>
                {form.alamat ? (
                  <Text
                    style={styles.selectedCustomerAddress}
                    numberOfLines={2}
                  >
                    {form.alamat}
                  </Text>
                ) : null}
                {form.kode_termin && (
                  <Text style={styles.selectedCustomerTermin}>
                    Termin: {form.kode_termin}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.placeholderText}>Pilih Customer</Text>
            )}
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Order</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tanggal SO</Text>
            <TextInput
              style={styles.input}
              value={form.tanggal_so}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, tanggal_so: text }))
              }
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Keterangan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.keterangan}
              onChangeText={(text) =>
                setForm((prev) => ({ ...prev, keterangan: text }))
              }
              placeholder="Keterangan tambahan..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Payment Settings */}
          <TouchableOpacity
            style={styles.paymentSettingsButton}
            onPress={() => setShowPaymentModal(true)}
          >
            <MaterialIcons name="payment" size={20} color="#667eea" />
            <Text style={styles.paymentSettingsText}>
              Pengaturan Pembayaran
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produk</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowProductModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Tambah Produk</Text>
            </TouchableOpacity>
          </View>

          {form.items.length === 0 ? (
            <View style={styles.emptyCart}>
              <MaterialIcons name="shopping-cart" size={48} color="#ccc" />
              <Text style={styles.emptyCartText}>Belum ada produk</Text>
              <Text style={styles.emptyCartSubtext}>
                Tap "Tambah Produk" untuk menambahkan item
              </Text>
            </View>
          ) : (
            <FlatList
              data={form.items}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.cartList}
            />
          )}

          {form.items.length > 0 && renderPaymentSummary()}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.draftButton]}
          onPress={handleSaveDraft}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Text style={styles.draftButtonText}>Simpan Draft</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmitOrder}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Order</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Customer Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Customer</Text>
            <TouchableOpacity
              onPress={() => setShowCustomerModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari customer..."
              value={searchCustomer}
              onChangeText={setSearchCustomer}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              renderItem={renderCustomerItem}
              keyExtractor={(item) => item.kode_cust}
              contentContainerStyle={styles.modalList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Product Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Produk</Text>
            <TouchableOpacity
              onPress={() => setShowProductModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari produk..."
              value={searchProduct}
              onChangeText={setSearchProduct}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.kode_item}
              contentContainerStyle={styles.modalList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pengaturan Pembayaran</Text>
            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.paymentModalContent}>
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>PPN (%)</Text>
              <TextInput
                style={styles.input}
                value={form.ppn_percent.toString()}
                onChangeText={(text) => {
                  const percent = parseFloat(text) || 0;
                  setForm((prev) => ({ ...prev, ppn_percent: percent }));
                }}
                keyboardType="numeric"
                placeholder="11"
              />
            </View>

            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Diskon Header (%)</Text>
              <TextInput
                style={styles.input}
                value={form.diskon_header_percent.toString()}
                onChangeText={(text) => {
                  const percent = parseFloat(text) || 0;
                  setForm((prev) => ({
                    ...prev,
                    diskon_header_percent: percent,
                    diskon_header: 0, // Reset nominal jika menggunakan persentase
                  }));
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Diskon Header (Nominal)</Text>
              <TextInput
                style={styles.input}
                value={form.diskon_header.toString()}
                onChangeText={(text) => {
                  const nominal = parseFloat(text) || 0;
                  setForm((prev) => ({
                    ...prev,
                    diskon_header: nominal,
                    diskon_header_percent: 0, // Reset persentase jika menggunakan nominal
                  }));
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Uang Muka</Text>
              <TextInput
                style={styles.input}
                value={form.uang_muka.toString()}
                onChangeText={(text) => {
                  const uangMuka = parseFloat(text) || 0;
                  setForm((prev) => ({ ...prev, uang_muka: uangMuka }));
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Cara Kirim</Text>
              <View style={styles.caraKirimContainer}>
                {["KG", "KP", "AG", "AP"].map((cara) => (
                  <TouchableOpacity
                    key={cara}
                    style={[
                      styles.caraKirimButton,
                      form.cara_kirim === cara &&
                        styles.caraKirimButtonSelected,
                    ]}
                    onPress={() =>
                      setForm((prev) => ({ ...prev, cara_kirim: cara as any }))
                    }
                  >
                    <Text
                      style={[
                        styles.caraKirimText,
                        form.cara_kirim === cara &&
                          styles.caraKirimTextSelected,
                      ]}
                    >
                      {cara}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Kode Kirim</Text>
              <TextInput
                style={styles.input}
                value={form.kode_kirim}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, kode_kirim: text }))
                }
                placeholder="Kode pengiriman"
              />
            </View>

            {/* Payment Summary Preview */}
            {renderPaymentSummary()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  customerSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  selectedCustomerCode: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  selectedCustomerAddress: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  selectedCustomerTermin: {
    fontSize: 12,
    color: "#667eea",
    marginTop: 2,
    fontWeight: "600",
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    minHeight: 80,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyCartText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  cartList: {
    marginTop: 8,
  },
  cartItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cartItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 2,
  },
  productCode: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 12,
    color: "#667eea",
    fontWeight: "600",
    marginBottom: 8,
  },
  discountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 4,
  },
  discountLabel: {
    fontSize: 12,
    color: "#666",
  },
  discountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  discountInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    padding: 4,
    width: 50,
    textAlign: "center",
    fontSize: 12,
  },
  discountPercent: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  discountValue: {
    fontSize: 12,
    color: "#f44336",
    fontWeight: "600",
  },
  quantityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityLeft: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 12,
    color: "#666",
  },
  stockInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    minWidth: 60,
    textAlign: "center",
  },
  subtotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  paymentSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#667eea",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdecea",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#f44336",
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  draftButton: {
    backgroundColor: "#f0f0f0",
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#667eea",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalList: {
    padding: 16,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  customerCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 12,
    color: "#888",
  },
  customerTermin: {
    fontSize: 12,
    color: "#667eea",
    fontWeight: "600",
    marginTop: 2,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productPriceInfo: {
    alignItems: "flex-end",
  },
  productStock: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  productWeight: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  productDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  outOfStockItem: {
    opacity: 0.6,
    backgroundColor: "#f5f5f5",
  },
  outOfStockText: {
    color: "#f44336",
    fontWeight: "600",
  },
  inStockText: {
    color: "#4CAF50",
  },
  outOfStockLabel: {
    fontSize: 10,
    color: "#f44336",
    fontWeight: "600",
    marginTop: 2,
  },
  paymentSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  paymentSettingsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  paymentModalContent: {
    flex: 1,
    padding: 16,
  },
  paymentInputGroup: {
    marginBottom: 16,
  },
  caraKirimContainer: {
    flexDirection: "row",
    gap: 8,
  },
  caraKirimButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  caraKirimButtonSelected: {
    borderColor: "#667eea",
    backgroundColor: "#667eea",
  },
  caraKirimText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  caraKirimTextSelected: {
    color: "#fff",
  },
});
