// app/ppi/create.tsx - COMPLETE NEW VERSION
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { ppiAPI, dataUmumAPI } from "@/api/services";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  OutstandingInvoice,
  PPICreateRequest,
  CustomerType,
  AkunBank,
  PPIPhoto,
} from "@/api/interface";
import {
  Button,
  Card,
  TextInput,
  RadioButton,
  Divider,
} from "react-native-paper";
import {
  formatCurrency,
  formatDate,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/utils/helpers";

import { MobileFTPUploader } from "@/utils/mobileFTPUploader";
import PPIPhotoUpload from "@/components/ppi/PPIPhotoUpload";
import { useLocalSearchParams } from "expo-router";

// --- TYPES ---
interface BankAccount {
  kode_akun: string;
  no_akun: string;
  nama_akun: string;
}

// --- CUSTOMER SELECTION MODAL ---
const CustomerSelectionModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onCustomerSelect: (customer: CustomerType) => void;
  selectedCustomer: CustomerType | null;
}> = ({ visible, onClose, onCustomerSelect, selectedCustomer }) => {
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await ppiAPI.getPpiCustomerList(1, 100);
      if (res.success && res.data) {
        setCustomers(res.data);
      } else {
        Alert.alert("Gagal memuat data customer");
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      Alert.alert("Error", "Gagal memuat data customer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) loadCustomers();
  }, [visible]);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.nama_relasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.kode_cust.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pilih Customer</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text>Memuat data customer...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.kode_cust}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.customerItem,
                  selectedCustomer?.kode_cust === item.kode_cust &&
                    styles.customerItemSelected,
                ]}
                onPress={() => {
                  onCustomerSelect(item);
                  onClose();
                }}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.nama_relasi}</Text>
                  <Text style={styles.customerCode}>{item.no_cust}</Text>
                  <Text style={styles.customerAddress}>
                    {item.alamat_kirim1}, {item.kota_kirim}
                  </Text>
                </View>
                {selectedCustomer?.kode_cust === item.kode_cust && (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#667eea"
                  />
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// --- BANK SELECTION MODAL ---
const BankSelectionModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onBankSelect: (bank: BankAccount) => void;
  selectedBank: BankAccount | null;
}> = ({ visible, onClose, onBankSelect, selectedBank }) => {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBanks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dataUmumAPI.getAkunBank();
      if (res.success && res.data) {
        setBanks(res.data);
      }
    } catch (err: any) {
      console.error("Error loading banks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ PERBAIKI: useEffect dengan dependency yang benar
  useEffect(() => {
    if (visible) {
      loadBanks();
    }
  }, [visible, loadBanks]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pilih Bank</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text>Memuat data bank...</Text>
          </View>
        ) : (
          <FlatList
            data={banks}
            keyExtractor={(item) => item.kode_akun}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.bankItem,
                  selectedBank?.kode_akun === item.kode_akun &&
                    styles.bankItemSelected,
                ]}
                onPress={() => {
                  onBankSelect(item);
                  onClose();
                }}
              >
                <MaterialIcons
                  name="account-balance"
                  size={24}
                  color="#667eea"
                />
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{item.nama_akun}</Text>
                  <Text style={styles.bankCode}>{item.no_akun}</Text>
                </View>
                {selectedBank?.kode_akun === item.kode_akun && (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#667eea"
                  />
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// --- STEP 1: CUSTOMER SELECTION ---
const CustomerStep: React.FC<{
  selectedCustomer: CustomerType | null;
  onCustomerSelect: (customer: CustomerType) => void;
  onNext: () => void;
  showCustomerModal: boolean;
  onShowCustomerModal: (show: boolean) => void;
  fromRKS:boolean
}> = ({
  selectedCustomer,
  onCustomerSelect,
  onNext,
  showCustomerModal,
  onShowCustomerModal,
  fromRKS = false
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pilih Customer</Text>
      <Text style={styles.stepDescription}>
        Pilih customer yang akan melakukan pembayaran piutang
      </Text>

      <Card style={styles.selectionCard}>
        <Card.Content>
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionTitle}>Customer</Text>
            <Button
              mode="outlined"
              onPress={() => onShowCustomerModal(true)}
              compact
              disabled={fromRKS}
            >
              {selectedCustomer ? "Ganti" : "Pilih"}
            </Button>
          </View>

          {selectedCustomer ? (
            <View style={styles.selectedInfo}>
              <MaterialIcons name="person" size={20} color="#667eea" />
              <View style={styles.selectedDetails}>
                <Text style={styles.selectedName}>
                  {selectedCustomer.nama_relasi}
                </Text>
                <Text style={styles.selectedCode}>
                  {selectedCustomer.no_cust}
                </Text>
                <Text style={styles.selectedAddress}>
                  {selectedCustomer.alamat_kirim1},{" "}
                  {selectedCustomer.kota_kirim}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noSelection}>
              <MaterialIcons name="person-outline" size={40} color="#ccc" />
              <Text style={styles.noSelectionText}>
                Belum ada customer dipilih
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* <View style={styles.fixedButtonContainer}>
        <Button
          mode="contained"
          onPress={onNext}
          disabled={!selectedCustomer}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
        >
          Lanjut ke Metode Bayar
        </Button>
      </View> */}
      {/*
      <CustomerSelectionModal
        visible={showCustomerModal}
        onClose={() => onShowCustomerModal(false)}
        onCustomerSelect={onCustomerSelect}
        selectedCustomer={selectedCustomer}
      /> */}
    </View>
  );
};

const PaymentMethodStep: React.FC<{
  paymentMethod: "cash" | "transfer" | "giro";
  onPaymentMethodChange: (method: "cash" | "transfer" | "giro") => void;
  selectedBank: BankAccount | null;
  onBankSelect: (bank: BankAccount) => void;
  giroNumber: string;
  onGiroNumberChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  showBankModal: boolean;
  onShowBankModal: (show: boolean) => void;
}> = ({
  paymentMethod,
  onPaymentMethodChange,
  selectedBank,
  onBankSelect,
  giroNumber,
  onGiroNumberChange,
  dueDate,
  onDueDateChange,
  onNext,
  onBack,
  showBankModal,
  onShowBankModal,
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Metode Pembayaran</Text>
      <Text style={styles.stepDescription}>
        Pilih metode pembayaran untuk transaksi ini
      </Text>

      <Card style={styles.selectionCard}>
        <Card.Content>
          <RadioButton.Group
            onValueChange={(value) =>
              onPaymentMethodChange(value as "cash" | "transfer" | "giro")
            }
            value={paymentMethod}
          >
            <View style={styles.radioItem}>
              <RadioButton value="cash" />
              <Text style={styles.radioLabel}>Cash</Text>
            </View>

            <View style={styles.radioItem}>
              <RadioButton value="transfer" />
              <Text style={styles.radioLabel}>Transfer Bank</Text>
            </View>

            <View style={styles.radioItem}>
              <RadioButton value="giro" />
              <Text style={styles.radioLabel}>Giro / Warkat</Text>
            </View>
          </RadioButton.Group>

          {/* Bank Selection untuk Transfer dan Giro */}
          {(paymentMethod === "transfer" || paymentMethod === "giro") && (
            <View style={styles.bankSelection}>
              <Divider style={styles.divider} />
              <Text style={styles.sectionLabel}>Pilih Bank</Text>
              <TouchableOpacity
                style={styles.bankSelector}
                onPress={() => onShowBankModal(true)}
              >
                {selectedBank ? (
                  <View style={styles.selectedInfo}>
                    <MaterialIcons
                      name="account-balance"
                      size={20}
                      color="#667eea"
                    />
                    <View style={styles.selectedDetails}>
                      <Text style={styles.selectedName}>
                        {selectedBank.nama_akun}
                      </Text>
                      <Text style={styles.selectedCode}>
                        {selectedBank.no_akun}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noSelection}>
                    <MaterialIcons
                      name="account-balance"
                      size={20}
                      color="#ccc"
                    />
                    <Text style={styles.placeholderText}>Pilih Bank</Text>
                  </View>
                )}
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Additional fields for giro */}
          {paymentMethod === "giro" && (
            <View style={styles.giroFields}>
              <Divider style={styles.divider} />
              <TextInput
                label="Nomor Giro"
                value={giroNumber}
                onChangeText={onGiroNumberChange}
                mode="outlined"
                style={styles.textInput}
              />
              <TextInput
                label="Tanggal Jatuh Tempo"
                value={dueDate}
                onChangeText={onDueDateChange}
                mode="outlined"
                style={styles.textInput}
                placeholder="YYYY-MM-DD"
              />
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

// --- STEP 3: INVOICE SELECTION ---
const InvoiceSelectionStep: React.FC<{
  selectedCustomer: CustomerType;
  selectedInvoices: OutstandingInvoice[];
  onInvoiceToggle: (invoice: OutstandingInvoice) => void;
  onPaymentChange: (kodeFj: string, field: string, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({
  selectedCustomer,
  selectedInvoices,
  onInvoiceToggle,
  onPaymentChange,
  onNext,
  onBack,
}) => {
  const [outstandingInvoices, setOutstandingInvoices] = useState<
    OutstandingInvoice[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOutstandingInvoices = useCallback(async () => {
    if (!selectedCustomer?.kode_cust) return;

    setLoading(true);
    setError(null);
    try {
      const response = await ppiAPI.getOutstandingInvoices(
        selectedCustomer.kode_cust
      );
      if (response.success && response.data) {
        setOutstandingInvoices(response.data);
      } else {
        setError(response.message || "Gagal memuat data outstanding invoices");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer?.kode_cust]);

  // ✅ PERBAIKI: useEffect dengan dependency yang benar
  useEffect(() => {
    loadOutstandingInvoices();
  }, [loadOutstandingInvoices]);

  const getTotalBayar = () => {
    return selectedInvoices.reduce((total, invoice) => {
      return total + (invoice.mobile_allocated_amount || 0);
    }, 0);
  };

  const getTotalDiscount = () => {
    return selectedInvoices.reduce((total, invoice) => {
      return total + (invoice.mobile_allocated_discount || 0);
    }, 0);
  };

  const handlePaymentInputChange = (
    kodeFj: string,
    field: string,
    valueText: string
  ) => {
    const value = parseCurrencyInput(valueText);
    onPaymentChange(kodeFj, field, value);
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pilih Faktur</Text>
      <Text style={styles.stepDescription}>
        Pilih faktur yang akan dibayar oleh {selectedCustomer.nama_relasi}
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text>Memuat data faktur...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="outlined" onPress={loadOutstandingInvoices}>
            Coba Lagi
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.invoiceList}>
          {outstandingInvoices.map((invoice) => {
            const isSelected = selectedInvoices.some(
              (i) => i.kode_fj === invoice.kode_fj
            );
            const selectedInvoice = selectedInvoices.find(
              (i) => i.kode_fj === invoice.kode_fj
            );

            return (
              <Card key={invoice.kode_fj} style={styles.invoiceCard}>
                <Card.Content>
                  <TouchableOpacity
                    style={styles.invoiceHeader}
                    onPress={() => onInvoiceToggle(invoice)}
                  >
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceNumber}>{invoice.no_fj}</Text>
                      <Text style={styles.invoiceDate}>
                        {formatDate(invoice.tgl_fj)} • Jatuh Tempo:{" "}
                        {formatDate(invoice.jatuh_tempo)}
                      </Text>
                      {invoice.is_overdue && (
                        <Text style={styles.overdueBadge}>
                          OVERDUE ({invoice.overdue_days} hari)
                        </Text>
                      )}
                    </View>
                    <View style={styles.checkboxContainer}>
                      {isSelected ? (
                        <MaterialIcons
                          name="check-box"
                          size={24}
                          color="#667eea"
                        />
                      ) : (
                        <MaterialIcons
                          name="check-box-outline-blank"
                          size={24}
                          color="#ccc"
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.amountRow}>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Total Invoice</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(invoice.total_invoice)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Sudah Dibayar</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(invoice.sudah_dibayar_setelah_alokasi)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Sisa Hutang</Text>
                      <Text
                        style={[styles.amountValue, styles.remainingAmount]}
                      >
                        {formatCurrency(
                          invoice.sisa_setelah_alokasi ?? invoice.sisa_hutang
                        )}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={styles.paymentInputs}>
                      <Divider style={styles.divider} />
                      <Text style={styles.paymentTitle}>Input Pembayaran</Text>

                      <View style={styles.inputRow}>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Jumlah Bayar</Text>
                          <TextInput
                            value={formatCurrencyInput(
                              selectedInvoice?.mobile_allocated_amount || 0
                            )}
                            onChangeText={(value) =>
                              handlePaymentInputChange(
                                invoice.kode_fj,
                                "mobile_allocated_amount",
                                value
                              )
                            }
                            keyboardType="numeric"
                            mode="outlined"
                            style={styles.currencyInput}
                            placeholder="0"
                          />
                        </View>

                        {/* <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Discount</Text>
                          <TextInput
                            value={formatCurrencyInput(
                              selectedInvoice?.mobile_allocated_discount || 0
                            )}
                            onChangeText={(value) =>
                              handlePaymentInputChange(
                                invoice.kode_fj,
                                "mobile_allocated_discount",
                                value
                              )
                            }
                            keyboardType="numeric"
                            mode="outlined"
                            style={styles.currencyInput}
                            placeholder="0"
                          />
                        </View> */}
                      </View>

                      {selectedInvoice && (
                        <View style={styles.calculationRow}>
                          <Text style={styles.calculationText}>
                            Sisa setelah bayar:{" "}
                            {formatCurrency(
                              (invoice.sisa_setelah_alokasi ??
                                invoice.sisa_hutang) -
                                (selectedInvoice.mobile_allocated_amount || 0) -
                                (selectedInvoice.mobile_allocated_discount || 0)
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {selectedInvoices.length > 0 && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Ringkasan Pembayaran</Text>
            <View style={styles.summaryRow}>
              <Text>Total Bayar:</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(getTotalBayar())}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Discount:</Text>
              <Text style={styles.summaryDiscount}>
                {formatCurrency(getTotalDiscount())}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(getTotalBayar() + getTotalDiscount())}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

// --- STEP 4: PHOTO UPLOAD ---
const PhotoUploadStep: React.FC<{
  photos: PPIPhoto[];
  onPhotosChange: (photos: PPIPhoto[]) => void;
  saveType: "draft" | "submitted";
  onSaveTypeChange: (type: "draft" | "submitted") => void;
  onBack: () => void;
  loading: boolean;
  selectedCustomer: CustomerType | null;
  selectedInvoices: OutstandingInvoice[];
  user: any;
}> = ({
  photos,
  onPhotosChange,
  saveType,
  onSaveTypeChange,
  onBack,
  loading,
  selectedCustomer,
  selectedInvoices,
  user,
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Upload Bukti Pembayaran</Text>
      <Text style={styles.stepDescription}>
        Upload foto bukti pembayaran (wajib, maksimal 10 foto)
      </Text>

      <PPIPhotoUpload
        photos={photos}
        onPhotosChange={onPhotosChange}
        maxPhotos={10}
      />

      <Card style={styles.saveOptionsCard}>
        <Card.Content>
          <Text style={styles.sectionLabel}>Simpan Sebagai</Text>
          <RadioButton.Group
            onValueChange={(value) => {
              if (value === "draft" || value === "submitted") {
                onSaveTypeChange(value); // ✅ Hanya ganti state
              }
            }}
            value={saveType}
          >
            <View style={styles.radioItem}>
              <RadioButton value="submitted" />
              <Text style={styles.radioLabel}>
                Submit PPI (Langsung diproses)
              </Text>
            </View>
            {/* <View style={styles.radioItem}>
              <RadioButton value="draft" />
              <Text style={styles.radioLabel}>
                Simpan Draft (Dapat diedit nanti)
              </Text>
            </View> */}
          </RadioButton.Group>
        </Card.Content>
      </Card>

      {/* ❌ HAPUS tombol dari sini - pindah ke fixed container */}
    </View>
  );
};

// --- MAIN COMPONENT ---
export default function PPICreate() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const buttonContainerHeight = 80;
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // Form data
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerType | null>(
    null
  );
  const [selectedInvoices, setSelectedInvoices] = useState<
    OutstandingInvoice[]
  >([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "giro"
  >("cash");
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [giroNumber, setGiroNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [photos, setPhotos] = useState<PPIPhoto[]>([]);
  const [saveType, setSaveType] = useState<"draft" | "submitted">("submitted");
  const [fromRKS, setFromRKS] = useState(false);
  const [isFormReset, setIsFormReset] = useState(false);
  const initializedFromRKS = useRef(false);

  const params = useLocalSearchParams<{
    kode_rks?: string;
    kode_cust?: string;
    no_cust?: string;
    nama_cust?: string;
    alamat?: string;
    is_unscheduled?: string;
    baru?: string;
    fromRKS?: string;
  }>();

  //====== OTOMATIS MASUK KE METODE PEMBAYARAN ==========

  // // 🧹 Step 1: Reset form dulu setiap kali halaman dibuka
  // useEffect(() => {
  //   console.log("🧹 Reset form PPI...");
  //   setSelectedCustomer(null);
  //   setSelectedInvoices([]);
  //   setPaymentMethod("cash");
  //   setSelectedBank(null);
  //   setGiroNumber("");
  //   setDueDate("");
  //   setPhotos([]);
  //   setSaveType("submitted");
  //   setFromRKS(false);
  //   setCurrentStep(1); // ✅ pastikan mulai dari step pertama
  //   initializedFromRKS.current = false;

  //   const timer = setTimeout(() => setIsFormReset(true), 50);
  //   return () => clearTimeout(timer);
  // }, []);

  // // 🧩 Step 2: Setelah reset, isi otomatis dari params (kalau ada)
  // useEffect(() => {
  //   if (isFormReset && !initializedFromRKS.current && params?.kode_cust) {
  //     console.log("📦 Diterima dari RKS:", params);

  //     const newCustomer: CustomerType = {
  //       kode_cust: params.kode_cust?.toString() || "",
  //       no_cust: params.no_cust?.toString() || "",
  //       nama_relasi: params.nama_cust?.toString() || "",
  //       alamat_kirim1: params.alamat?.toString() || "Alamat belum tersedia",
  //       kota_kirim: "",
  //       kode_termin: "",
  //       nama_termin: "",
  //     };

  //     // ✅ isi customer & tandai fromRKS
  //     setSelectedCustomer(newCustomer);
  //     setFromRKS(true);

  //     // ✅ langsung lompat ke step 2 (Metode Pembayaran)
  //     setCurrentStep(2);

  //     initializedFromRKS.current = true;
  //     console.log("✅ Customer diisi otomatis dari RKS:", newCustomer);
  //   }
  // }, [isFormReset, params]);

  //=============== END ====================================

  // 🔹 Step 1: Reset form dulu setiap kali halaman dibuka
  useEffect(() => {
    console.log("🧹 Reset form PPI...");
    setSelectedCustomer(null);
    setSelectedInvoices([]);
    setPaymentMethod("cash");
    setSelectedBank(null);
    setGiroNumber("");
    setDueDate("");
    setPhotos([]);
    setSaveType("submitted");
    setFromRKS(false);
    initializedFromRKS.current = false;

    // beri delay singkat agar state benar-benar reset
    const timer = setTimeout(() => setIsFormReset(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // 🔹 Step 2: Setelah reset, isi otomatis dari params (kalau ada)
  useEffect(() => {
    if (isFormReset && !initializedFromRKS.current && params?.kode_cust) {
      console.log("📦 Diterima dari RKS:", params);

      const newCustomer: CustomerType = {
        kode_cust: params.kode_cust?.toString() || "",
        no_cust: params.no_cust?.toString() || "",
        nama_relasi: params.nama_cust?.toString() || "",
        alamat_kirim1: params.alamat?.toString() || "Alamat belum tersedia",
        kota_kirim: "",
        kode_termin: "",
        nama_termin: "",
      };

      setSelectedCustomer(newCustomer);
      setFromRKS(true);
      initializedFromRKS.current = true;
      console.log("✅ Customer diisi otomatis dari params:", newCustomer);
    }
  }, [isFormReset, params]);

  const getTotalPaymentAmount = useCallback(() => {
    return selectedInvoices.reduce(
      (total, inv) => total + (inv.mobile_allocated_amount || 0),
      0
    );
  }, [selectedInvoices]);

  const handleBankSelect = useCallback((bank: BankAccount) => {
    setSelectedBank(bank);
    setShowBankModal(false);
  }, []);

  const validateBeforeSubmit = () => {
    if (!selectedCustomer) {
      Alert.alert("Error", "Customer harus dipilih");
      return false;
    }
    if (selectedInvoices.length === 0) {
      Alert.alert("Error", "Minimal satu faktur harus dipilih");
      return false;
    }
    if (getTotalPaymentAmount() === 0) {
      Alert.alert("Error", "Total jumlah bayar tidak boleh nol");
      return false;
    }
    if (paymentMethod === "giro") {
      if (!giroNumber.trim()) {
        Alert.alert("Error", "Nomor Giro harus diisi");
        return false;
      }
      if (!dueDate.trim()) {
        Alert.alert("Error", "Tanggal Jatuh Tempo harus diisi");
        return false;
      }
    }
    if (
      (paymentMethod === "transfer" || paymentMethod === "giro") &&
      !selectedBank
    ) {
      Alert.alert("Error", "Bank harus dipilih untuk metode transfer/giro");
      return false;
    }
    if (photos.length === 0) {
      Alert.alert("Error", "Foto bukti pembayaran wajib diupload");
      return false;
    }
    return true;
  };

  const handleSubmit = useCallback(
    async (status: "draft" | "submitted") => {
      if (!validateBeforeSubmit()) return;

      if (!selectedCustomer || selectedInvoices.length === 0) {
        Alert.alert("Error", "Data belum lengkap");
        return;
      }
      // ✅ HITUNG TOTAL DIBAYAR = total bayar_mu + total discount
      const totalBayar = selectedInvoices.reduce(
        (sum, inv) => sum + (inv.mobile_allocated_amount || 0),
        0
      );
      const totalDiscount = selectedInvoices.reduce(
        (sum, inv) => sum + (inv.mobile_allocated_discount || 0),
        0
      );
      const totalDibayar = totalBayar + totalDiscount;

      setLoading(true);
      try {
        let fileZipPath = "";

        if (photos.length > 0) {
          try {
            // console.log("📤 Uploading PPI photos sebagai ZIP...");
            const zipFileName = `PPI_${selectedCustomer.kode_cust}_${
              new Date().toISOString().split("T")[0]
            }_${Date.now()}`;

            fileZipPath = await MobileFTPUploader.uploadPPIPhotosAsZip(
              photos,
              selectedCustomer.kode_cust,
              user?.kodeCabang || "DEF",
              zipFileName
            );
            // console.log("✅ PPI ZIP uploaded:", fileZipPath);
          } catch (uploadError: any) {
            console.error("❌ PPI ZIP upload failed:", uploadError);
            Alert.alert(
              "Upload Foto Gagal",
              "PPI berhasil dibuat, tetapi upload foto gagal. Foto dapat diupload ulang nanti."
            );
          }
        }

        const paymentRecord = {
          metode_bayar: paymentMethod,
          jumlah_bayar: totalDibayar,
          tgl_bayar: new Date().toISOString().split("T")[0],
          ...(paymentMethod === "giro" && {
            no_giro: giroNumber,
            tgl_jatuh_tempo: dueDate,
          }),
          ...((paymentMethod === "transfer" || paymentMethod === "giro") &&
            selectedBank && {
              bank: selectedBank.nama_akun,
            }),
          keterangan: "Pembayaran PPI via mobile",
          created_by: user?.nama_user || "mobile_user",
          file_path: fileZipPath || undefined,
          file_name: fileZipPath.split("/").pop() || undefined,
          file_upload_status: saveType,
          // Opsional: tambahkan file info
          // ...(fileZipPath && {
          //   file_path: fileZipPath,
          //   file_name: fileZipPath.split("/").pop(),
          // }),
        };
        const ppiData: PPICreateRequest = {
          header: {
            tanggal_ppi: new Date().toISOString().split("T")[0],
            kode_cust: selectedCustomer.kode_cust,
            nama_cust: selectedCustomer.nama_relasi,
            cara_bayar: paymentMethod,
            status: saveType,
            file_zip_path: fileZipPath || undefined,
            // total_dibayar: totalDibayar, // ✅ TAMBAHKAN INI
            // total_discount: totalDiscount, // ✅ SESUAI DDL
            ...(paymentMethod === "giro" && {
              no_giro: giroNumber,
              tgl_jatuh_tempo: dueDate,
            }),
            ...((paymentMethod === "transfer" || paymentMethod === "giro") &&
              selectedBank && {
                bank: selectedBank.nama_akun,
                kode_akun_debet: selectedBank.kode_akun,
              }),
          },
          details: selectedInvoices.map((invoice) => ({
            kode_fj: invoice.kode_fj,
            no_fj: invoice.no_fj,
            tgl_fj: invoice.tgl_fj,
            // netto_mu: invoice.total_invoice,
            // lunas_mu: invoice.sudah_dibayar + invoice.mobile_allocated_amount,
            // owing: invoice.total_invoice - (invoice.sudah_dibayar + invoice.mobile_allocated_amount),// invoice.sisa_setelah_alokasi ?? invoice.sisa_hutang,
            bayar_mu: invoice.mobile_allocated_amount || 0,
            discount: invoice.mobile_allocated_discount || 0,
            // sisa_setelah_bayar: invoice.sisa_setelah_alokasi ?? invoice.sisa_hutang,
          })),
          payments: [paymentRecord],
        };
        // console.log("ppiData ", ppiData);
        // throw new Error("TES ");

        const response = await ppiAPI.createPPI(ppiData);

        if (response.success) {
          const message =
            status === "draft"
              ? `PPI berhasil disimpan sebagai draft${
                  fileZipPath ? " dengan foto" : ""
                }`
              : `PPI berhasil dibuat dan disubmit${
                  fileZipPath ? " dengan foto" : ""
                }`;

          Alert.alert("Sukses", message, [
            {
              text: "OK",
              onPress: () =>
                router.replace({
                  pathname: "/ppi",
                  params: { successMessage: message },
                }),
            },
          ]);
        } else {
          Alert.alert("Error", response.message || "Gagal membuat PPI");
        }
      } catch (error: any) {
        console.error("Error creating PPI:", error);
        Alert.alert(
          "Error",
          error.message || "Terjadi kesalahan saat membuat PPI"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      selectedCustomer,
      selectedInvoices,
      photos,
      paymentMethod,
      giroNumber,
      dueDate,
      selectedBank,
      user,
      router,
    ]
  );
  // Step navigation dengan fixed buttons
  const handleNextStep = useCallback(() => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  }, [currentStep]);

  // const handleBackStep = useCallback(() => {
  //   if (currentStep > 1) setCurrentStep(currentStep - 1);
  //   else router.back();
  // }, [currentStep, router]);
  const handleBackStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // Ganti dengan replace agar tidak bisa kembali ke form
      router.replace("/ppi");
    }
  }, [currentStep, router]);
  // Handle invoice selection
  const handleInvoiceToggle = useCallback((invoice: OutstandingInvoice) => {
    setSelectedInvoices((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.kode_fj === invoice.kode_fj
      );
      if (existingIndex >= 0) {
        return prev.filter((i) => i.kode_fj !== invoice.kode_fj);
      } else {
        return [
          ...prev,
          {
            ...invoice,
            mobile_allocated_amount: 0,
            mobile_allocated_discount: 0,
            sisa_setelah_alokasi: invoice.sisa_setelah_alokasi,
          },
        ];
      }
    });
  }, []);

  // Handle payment amount changes
  const handlePaymentChange = useCallback(
    (kodeFj: string, field: string, value: number) => {
      setSelectedInvoices((prev) =>
        prev.map((invoice) =>
          invoice.kode_fj === kodeFj
            ? {
                ...invoice,
                [field]: value,
                sisa_setelah_alokasi:
                  invoice.sisa_hutang -
                  (field === "mobile_allocated_amount"
                    ? value
                    : invoice.mobile_allocated_amount) -
                  (field === "mobile_allocated_discount"
                    ? value
                    : invoice.mobile_allocated_discount),
              }
            : invoice
        )
      );
    },
    []
  );

  // Progress steps
  const steps = [
    { number: 1, title: "Customer", active: currentStep === 1 },
    { number: 2, title: "Metode Bayar", active: currentStep === 2 },
    { number: 3, title: "Pilih Faktur", active: currentStep === 3 },
    { number: 4, title: "Upload Foto", active: currentStep === 4 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Buat PPI Baru",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={loading} // 🔹 Disable saat loading
              style={{ opacity: loading ? 0.5 : 1 }} // 🔹 Optional: buat terlihat disabled
            >
              <MaterialIcons name="arrow-back" size={24} color="#667eea" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View key={step.number} style={styles.progressStep}>
            <View
              style={[
                styles.progressCircle,
                step.active && styles.progressCircleActive,
                currentStep > step.number && styles.progressCircleCompleted,
              ]}
            >
              {currentStep > step.number ? (
                <MaterialIcons name="check" size={16} color="#fff" />
              ) : (
                <Text style={styles.progressNumber}>{step.number}</Text>
              )}
            </View>
            <Text
              style={[
                styles.progressText,
                step.active && styles.progressTextActive,
                currentStep > step.number && styles.progressTextCompleted,
              ]}
            >
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  currentStep > step.number && styles.progressLineCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          // contentContainerStyle={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContent,
            // { paddingBottom: buttonContainerHeight + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Render current step */}
          {currentStep === 1 && (
            <CustomerStep
              selectedCustomer={selectedCustomer}
              onCustomerSelect={setSelectedCustomer}
              onNext={handleNextStep}
              showCustomerModal={showCustomerModal}
              onShowCustomerModal={setShowCustomerModal}
              fromRKS={fromRKS}
            />
          )}

          {currentStep === 2 && (
            <PaymentMethodStep
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              selectedBank={selectedBank}
              onBankSelect={handleBankSelect}
              giroNumber={giroNumber}
              onGiroNumberChange={setGiroNumber}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              onNext={handleNextStep}
              onBack={handleBackStep}
              showBankModal={showBankModal}
              onShowBankModal={setShowBankModal}
            />
          )}

          {currentStep === 3 && selectedCustomer && (
            <InvoiceSelectionStep
              selectedCustomer={selectedCustomer}
              selectedInvoices={selectedInvoices}
              onInvoiceToggle={handleInvoiceToggle}
              onPaymentChange={handlePaymentChange}
              onNext={handleNextStep}
              onBack={handleBackStep}
            />
          )}

          {currentStep === 4 && (
            <PhotoUploadStep
              photos={photos}
              onPhotosChange={setPhotos}
              saveType={saveType}
              onSaveTypeChange={setSaveType}
              onBack={handleBackStep}
              loading={loading}
              selectedCustomer={selectedCustomer} // ✅ SEKARANG SESUAI DENGAN INTERFACE
              selectedInvoices={selectedInvoices} // ✅ SEKARANG SESUAI DENGAN INTERFACE
              user={user} // ✅ SEKARANG SESUAI DENGAN INTERFACE
            />
          )}
        </ScrollView>

        {/* ✅ PERBAIKI: Fixed Buttons di luar ScrollView */}
        {/* <View
            style={[
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                padding: 16,
                paddingBottom: insets.bottom, // ✅ Tambahkan insets.bottom
                borderTopWidth: 1,
                borderTopColor: "#e0e0e0",
                elevation: 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
            ]}
          > */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleBackStep}
            style={styles.backButton}
            contentStyle={styles.buttonContent}
            disabled={loading||fromRKS}
            loading={currentStep === 4 && loading}
          >
            Kembali
          </Button>
          <Button
            mode="contained"
            onPress={
              currentStep === 4
                ? () => handleSubmit(saveType) // ✅ Panggil handleSubmit dengan saveType
                : handleNextStep // ✅ Lanjut step biasa
            }
            disabled={
              loading ||
              (currentStep === 1 && !selectedCustomer) ||
              (currentStep === 2 &&
                (paymentMethod === "giro"
                  ? !selectedBank || !giroNumber || !dueDate
                  : paymentMethod === "transfer"
                  ? !selectedBank
                  : false)) ||
              (currentStep === 3 &&
                (selectedInvoices.length === 0 ||
                  getTotalPaymentAmount() === 0)) // ✅ VALIDASI BARU
            }
            loading={currentStep === 4 && loading}
            style={styles.nextButton}
            contentStyle={styles.buttonContent}
          >
            {currentStep === 4
              ? "Simpan PPI"
              : currentStep === 3
              ? "Lanjut ke Upload Foto"
              : currentStep === 2
              ? "Lanjut ke Pilih Faktur"
              : "Lanjut ke Metode Bayar"}
          </Button>
        </View>
        {/* </View> */}
      </View>

      {/* Customer Selection Modal */}
      <CustomerSelectionModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerSelect={setSelectedCustomer}
        selectedCustomer={selectedCustomer}
      />

      {/* Bank Selection Modal */}
      <BankSelectionModal
        visible={showBankModal}
        onClose={() => setShowBankModal(false)}
        onBankSelect={handleBankSelect} // ✅ GUNAKAN function dari main component
        selectedBank={selectedBank}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  // Progress Steps
  progressContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleActive: {
    backgroundColor: "#667eea",
  },
  progressCircleCompleted: {
    backgroundColor: "#4caf50",
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  progressText: {
    fontSize: 10,
    color: "#999",
    marginLeft: 6,
    flex: 1,
  },
  progressTextActive: {
    color: "#667eea",
    fontWeight: "600",
  },
  progressTextCompleted: {
    color: "#4caf50",
    fontWeight: "600",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  progressLineCompleted: {
    backgroundColor: "#4caf50",
  },
  // Step Container
  stepContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  // Fixed Button Container
  // fixedButtonContainer: {
  //   // marginTop: 'auto',
  //   // paddingTop: 16,
  //   position: "absolute",
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   backgroundColor: "#fff",
  //   padding: 16,
  //   borderTopWidth: 1,
  //   borderTopColor: "#e0e0e0",
  //   elevation: 8,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: -2 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  // },
  actionButtons: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 12,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  // Common Cards
  selectionCard: {
    marginBottom: 16,
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  selectedDetails: {
    flex: 1,
    marginLeft: 12,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  selectedCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  selectedAddress: {
    fontSize: 12,
    color: "#999",
  },
  noSelection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noSelectionText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
    marginLeft: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#fff",
  },
  // Customer & Bank Items
  customerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  customerItemSelected: {
    backgroundColor: "#f0f4ff",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  customerCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 12,
    color: "#999",
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  bankItemSelected: {
    backgroundColor: "#f0f4ff",
  },
  bankInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  bankCode: {
    fontSize: 14,
    color: "#666",
  },
  // Payment Method Styles
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioLabel: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  bankSelection: {
    marginTop: 16,
  },
  bankSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  giroFields: {
    marginTop: 16,
    gap: 12,
  },
  textInput: {
    backgroundColor: "#fff",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  // Invoice Styles
  loadingContainer: {
    padding: 32,
    alignItems: "center",
  },
  errorContainer: {
    padding: 32,
    alignItems: "center",
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
    marginVertical: 16,
  },
  invoiceList: {
    flex: 1,
    marginBottom: 16,
  },
  invoiceCard: {
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  overdueBadge: {
    fontSize: 10,
    color: "#d32f2f",
    fontWeight: "600",
    backgroundColor: "#ffebee",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  checkboxContainer: {
    marginLeft: 8,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  amountItem: {
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  remainingAmount: {
    color: "#d32f2f",
  },
  paymentInputs: {
    marginTop: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  currencyInput: {
    // backgroundColor: "#fff",
    backgroundColor: "white",
    borderRadius: 12,
    // padding: 16,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculationRow: {
    marginTop: 8,
  },
  calculationText: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
  },
  // Summary Styles
  summaryCard: {
    backgroundColor: "#f8f9ff",
    borderColor: "#667eea",
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryAmount: {
    fontWeight: "600",
    color: "#333",
  },
  summaryDiscount: {
    fontWeight: "600",
    color: "#4caf50",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: "700",
    color: "#333",
  },
  totalAmount: {
    fontWeight: "700",
    color: "#667eea",
    fontSize: 16,
  },
  // Save Options
  saveOptionsCard: {
    marginTop: 16,
  },
});
