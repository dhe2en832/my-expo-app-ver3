// app/sales-order/edit/[id].tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { salesOrderAPI } from "@/api/services";

// Interface untuk item sales order
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
  is_deleted?: boolean;
}

// Interface untuk form edit sales order
interface EditSalesOrderForm {
  kode_so: string;
  no_so: string;
  tgl_so: string;
  kode_sales: string;
  nama_sales: string;
  kode_cust: string;
  nama_cust: string;
  alamat: string;
  kota_kirim: string;
  hp: string;
  subtotal: number;
  diskon_dokumen: number;
  persen_diskon_dokumen: number;
  total_setelah_diskon: number;
  include_ppn: boolean;
  ppn: number;
  include_pph: boolean;
  pph: number;
  uang_muka: number;
  total: number;
  items: EditSalesOrderItem[];
  keterangan: string;
  status: string;
}

export default function EditSalesOrder() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EditSalesOrderForm | null>(null);
  const [originalData, setOriginalData] = useState<EditSalesOrderForm | null>(
    null
  );

  // Load SO data untuk edit
  const loadSalesOrderData = async () => {
    try {
      setLoading(true);
      const res = await salesOrderAPI.getSoDetailCombined(orderId);

      if (res.success && res.data) {
        const formattedData = mapToEditForm(res.data);
        setFormData(formattedData);
        setOriginalData(formattedData);
      } else {
        throw new Error(res.message || "Gagal memuat data sales order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Map API data ke form edit
  const mapToEditForm = (apiData: any): EditSalesOrderForm => {
    const header = apiData.header;
    const items = apiData.items || [];

    return {
      kode_so: header.kode_so,
      no_so: header.no_so,
      tgl_so: header.tgl_so,
      kode_sales: header.kode_sales,
      nama_sales: header.nama_sales,
      kode_cust: header.kode_cust,
      nama_cust: header.nama_cust,
      alamat: header.alamat,
      kota_kirim: header.kota_kirim || "", // Tidak ada di response, default empty
      hp: header.hp || "", // Tidak ada di response, default empty
      subtotal: header.subtotal || calculateSubtotal(items),
      diskon_dokumen: header.diskon_header || 0,
      persen_diskon_dokumen: header.diskon_header_percent || 0,
      total_setelah_diskon: header.subtotal || calculateSubtotal(items),
      include_ppn: header.ppn_percent > 0,
      ppn: header.ppn_value || 0,
      include_pph: false, // Tidak ada di response, default false
      pph: 0, // Tidak ada di response, default 0
      uang_muka: header.uang_muka || 0,
      total: header.total || 0,
      items: items.map((item: any) => ({
        id: item.id_so?.toString(), // Menggunakan id_so sebagai id
        kode_item: item.kode_item,
        no_item: item.kode_item, // Menggunakan kode_item sebagai no_item
        nama_item: item.nama_item,
        quantity: item.qty || item.qty_std,
        satuan: item.satuan,
        harga: item.harga,
        diskon_item: item.diskon_value || 0,
        persen_diskon_item: parseFloat(item.diskon_percent) || 0,
        tipe_diskon_item: "amount", // Default ke amount
        harga_setelah_diskon: item.harga - (item.diskon_value || 0),
        subtotal: item.subtotal || item.total,
      })),
      keterangan: "", // Tidak ada di response, default empty
      status: header.status,
    };
  };

  // Helper function untuk calculate subtotal dari items
  const calculateSubtotal = (items: any[]): number => {
    return items.reduce(
      (sum, item) => sum + (item.subtotal || item.total || 0),
      0
    );
  };

  // Update form field
  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Update item field
  const updateItemField = (itemIndex: number, field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;

      const updatedItems = [...prev.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };

      // Recalculate item
      updatedItems[itemIndex] = calculateItemTotals(updatedItems[itemIndex]);

      return { ...prev, items: updatedItems };
    });
  };

  // Calculate item totals
  const calculateItemTotals = (
    item: EditSalesOrderItem
  ): EditSalesOrderItem => {
    let hargaSetelahDiskon = item.harga;

    if (item.tipe_diskon_item === "percent" && item.persen_diskon_item > 0) {
      hargaSetelahDiskon =
        item.harga - (item.harga * item.persen_diskon_item) / 100;
    } else if (item.tipe_diskon_item === "amount" && item.diskon_item > 0) {
      hargaSetelahDiskon = item.harga - item.diskon_item;
    }

    const subtotal = hargaSetelahDiskon * item.quantity;

    return {
      ...item,
      harga_setelah_diskon: hargaSetelahDiskon,
      subtotal: subtotal,
    };
  };

  // Recalculate order totals
  const recalculateOrderTotals = () => {
    if (!formData) return;

    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    const diskonDokumen =
      formData.persen_diskon_dokumen > 0
        ? (subtotal * formData.persen_diskon_dokumen) / 100
        : formData.diskon_dokumen;

    const totalSetelahDiskon = subtotal - diskonDokumen;
    const ppn = formData.include_ppn ? totalSetelahDiskon * 0.11 : 0;
    const pph = formData.include_pph ? totalSetelahDiskon * 0.02 : 0;
    const total = totalSetelahDiskon + ppn - pph - formData.uang_muka;

    setFormData((prev) =>
      prev
        ? {
            ...prev,
            subtotal,
            diskon_dokumen: diskonDokumen,
            total_setelah_diskon: totalSetelahDiskon,
            ppn,
            pph,
            total,
          }
        : null
    );
  };

  // Add new item
  const addNewItem = () => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            items: [
              ...prev.items,
              {
                kode_item: "",
                no_item: "",
                nama_item: "",
                quantity: 1,
                satuan: "pcs",
                harga: 0,
                diskon_item: 0,
                persen_diskon_item: 0,
                tipe_diskon_item: "amount",
                harga_setelah_diskon: 0,
                subtotal: 0,
              },
            ],
          }
        : null
    );
  };

  // Remove item
  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (!prev) return null;

      const updatedItems = [...prev.items];
      if (updatedItems[index].id) {
        // Soft delete untuk existing items
        updatedItems[index].is_deleted = true;
      } else {
        // Hard remove untuk new items
        updatedItems.splice(index, 1);
      }

      return { ...prev, items: updatedItems };
    });
  };

  // Save changes
  const saveChanges = async () => {
    if (!formData) return;

    try {
      setSaving(true);

      // Validasi
      if (formData.items.length === 0) {
        Alert.alert("Error", "Minimal harus ada 1 item");
        return;
      }

      const activeItems = formData.items.filter((item) => !item.is_deleted);
      if (activeItems.length === 0) {
        Alert.alert("Error", "Minimal harus ada 1 item yang aktif");
        return;
      }

      if (activeItems.some((item) => !item.kode_item || item.quantity <= 0)) {
        Alert.alert(
          "Error",
          "Semua item harus memiliki kode item dan quantity yang valid"
        );
        return;
      }

      // Recalculate sebelum save
      recalculateOrderTotals();

      const updatePayload = {
        ...formData,
        // Hanya kirim items yang tidak di-delete
        items: activeItems,
      };

      const res = await salesOrderAPI.updateSalesOrder(orderId, updatePayload);

      if (res.success) {
        Alert.alert("Success", "Sales Order berhasil diupdate");
        router.back();
      } else {
        throw new Error(res.message || "Gagal update sales order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!formData || !originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  useEffect(() => {
    if (orderId) {
      loadSalesOrderData();
    }
  }, [orderId]);

  useEffect(() => {
    recalculateOrderTotals();
  }, [
    formData?.items,
    formData?.diskon_dokumen,
    formData?.persen_diskon_dokumen,
    formData?.include_ppn,
    formData?.include_pph,
    formData?.uang_muka,
  ]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!formData) {
    return (
      <View style={styles.errorContainer}>
        <Text>Data tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Edit ${formData.no_so}`,
          headerRight: () => (
            <TouchableOpacity
              onPress={saveChanges}
              disabled={saving || !hasChanges()}
              style={styles.saveButton}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  (!hasChanges() || saving) && styles.saveButtonDisabled,
                ]}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView}>
        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Customer</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Customer</Text>
            <TextInput
              style={styles.input}
              value={formData.nama_cust}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Alamat</Text>
            <TextInput
              style={styles.input}
              value={formData.alamat}
              multiline
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Keterangan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.keterangan}
              onChangeText={(value) => updateFormField("keterangan", value)}
              multiline
              placeholder="Tambah keterangan..."
            />
          </View>
        </View>

        {/* Document Discount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diskon Dokumen</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Diskon (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.persen_diskon_dokumen.toString()}
                onChangeText={(value) =>
                  updateFormField(
                    "persen_diskon_dokumen",
                    parseFloat(value) || 0
                  )
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Diskon (Rp)</Text>
              <TextInput
                style={styles.input}
                value={formData.diskon_dokumen.toString()}
                onChangeText={(value) =>
                  updateFormField("diskon_dokumen", parseFloat(value) || 0)
                }
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Tax & Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pajak & Pembayaran</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Include PPN 11%</Text>
            <TouchableOpacity
              style={[
                styles.toggle,
                formData.include_ppn && styles.toggleActive,
              ]}
              onPress={() =>
                updateFormField("include_ppn", !formData.include_ppn)
              }
            >
              <Text style={styles.toggleText}>
                {formData.include_ppn ? "YA" : "TIDAK"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Include PPh 2%</Text>
            <TouchableOpacity
              style={[
                styles.toggle,
                formData.include_pph && styles.toggleActive,
              ]}
              onPress={() =>
                updateFormField("include_pph", !formData.include_pph)
              }
            >
              <Text style={styles.toggleText}>
                {formData.include_pph ? "YA" : "TIDAK"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Uang Muka (Rp)</Text>
            <TextInput
              style={styles.input}
              value={formData.uang_muka.toString()}
              onChangeText={(value) =>
                updateFormField("uang_muka", parseFloat(value) || 0)
              }
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity style={styles.addButton} onPress={addNewItem}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Tambah Item</Text>
            </TouchableOpacity>
          </View>

          {formData.items.map((item, index) =>
            item.is_deleted ? null : (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Item #{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <MaterialIcons name="delete" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Kode Item</Text>
                  <TextInput
                    style={styles.input}
                    value={item.kode_item}
                    onChangeText={(value) =>
                      updateItemField(index, "kode_item", value)
                    }
                    placeholder="Kode item..."
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Nama Item</Text>
                  <TextInput
                    style={styles.input}
                    value={item.nama_item}
                    onChangeText={(value) =>
                      updateItemField(index, "nama_item", value)
                    }
                    placeholder="Nama item..."
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity.toString()}
                      onChangeText={(value) =>
                        updateItemField(
                          index,
                          "quantity",
                          parseFloat(value) || 0
                        )
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.col}>
                    <Text style={styles.label}>Satuan</Text>
                    <TextInput
                      style={styles.input}
                      value={item.satuan}
                      onChangeText={(value) =>
                        updateItemField(index, "satuan", value)
                      }
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Harga</Text>
                  <TextInput
                    style={styles.input}
                    value={item.harga.toString()}
                    onChangeText={(value) =>
                      updateItemField(index, "harga", parseFloat(value) || 0)
                    }
                    keyboardType="numeric"
                  />
                </View>

                {/* Item Discount */}
                <View style={styles.field}>
                  <Text style={styles.label}>Diskon Item</Text>
                  <View style={styles.discountRow}>
                    <TouchableOpacity
                      style={[
                        styles.discountType,
                        item.tipe_diskon_item === "percent" &&
                          styles.discountTypeActive,
                      ]}
                      onPress={() =>
                        updateItemField(index, "tipe_diskon_item", "percent")
                      }
                    >
                      <Text>%</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={styles.discountInput}
                      value={
                        item.tipe_diskon_item === "percent"
                          ? item.persen_diskon_item.toString()
                          : item.diskon_item.toString()
                      }
                      onChangeText={(value) => {
                        if (item.tipe_diskon_item === "percent") {
                          updateItemField(
                            index,
                            "persen_diskon_item",
                            parseFloat(value) || 0
                          );
                        } else {
                          updateItemField(
                            index,
                            "diskon_item",
                            parseFloat(value) || 0
                          );
                        }
                      }}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity
                      style={[
                        styles.discountType,
                        item.tipe_diskon_item === "amount" &&
                          styles.discountTypeActive,
                      ]}
                      onPress={() =>
                        updateItemField(index, "tipe_diskon_item", "amount")
                      }
                    >
                      <Text>Rp</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemSummary}>
                  <Text>
                    Harga Setelah Diskon:{" "}
                    {formatCurrency(item.harga_setelah_diskon)}
                  </Text>
                  <Text>Subtotal: {formatCurrency(item.subtotal)}</Text>
                </View>
              </View>
            )
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Ringkasan Order</Text>

          <View style={styles.summaryRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(formData.subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Diskon Dokumen:</Text>
            <Text>-{formatCurrency(formData.diskon_dokumen)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Total Setelah Diskon:</Text>
            <Text>{formatCurrency(formData.total_setelah_diskon)}</Text>
          </View>

          {formData.include_ppn && (
            <View style={styles.summaryRow}>
              <Text>PPN 11%:</Text>
              <Text>+{formatCurrency(formData.ppn)}</Text>
            </View>
          )}

          {formData.include_pph && (
            <View style={styles.summaryRow}>
              <Text>PPh 2%:</Text>
              <Text>-{formatCurrency(formData.pph)}</Text>
            </View>
          )}

          {formData.uang_muka > 0 && (
            <View style={styles.summaryRow}>
              <Text>Uang Muka:</Text>
              <Text>-{formatCurrency(formData.uang_muka)}</Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.grandTotal]}>
            <Text>GRAND TOTAL:</Text>
            <Text>{formatCurrency(formData.total)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: "#007bff",
  },
  toggleText: {
    color: "#333",
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discountType: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  discountTypeActive: {
    backgroundColor: "#007bff",
  },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 8,
    textAlign: "center",
  },
  itemSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  summarySection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 8,
    marginTop: 8,
  },
  saveButton: {
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: "#007bff",
    fontWeight: "600",
  },
  saveButtonDisabled: {
    color: "#ccc",
  },
});

// Helper function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};
