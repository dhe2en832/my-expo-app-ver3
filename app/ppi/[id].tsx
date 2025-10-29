// app/ppi/edit/[kode_ppi].tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { ppiAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "react-native-paper";
import { PPIMasterDetailPayments, APIResponse } from "@/api/interface";

// --- HELPER FUNCTIONS ---
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "synced":
    case "approved":
    case "terbuka":
      return "#4CAF50";
    case "pending_sync":
    case "pending":
      return "#FF9800";
    case "draft":
      return "#9E9E9E";
    case "rejected":
    case "cancelled":
    case "ditolak":
      return "#F44336";
    case "closed":
      return "#2196F3";
    default:
      return "#666";
  }
};

const getStatusText = (status: string) => {
  switch (status?.toLowerCase()) {
    case "synced":
    case "terbuka":
      return "Terbuka";
    case "pending_sync":
    case "pending":
      return "Pending";
    case "draft":
      return "Draft";
    case "approved":
      return "Disetujui";
    case "rejected":
    case "ditolak":
      return "Ditolak";
    case "cancelled":
    case "dibatalkan":
      return "Dibatalkan";
    case "closed":
      return "Closed";
    default:
      return status || "Draft";
  }
};

const getPaymentMethodText = (caraBayar: string) => {
  switch (caraBayar?.toLowerCase()) {
    case "cash":
      return "Cash";
    case "transfer":
      return "Transfer";
    case "giro":
      return "Giro";
    default:
      return caraBayar || "-";
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString || "-";
  }
};

const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString || "-";
  }
};

// --- COMPONENTS ---
const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Card style={styles.sectionCard}>
    <Card.Content>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card.Content>
  </Card>
);

const InfoRow: React.FC<{
  label: string;
  value: string | number;
  isImportant?: boolean;
  isCurrency?: boolean;
}> = ({ label, value, isImportant = false, isCurrency = false }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text
      style={[
        styles.infoValue,
        isImportant && styles.importantValue,
        isCurrency && styles.currencyValue,
      ]}
    >
      {isCurrency ? formatCurrency(Number(value)) : value || "-"}
    </Text>
  </View>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <View
    style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}
  >
    <Text style={styles.statusBadgeText}>{getStatusText(status)}</Text>
  </View>
);

