// app/penerimaan-piutang/print/[id].tsx
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
import { ppiAPI } from "@/api/services";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";

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

// ✅ Interface untuk Penerimaan Piutang Data berdasarkan response API
interface PenerimaanPiutangData {
  // Basic Info dari header
  kode_ppi: string;
  no_ppi: string;
  tanggal_ppi: string;
  kode_cust: string;
  nama_cust: string;
  kode_sales: string;
  nama_sales: string;
  jumlah_bayar: number;
  cara_bayar: string;
  no_giro: string;
  kode_akun_debet: string;
  nama_akun: string;
  kode_akun_piutang: string;
  nama_akun_piutang: string;
  status: string;
  sumber_data: string;

  // Details (faktur yang dibayar)
  details: Array<{
    kode_fj: string;
    no_fj: string;
    tgl_fj: string;
    netto_mu: number;
    lunas_mu: number;
    bayar_mu: number;
    kode_mu: string;
    sisa_hutang: number;
    sisa_setelah_bayar: number;
  }>;

  // Payments (detail pembayaran)
  payments: Array<{
    metode_bayar: string;
    jumlah_bayar: number;
    tgl_bayar: string;
    no_giro: string;
    akun_pembayaran: string;
    tgl_jatuh_tempo: string;
    keterangan: string;
  }>;

  // Summary
  summary: {
    jumlah_faktur: number;
    total_outstanding_faktur: number;
    jumlah_bayar: number;
    sisa_outstanding_faktur: number;
    sumber_data: string;
  };

  // Company Info
  perusahaan: {
    nama: string;
    alamat: string;
    kota: string;
    telepon: string;
    email: string;
  };
}

// ✅ Interface untuk Bluetooth Device
interface BluetoothDevice {
  id: string;
  name: string;
  mac?: string;
  type: string;
}

