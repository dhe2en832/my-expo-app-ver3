// app/sales-order/print/[id].tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  Linking,
  Platform,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { salesOrderAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import {
  SalesOrderDetailResponse,
  SalesOrderHeader,
  SalesOrderItem,
} from "@/api/interface";

// ✅ Environment Configuration
const getBuildEnvironment = () => {
  const manifest = Constants.expoConfig;
  const extra = manifest?.extra || {};

  const isProduction = extra.IS_PRODUCTION === "true";
  const bluetoothEnabled = extra.BLUETOOTH_ENABLED === "true";
  const appEnv = extra.APP_ENV || "development";
  const easProjectId = extra.eas?.projectId;

  const isEASBuild = !!easProjectId;
  const isRealBluetoothAvailable =
    isProduction && bluetoothEnabled && isEASBuild && Platform.OS === "android";

  return {
    isProduction,
    bluetoothEnabled,
    appEnv,
    isEASBuild,
    isRealBluetoothAvailable,
    buildProfile: extra.EAS_BUILD_PROFILE || "development",
  };
};

const {
  isProduction,
  bluetoothEnabled,
  appEnv,
  isEASBuild,
  isRealBluetoothAvailable,
  buildProfile,
} = getBuildEnvironment();

// ✅ Conditional Thermal Printer Import
let ThermalPrinter: any = null;
if (isRealBluetoothAvailable) {
  try {
    ThermalPrinter = require("react-native-thermal-receipt-printer");
    console.log("🔵 Thermal printer loaded - EAS Production Build");
  } catch (error) {
    console.warn("🟡 Thermal printer library not available");
  }
}

// ✅ Interface untuk Sales Order Data dengan FIELD BARU
interface SalesOrderData {
  // Basic Info
  kode_so: string;
  no_so: string;
  tgl_so: string;
  kode_sales: string;
  nama_sales: string;
  kode_cust: string;
  nama_cust: string;
  alamat: string;
  kota_kirim?: string;
  hp?: string;
  keterangan: string;
  status: string;

  // ✅ FIELD BARU: Payment & Tax Information
  kode_termin?: string;
  kode_kirim?: string;
  cara_kirim?: "KG" | "KP" | "AG" | "AP";
  ppn_percent: number;
  ppn_value: number;
  diskon_header: number;
  diskon_header_percent: number;
  uang_muka: number;
  subtotal: number;
  total: number;
  nilai_pajak: number;
  is_unscheduled: "Y" | "N";
  synced: "Y" | "N";
  sumber_data: "MOBILE" | "ERP";

  // Items dengan FIELD BARU
  items: Array<{
    kode_item: string;
    no_item: string;
    nama_item: string;
    diskripsi?: string;
    quantity: number;
    harga: number;
    subtotal: number;
    diskon_percent: number;
    diskon_value: number;
    total: number;
    satuan?: string;
    berat: number;
    franco: "Y" | "N";
    rowid: number;
  }>;

  // Company Info
  perusahaan: {
    nama: string;
    alamat: string;
    kota: string;
    telepon: string;
    email: string;
  };

  // ✅ SUMMARY CALCULATIONS
  summary?: {
    subtotal: number;
    diskon_detail: number;
    diskon_header: number;
    ppn: number;
    uang_muka: number;
    total: number;
  };
}

// ✅ Interface untuk Bluetooth Device
interface BluetoothDevice {
  id: string;
  name: string;
  mac?: string;
  type: string;
}

export default function PrintSalesOrder() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderId = params.id as string;
  const nomorSO = params.nomor_so as string;
  const namaCustomer = params.nama_customer as string;

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<SalesOrderData | null>(null);

  // ✅ State untuk Bluetooth
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>(
    []
  );
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const printRef = useRef<View>(null);

  // ✅ Bluetooth Device Scanning (sama seperti sebelumnya)
  const scanBluetoothDevices = async () => {
    if (!isRealBluetoothAvailable) {
      setScanning(true);
      setTimeout(() => {
        setBluetoothDevices([
          {
            id: "1",
            name: "Printer Thermal 58mm",
            type: "printer",
            mac: "00:11:22:33:44:55",
          },
          {
            id: "2",
            name: "BT Printer X1",
            type: "printer",
            mac: "66:77:88:99:AA:BB",
          },
        ]);
        setScanning(false);
      }, 2000);
      return;
    }

    if (!ThermalPrinter) {
      Alert.alert("Error", "Library printer tidak tersedia");
      return;
    }

    try {
      setScanning(true);
      const devices = await ThermalPrinter.getDeviceList();
      const formattedDevices: BluetoothDevice[] = devices.map(
        (device: any) => ({
          id: device.MAC,
          name: device.name,
          mac: device.MAC,
          type: "printer",
        })
      );
      setBluetoothDevices(formattedDevices);
    } catch (error: any) {
      console.error("❌ Scan error:", error);
      Alert.alert("Scan Gagal", "Tidak dapat memindai perangkat Bluetooth");
    } finally {
      setScanning(false);
    }
  };

  // ✅ Render Bluetooth Device Item (sama seperti sebelumnya)
  const renderBluetoothDevice = ({ item }: { item: BluetoothDevice }) => {
    const isConnected = connectedDevice?.id === item.id;

    const connectToDevice = async () => {
      if (!isRealBluetoothAvailable || !ThermalPrinter) {
        setConnectedDevice(item);
        setShowBluetoothModal(false);
        Alert.alert(
          "Simulation Mode",
          `Terhubung ke ${item.name} (Simulation)`
        );
        return;
      }

      try {
        setConnecting(true);
        await ThermalPrinter.connectDevice(item.mac!);
        setConnectedDevice(item);
        setShowBluetoothModal(false);
        Alert.alert("Berhasil", `Terhubung ke ${item.name}`);
      } catch (error: any) {
        console.error("❌ Connection failed:", error);
        Alert.alert("Gagal", `Tidak dapat terhubung ke ${item.name}`);
      } finally {
        setConnecting(false);
      }
    };

    return (
      <TouchableOpacity
        style={styles.deviceItem}
        onPress={connectToDevice}
        disabled={connecting}
      >
        <MaterialIcons
          name={isConnected ? "bluetooth-connected" : "bluetooth"}
          size={24}
          color={isConnected ? "#007bff" : "#666"}
        />
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceType}>
            {item.type} • {item.mac}
          </Text>
        </View>
        {connecting ? (
          <ActivityIndicator size="small" color="#007bff" />
        ) : (
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        )}
      </TouchableOpacity>
    );
  };

  // ✅ Disconnect Bluetooth (sama seperti sebelumnya)
  const disconnectBluetooth = async () => {
    if (connectedDevice && isRealBluetoothAvailable && ThermalPrinter) {
      try {
        await ThermalPrinter.disconnect();
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
    setConnectedDevice(null);
  };

  // ✅ Load sales order data dari API - DIPERBARUI untuk field baru
  const loadSalesOrderData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📦 Loading sales order data for:", orderId);

      // ✅ GUNAKAN getSoDetailCombined untuk data yang lengkap
      const res = await salesOrderAPI.getSoDetailCombined(orderId);

      if (res.success && res.data) {
        console.log("✅ Sales order data loaded successfully");
        const formattedData = mapApiDataToPrintFormat(res.data);
        setOrderData(formattedData);
      } else {
        throw new Error(res.message || "Gagal memuat data sales order");
      }
    } catch (err: any) {
      console.error("❌ Load error:", err);
      setError(err.message || "Gagal memuat data sales order");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Map API data ke format print - DIPERBARUI dengan field baru
  const mapApiDataToPrintFormat = (apiData: any): SalesOrderData => {
    const header = apiData.header || {};
    const items = apiData.items || [];
    const summary = apiData.summary;

    // ✅ Hitung summary jika tidak tersedia dari API
    const calculatedSubtotal = items.reduce((total: number, item: any) => {
      return total + (item.harga || 0) * (item.qty_std || item.quantity || 0);
    }, 0);

    const calculatedDiscountDetail = items.reduce(
      (total: number, item: any) => {
        return total + (item.diskon_value || 0);
      },
      0
    );

    const totalAfterDetailDiscount =
      calculatedSubtotal - calculatedDiscountDetail;

    const discountHeader =
      header.diskon_header ||
      (header.diskon_header_percent
        ? totalAfterDetailDiscount * (header.diskon_header_percent / 100)
        : 0);

    const subtotalAfterDiscount = totalAfterDetailDiscount - discountHeader;

    const ppnValue =
      header.ppn_value ||
      (header.ppn_percent
        ? subtotalAfterDiscount * (header.ppn_percent / 100)
        : 0);

    const calculatedTotal =
      subtotalAfterDiscount + ppnValue - (header.uang_muka || 0);

    return {
      // Basic Info
      kode_so: header.kode_so || orderId,
      no_so: header.no_so || header.kode_so || orderId,
      tgl_so: header.tgl_so || new Date().toISOString().split("T")[0],
      kode_sales: header.kode_sales || "",
      nama_sales: header.nama_sales || "",
      kode_cust: header.kode_cust || "",
      nama_cust: header.customer_name || header.nama_cust || namaCustomer || "",
      alamat: header.customer_address || header.alamat || "",
      kota_kirim: header.kota_kirim,
      hp: header.hp,
      keterangan: header.keterangan || "",
      status: header.status || "",

      // ✅ FIELD BARU: Payment & Tax Information
      kode_termin: header.kode_termin,
      kode_kirim: header.kode_kirim,
      cara_kirim: header.cara_kirim,
      ppn_percent: header.ppn_percent || 0,
      ppn_value: ppnValue,
      diskon_header: discountHeader,
      diskon_header_percent: header.diskon_header_percent || 0,
      uang_muka: header.uang_muka || 0,
      subtotal: header.subtotal || calculatedSubtotal,
      total: header.total || calculatedTotal,
      nilai_pajak: header.nilai_pajak || 0,
      is_unscheduled: header.is_unscheduled || "N",
      synced: header.synced || "N",
      sumber_data: header.sumber_data || "MOBILE",

      // Items dengan FIELD BARU
      items: items.map((item: any) => ({
        kode_item: item.kode_item,
        no_item: item.no_item || "",
        nama_item: item.nama_item,
        diskripsi: item.diskripsi,
        quantity: item.qty_std || item.quantity || 0,
        harga: item.harga || 0,
        subtotal: (item.harga || 0) * (item.qty_std || item.quantity || 0),
        diskon_percent: item.diskon_percent || 0,
        diskon_value: item.diskon_value || 0,
        total:
          item.total ||
          (item.harga || 0) * (item.qty_std || item.quantity || 0) -
            (item.diskon_value || 0),
        satuan: item.satuan || "pcs",
        berat: item.berat || 0,
        franco: item.franco || "N",
        rowid: item.rowid || 0,
      })),

      // Company Info
      perusahaan: {
        nama: "PT. BANGUN JAYA ABADI",
        alamat: "Jl. Industri No. 45, Kawasan SIER",
        kota: "Surabaya",
        telepon: "(031) 593-1234",
        email: "info@bangunjaya.com",
      },

      // ✅ SUMMARY CALCULATIONS
      summary: summary || {
        subtotal: calculatedSubtotal,
        diskon_detail: calculatedDiscountDetail,
        diskon_header: discountHeader,
        ppn: ppnValue,
        uang_muka: header.uang_muka || 0,
        total: calculatedTotal,
      },
    };
  };

  // ✅ Load data pada component mount
  useEffect(() => {
    if (orderId) {
      loadSalesOrderData();
    }
  }, [orderId]);

  // ✅ Utility functions
  const centerText = (text: string, width: number): string => {
    if (text.length >= width) return text;
    const padding = width - text.length;
    const leftPadding = Math.floor(padding / 2);
    return " ".repeat(leftPadding) + text;
  };

  const formatCurrencyCompact = (amount: number): string => {
    if (amount >= 1000000) {
      return `Rp${(amount / 1000000).toFixed(1)}JT`;
    } else if (amount >= 1000) {
      return `Rp${(amount / 1000).toFixed(0)}K`;
    }
    return `Rp${amount}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateShort = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // ✅ Generate print text - DIPERBARUI dengan field baru
  const generatePrintText = (): string => {
    if (!orderData) return "";

    const lines: string[] = [];

    // Company Header
    lines.push(centerText(orderData.perusahaan.nama, 32));
    lines.push(centerText(orderData.perusahaan.alamat, 32));
    lines.push(
      centerText(
        `${orderData.perusahaan.kota} - Telp: ${orderData.perusahaan.telepon}`,
        32
      )
    );
    lines.push("");

    // Document Title
    lines.push(centerText("SALES ORDER", 32));
    lines.push("=".repeat(32));

    // Customer Information
    lines.push("KEPADA:");
    lines.push(orderData.nama_cust);
    lines.push(orderData.alamat);
    if (orderData.kota_kirim) lines.push(orderData.kota_kirim);
    if (orderData.hp) lines.push(`Telp: ${orderData.hp}`);
    lines.push("");

    // Order Information dengan FIELD BARU
    lines.push("INFO ORDER:");
    lines.push(`No SO  : ${orderData.kode_so}`);
    lines.push(`Tanggal: ${formatDateShort(orderData.tgl_so)}`);
    lines.push(`Sales  : ${orderData.nama_sales}`);
    lines.push(`Status : ${orderData.status.toUpperCase()}`);

    // ✅ TAMBAHKAN FIELD BARU
    if (orderData.kode_termin) lines.push(`Termin : ${orderData.kode_termin}`);
    if (orderData.cara_kirim) lines.push(`Kirim  : ${orderData.cara_kirim}`);
    lines.push("");

    // Keterangan jika ada
    if (orderData.keterangan) {
      lines.push("KETERANGAN:");
      lines.push(orderData.keterangan);
      lines.push("");
    }

    // Table Header
    lines.push("-".repeat(42));
    lines.push("NO  ITEM              QTY   HARGA    SUBTOTAL");
    lines.push("-".repeat(42));

    // Table Rows
    orderData.items.forEach((item, index) => {
      const no = (index + 1).toString().padEnd(3);
      const itemName =
        item.nama_item.length > 14
          ? item.nama_item.substring(0, 14) + ".."
          : item.nama_item.padEnd(16);
      const qty = `${item.quantity}${
        item.satuan?.substring(0, 2) || ""
      }`.padEnd(5);
      const harga = formatCurrencyCompact(item.harga).padEnd(8);
      const subtotal = formatCurrencyCompact(item.subtotal);

      lines.push(`${no}${itemName}${qty}${harga}${subtotal}`);

      // ✅ TAMBAHKAN DISKON ITEM JIKA ADA
      if (item.diskon_value > 0) {
        const diskonText = `    Diskon: -${formatCurrencyCompact(
          item.diskon_value
        )}`;
        lines.push(diskonText.padEnd(42));
      }
    });

    lines.push("-".repeat(42));

    // ✅ SUMMARY DENGAN FIELD BARU
    lines.push("");
    lines.push("RINCIAN:");
    lines.push(
      `Subtotal         : ${formatCurrencyCompact(orderData.subtotal)}`
    );

    const diskonDetail = orderData.summary?.diskon_detail ?? 0;
    if (diskonDetail > 0) {
      lines.push(`Diskon Detail    : -${formatCurrencyCompact(diskonDetail)}`);
    }

    if (orderData.diskon_header > 0) {
      lines.push(
        `Diskon Header    : -${formatCurrencyCompact(orderData.diskon_header)}`
      );
    }

    if (orderData.ppn_value > 0) {
      lines.push(
        `PPN (${orderData.ppn_percent}%)     : +${formatCurrencyCompact(
          orderData.ppn_value
        )}`
      );
    }

    if (orderData.uang_muka > 0) {
      lines.push(
        `Uang Muka        : -${formatCurrencyCompact(orderData.uang_muka)}`
      );
    }

    lines.push("-".repeat(20));
    lines.push(
      centerText(`TOTAL: ${formatCurrencyCompact(orderData.total)}`, 32)
    );
    lines.push("");

    // Footer & Signature
    lines.push(centerText("HORMAT KAMI", 32));
    lines.push("");
    lines.push("");
    lines.push(centerText(orderData.perusahaan.nama, 32));
    lines.push("");
    lines.push(centerText("CUSTOMER", 32));
    lines.push("");
    lines.push("");
    lines.push("-".repeat(32));

    // Print info dengan sync status
    lines.push(
      centerText(`Printed: ${new Date().toLocaleDateString("id-ID")}`, 32)
    );
    lines.push(
      centerText(
        `Status: ${orderData.synced === "Y" ? "SYNCED" : "PENDING SYNC"}`,
        32
      )
    );
    lines.push("");
    lines.push("".padEnd(32, "="));

    return lines.join("\n");
  };

  // ✅ Print functions (tetap sama seperti sebelumnya)
  const printWithSimulation = async () => {
    if (!orderData) {
      throw new Error("Data order tidak tersedia");
    }

    const printText = generatePrintText();
    const filename = `SO-${orderData.kode_so}.txt`;

    try {
      const dir = (FileSystem as any).documentDirectory;
      const fileUri = `${dir}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, printText, {
        encoding: "base64",
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: `Print SO - ${orderData.kode_so}`,
          UTI: "public.plain-text",
        });

        Alert.alert(
          "File Siap Dicetak",
          `File ${filename} telah dibagikan. Buka dengan aplikasi printer thermal.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Text untuk Print",
          `Copy text berikut ke aplikasi printer:\n\n${printText.substring(
            0,
            200
          )}...`,
          [
            { text: "OK" },
            {
              text: "Copy Text",
              onPress: async () => {
                try {
                  const { default: Clipboard } = await import("expo-clipboard");
                  await Clipboard.setStringAsync(printText);
                  Alert.alert("Berhasil", "Text telah disalin ke clipboard");
                } catch (error) {
                  Alert.alert("Info", "Text siap untuk dicopy manual");
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Simulation print error:", error);
      throw new Error("Gagal membuat file untuk print: " + error.message);
    }
  };

  const printViaBluetooth = async () => {
    if (!orderData) {
      Alert.alert("Error", "Data order tidak tersedia");
      return;
    }

    try {
      setPrinting(true);

      if (isRealBluetoothAvailable) {
        await printWithRealBluetooth();
      } else {
        await printWithSimulation();
      }
    } catch (error: any) {
      console.error("❌ Print error:", error);
      Alert.alert(
        "Print Gagal",
        error.message || "Terjadi kesalahan saat mencetak",
        [
          { text: "OK" },
          {
            text: "Coba Export File",
            onPress: () => printWithSimulation(),
          },
        ]
      );
    } finally {
      setPrinting(false);
    }
  };

  const printWithRealBluetooth = async () => {
    if (!ThermalPrinter || !orderData) {
      throw new Error("Library printer thermal tidak tersedia");
    }

    try {
      await ThermalPrinter.init();
      const devices = await ThermalPrinter.getDeviceList();

      if (!devices || devices.length === 0) {
        throw new Error("Tidak ada printer Bluetooth yang terpair");
      }

      const targetDevice = devices[0];
      await ThermalPrinter.connectDevice(targetDevice.MAC);

      setConnectedDevice({
        id: targetDevice.MAC,
        name: targetDevice.name,
        mac: targetDevice.MAC,
        type: "printer",
      });

      // Gunakan text biasa untuk thermal printer
      const printText = generatePrintText();
      await ThermalPrinter.printText(printText, {
        encoding: "UTF-8",
        codepage: 0,
      });

      await ThermalPrinter.cutPaper();
      await ThermalPrinter.disconnect();

      Alert.alert(
        "Berhasil",
        `Sales Order berhasil dicetak ke ${targetDevice.name}!`
      );
    } catch (error: any) {
      console.error("❌ Real Bluetooth failed:", error);
      Alert.alert("Bluetooth Tidak Tersedia", "Menggunakan mode export file.", [
        { text: "OK" },
        { text: "Export File", onPress: () => printWithSimulation() },
      ]);
    }
  };

  // ✅ PDF Print dengan field baru
  const handlePrintPDF = async () => {
    if (!orderData) return;

    try {
      setPrinting(true);
      const html = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Print SO - ${orderData.kode_so}`,
        });
      }
    } catch (error: any) {
      Alert.alert("Error", "Gagal membuat PDF: " + error.message);
    } finally {
      setPrinting(false);
    }
  };

  // ✅ Generate PDF HTML dengan field baru
  const generatePDFHTML = () => {
    if (!orderData) return "";
    const diskonDetail =
      orderData.summary?.diskon_detail ??
      orderData.items.reduce(
        (total, item) => total + (item.diskon_value || 0),
        0
      );
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sales Order - ${orderData.kode_so}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .document-title { font-size: 18px; font-weight: bold; margin-top: 20px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { text-align: right; font-weight: bold; margin-top: 20px; font-size: 16px; }
          .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-approved { background: #d4edda; color: #155724; }
          .status-synced { background: #d1ecf1; color: #0c5460; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${orderData.perusahaan.nama}</div>
          <div>${orderData.perusahaan.alamat}</div>
          <div>${orderData.perusahaan.kota} - Telp: ${
      orderData.perusahaan.telepon
    }</div>
          <div class="document-title">SALES ORDER - ${orderData.kode_so}</div>
        </div>

        <div class="info-section">
          <div>
            <strong>Kepada:</strong><br>
            ${orderData.nama_cust}<br>
            ${orderData.alamat}<br>
            ${orderData.kota_kirim || ""}<br>
            ${orderData.hp ? `Telp: ${orderData.hp}` : ""}
          </div>
          <div>
            <strong>Info Order:</strong><br>
            Tanggal: ${formatDateShort(orderData.tgl_so)}<br>
            Sales: ${orderData.nama_sales}<br>
            Status: <span class="status-badge status-${
              orderData.status
            }">${orderData.status.toUpperCase()}</span><br>
            ${
              orderData.kode_termin
                ? `Termin: ${orderData.kode_termin}<br>`
                : ""
            }
            ${
              orderData.cara_kirim
                ? `Pengiriman: ${orderData.cara_kirim}<br>`
                : ""
            }
            Sync: <span class="status-badge ${
              orderData.synced === "Y" ? "status-synced" : "status-pending"
            }">${orderData.synced === "Y" ? "SYNCED" : "PENDING"}</span>
          </div>
        </div>

        ${
          orderData.keterangan
            ? `
        <div style="margin-bottom: 20px;">
          <strong>Keterangan:</strong><br>
          ${orderData.keterangan}
        </div>
        `
            : ""
        }

        <table class="table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Item</th>
              <th>Nama Item</th>
              <th>Qty</th>
              <th>Harga</th>
              <th>Diskon</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items
              .map(
                (item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.kode_item}</td>
                <td>${item.nama_item}</td>
                <td>${item.quantity} ${item.satuan}</td>
                <td>${formatCurrency(item.harga)}</td>
                <td>${
                  item.diskon_value > 0
                    ? `-${formatCurrency(item.diskon_value)}`
                    : "-"
                }</td>
                <td>${formatCurrency(item.subtotal)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(orderData.subtotal)}</span>
          </div>
           ${
             diskonDetail > 0
               ? `
        <div class="summary-row">
          <span>Diskon Detail:</span>
          <span>-${formatCurrency(diskonDetail)}</span>
        </div>
        `
               : ""
           }
          ${
            orderData.diskon_header > 0
              ? `
          <div class="summary-row">
            <span>Diskon Header:</span>
            <span>-${formatCurrency(orderData.diskon_header)}</span>
          </div>
          `
              : ""
          }
          ${
            orderData.ppn_value > 0
              ? `
          <div class="summary-row">
            <span>PPN (${orderData.ppn_percent}%):</span>
            <span>+${formatCurrency(orderData.ppn_value)}</span>
          </div>
          `
              : ""
          }
          ${
            orderData.uang_muka > 0
              ? `
          <div class="summary-row">
            <span>Uang Muka:</span>
            <span>-${formatCurrency(orderData.uang_muka)}</span>
          </div>
          `
              : ""
          }
          <div class="summary-row" style="border-top: 1px solid #ddd; padding-top: 10px; font-weight: bold;">
            <span>TOTAL:</span>
            <span>${formatCurrency(orderData.total)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <div style="display: inline-block; margin: 0 40px;">
            <div style="border-top: 1px solid #333; padding-top: 10px; width: 200px;">
              <strong>Hormat Kami</strong><br><br><br>
              ${orderData.perusahaan.nama}
            </div>
          </div>
          <div style="display: inline-block; margin: 0 40px;">
            <div style="border-top: 1px solid #333; padding-top: 10px; width: 200px;">
              <strong>Customer</strong><br><br><br>
              &nbsp;
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
          Dicetak pada: ${new Date().toLocaleString("id-ID")} |
          Sumber: ${orderData.sumber_data} |
          Sync: ${orderData.synced}
        </div>
      </body>
      </html>
    `;
  };

  // ✅ UI Components (Build Info, Connection Status, Action Bar) - tetap sama
  const EASBuildInfo = () => (
    <View
      style={[
        styles.buildInfo,
        isProduction
          ? styles.buildProduction
          : appEnv === "preview"
          ? styles.buildPreview
          : styles.buildDevelopment,
      ]}
    >
      <MaterialIcons
        name={isEASBuild ? "cloud" : "computer"}
        size={12}
        color="#fff"
      />
      <Text style={styles.buildText}>
        {isEASBuild ? `EAS ${buildProfile.toUpperCase()}` : "LOCAL DEV"}
      </Text>
      <View style={styles.buildBadges}>
        <View
          style={[
            styles.envBadge,
            isRealBluetoothAvailable
              ? styles.badgeSuccess
              : styles.badgeWarning,
          ]}
        >
          <Text style={styles.envBadgeText}>
            {isRealBluetoothAvailable ? "BLUETOOTH" : "SIMULATION"}
          </Text>
        </View>
        <Text style={styles.envText}>{appEnv.toUpperCase()}</Text>
      </View>
    </View>
  );

  // ... (Render Bluetooth device item dan komponen UI lainnya tetap sama)

  // ✅ Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Memuat data sales order...</Text>
      </SafeAreaView>
    );
  }

  // ✅ Error State
  if (error || !orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Print Sales Order" }} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorTitle}>
            {error ? "Gagal Memuat Data" : "Data Tidak Ditemukan"}
          </Text>
          <Text style={styles.errorText}>
            {error || "Data sales order tidak tersedia"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadSalesOrderData}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: `Print ${orderData.kode_so}`,
          headerBackTitle: "Kembali",
        }}
      />

      {/* EAS Build Info */}
      <EASBuildInfo />

      {/* Connection Status */}
      {connectedDevice && (
        <View style={styles.connectionStatus}>
          <MaterialIcons name="bluetooth-connected" size={16} color="#fff" />
          <Text style={styles.connectionText}>
            Terhubung: {connectedDevice.name}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.bluetoothButton]}
          onPress={printViaBluetooth}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="print" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isRealBluetoothAvailable
                  ? "Print Bluetooth"
                  : "Export untuk Print"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {connectedDevice ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={disconnectBluetooth}
            disabled={printing}
          >
            <MaterialIcons name="bluetooth-disabled" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Putus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.scanButton]}
            onPress={() => setShowBluetoothModal(true)}
            disabled={printing}
          >
            <MaterialIcons name="bluetooth" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {isRealBluetoothAvailable ? "Cari Printer" : "Simulate Printers"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.pdfButton]}
          onPress={handlePrintPDF}
          disabled={printing}
        >
          <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Print Preview - DIPERBARUI dengan field baru */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.printContainer}
      >
        <View ref={printRef} style={styles.printContent}>
          {/* Header Perusahaan */}
          <View style={styles.companyHeader}>
            <Text style={styles.companyName}>{orderData.perusahaan.nama}</Text>
            <Text style={styles.companyAddress}>
              {orderData.perusahaan.alamat}
            </Text>
            <Text style={styles.companyContact}>
              {orderData.perusahaan.kota} - Telp: {orderData.perusahaan.telepon}
            </Text>
            <View style={styles.documentTitle}>
              <Text style={styles.documentTitleText}>SALES ORDER</Text>
            </View>
          </View>

          {/* Informasi Customer & SO dengan FIELD BARU */}
          <View style={styles.infoSection}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Kepada:</Text>
              <Text style={styles.customerName}>{orderData.nama_cust}</Text>
              <Text style={styles.customerAddress}>{orderData.alamat}</Text>
              {orderData.kota_kirim && (
                <Text style={styles.customerAddress}>
                  {orderData.kota_kirim}
                </Text>
              )}
              {orderData.hp && (
                <Text style={styles.customerContact}>Telp: {orderData.hp}</Text>
              )}
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>No. SO:</Text>
                <Text style={styles.infoValue}>{orderData.kode_so}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tanggal:</Text>
                <Text style={styles.infoValue}>
                  {formatDateShort(orderData.tgl_so)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sales:</Text>
                <Text style={styles.infoValue}>{orderData.nama_sales}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[styles.infoValue, styles.statusText]}>
                  {orderData.status.toUpperCase()}
                </Text>
              </View>
              {/* ✅ TAMBAHKAN FIELD BARU */}
              {orderData.kode_termin && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Termin:</Text>
                  <Text style={styles.infoValue}>{orderData.kode_termin}</Text>
                </View>
              )}
              {orderData.cara_kirim && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pengiriman:</Text>
                  <Text style={styles.infoValue}>{orderData.cara_kirim}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sumber:</Text>
                <Text style={styles.infoValue}>{orderData.sumber_data}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sync:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    orderData.synced === "Y"
                      ? styles.syncedText
                      : styles.pendingText,
                  ]}
                >
                  {orderData.synced === "Y" ? "SYNCED" : "PENDING"}
                </Text>
              </View>
            </View>
          </View>

          {/* Keterangan */}
          {orderData.keterangan && (
            <View style={styles.remarksSection}>
              <Text style={styles.remarksLabel}>Keterangan:</Text>
              <Text style={styles.remarksText}>{orderData.keterangan}</Text>
            </View>
          )}

          {/* Tabel Items dengan FIELD BARU */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text
                style={[styles.tableCell, styles.tableHeaderCell, styles.colNo]}
              >
                No
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.colKode,
                ]}
              >
                Kode Item
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.colNama,
                ]}
              >
                Nama Item
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.colQty,
                ]}
              >
                Qty
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.colHarga,
                ]}
              >
                Harga
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.colDiskon,
                ]}
              >
                Diskon
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.colSubtotal,
                ]}
              >
                Subtotal
              </Text>
            </View>

            {orderData.items.map((item, index) => (
              <View key={`${item.kode_item}-${index}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colNo]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colKode]}>
                  {item.kode_item}
                </Text>
                <Text style={[styles.tableCell, styles.colNama]}>
                  {item.nama_item}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.quantity} {item.satuan}
                </Text>
                <Text style={[styles.tableCell, styles.colHarga]}>
                  {formatCurrency(item.harga)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colDiskon,
                    styles.discountText,
                  ]}
                >
                  {item.diskon_value > 0
                    ? `-${formatCurrency(item.diskon_value)}`
                    : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colSubtotal]}>
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
            ))}
          </View>

          {/* ✅ SUMMARY DENGAN FIELD BARU */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Rincian Pembayaran</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(orderData.subtotal)}
              </Text>
            </View>

            {(orderData.summary?.diskon_detail ??
              orderData.items.reduce(
                (total, item) => total + (item.diskon_value || 0),
                0
              )) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diskon Detail:</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -
                  {formatCurrency(
                    orderData.summary?.diskon_detail ??
                      orderData.items.reduce(
                        (total, item) => total + (item.diskon_value || 0),
                        0
                      )
                  )}
                </Text>
              </View>
            )}

            {orderData.diskon_header > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Diskon Header{" "}
                  {orderData.diskon_header_percent > 0
                    ? `(${orderData.diskon_header_percent}%)`
                    : ""}
                  :
                </Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -{formatCurrency(orderData.diskon_header)}
                </Text>
              </View>
            )}

            {orderData.ppn_value > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  PPN ({orderData.ppn_percent}%):
                </Text>
                <Text style={styles.summaryValue}>
                  +{formatCurrency(orderData.ppn_value)}
                </Text>
              </View>
            )}

            {orderData.uang_muka > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Uang Muka:</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -{formatCurrency(orderData.uang_muka)}
                </Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(orderData.total)}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.printFooter}>
            <Text style={styles.printFooterText}>
              Dicetak pada: {new Date().toLocaleString("id-ID")} | Sumber:{" "}
              {orderData.sumber_data} | Sync: {orderData.synced}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bluetooth Devices Modal (tetap sama) */}
      <Modal
        visible={showBluetoothModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onShow={scanBluetoothDevices}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {isRealBluetoothAvailable
                  ? "Bluetooth Printers"
                  : "Simulated Printers"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isRealBluetoothAvailable
                  ? "Printer yang sudah terpair"
                  : "Development simulation mode"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowBluetoothModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={scanBluetoothDevices}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="refresh" size={20} color="#fff" />
              )}
              <Text style={styles.scanButtonText}>
                {scanning ? "Memindai..." : "Scan Ulang"}
              </Text>
            </TouchableOpacity>
          </View>

          {bluetoothDevices.length === 0 ? (
            <View style={styles.emptyDevices}>
              <MaterialIcons
                name={scanning ? "bluetooth-searching" : "bluetooth-disabled"}
                size={48}
                color="#ccc"
              />
              <Text style={styles.emptyDevicesText}>
                {scanning
                  ? "Mencari printer..."
                  : "Tidak ada printer ditemukan"}
              </Text>
              <Text style={styles.emptyDevicesSubtext}>
                {isRealBluetoothAvailable
                  ? "Pastikan printer dalam mode pairing"
                  : "Simulation mode - Printer akan muncul dalam beberapa detik"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={bluetoothDevices}
              renderItem={renderBluetoothDevice}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.devicesList}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ Styles - DITAMBAHKAN style untuk field baru
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
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
    padding: 20,
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
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buildInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  buildProduction: {
    backgroundColor: "#28a745",
  },
  buildPreview: {
    backgroundColor: "#6f42c1",
  },
  buildDevelopment: {
    backgroundColor: "#ff9800",
  },
  buildText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  buildBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  envBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeSuccess: {
    backgroundColor: "#155724",
  },
  badgeWarning: {
    backgroundColor: "#856404",
  },
  envBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  envText: {
    color: "#fff",
    fontSize: 9,
    opacity: 0.8,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  connectionText: {
    color: "#fff",
    fontWeight: "600",
    flex: 1,
  },
  actionBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  bluetoothButton: {
    backgroundColor: "#007bff",
    flex: 1.5,
  },
  scanButton: {
    backgroundColor: "#6f42c1",
  },
  pdfButton: {
    backgroundColor: "#dc3545",
  },
  disconnectButton: {
    backgroundColor: "#dc3545",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  printContainer: {
    padding: 16,
  },
  printContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyHeader: {
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 20,
    marginBottom: 20,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  documentTitle: {
    marginTop: 10,
  },
  documentTitleText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontWeight: "bold",
    marginBottom: 8,
    fontSize: 14,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  customerContact: {
    fontSize: 12,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
  },
  statusText: {
    fontWeight: "600",
    color: "#28a745",
  },
  syncedText: {
    color: "#28a745",
    fontWeight: "600",
  },
  pendingText: {
    color: "#ff9800",
    fontWeight: "600",
  },
  remarksSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  remarksLabel: {
    fontWeight: "bold",
    marginBottom: 4,
    fontSize: 14,
  },
  remarksText: {
    fontSize: 12,
    color: "#666",
  },
  table: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
  },
  tableHeaderCell: {
    fontWeight: "bold",
  },
  colNo: {
    width: "8%",
    textAlign: "center",
  },
  colKode: {
    width: "12%",
  },
  colNama: {
    width: "25%",
  },
  colQty: {
    width: "10%",
    textAlign: "center",
  },
  colHarga: {
    width: "15%",
    textAlign: "right",
  },
  colDiskon: {
    width: "12%",
    textAlign: "right",
  },
  colSubtotal: {
    width: "18%",
    textAlign: "right",
  },
  discountText: {
    color: "#F44336",
  },
  // ✅ STYLE BARU untuk Summary Section
  summarySection: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28a745",
  },
  printFooter: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  printFooterText: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  // Modal styles (tetap sama)
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
  modalSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalActions: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  emptyDevices: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyDevicesText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDevicesSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  devicesList: {
    padding: 16,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
