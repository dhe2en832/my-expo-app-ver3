// components/sales-order/SalesOrderForm.tsx
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import {
  salesOrderAPI,
  customerAPI,
  dataBarangAPI,
  dataUmumAPI,
} from "@/api/services";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { CustomerList, ProductList, StockItem } from "@/api/interface";
import moment from "moment";

const now = moment();

// ✅ Interfaces sama persis dengan create.tsx
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

interface SalesOrderForm {
  kode_cust: string;
  no_cust: string;
  nama_cust: string;
  alamat: string;
  tanggal_so: string;
  keterangan: string;
  kode_termin?: string;
  nama_termin?: string;
  kode_kirim?: string;
  cara_kirim?: "KG" | "KP" | "AG" | "AP";
  pajak: "N" | "I" | "E";
  ppn_percent: number;
  diskon_header: number;
  diskon_header_percent: number;
  uang_muka: number;
  items: CartItem[];
}

interface SalesOrderFormProps {
  mode: "create" | "edit";
  orderId?: string;
  initialData?: any;
  isEditable?: boolean;
}

export default function SalesOrderForm({
  mode,
  orderId,
  initialData,
  isEditable = true,
}: SalesOrderFormProps) {
  const insets = useSafeAreaInsets();
  const DEFAULT_PPN_PERCENT = 11;
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminList, setTerminList] = useState<any[]>([]);
  const [showTerminModal, setShowTerminModal] = useState(false);
  const [ppnRupiah, setPpnRupiah] = useState(0);
  // ✅ State untuk form (SAMA PERSIS dengan create.tsx)
  const [form, setForm] = useState<SalesOrderForm>({
    kode_cust: "",
    no_cust: "",
    nama_cust: "",
    alamat: "",
    tanggal_so: new Date().toISOString().split("T")[0],
    keterangan: "",
    kode_termin: "",
    nama_termin: "",
    kode_kirim: "",
    cara_kirim: undefined,
    pajak: "N",
    ppn_percent: 11,
    diskon_header: 0,
    diskon_header_percent: 0,
    uang_muka: 0,
    items: [],
  });

  // ✅ State untuk existing order data (edit mode)
  const [existingOrder, setExistingOrder] = useState<any>(null);

  // ✅ State untuk modals (SAMA dengan create.tsx)
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ✅ State untuk data (SAMA dengan create.tsx)
  const [customers, setCustomers] = useState<CustomerList[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerList[]>(
    []
  );
  const [products, setProducts] = useState<StockItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StockItem[]>([]);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  // ✅ Load existing data untuk edit mode
  useEffect(() => {
    if (mode === "edit" && orderId) {
      loadExistingOrder();
    } else if (initialData) {
      setExistingOrder(initialData);
      populateFormFromData(initialData);
      setLoading(false);
    }
  }, [mode, orderId, initialData]);

  const loadExistingOrder = async () => {
    try {
      setLoading(true);
      const res = await salesOrderAPI.getSoDetailCombined(orderId!);
      if (res.success && res.data) {
        setExistingOrder(res.data);
        populateFormFromData(res.data);
      } else {
        setError("Gagal memuat data sales order");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data sales order");
    } finally {
      setLoading(false);
    }
  };

  const loadTerminList = async () => {
    try {
      const res = await dataUmumAPI.getTerminByKode(""); // Kosongkan untuk get all
      if (res.success && res.data) {
        setTerminList(res.data);
      }
    } catch (err: any) {
      console.error("Error loading termin:", err);
    }
  };

  // ✅ Panggil saat component mount
  useEffect(() => {
    loadTerminList();
  }, []);

  const populateFormFromData = (orderData: any) => {
    const header = orderData.header;
    const details = orderData.items;

    // Convert details to cart items
    const cartItems: CartItem[] = details.map((detail: any, index: number) => ({
      id: `existing-${index}`,
      kode_item: detail.kode_item,
      no_item: detail.no_item || "", // Will be populated when products are loaded
      nama_item: detail.nama_item,
      harga: detail.harga,
      quantity: detail.qty,
      subtotal: detail.total,
      stok: 0, // Will be updated when products are loaded
      satuan: detail.satuan,
      kategori: "",
      kelompok: "",
      diskon_percent: parseFloat(detail.diskon_percent) || 0,
      diskon_value: detail.diskon_value || 0,
      berat: detail.berat || 0,
      franco: detail.franco || "N",
      diskripsi: detail.diskripsi || "",
    }));
    const selectedTermin = terminList.find(
      (termin) => termin.kode_termin === header.kode_termin
    );
    let ppnPercent = header.ppn_percent || 0;
    if (header.pajak && header.pajak !== "N" && !header.ppn_percent) {
      ppnPercent = DEFAULT_PPN_PERCENT;
    }
    setForm({
      kode_cust: header.kode_cust,
      no_cust: header.no_cust,
      nama_cust: header.nama_cust,
      alamat: header.alamat,
      tanggal_so:
        moment(header.tgl_so).format("YYYY-MM-DD") ||
        new Date().toISOString().split("T")[0],
      keterangan: "", // Adjust based on your API
      kode_termin: header.kode_termin || "",
      nama_termin: selectedTermin?.nama_termin || "",
      kode_kirim: header.kode_kirim || "",
      cara_kirim: header.cara_kirim as "KG" | "KP" | "AG" | "AP" | undefined,
      pajak: header.pajak || "N", //
      // ppn_percent: header.ppn_percent || 0,
      ppn_percent: ppnPercent,
      diskon_header: header.diskon_header || 0,
      diskon_header_percent: parseFloat(header.diskon_header_percent) || 0,
      uang_muka: header.uang_muka || 0,
      items: cartItems,
    });
    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    const calculatedPpn = subtotalAfterDiscount * (ppnPercent / 100);
    setPpnRupiah(calculatedPpn);
  };

  // ✅ COPY SEMUA FUNGSI DARI create.tsx DI SINI:

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
            customer.no_cust?.toLowerCase().includes(query) ||
            customer.alamat_kirim1?.toLowerCase().includes(query)
        )
      );
    }
  }, [customers, searchCustomer]);

  // ✅ Handler untuk pilih termin
  const handleSelectTermin = (termin: any) => {
    setForm((prev) => ({
      ...prev,
      kode_termin: termin.kode_termin,
      nama_termin: termin.nama_termin,
    }));
    setShowTerminModal(false);
  };

  // ✅ Render item termin
  const renderTerminItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.terminItem}
      onPress={() => handleSelectTermin(item)}
    >
      <Text style={styles.terminName}>{item.nama_termin}</Text>
      <Text style={styles.terminCode}>{item.kode_termin}</Text>
      <Text style={styles.terminDetail}>
        {item.tempo > 0 ? `Net ${item.tempo} Hari` : "C.O.D"} •{" "}
        {item.persen > 0 ? `Diskon ${item.persen}%` : "Tanpa Diskon"}
      </Text>
      {item.catatan && <Text style={styles.terminCatatan}>{item.catatan}</Text>}
    </TouchableOpacity>
  );

  // ✅ Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getCombinedCustomerList(1, 100);

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
      no_cust: customer.no_cust,
      nama_cust: customer.nama_cust || "",
      alamat: customer.alamat_kirim1 || "",
      kode_termin: customer.kode_termin || "",
      nama_termin: customer.nama_termin,
    }));
    setShowCustomerModal(false);
    setSearchCustomer("");
  };

  // ✅ Add product to cart
  const handleAddProduct = (product: ProductList) => {
    if (product.stok <= 0) {
      Alert.alert("Stok Habis", "Produk ini tidak tersedia di stok");
      return;
    }

    const existingItem = form.items.find(
      (item) => item.kode_item === product.kode_item
    );

    if (existingItem) {
      if (existingItem.quantity + 1 > product.stok) {
        Alert.alert("Stok Tidak Cukup", `Stok tersedia: ${product.stok}`);
        return;
      }

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

  // ✅ Update cart item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = form.items.find((item) => item.id === itemId);
    if (!item) return;

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

  // ✅ Calculate totals
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

  // const calculateSubtotalAfterDiscount = () => {
  //   return calculateTotalAfterDetailDiscount() - calculateDiscountHeader();
  // };

  // const calculatePPN = () => {
  //   if (form.pajak === "N") {
  //     return 0; // Tanpa Pajak
  //   }

  //   const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
  //   const ppnValue = subtotalAfterDiscount * (form.ppn_percent / 100);

  //   // Update state nilai rupiah pajak
  //   setPpnRupiah(ppnValue);

  //   return ppnValue;
  // };

  // ✅ Update calculateGrandTotal untuk handle Include Pajak
  const calculateGrandTotal = () => {
    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    const ppnValue = calculatePPN();

    if (form.pajak === "I") {
      // Untuk Include, PPN sudah termasuk dalam subtotal
      return subtotalAfterDiscount - form.uang_muka;
    } else {
      // Untuk Exclude dan Tanpa Pajak, PPN ditambahkan
      return subtotalAfterDiscount + ppnValue - form.uang_muka;
    }
  };

  // ✅ PERBAIKI: Gunakan useCallback untuk calculation functions
  const calculateSubtotalAfterDiscount = useCallback(() => {
    const totalAfterDetailDiscount = calculateTotalAfterDetailDiscount();
    const discountHeader = calculateDiscountHeader();

    let subtotalAfterDiscount = totalAfterDetailDiscount - discountHeader;

    if (form.pajak === "I") {
      const ppnIncluded =
        subtotalAfterDiscount * (form.ppn_percent / (100 + form.ppn_percent));
      subtotalAfterDiscount -= ppnIncluded;
    }

    return subtotalAfterDiscount;
  }, [
    form.pajak,
    form.ppn_percent,
    form.items,
    form.diskon_header,
    form.diskon_header_percent,
  ]);

  const calculatePPN = useCallback(() => {
    if (form.pajak === "N") {
      return 0;
    }

    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    const ppnValue = subtotalAfterDiscount * (form.ppn_percent / 100);

    // ✅ Pindahkan setPpnRupiah ke handler khusus
    return ppnValue;
  }, [form.pajak, form.ppn_percent, calculateSubtotalAfterDiscount]);

  // ✅ PERBAIKI: useEffect dengan dependencies minimal
  useEffect(() => {
    const ppnValue = calculatePPN();
    setPpnRupiah(ppnValue);
  }, [calculatePPN]); // Hanya depend on calculatePPN

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

  // ✅ Prepare order data untuk API
  const prepareOrderData = () => {
    const subtotal = calculateSubtotal();
    const totalDiscountDetail = calculateTotalDiscountDetail();
    const discountHeader = calculateDiscountHeader();
    const subtotalAfterDiscount = calculateSubtotalAfterDiscount();
    const ppnValue = calculatePPN();
    const grandTotal = calculateGrandTotal();

    return {
      header: {
        kode_so: existingOrder?.header.kode_so, // Untuk update
        no_so: existingOrder?.header.no_so, // Untuk update
        kode_sales: user?.kodeSales,
        nama_sales: user?.namaSales || "",
        kode_cust: form.kode_cust,
        customer_name: form.nama_cust,
        customer_address: form.alamat,
        kode_termin: form.kode_termin,
        nama_termin: form.nama_termin,
        kode_kirim: form.kode_kirim,
        cara_kirim: form.cara_kirim,
        pajak: form.pajak,
        ppn_percent: form.ppn_percent,
        ppn_value: ppnValue,
        diskon_header_value: discountHeader,
        diskon_header_percent: form.diskon_header_percent,
        uang_muka: form.uang_muka,
        // subtotal: subtotal,
        total: grandTotal,
        status: existingOrder?.header.status || "pending",
        is_unscheduled: "N",
        tgl_so: form.tanggal_so,
        diskripsi: form.keterangan,
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
        id_so: index + 1,
      })),
    };
  };

  // ✅ MODIFIED: Save as draft - handle both create dan edit
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      const orderData = prepareOrderData();
      orderData.header.status = "draft";

      let res;
      if (mode === "edit") {
        res = await salesOrderAPI.updateSalesOrder(orderId!, orderData);
      } else {
        res = await salesOrderAPI.createSalesOrder(orderData);
      }

      if (res.success) {
        const message =
          mode === "edit"
            ? "Sales Order berhasil diperbarui sebagai draft"
            : "Sales Order berhasil disimpan sebagai draft";

        Alert.alert("Berhasil", message, [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        setError(
          res.message ||
            `Gagal ${mode === "edit" ? "memperbarui" : "menyimpan"} draft`
        );
      }
    } catch (err: any) {
      setError(
        err.message ||
          `Gagal ${mode === "edit" ? "memperbarui" : "menyimpan"} draft`
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ MODIFIED: Submit order - handle both create dan edit
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    const action = mode === "edit" ? "memperbarui" : "submit";

    Alert.alert(
      "Konfirmasi",
      `Apakah Anda yakin ingin ${action} Sales Order ini?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya",
          onPress: async () => {
            try {
              setSaving(true);
              setError(null);

              const orderData = prepareOrderData();
              // Untuk edit, pertahankan status yang ada kecuali dari draft
              if (mode === "edit" && existingOrder?.header.status !== "draft") {
                orderData.header.status = existingOrder!.header.status;
              } else {
                orderData.header.status = "pending";
              }

              let res;
              if (mode === "edit") {
                res = await salesOrderAPI.updateSalesOrder(orderId!, orderData);
              } else {
                res = await salesOrderAPI.createSalesOrder(orderData);
              }

              if (res.success) {
                const message =
                  mode === "edit"
                    ? "Sales Order berhasil diperbarui"
                    : "Sales Order berhasil disubmit";

                Alert.alert("Berhasil", message, [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                setError(res.message || `Gagal ${action} sales order`);
              }
            } catch (err: any) {
              setError(err.message || `Gagal ${action} sales order`);
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

  // ✅ Render cart item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemHeader}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.nama_item}
        </Text>
        {isEditable && (
          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            style={styles.removeButton}
          >
            <MaterialIcons name="close" size={20} color="#f44336" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.productCode}>
        {item.kode_item} • {item.no_item}
      </Text>
      <Text style={styles.productCategory}>
        {item.kategori} • {item.kelompok}
      </Text>
      <Text style={styles.productPrice}>{formatCurrency(item.harga)}</Text>

      {/* Discount Input */}
      {isEditable && (
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
              editable={isEditable}
            />
            <Text style={styles.discountPercent}>%</Text>
          </View>
          <Text style={styles.discountValue}>
            {formatCurrency(item.diskon_value)}
          </Text>
        </View>
      )}

      <View style={styles.quantityContainer}>
        <View style={styles.quantityLeft}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <Text style={styles.stockInfo}>Stok: {item.stok}</Text>
        </View>

        {isEditable ? (
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
        ) : (
          <Text style={styles.quantityText}>{item.quantity}</Text>
        )}

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
      <Text style={styles.customerCode}>{item.no_cust}</Text>
      <Text style={styles.customerAddress} numberOfLines={2}>
        {item.alamat_kirim1}
      </Text>
      {item.kode_termin && (
        <Text style={styles.customerTermin}>Termin: {item.nama_termin}</Text>
      )}
    </TouchableOpacity>
  );

  // ✅ Render product item
  const renderProductItem = ({ item }: { item: ProductList }) => (
    <TouchableOpacity
      style={[styles.productItem, item.stok <= 0 && styles.outOfStockItem]}
      onPress={() => item.stok > 0 && isEditable && handleAddProduct(item)}
      disabled={item.stok <= 0 || !isEditable}
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
        {!isEditable && <Text style={styles.readOnlyLabel}>View Only</Text>}
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

      {/* <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>PPN ({form.ppn_percent}%):</Text>
        <Text style={styles.summaryValue}>
          +{formatCurrency(calculatePPN())}
        </Text>
      </View> */}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          {form.pajak === "I"
            ? "Subtotal (Include PPN):"
            : "Subtotal setelah diskon:"}
        </Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(calculateSubtotalAfterDiscount())}
        </Text>
      </View>

      {form.pajak !== "N" && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>PPN ({form.ppn_percent}%):</Text>
          <Text style={styles.summaryValue}>
            {form.pajak === "I"
              ? "(Include)"
              : `+${formatCurrency(calculatePPN())}`}
          </Text>
        </View>
      )}

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

  // ✅ Render editable field wrapper
  const renderEditableField = (
    content: React.ReactNode,
    fieldEditable: boolean = true
  ) => {
    if (!isEditable || !fieldEditable) {
      return <View style={styles.readOnlyContainer}>{content}</View>;
    }
    return content;
  };

  // ✅ Render customer selector dengan conditional editing
  const renderCustomerSelector = () => {
    const content = (
      <TouchableOpacity
        style={[styles.customerSelector, !isEditable && styles.readOnly]}
        onPress={isEditable ? () => setShowCustomerModal(true) : undefined}
        disabled={!isEditable}
      >
        {form.nama_cust ? (
          <View>
            <Text style={styles.selectedCustomerName}>{form.nama_cust}</Text>
            <Text style={styles.selectedCustomerCode}>{form.no_cust}</Text>
                {/* TAMPILKAN NO CUST */}

            {form.alamat && (
              <Text style={styles.selectedCustomerAddress} numberOfLines={2}>
                {form.alamat}
              </Text>
            )}
            {form.kode_termin && (
              <Text style={styles.selectedCustomerTermin}>
                Termin: {form.nama_termin}
                {/* TAMPILKAN TERMIN */}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.placeholderText}>Pilih Customer</Text>
        )}
        {isEditable && (
          <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
        )}
      </TouchableOpacity>
    );

    return content;
  };

  const handlePajakChange = useCallback(
    (pajakValue: "N" | "I" | "E") => {
      let newPpnPercent = 0;

      if (pajakValue === "N") {
        newPpnPercent = 0;
      } else {
        newPpnPercent = DEFAULT_PPN_PERCENT;
      }

      setForm((prev) => ({
        ...prev,
        pajak: pajakValue,
        ppn_percent: newPpnPercent,
      }));
    },
    [DEFAULT_PPN_PERCENT]
  );

  // ✅ Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[styles.loadingContainer, { paddingBottom: insets.bottom }]}
        >
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>
            {mode === "edit"
              ? "Memuat data sales order..."
              : "Mempersiapkan form..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Render UI - SAMA PERSIS dengan create.tsx dengan conditional edits
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Stack.Screen
          options={{
            title: mode === "edit" ? "Edit Sales Order" : "Buat Sales Order",
            headerBackTitle: "Kembali",
          }}
        />

        {/* Status Header untuk Edit Mode */}
        {mode === "edit" && existingOrder && (
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(existingOrder.header.status),
                },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(existingOrder.header.status)}
              </Text>
            </View>
            <Text style={styles.orderNumber}>{existingOrder.header.no_so}</Text>
          </View>
        )}

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer Selection */}
          {/* <View style={[styles.section, styles.firstSection]}> */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer</Text>
            {renderCustomerSelector()}
          </View>

          {/* Order Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informasi Order</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tanggal SO</Text>
              {renderEditableField(
                <TextInput
                  style={styles.input}
                  value={form.tanggal_so}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, tanggal_so: text }))
                  }
                  placeholder="YYYY-MM-DD"
                  editable={isEditable}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Keterangan</Text>
              {renderEditableField(
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
                  editable={isEditable}
                />
              )}
            </View>

            {/* Payment Settings */}
            {isEditable && (
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
            )}
          </View>

          {/* Products */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Produk</Text>
              {isEditable && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowProductModal(true)}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Tambah Produk</Text>
                </TouchableOpacity>
              )}
            </View>

            {form.items.length === 0 ? (
              <View style={styles.emptyCart}>
                <MaterialIcons name="shopping-cart" size={48} color="#ccc" />
                <Text style={styles.emptyCartText}>Belum ada produk</Text>
                <Text style={styles.emptyCartSubtext}>
                  {isEditable
                    ? 'Tap "Tambah Produk" untuk menambahkan item'
                    : "Tidak ada produk dalam order ini"}
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
        {isEditable && (
          <View
            style={[
              styles.actionButtons,
            ]}
          >
            <TouchableOpacity
              style={[styles.button, styles.draftButton]}
              onPress={handleSaveDraft}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Text style={styles.draftButtonText}>
                  {mode === "edit" ? "Update Draft" : "Simpan Draft"}
                </Text>
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
                <Text style={styles.submitButtonText}>
                  {mode === "edit" ? "Update Order" : "Submit Order"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
      {/* Customer Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomerModal(false)}
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
        onRequestClose={() => setShowProductModal(false)}
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
        onRequestClose={() => setShowPaymentModal(false)}
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

          <ScrollView
            style={styles.paymentModalContent}
            contentContainerStyle={styles.paymentModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text>Pajak</Text>
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Termin Pembayaran</Text>
              <TouchableOpacity
                style={[styles.terminSelector, !isEditable && styles.readOnly]}
                onPress={
                  isEditable ? () => setShowTerminModal(true) : undefined
                }
                disabled={!isEditable}
              >
                <View style={styles.terminContent}>
                  {form.nama_termin ? (
                    <View>
                      <Text style={styles.selectedTerminName}>
                        {form.nama_termin}
                      </Text>
                      <Text style={styles.selectedTerminCode}>
                        {form.kode_termin}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>Pilih Termin</Text>
                  )}
                  {isEditable && (
                    <View>
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={24}
                        color="#666"
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Status Pajak</Text>
              <View style={styles.pajakContainer}>
                {[
                  { value: "N", label: "Tanpa Pajak" },
                  { value: "I", label: "Include Pajak" },
                  { value: "E", label: "Exclude Pajak" },
                ].map((pajak) => (
                  <TouchableOpacity
                    key={pajak.value}
                    style={[
                      styles.pajakButton,
                      form.pajak === pajak.value && styles.pajakButtonSelected,
                    ]}
                    onPress={() =>
                      handlePajakChange(pajak.value as "N" | "I" | "E")
                    }
                    disabled={!isEditable}
                  >
                    <Text
                      style={[
                        styles.pajakText,
                        form.pajak === pajak.value && styles.pajakTextSelected,
                      ]}
                    >
                      {pajak.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.paymentInputGroup}>
              <View style={styles.ppnHeader}>
                <Text style={styles.label}>PPN</Text>
                <Text style={styles.ppnRupiahValue}>
                  {formatCurrency(ppnRupiah)}
                </Text>
              </View>

              <View style={styles.ppnInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.ppnInput,
                    form.pajak === "N" && styles.disabledInput, // ✅ Disable jika Tanpa Pajak
                  ]}
                  value={form.ppn_percent.toString()}
                  onChangeText={(text) => {
                    const percent = parseFloat(text) || 0;
                    if (percent >= 0 && percent <= 100) {
                      setForm((prev) => ({ ...prev, ppn_percent: percent }));
                      const subtotalAfterDiscount =
                        calculateSubtotalAfterDiscount();
                      const newPpnRupiah =
                        subtotalAfterDiscount * (percent / 100);
                      setPpnRupiah(newPpnRupiah);
                    }
                  }}
                  keyboardType="numeric"
                  placeholder={DEFAULT_PPN_PERCENT.toString()}
                  editable={form.pajak !== "N"} // ✅ Disable jika Tanpa Pajak
                />
                <Text style={styles.ppnPercentLabel}>%</Text>
              </View>

              {/* ✅ Status Info */}
              <Text style={styles.ppnStatusText}>
                {form.pajak === "N"
                  ? "Transaksi tanpa PPN"
                  : form.pajak === "I"
                  ? "PPN termasuk dalam harga"
                  : "PPN ditambahkan di akhir"}
              </Text>
            </View>
            {/* <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>PPN (%)</Text>
              {renderEditableField(
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
              )}
            </View> */}
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Diskon Header (%)</Text>
              {renderEditableField(
                <TextInput
                  style={styles.input}
                  value={form.diskon_header_percent.toString()}
                  onChangeText={(text) => {
                    const percent = parseFloat(text) || 0;
                    setForm((prev) => ({
                      ...prev,
                      diskon_header_percent: percent,
                      diskon_header: 0,
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                />
              )}
            </View>
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Diskon Header (Nominal)</Text>
              {renderEditableField(
                <TextInput
                  style={styles.input}
                  value={form.diskon_header.toString()}
                  onChangeText={(text) => {
                    const nominal = parseFloat(text) || 0;
                    setForm((prev) => ({
                      ...prev,
                      diskon_header: nominal,
                      diskon_header_percent: 0,
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                />
              )}
            </View>
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Uang Muka</Text>
              {renderEditableField(
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
              )}
            </View>
            <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Cara Kirim</Text>
              {renderEditableField(
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
                        setForm((prev) => ({
                          ...prev,
                          cara_kirim: cara as any,
                        }))
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
              )}
            </View>
            {/* <View style={styles.paymentInputGroup}>
              <Text style={styles.label}>Kode Kirim</Text>
              {renderEditableField(
                <TextInput
                  style={styles.input}
                  value={form.kode_kirim}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, kode_kirim: text }))
                  }
                  placeholder="Kode pengiriman"
                />
              )}
            </View> */}

            {renderPaymentSummary()}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Termin Modal */}
      <Modal
        visible={showTerminModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTerminModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih Termin Pembayaran</Text>
            <TouchableOpacity
              onPress={() => setShowTerminModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={terminList}
            renderItem={renderTerminItem}
            keyExtractor={(item) => item.kode_termin}
            contentContainerStyle={styles.modalList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ Styles - COPY SEMUA DARI create.tsx DAN TAMBAH YANG BARU
const styles = StyleSheet.create({
  paymentModalScrollContent: {
    flexGrow: 1,
    paddingBottom: 32, // ✅ Extra space
  },
  ppnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ppnRupiahValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#667eea",
  },
  ppnInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ppnPercentLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
    width: 30,
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  ppnStatusText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  terminContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  terminTextContainer: {
    flex: 1,
  },
  customerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  customerTextContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 6,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },
  section: {
    backgroundColor: "white",
    marginHorizontal: 8, // ✅ Consistent horizontal margin
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  firstSection: {
    marginTop: 8,
  },
  rowSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  halfSection: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#334155",
  },
  customerInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressInput: {
    marginTop: 8,
    textAlignVertical: "top",
  },
  placeholder: {
    color: "#94a3b8",
    fontSize: 16,
  },
  selectedCustomerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  selectedCustomerCode: {
    fontSize: 14,
    color: "#64748b",
  },
  label: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 6,
  },
  terminContainer: {
    flexDirection: "row",
    gap: 8,
  },
  terminButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  terminButtonActive: {
    backgroundColor: "#667eea",
  },
  terminText: {
    fontSize: 14,
    color: "#64748b",
  },
  terminTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  caraKirimButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  caraKirimButtonActive: {
    backgroundColor: "#667eea",
  },
  caraKirimText: {
    fontSize: 14,
    color: "#64748b",
  },
  caraKirimTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  pajakButtonActive: {
    backgroundColor: "#667eea",
  },
  pajakTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  ppnRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  ppnInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  equals: {
    fontSize: 18,
    color: "#64748b",
  },
  ppnValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  diskonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diskonInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  diskonInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  percent: {
    marginLeft: 4,
    fontSize: 16,
    color: "#64748b",
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addProductText: {
    color: "#667eea",
    fontWeight: "600",
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCartText: {
    marginTop: 12,
    fontSize: 16,
    color: "#94a3b8",
  },
  cartItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cartItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cartLabel: {
    width: 80,
    fontSize: 14,
    color: "#64748b",
  },
  cartInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  diskonRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  diskonInputSmall: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
  },
  percentSmall: {
    fontSize: 14,
    color: "#64748b",
  },
  equalsSmall: {
    fontSize: 14,
    color: "#64748b",
  },
  cartTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 8,
  },
  cartTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  cartTotalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  draftButton: {
    backgroundColor: "#f1f5f9",
  },
  submitButton: {
    backgroundColor: "#667eea",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    // paddingTop: 16 + insets.top,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  modalSearch: {
    margin: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalList: {
    paddingHorizontal: 16,
    // paddingBottom: insets.bottom + 16,
  },
  customerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  customerCode: {
    fontSize: 14,
    color: "#64748b",
  },
  customerAddress: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  productItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  productCode: {
    fontSize: 14,
    color: "#64748b",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  loadingProducts: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#94a3b8",
  },

  // Tambahan styles untuk edit mode
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statusLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  orderNumber: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginLeft: "auto",
  },
  readOnlyContainer: {
    opacity: 0.7,
  },
  readOnly: {
    backgroundColor: "#f5f5f5",
  },
  readOnlyLabel: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
  inputGroup: {
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  emptyCartSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  cartList: {
    marginTop: 8,
  },
  removeButton: {
    padding: 2,
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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
  customerTermin: {
    fontSize: 12,
    color: "#667eea",
    fontWeight: "600",
    marginTop: 2,
  },
  outOfStockItem: {
    opacity: 0.6,
    backgroundColor: "#f5f5f5",
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  productPriceInfo: {
    alignItems: "flex-end",
  },
  productStock: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  outOfStockText: {
    color: "#f44336",
    fontWeight: "600",
  },
  inStockText: {
    color: "#4CAF50",
  },
  productWeight: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  outOfStockLabel: {
    fontSize: 10,
    color: "#f44336",
    fontWeight: "600",
    marginTop: 2,
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
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
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
  paymentModalContent: {
    flex: 1,
    padding: 16,
    // paddingBottom: insets.bottom + 16,
  },
  paymentInputGroup: {
    marginBottom: 16,
  },
  caraKirimContainer: {
    flexDirection: "row",
    gap: 8,
  },
  caraKirimButtonSelected: {
    borderColor: "#667eea",
    backgroundColor: "#667eea",
  },
  caraKirimTextSelected: {
    color: "#fff",
  },
  terminSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  selectedTerminName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  selectedTerminCode: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  terminItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  terminName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  terminCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  terminDetail: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  terminCatatan: {
    fontSize: 12,
    color: "#667eea",
    fontStyle: "italic",
  },
  // ✅ Styles untuk pajak
  pajakContainer: {
    flexDirection: "row",
    gap: 8,
  },
  pajakButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  pajakButtonSelected: {
    borderColor: "#667eea",
    backgroundColor: "#667eea",
  },
  pajakText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  pajakTextSelected: {
    color: "#fff",
  },
});

// Helper functions
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "disetujui":
      return "#4CAF50";
    case "terbuka":
    case "pending":
    case "menunggu":
      return "#FF9800";
    case "rejected":
    case "ditolak":
      return "#F44336";
    case "draft":
      return "#9E9E9E";
    case "submitted":
      return "#2196F3";
    default:
      return "#666";
  }
};

const getStatusText = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "disetujui":
      return "Disetujui";
    case "terbuka":
    case "pending":
    case "menunggu":
      return "Menunggu";
    case "rejected":
    case "ditolak":
      return "Ditolak";
    case "draft":
      return "Draft";
    case "submitted":
      return "Dikirim";
    default:
      return status || "Draft";
  }
};