export default function PrintPenerimaanPiutang() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const ppiId = params.id as string;
  const nomorPPI = params.nomor_ppi as string;
  const namaCustomer = params.nama_customer as string;

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ppiData, setPpiData] = useState<PenerimaanPiutangData | null>(null);

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

  // ✅ Bluetooth Device Scanning
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

  // ✅ Render Bluetooth Device Item
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

  // ✅ Disconnect Bluetooth
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

  // ✅ Load penerimaan piutang data dari API
  const loadPenerimaanPiutangData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("💰 Loading penerimaan piutang data for:", ppiId);

      // ✅ GUNAKAN getMasterDetailCombined
      const res = await ppiAPI.getPPIDetail(ppiId);

      if (res.success && res.data) {
        console.log("✅ Penerimaan piutang data loaded successfully");
        const formattedData = mapApiDataToPrintFormat(res.data);
        setPpiData(formattedData);
      } else {
        throw new Error(res.message || "Gagal memuat data penerimaan piutang");
      }
    } catch (err: any) {
      console.error("❌ Load error:", err);
      setError(err.message || "Gagal memuat data penerimaan piutang");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Map API data ke format print berdasarkan response getMasterDetailCombined
  const mapApiDataToPrintFormat = (apiData: any): PenerimaanPiutangData => {
    const header = apiData.header || {};
    const details = apiData.details || [];
    const payments = apiData.payments || [];
    const summary = apiData.summary || {};

    return {
      // Basic Info dari header
      kode_ppi: header.kode_ppi || ppiId,
      no_ppi: header.no_ppi || header.kode_ppi || ppiId,
      tanggal_ppi: header.tanggal_ppi || new Date().toISOString(),
      kode_cust: header.kode_cust || "",
      nama_cust: header.nama_cust || namaCustomer || "",
      kode_sales: header.kode_sales || "",
      nama_sales: header.nama_sales || "",
      jumlah_bayar: header.jumlah_bayar || 0,
      cara_bayar: header.cara_bayar || "",
      no_giro: header.no_giro || "",
      kode_akun_debet: header.kode_akun_debet || "",
      nama_akun: header.nama_akun || "",
      kode_akun_piutang: header.kode_akun_piutang || "",
      nama_akun_piutang: header.nama_akun_piutang || "",
      status: header.status || "",
      sumber_data: header.sumber_data || "ERP",

      // Details (faktur yang dibayar)
      details: details.map((detail: any) => ({
        kode_fj: detail.kode_fj || "",
        no_fj: detail.no_fj || "",
        tgl_fj: detail.tgl_fj || "",
        netto_mu: detail.netto_mu || 0,
        lunas_mu: detail.lunas_mu || 0,
        bayar_mu: detail.bayar_mu || 0,
        kode_mu: detail.kode_mu || "IDR",
        sisa_hutang: detail.sisa_hutang || 0,
        sisa_setelah_bayar: detail.sisa_setelah_bayar || 0,
      })),

      // Payments (detail pembayaran)
      payments: payments.map((payment: any) => ({
        metode_bayar: payment.metode_bayar || "",
        jumlah_bayar: payment.jumlah_bayar || 0,
        tgl_bayar: payment.tgl_bayar || "",
        no_giro: payment.no_giro || "",
        akun_pembayaran: payment.akun_pembayaran || "",
        tgl_jatuh_tempo: payment.tgl_jatuh_tempo || "",
        keterangan: payment.keterangan || "",
      })),

      // Summary
      summary: {
        jumlah_faktur: summary.jumlah_faktur || 0,
        total_outstanding_faktur: summary.total_outstanding_faktur || 0,
        jumlah_bayar: summary.jumlah_bayar || 0,
        sisa_outstanding_faktur: summary.sisa_outstanding_faktur || 0,
        sumber_data: summary.sumber_data || "ERP",
      },

      // Company Info
      perusahaan: {
        nama: header.nama_cust,
        alamat: header.alamat,
        kota: header.kota,
        telepon: header.telepon,
        email: header.email ||  "",
      },
    };
  };

  // ✅ Load data pada component mount
  useEffect(() => {
    if (ppiId) {
      loadPenerimaanPiutangData();
    }
  }, [ppiId]);

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

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getCaraBayarText = (caraBayar: string): string => {
    const caraBayarMap: { [key: string]: string } = {
      tunai: "TUNAI",
      transfer: "TRANSFER",
      cek: "CEK",
      giro: "GIRO",
    };
    return caraBayarMap[caraBayar.toLowerCase()] || caraBayar.toUpperCase();
  };

  // ✅ Generate print text untuk thermal printer
  const generatePrintText = (): string => {
    if (!ppiData) return "";

    const lines: string[] = [];

    // Company Header
    lines.push(centerText(ppiData.perusahaan.nama, 32));
    lines.push(centerText(ppiData.perusahaan.alamat, 32));
    lines.push(
      centerText(
        `${ppiData.perusahaan.kota} - Telp: ${ppiData.perusahaan.telepon}`,
        32
      )
    );
    lines.push("");

    // Document Title
    lines.push(centerText("PENERIMAAN PIUTANG", 32));
    lines.push("=".repeat(32));

    // Customer Information
    lines.push("KEPADA:");
    lines.push(ppiData.nama_cust);
    lines.push(`Sales: ${ppiData.nama_sales}`);
    lines.push("");

    // Payment Information
    lines.push("INFO PEMBAYARAN:");
    lines.push(`No PPI  : ${ppiData.kode_ppi}`);
    lines.push(`Tanggal : ${formatDateShort(ppiData.tanggal_ppi)}`);
    lines.push(`Jenis   : ${getCaraBayarText(ppiData.cara_bayar)}`);
    lines.push(`Status  : ${ppiData.status.toUpperCase()}`);
    lines.push(`Akun    : ${ppiData.nama_akun}`);

    if (ppiData.no_giro && ppiData.no_giro !== "-") {
      lines.push(`No Giro : ${ppiData.no_giro}`);
    }
    lines.push("");

    // Detail Faktur
    if (ppiData.details.length > 0) {
      lines.push("DETAIL FAKTUR:");
      lines.push("-".repeat(32));
      ppiData.details.forEach((detail, index) => {
        lines.push(`${index + 1}. ${detail.no_fj}`);
        lines.push(`   Tgl: ${formatDateShort(detail.tgl_fj)}`);
        lines.push(`   Total: ${formatCurrencyCompact(detail.netto_mu)}`);
        lines.push(`   Bayar: ${formatCurrencyCompact(detail.bayar_mu)}`);
        lines.push(
          `   Sisa: ${formatCurrencyCompact(detail.sisa_setelah_bayar)}`
        );
      });
      lines.push("-".repeat(32));
      lines.push("");
    }

    // Detail Pembayaran
    if (ppiData.payments.length > 0) {
      lines.push("RINCIAN PEMBAYARAN:");
      lines.push("-".repeat(32));
      ppiData.payments.forEach((payment, index) => {
        lines.push(`${index + 1}. ${getCaraBayarText(payment.metode_bayar)}`);
        lines.push(`   Jumlah: ${formatCurrencyCompact(payment.jumlah_bayar)}`);
        lines.push(`   Tanggal: ${formatDateShort(payment.tgl_bayar)}`);
        if (payment.keterangan && payment.keterangan !== "-") {
          lines.push(`   Ket: ${payment.keterangan}`);
        }
      });
      lines.push("-".repeat(32));
      lines.push("");
    }

    // Summary
    lines.push("SUMMARY:");
    lines.push("-".repeat(32));
    lines.push(`Jml Faktur    : ${ppiData.summary.jumlah_faktur}`);
    lines.push(
      `Outstanding   : ${formatCurrencyCompact(
        ppiData.summary.total_outstanding_faktur
      )}`
    );
    lines.push(
      `Total Bayar   : ${formatCurrencyCompact(ppiData.summary.jumlah_bayar)}`
    );
    lines.push(
      `Sisa Outstd   : ${formatCurrencyCompact(
        ppiData.summary.sisa_outstanding_faktur
      )}`
    );
    lines.push("");

    // Footer & Signature
    lines.push(centerText("BUKTI PEMBAYARAN", 32));
    lines.push("");
    lines.push("");
    lines.push(centerText("DIKELUARKAN OLEH", 32));
    lines.push("");
    lines.push("");
    lines.push(centerText("DITERIMA OLEH", 32));
    lines.push("");
    lines.push("");
    lines.push("-".repeat(32));

    // Print info dengan sync status
    lines.push(
      centerText(`Printed: ${new Date().toLocaleDateString("id-ID")}`, 32)
    );
    lines.push(centerText(`Sumber: ${ppiData.sumber_data}`, 32));
    lines.push("");
    lines.push("".padEnd(32, "="));

    return lines.join("\n");
  };

  // ✅ Print functions
  const printWithSimulation = async () => {
    if (!ppiData) {
      throw new Error("Data penerimaan piutang tidak tersedia");
    }

    const printText = generatePrintText();
    const filename = `PPI-${ppiData.kode_ppi}.txt`;

    try {
      const dir = (FileSystem as any).documentDirectory;
      const fileUri = `${dir}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, printText, {
        encoding: "base64",
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: `Print PPI - ${ppiData.kode_ppi}`,
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
    if (!ppiData) {
      Alert.alert("Error", "Data penerimaan piutang tidak tersedia");
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
    if (!ThermalPrinter || !ppiData) {
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
        `Penerimaan Piutang berhasil dicetak ke ${targetDevice.name}!`
      );
    } catch (error: any) {
      console.error("❌ Real Bluetooth failed:", error);
      Alert.alert("Bluetooth Tidak Tersedia", "Menggunakan mode export file.", [
        { text: "OK" },
        { text: "Export File", onPress: () => printWithSimulation() },
      ]);
    }
  };

  // ✅ PDF Print
  const handlePrintPDF = async () => {
    if (!ppiData) return;

    try {
      setPrinting(true);
      const html = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Print PPI - ${ppiData.kode_ppi}`,
        });
      }
    } catch (error: any) {
      Alert.alert("Error", "Gagal membuat PDF: " + error.message);
    } finally {
      setPrinting(false);
    }
  };

  // ✅ Generate PDF HTML
  const generatePDFHTML = () => {
    if (!ppiData) return "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Penerimaan Piutang - ${ppiData.kode_ppi}</title>
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
          .payment-info { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${ppiData.perusahaan.nama}</div>
          <div>${ppiData.perusahaan.alamat}</div>
          <div>${ppiData.perusahaan.kota} - Telp: ${
      ppiData.perusahaan.telepon
    }</div>
          <div class="document-title">PENERIMAAN PIUTANG - ${
            ppiData.kode_ppi
          }</div>
        </div>

        <div class="info-section">
          <div>
            <strong>Kepada:</strong><br>
            ${ppiData.nama_cust}<br>
            Sales: ${ppiData.nama_sales}
          </div>
          <div>
            <strong>Info Pembayaran:</strong><br>
            Tanggal: ${formatDateTime(ppiData.tanggal_ppi)}<br>
            Jenis: ${getCaraBayarText(ppiData.cara_bayar)}<br>
            Status: <span class="status-badge status-${ppiData.status.toLowerCase()}">${ppiData.status.toUpperCase()}</span><br>
            Akun: ${ppiData.nama_akun}<br>
            ${
              ppiData.no_giro && ppiData.no_giro !== "-"
                ? `No Giro: ${ppiData.no_giro}<br>`
                : ""
            }
            Sumber: ${ppiData.sumber_data}
          </div>
        </div>

        ${
          ppiData.details.length > 0
            ? `
        <div style="margin-bottom: 20px;">
          <strong>Detail Faktur:</strong>
          <table class="table">
            <thead>
              <tr>
                <th>No Faktur</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th>Bayar</th>
                <th>Sisa</th>
              </tr>
            </thead>
            <tbody>
              ${ppiData.details
                .map(
                  (detail) => `
                <tr>
                  <td>${detail.no_fj}</td>
                  <td>${formatDateShort(detail.tgl_fj)}</td>
                  <td>${formatCurrency(detail.netto_mu)}</td>
                  <td>${formatCurrency(detail.bayar_mu)}</td>
                  <td>${formatCurrency(detail.sisa_setelah_bayar)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        ${
          ppiData.payments.length > 0
            ? `
        <div style="margin-bottom: 20px;">
          <strong>Rincian Pembayaran:</strong>
          <table class="table">
            <thead>
              <tr>
                <th>Metode</th>
                <th>Jumlah</th>
                <th>Tanggal</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${ppiData.payments
                .map(
                  (payment) => `
                <tr>
                  <td>${getCaraBayarText(payment.metode_bayar)}</td>
                  <td>${formatCurrency(payment.jumlah_bayar)}</td>
                  <td>${formatDateShort(payment.tgl_bayar)}</td>
                  <td>${payment.keterangan || "-"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        <div class="payment-info">
          <strong>Summary:</strong>
          <div class="summary">
            <div class="summary-row">
              <span>Jumlah Faktur:</span>
              <span>${ppiData.summary.jumlah_faktur}</span>
            </div>
            <div class="summary-row">
              <span>Total Outstanding:</span>
              <span>${formatCurrency(
                ppiData.summary.total_outstanding_faktur
              )}</span>
            </div>
            <div class="summary-row">
              <span>Total Bayar:</span>
              <span>${formatCurrency(ppiData.summary.jumlah_bayar)}</span>
            </div>
            <div class="summary-row" style="border-top: 1px solid #ddd; padding-top: 10px; font-weight: bold;">
              <span>Sisa Outstanding:</span>
              <span>${formatCurrency(
                ppiData.summary.sisa_outstanding_faktur
              )}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <div style="display: inline-block; margin: 0 40px;">
            <div style="border-top: 1px solid #333; padding-top: 10px; width: 200px;">
              <strong>Dikeluarkan Oleh</strong><br><br><br>
              ${ppiData.perusahaan.nama}
            </div>
          </div>
          <div style="display: inline-block; margin: 0 40px;">
            <div style="border-top: 1px solid #333; padding-top: 10px; width: 200px;">
              <strong>Diterima Oleh</strong><br><br><br>
              &nbsp;
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
          Dicetak pada: ${new Date().toLocaleString("id-ID")} |
          Sumber: ${ppiData.sumber_data}
        </div>
      </body>
      </html>
    `;
  };

  // ✅ UI Components
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

  // ✅ Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>
          Memuat data penerimaan piutang...
        </Text>
      </SafeAreaView>
    );
  }

  // ✅ Error State
  if (error || !ppiData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: "Print Penerimaan Piutang" }} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorTitle}>
            {error ? "Gagal Memuat Data" : "Data Tidak Ditemukan"}
          </Text>
          <Text style={styles.errorText}>
            {error || "Data penerimaan piutang tidak tersedia"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadPenerimaanPiutangData}
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
          title: `Print ${ppiData.kode_ppi}`,
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

      {/* Print Preview */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.printContainer}
      >
        <View ref={printRef} style={styles.printContent}>
          {/* Header Perusahaan */}
          <View style={styles.companyHeader}>
            <Text style={styles.companyName}>{ppiData.perusahaan.nama}</Text>
            <Text style={styles.companyAddress}>
              {ppiData.perusahaan.alamat}
            </Text>
            <Text style={styles.companyContact}>
              {ppiData.perusahaan.kota} - Telp: {ppiData.perusahaan.telepon}
            </Text>
            <View style={styles.documentTitle}>
              <Text style={styles.documentTitleText}>PENERIMAAN PIUTANG</Text>
            </View>
          </View>

          {/* Informasi Customer & PPI */}
          <View style={styles.infoSection}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Kepada:</Text>
              <Text style={styles.customerName}>{ppiData.nama_cust}</Text>
              <Text style={styles.customerContact}>
                Sales: {ppiData.nama_sales}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>No. PPI:</Text>
                <Text style={styles.infoValue}>{ppiData.kode_ppi}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tanggal:</Text>
                <Text style={styles.infoValue}>
                  {formatDateTime(ppiData.tanggal_ppi)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Jenis Bayar:</Text>
                <Text style={styles.infoValue}>
                  {getCaraBayarText(ppiData.cara_bayar)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[styles.infoValue, styles.statusText]}>
                  {ppiData.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Akun:</Text>
                <Text style={styles.infoValue}>{ppiData.nama_akun}</Text>
              </View>
              {ppiData.no_giro && ppiData.no_giro !== "-" && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>No Giro:</Text>
                  <Text style={styles.infoValue}>{ppiData.no_giro}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sumber:</Text>
                <Text style={styles.infoValue}>{ppiData.sumber_data}</Text>
              </View>
            </View>
          </View>

          {/* Detail Faktur */}
          {ppiData.details.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Detail Faktur</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colNo,
                    ]}
                  >
                    No
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colFj,
                    ]}
                  >
                    No Faktur
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colTgl,
                    ]}
                  >
                    Tanggal
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colTotal,
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colBayar,
                    ]}
                  >
                    Bayar
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colSisa,
                    ]}
                  >
                    Sisa
                  </Text>
                </View>

                {ppiData.details.map((detail, index) => (
                  <View key={detail.kode_fj} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colNo]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.tableCell, styles.colFj]}>
                      {detail.no_fj}
                    </Text>
                    <Text style={[styles.tableCell, styles.colTgl]}>
                      {formatDateShort(detail.tgl_fj)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colTotal]}>
                      {formatCurrency(detail.netto_mu)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colBayar]}>
                      {formatCurrency(detail.bayar_mu)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colSisa]}>
                      {formatCurrency(detail.sisa_setelah_bayar)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Detail Pembayaran */}
          {ppiData.payments.length > 0 && (
            <View style={styles.paymentsSection}>
              <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colNo,
                    ]}
                  >
                    No
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colMetode,
                    ]}
                  >
                    Metode
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colJumlah,
                    ]}
                  >
                    Jumlah
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colTgl,
                    ]}
                  >
                    Tanggal
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      styles.colKet,
                    ]}
                  >
                    Keterangan
                  </Text>
                </View>

                {ppiData.payments.map((payment, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.colNo]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.tableCell, styles.colMetode]}>
                      {getCaraBayarText(payment.metode_bayar)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colJumlah]}>
                      {formatCurrency(payment.jumlah_bayar)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colTgl]}>
                      {formatDateShort(payment.tgl_bayar)}
                    </Text>
                    <Text style={[styles.tableCell, styles.colKet]}>
                      {payment.keterangan || "-"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jumlah Faktur:</Text>
                <Text style={styles.summaryValue}>
                  {ppiData.summary.jumlah_faktur}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Outstanding:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(ppiData.summary.total_outstanding_faktur)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Bayar:</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(ppiData.summary.jumlah_bayar)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Sisa Outstanding:</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(ppiData.summary.sisa_outstanding_faktur)}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.printFooter}>
            <Text style={styles.printFooterText}>
              Dicetak pada: {new Date().toLocaleString("id-ID")} | Sumber:{" "}
              {ppiData.sumber_data}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bluetooth Devices Modal */}
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

// ✅ Styles (sama seperti sebelumnya, hanya menambahkan style untuk kolom baru)
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
  detailsSection: {
    marginBottom: 20,
  },
  paymentsSection: {
    marginBottom: 20,
  },
  summarySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
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
  // Kolom untuk detail faktur
  colNo: {
    width: "8%",
    textAlign: "center",
  },
  colFj: {
    width: "20%",
  },
  colTgl: {
    width: "15%",
  },
  colTotal: {
    width: "19%",
    textAlign: "right",
  },
  colBayar: {
    width: "19%",
    textAlign: "right",
  },
  colSisa: {
    width: "19%",
    textAlign: "right",
  },
  // Kolom untuk pembayaran
  colMetode: {
    width: "15%",
  },
  colJumlah: {
    width: "20%",
    textAlign: "right",
  },
  colKet: {
    width: "30%",
  },
  summaryContent: {
    backgroundColor: "#e8f5e8",
    padding: 16,
    borderRadius: 6,
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
  // Modal styles
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
