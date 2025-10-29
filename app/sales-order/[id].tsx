// app/sales-order/[id].tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { salesOrderAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import SalesOrderForm from "@/components/sales-order/SalesOrderForm";

export default function EditSalesOrder() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const { id, status, isEditable, mode, no_so } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  // ✅ TENTUKAN MODE BERDASARKAN PARAMS DAN ROLE USER
  // const determineMode = (): "create" | "edit" | "approval" => {
  //   // ✅ HAPUS "view"
  //   // Jika mode sudah ditentukan dari params, gunakan itu
  //   if (mode === "approval") return "approval";
  //   if (mode === "create") return "create";
  //   if (mode === "edit") return "edit";

  //   // Auto-determine mode berdasarkan role dan status
  //   if (user?.salesRole === "Sales Supervisor") {
  //     // Supervisor: approval untuk pending, EDIT untuk lainnya (bukan view)
  //     const statusStr = Array.isArray(status) ? status[0] : status;
  //     return statusStr?.toLowerCase() === "pending" ||
  //       statusStr?.toLowerCase() === "menunggu"
  //       ? "approval"
  //       : "edit"; // ✅ GUNAKAN "edit" DENGAN isEditable=false
  //   } else {
  //     // Sales biasa: edit untuk draft milik sendiri, EDIT untuk lainnya (bukan view)
  //     const statusStr = Array.isArray(status) ? status[0] : status;
  //     const isEditableForm =
  //       isEditable === "true" ||
  //       statusStr === "draft" ||
  //       statusStr?.toLowerCase() === "terbuka";

  //     return isEditableForm ? "edit" : "edit"; // ✅ SELALU "edit", kontrol via isEditable
  //   }
  // };

  const determineMode = (): "create" | "edit" | "approval" | "view" => {
    if (mode === "approval") return "approval";
    if (mode === "create") return "create";
    if (mode === "edit") return "edit";

    const statusStr = Array.isArray(status)
      ? status[0]?.toLowerCase()
      : status?.toLowerCase();

    if (user?.salesRole === "Sales Supervisor") {
      if (["pending", "menunggu"].includes(statusStr)) return "approval";
      return "view"; // supervisor view saja selain pending
    }

    if (["draft", "terbuka"].includes(statusStr) && isEditable === "true") {
      return "edit";
    }

    return "view"; // default
  };

  const currentMode = determineMode();

  // ✅ TENTUKAN EDITABLE STATUS - LEBIH SIMPLE
  const determineIsEditable = (): boolean => {
    if (currentMode === "approval") return false;
    if (currentMode === "create") return true;

    // Untuk edit mode, check status dan role
    const statusStr = Array.isArray(status) ? status[0] : status;

    // Supervisor hanya bisa edit jika status draft?
    if (user?.salesRole === "Sales Supervisor") {
      return statusStr === "draft"; // Supervisor bisa edit draft jika perlu
    }

    // Sales biasa: editable untuk draft dan terbuka
    return (
      isEditable === "true" ||
      statusStr === "draft" ||
      statusStr?.toLowerCase() === "terbuka"
    );
  };

  const isEditableForm = determineIsEditable();

  // ✅ LOAD ORDER DATA UNTUK EDIT/APPROVAL MODE
  useEffect(() => {
    if (id && currentMode !== "create") {
      loadOrderData();
    } else {
      setLoading(false);
    }
  }, [id, currentMode]);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await salesOrderAPI.getSoDetailCombined(id as string);

      if (res.success && res.data) {
        setOrderData(res.data);
      } else {
        setError(res.message || "Gagal memuat data sales order");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data sales order");
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLER UNTUK APPROVAL (UNTUK SUPERVISOR)
  const handleApprove = async (orderId: string, notes?: string) => {
    try {
      const res = await salesOrderAPI.approveSalesOrder(
        orderId,
        notes,
        user?.nama_user
      );

      if (res.success) {
        Alert.alert("Berhasil", "Sales Order berhasil disetujui", [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/sales-order",
                params: {
                  successMessage: "Sales Order berhasil disetujui",
                },
              });
            },
          },
        ]);
      } else {
        Alert.alert("Error", res.message || "Gagal menyetujui sales order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal menyetujui sales order");
    }
  };

  // ✅ HANDLER UNTUK REJECT (UNTUK SUPERVISOR)
  const handleReject = async (orderId: string, notes?: string) => {
    try {
      const res = await salesOrderAPI.rejectSalesOrder(
        orderId,
        notes,
        user?.nama_user
      );

      if (res.success) {
        Alert.alert("Berhasil", "Sales Order berhasil ditolak", [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/sales-order",
                params: {
                  successMessage: "Sales Order berhasil ditolak",
                },
              });
            },
          },
        ]);
      } else {
        Alert.alert("Error", res.message || "Gagal menolak sales order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal menolak sales order");
    }
  };

  // ✅ LOADING STATE
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Memuat sales order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ ERROR STATE
  if (error && currentMode !== "create") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrderData}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ MAIN RENDER
  return (
    <SafeAreaView style={styles.container}>
      <SalesOrderForm
        mode={currentMode}
        orderId={id as string}
        initialData={orderData}
        isEditable={isEditableForm}
        onApprove={currentMode === "approval" ? handleApprove : undefined}
        onReject={currentMode === "approval" ? handleReject : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