// --- MAIN COMPONENT ---
export default function PPIEditView() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    kode_ppi: string;
    no_ppi?: string;
    status?: string;
  }>();

  const [ppiData, setPpiData] = useState<PPIMasterDetailPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const fetchPPIDetail = async () => {
    if (!params.kode_ppi) {
      setError("Kode PPI tidak ditemukan");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res: APIResponse<PPIMasterDetailPayments> =
        await ppiAPI.getPPIDetail(params.kode_ppi);

      if (res.success && res.data) {
        setPpiData(res.data);
      } else {
        setError(res.message || "Gagal mengambil data PPI");
      }
    } catch (err: any) {
      console.error("Error fetching PPI detail:", err);
      setError(err.message || "Gagal memuat data PPI");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPPIDetail();
  }, []);

  // --- USE EFFECTS ---
  useEffect(() => {
    fetchPPIDetail();
  }, [params.kode_ppi]);

  // --- HANDLERS ---
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handlePrint = useCallback(() => {
    if (ppiData) {
      router.push({
        pathname: `/ppi/print/${ppiData.header.kode_ppi}`,
        params: {
          no_ppi: ppiData.header.no_ppi,
          nama_cust: ppiData.header.nama_cust,
        },
      });
    }
  }, [ppiData, router]);

  // --- RENDER LOGIC ---
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat data PPI...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorTitle}>Gagal Memuat Data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPPIDetail}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!ppiData) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="receipt-long" size={48} color="#ccc" />
          <Text style={styles.errorTitle}>Data PPI Tidak Ditemukan</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPPIDetail}>
            <Text style={styles.retryButtonText}>Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { header, details, payments, summary } = ppiData;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#667eea"]}
            tintColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <DetailSection title="Informasi PPI">
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.ppiNumber}>
                {header.no_ppi || `PPI-${header.kode_ppi}`}
              </Text>
              <Text style={styles.ppiDate}>
                {formatDateTime(header.tanggal_ppi)}
              </Text>
            </View>
            <StatusBadge status={header.status} />
          </View>
          <InfoRow label="Sumber Data" value={header.sumber_data} />
        </DetailSection>

        {/* Customer & Sales Information */}
        <DetailSection title="Informasi Customer & Sales">
          <InfoRow label="Customer" value={header.nama_cust} />
          <InfoRow label="No. Customer" value={header.no_cust} />
          <InfoRow label="Alamat" value={header.alamat} />
          <InfoRow label="Kota" value={header.kota} />
          <InfoRow label="Telepon" value={header.telepon} />
          <InfoRow label="Sales" value={header.nama_sales} />
          <InfoRow label="No. Sales" value={header.no_sales} />
        </DetailSection>

        {/* Payment Summary */}
        <DetailSection title="Ringkasan Pembayaran">
          <InfoRow
            label="Jumlah Faktur"
            value={summary.jumlah_faktur.toString()}
          />
          <InfoRow
            label="Total Dibayar"
            value={summary.jumlah_bayar}
            isCurrency
            isImportant
          />
          {/* <InfoRow
            label="Total Discount"
            value={summary.total_discount}
            isCurrency
          /> */}
          <InfoRow label="Sumber Data" value={summary.sumber_data} />
        </DetailSection>

        {/* Header Payment Information */}
        <DetailSection title="Informasi Pembayaran Header">
          <InfoRow
            label="Cara Bayar"
            value={getPaymentMethodText(header.cara_bayar)}
          />
          <InfoRow
            label="Jumlah Bayar"
            value={header.jumlah_bayar}
            isCurrency
            isImportant
          />
          <InfoRow label="No. Giro" value={header.no_giro || "-"} />
          {header.nama_akun && (
            <InfoRow label="Akun Debet" value={header.nama_akun} />
          )}
          {header.nama_akun_piutang && (
            <InfoRow label="Akun Piutang" value={header.nama_akun_piutang} />
          )}
        </DetailSection>

        {/* Payment Details */}
        {payments && payments.length > 0 && (
          <DetailSection title="Detail Pembayaran">
            {payments.map((payment, index) => (
              <View key={index} style={styles.paymentItem}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentMethod}>
                    {getPaymentMethodText(payment.metode_bayar)}
                  </Text>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.jumlah_bayar)}
                  </Text>
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDate}>
                    {formatDateTime(payment.tgl_bayar)}
                  </Text>
                  {payment.tgl_jatuh_tempo && (
                    <Text style={styles.paymentDue}>
                      Jatuh Tempo: {formatDate(payment.tgl_jatuh_tempo)}
                    </Text>
                  )}
                </View>
                {payment.no_giro && payment.no_giro !== "-" && (
                  <Text style={styles.paymentInfo}>
                    No. Giro: {payment.no_giro}
                  </Text>
                )}
                {payment.bank && (
                  <Text style={styles.paymentInfo}>Bank: {payment.bank}</Text>
                )}
                {payment.no_rekening && (
                  <Text style={styles.paymentInfo}>
                    No. Rekening: {payment.no_rekening}
                  </Text>
                )}
                {payment.keterangan && (
                  <Text style={styles.paymentNote}>
                    Keterangan: {payment.keterangan}
                  </Text>
                )}
              </View>
            ))}
          </DetailSection>
        )}

        {/* Faktur Details */}
        {details && details.length > 0 && (
          <DetailSection title="Detail Faktur">
            {details.map((faktur, index) => (
              <View key={index} style={styles.fakturItem}>
                <View style={styles.fakturHeader}>
                  <Text style={styles.fakturNumber}>
                    {faktur.no_fj || `FJ-${faktur.kode_fj}`}
                  </Text>
                  <Text style={styles.fakturAmount}>
                    {formatCurrency(faktur.netto_mu)}
                  </Text>
                </View>
                <View style={styles.fakturDetails}>
                  <Text style={styles.fakturDate}>
                    {formatDateTime(faktur.tgl_fj)}
                  </Text>
                  <Text style={styles.fakturStatus}>
                    Lunas: {formatCurrency(faktur.lunas_mu)}
                  </Text>
                </View>
                <View style={styles.fakturBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Bayar:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(faktur.bayar_mu)}
                    </Text>
                  </View>
                  {faktur.discount && faktur.discount > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Discount:</Text>
                      <Text style={styles.discountValue}>
                        {formatCurrency(faktur.discount)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Sisa Setelah Bayar:
                    </Text>
                    <Text
                      style={[styles.breakdownValue, styles.remainingValue]}
                    >
                      {formatCurrency(faktur.sisa_setelah_bayar)}
                    </Text>
                  </View>
                  {faktur.owing && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Owing:</Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(faktur.owing)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </DetailSection>
        )}

        {/* Additional Header Information */}
        <DetailSection title="Informasi Tambahan">
          {header.debet_rp && (
            <InfoRow label="Debet RP" value={header.debet_rp} isCurrency />
          )}
          {header.kredit_rp && (
            <InfoRow label="Kredit RP" value={header.kredit_rp} isCurrency />
          )}
          {header.jumlah_rp && (
            <InfoRow
              label="Jumlah RP"
              value={header.jumlah_rp}
              isCurrency
              isImportant
            />
          )}
        </DetailSection>

        {/* Action Notes */}
        <View style={styles.notesContainer}>
          <MaterialIcons name="info-outline" size={16} color="#666" />
          <Text style={styles.notesText}>
            Mode view-only. Data tidak dapat diubah.
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Detail PPI",
          headerLeft: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
              <MaterialIcons name="arrow-back" size={24} color="#667eea" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handlePrint}>
              <MaterialIcons name="print" size={24} color="#667eea" />
            </TouchableOpacity>
          ),
        }}
      />

      {renderContent()}
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f5f7fb",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  ppiNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  ppiDate: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  statusBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  importantValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  currencyValue: {
    fontFamily: "monospace",
  },
  paymentItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  paymentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: "#666",
  },
  paymentDue: {
    fontSize: 12,
    color: "#ff9800",
  },
  paymentInfo: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  paymentNote: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  fakturItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  fakturHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fakturNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  fakturAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  fakturDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fakturStatus: {
    fontSize: 12,
    color: "#666",
  },
  fakturBreakdown: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  discountValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ff6d00",
  },
  remainingValue: {
    fontWeight: "bold",
    color: "#d32f2f",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 12,
    color: "#1976d2",
    marginLeft: 8,
    fontStyle: "italic",
  },
  headerButton: {
    padding: 4,
    marginHorizontal: 8,
  },
  fakturDate: {
    fontSize: 12,
    color: "#666",
  },
});
