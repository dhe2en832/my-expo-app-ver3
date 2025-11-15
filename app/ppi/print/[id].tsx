// app/penerimaan-piutang/print/[id].tsx
import React, { useEffect, useRef, useState } from "react";
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
  Platform,
  SafeAreaView,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { dataUmumAPI, ppiAPI } from "@/api/services";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { Perusahaan } from "@/api/interface";

// ================== Environment Configuration ==================
const getBuildEnvironment = () => {
  const manifest = Constants.expoConfig;
  const extra = (manifest && manifest.extra) || {};
  const isProduction = String(extra.IS_PRODUCTION) === "true";
  const bluetoothEnabled = String(extra.BLUETOOTH_ENABLED) === "true";
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

// ================== Try import bluetooth-escpos library (hybrid) ==================
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;
let bluetoothLibAvailable = false;
try {
  const lib = require("@ccdilan/react-native-bluetooth-escpos-printer");
  BluetoothManager =
    lib?.BluetoothManager || lib?.default?.BluetoothManager || lib;
  BluetoothEscposPrinter =
    lib?.BluetoothEscposPrinter || lib?.default?.BluetoothEscposPrinter || lib;
  bluetoothLibAvailable = !!BluetoothManager && !!BluetoothEscposPrinter;
  console.log("🔵 bluetooth-escpos library loaded", { bluetoothLibAvailable });
} catch (err) {
  console.warn(
    "🟡 bluetooth-escpos library not available - simulation mode",
    err
  );
  BluetoothManager = null;
  BluetoothEscposPrinter = null;
  bluetoothLibAvailable = false;
}

const isBluetoothSupported =
  bluetoothLibAvailable &&
  Platform.OS === "android" &&
  isRealBluetoothAvailable;

// ================== Interfaces ==================
interface PenerimaanPiutangData {
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
  status: string;
  sumber_data: string;
  details: Array<{
    no_fj: string;
    tgl_fj: string;
    netto_mu: number;
    bayar_mu: number;
    sisa_setelah_bayar: number;
  }>;
  payments: Array<{
    metode_bayar: string;
    jumlah_bayar: number;
    tgl_bayar: string;
    keterangan: string;
  }>;
  summary: {
    jumlah_faktur: number;
    total_outstanding_faktur: number;
    jumlah_bayar: number;
    sisa_outstanding_faktur: number;
  };
  perusahaan: {
    nama: string;
    alamat: string;
    kota: string;
    telepon: string;
    email: string;
  };
}

interface BluetoothDevice {
  id: string;
  name: string;
  mac?: string;
  type: string;
}

// ================== Component ==================
export default function PrintPenerimaanPiutang() {
  const params = useLocalSearchParams();
  const ppiId = (params.id as string) || "";
  const nomorPPI = (params.nomor_ppi as string) || "";
  const namaCustomer = (params.nama_customer as string) || "";
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ppiData, setPpiData] = useState<PenerimaanPiutangData | null>(null);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>(
    []
  );
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<View>(null);
  const [infoPerusahaan, setInfoPerusahaan] = useState<any>({});

  const loadDataPerusahaan = async () => {
    try {
      const res = await dataUmumAPI.getInfoPerusahaan();
      // console.log("🔥 API Perusahaan Response:", res);
      // console.log("🔥 res.data:", res.data);

      if (res.success && res.data) {
        setInfoPerusahaan(res.data);
        return res.data;
      }
      return [];
    } catch (err: any) {
      console.error("Error loading info perusahaan:", err);
    }
  };

  useEffect(() => {
    console.log("Build flags", {
      isProduction,
      bluetoothEnabled,
      isEASBuild,
      isRealBluetoothAvailable,
      bluetoothLibAvailable,
      isBluetoothSupported,
    });
    if (BluetoothManager && BluetoothManager.isBluetoothEnabled) {
      BluetoothManager.isBluetoothEnabled()
        .then((enabled: any) => console.log("Bluetooth Enabled ->", enabled))
        .catch((e: any) => console.warn("isBluetoothEnabled err", e));
    }
  }, []);

  // ================== Load PPI Data ==================
  useEffect(() => {
    if (ppiId) {
      loadPenerimaanPiutangData();
    }
  }, [ppiId]);

  const loadPenerimaanPiutangData = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadDataPerusahaan();
      const res = await ppiAPI.getPPIDetail(ppiId);
      if (res.success && res.data) {
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

  const mapApiDataToPrintFormat = (apiData: any): PenerimaanPiutangData => {
    const header = apiData.header || {};
    const details = apiData.details || [];
    const payments = apiData.payments || [];
    const summary = apiData.summary || {};
    const perusahaanInfo = infoPerusahaan?.[0] || {};
    // console.log("perusahaanInfo ", perusahaanInfo);
    const perusahaan = {
      nama: perusahaanInfo.nama_prsh?.trim()
        ? perusahaanInfo.nama_prsh
        : perusahaanInfo.nama_divisi?.trim()
        ? perusahaanInfo.nama_divisi
        : "-",
      alamat:
        perusahaanInfo.alamat1?.trim() ||
        perusahaanInfo.alamat2?.trim() ||
        perusahaanInfo.alamat3?.trim() ||
        "-",
      kota: "-",
      telepon: perusahaanInfo.telp?.trim() || "-",
      email: perusahaanInfo.email?.trim() || "-",
    };
    return {
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
      status: header.status || "",
      sumber_data: header.sumber_data || "ERP",
      details: details.map((detail: any) => ({
        no_fj: detail.no_fj || "",
        tgl_fj: detail.tgl_fj || "",
        netto_mu: detail.netto_mu || 0,
        bayar_mu: detail.bayar_mu || 0,
        sisa_setelah_bayar: detail.sisa_setelah_bayar || 0,
      })),
      payments: payments.map((payment: any) => ({
        metode_bayar: payment.metode_bayar || "",
        jumlah_bayar: payment.jumlah_bayar || 0,
        tgl_bayar: payment.tgl_bayar || "",
        keterangan: payment.keterangan || "",
      })),
      summary: {
        jumlah_faktur: summary.jumlah_faktur || 0,
        total_outstanding_faktur: summary.total_outstanding_faktur || 0,
        jumlah_bayar: summary.jumlah_bayar || 0,
        sisa_outstanding_faktur: summary.sisa_outstanding_faktur || 0,
      },
      perusahaan,
    };
  };

  // ================== Generate Print Text (48 chars, full numbers, wrap text) ==================
  const generatePrintText = (): string => {
    if (!ppiData) return "";
    const PRINT_WIDTH = 32; // DIUBAH dari 48 menjadi 32
    const MAX_CHAR_PER_LINE = 32;

    const wrapText = (
      text: string,
      width: number = MAX_CHAR_PER_LINE
    ): string[] => {
      if (!text?.trim()) return [""];
      const words = text.trim().split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        if (testLine.length <= width) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word.length > width ? word.substring(0, width) : word;
        }
      }

      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const centerText = (text: string): string => {
      if (!text) return "";
      const cleanText = text.trim();
      if (cleanText.length >= PRINT_WIDTH) return cleanText;

      const padding = Math.floor((PRINT_WIDTH - cleanText.length) / 2);
      return " ".repeat(Math.max(0, padding)) + cleanText;
    };

    const formatLine = (left: string, right: string = ""): string => {
      const availableWidth = PRINT_WIDTH - left.length;
      if (right.length >= availableWidth) {
        return left + right.substring(0, availableWidth);
      }
      return left + " ".repeat(availableWidth - right.length) + right;
    };

    const formatCurrency = (amount: number): string => {
      const value = Math.round(amount || 0);
      return `${value.toLocaleString("id-ID")}`; // HAPUS "Rp " untuk hemat space
    };

    const formatDateShort = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID");
      } catch {
        return dateString;
      }
    };

    const lines: string[] = [];

    // HEADER - Sesuaikan dengan 32 karakter
    lines.push("=".repeat(PRINT_WIDTH));

    // Wrap alamat untuk center text yang panjang
    const wrappedNamaPerusahaan = wrapText(
      ppiData.perusahaan.nama.toUpperCase(),
      PRINT_WIDTH
    );
    wrappedNamaPerusahaan.forEach((line) => lines.push(centerText(line)));

    const wrappedAlamat = wrapText(ppiData.perusahaan.alamat, PRINT_WIDTH);
    wrappedAlamat.forEach((line) => lines.push(centerText(line)));

    lines.push(
      centerText(
        `${ppiData.perusahaan.kota} - Telp: ${ppiData.perusahaan.telepon}`
      )
    );
    lines.push("");
    lines.push(centerText("PENERIMAAN PIUTANG"));
    lines.push("=".repeat(PRINT_WIDTH));

    // KEPADA - Optimasi untuk 32 karakter
    lines.push("KEPADA:");
    wrapText(ppiData.nama_cust, PRINT_WIDTH).forEach((line) =>
      lines.push(line)
    );
    wrapText(`Sales: ${ppiData.nama_sales}`, PRINT_WIDTH).forEach((line) =>
      lines.push(line)
    );
    lines.push("");

    // INFO PEMBAYARAN - Label lebih pendek
    lines.push("INFO BAYAR:");
    lines.push("-".repeat(PRINT_WIDTH));
    lines.push(formatLine("No PPI", ppiData.no_ppi));
    lines.push(formatLine("Tgl", formatDateShort(ppiData.tanggal_ppi)));
    lines.push(formatLine("Jenis", getCaraBayarText(ppiData.cara_bayar)));
    lines.push(formatLine("Status", ppiData.status.toUpperCase()));
    lines.push(formatLine("Akun", ppiData.nama_akun));

    if (ppiData.no_giro && ppiData.no_giro !== "-") {
      lines.push(formatLine("Giro", ppiData.no_giro));
    }
    lines.push("");

    // DETAIL FAKTUR - Format lebih compact
    if (ppiData.details.length > 0) {
      lines.push("DETAIL FAKTUR:");
      lines.push("-".repeat(PRINT_WIDTH));

      ppiData.details.forEach((detail, index) => {
        lines.push(`${index + 1}. ${detail.no_fj}`);
        lines.push(formatLine("  Tgl", formatDateShort(detail.tgl_fj)));
        lines.push(formatLine("  Total", formatCurrency(detail.netto_mu)));
        lines.push(formatLine("  Bayar", formatCurrency(detail.bayar_mu)));
        lines.push(
          formatLine("  Sisa", formatCurrency(detail.sisa_setelah_bayar))
        );

        if (index < ppiData.details.length - 1) {
          lines.push("  ---");
        }
      });

      lines.push("-".repeat(PRINT_WIDTH));
      lines.push("");
    }

    // RINCIAN PEMBAYARAN - Label lebih pendek
    if (ppiData.payments.length > 0) {
      lines.push("RINCIAN BAYAR:");
      lines.push("-".repeat(PRINT_WIDTH));

      ppiData.payments.forEach((payment, index) => {
        lines.push(`${index + 1}. ${getCaraBayarText(payment.metode_bayar)}`);
        lines.push(
          formatLine("  Jumlah", formatCurrency(payment.jumlah_bayar))
        );
        lines.push(formatLine("  Tgl", formatDateShort(payment.tgl_bayar)));

        if (payment.keterangan && payment.keterangan !== "-") {
          lines.push("  Ket:");
          const wrappedKeterangan = wrapText(
            payment.keterangan,
            PRINT_WIDTH - 4
          );
          wrappedKeterangan.forEach((line) => lines.push(`    ${line}`));
        }
      });

      lines.push("-".repeat(PRINT_WIDTH));
      lines.push("");
    }

    // SUMMARY - Format compact
    lines.push("SUMMARY:");
    lines.push("-".repeat(PRINT_WIDTH));
    lines.push(
      formatLine("Jml Faktur", ppiData.summary.jumlah_faktur.toString())
    );
    lines.push(
      formatLine(
        "Outstanding",
        formatCurrency(ppiData.summary.total_outstanding_faktur)
      )
    );
    lines.push(
      formatLine("Total Bayar", formatCurrency(ppiData.summary.jumlah_bayar))
    );
    lines.push(
      formatLine(
        "Sisa Outstd",
        formatCurrency(ppiData.summary.sisa_outstanding_faktur)
      )
    );
    lines.push("");

    // FOOTER - Label lebih pendek
    lines.push(centerText("BUKTI BAYAR"));
    lines.push("");
    lines.push(centerText("DIKELUARKAN"));
    lines.push("");
    lines.push(centerText("DITERIMA"));
    lines.push("");
    lines.push("-".repeat(PRINT_WIDTH));
    lines.push(centerText(`Print: ${new Date().toLocaleDateString("id-ID")}`));
    lines.push(centerText(`Sumber: ${ppiData.sumber_data}`));
    lines.push("");
    lines.push("=".repeat(PRINT_WIDTH));

    return lines.join("\n");
  };

  // ================== Utilities ==================
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

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

  const getCaraBayarText = (caraBayar: string): string => {
    const map: { [key: string]: string } = {
      tunai: "TUNAI",
      transfer: "TRANSFER",
      cek: "CEK",
      giro: "GIRO",
    };
    return map[caraBayar.toLowerCase()] || caraBayar.toUpperCase();
  };

  // ================== Print Preview Modal ==================
  const PrintPreviewModal = () => {
    const text = generatePrintText();
    return (
      <Modal visible={showPreview} animationType="slide">
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Print Preview PPI</Text>
            <TouchableOpacity
              onPress={() => setShowPreview(false)}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.previewBody}>
            <Text style={styles.monoText}>{text}</Text>
          </ScrollView>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: "#007bff", marginRight: 8 },
              ]}
              onPress={() => {
                setShowPreview(false);
                printViaBluetooth();
              }}
            >
              <Text style={styles.btnText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#6f42c1" }]}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.btnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // ================== Export TXT ==================
  const exportTextFile = async () => {
    if (!ppiData) {
      Alert.alert("Error", "Data penerimaan piutang tidak tersedia");
      return;
    }
    const text = generatePrintText();
    const filename = `PPI-${ppiData.kode_ppi}.txt`;
    const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, text, {
        encoding: "utf8",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: `Print PPI - ${ppiData.kode_ppi}`,
          UTI: "public.plain-text",
        });
      }
    } catch (e: any) {
      console.error("Export TXT failed:", e);
      Alert.alert("Gagal", "Gagal mengekspor file TXT");
    }
  };

  // ================== Bluetooth Scan ==================
  const scanBluetoothDevices = async () => {
    if (!isBluetoothSupported) {
      setScanning(true);
      setTimeout(() => {
        setBluetoothDevices([
          {
            id: "1",
            name: "Printer Thermal 58mm (Sim)",
            type: "printer",
            mac: "00:11:22:33:44:55",
          },
          {
            id: "2",
            name: "BT Printer X1 (Sim)",
            type: "printer",
            mac: "66:77:88:99:AA:BB",
          },
        ]);
        setScanning(false);
      }, 800);
      return;
    }
    if (!BluetoothManager) {
      Alert.alert("Error", "Library bluetooth tidak tersedia");
      return;
    }
    try {
      setScanning(true);
      const raw = await BluetoothManager.scanDevices();
      let parsed: any = typeof raw === "string" ? JSON.parse(raw) : raw;
      const all = [...(parsed.found || []), ...(parsed.paired || [])];
      const formatted: BluetoothDevice[] = (all || []).map((d: any) => ({
        id: d.address || d.MAC || d.mac || `${d.name}-${Math.random()}`,
        mac: d.address || d.MAC || d.mac,
        name: d.name || d.deviceName || "Unknown Printer",
        type: "printer",
      }));
      setBluetoothDevices(formatted);
    } catch (error: any) {
      console.error("❌ Scan error:", error);
      Alert.alert("Scan Gagal", "Tidak dapat memindai perangkat Bluetooth");
    } finally {
      setScanning(false);
    }
  };

  // ================== Connect ==================
  const connectToDevice = async (item: BluetoothDevice) => {
    if (!isBluetoothSupported || !BluetoothManager) {
      setConnectedDevice(item);
      setShowBluetoothModal(false);
      Alert.alert("Simulation Mode", `Terhubung ke ${item.name} (Simulated)`);
      return;
    }
    try {
      setConnecting(true);
      await BluetoothManager.connect(item.mac);
      if (BluetoothEscposPrinter && BluetoothEscposPrinter.printerInit) {
        await BluetoothEscposPrinter.printerInit();
      }
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

  // ================== Disconnect ==================
  const disconnectBluetooth = async () => {
    if (connectedDevice && isBluetoothSupported && BluetoothManager) {
      try {
        await BluetoothManager.disconnect();
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
    setConnectedDevice(null);
  };

  // ================== Print via Bluetooth ==================
  const printWithRealBluetooth = async () => {
    if (!BluetoothEscposPrinter || !BluetoothManager || !ppiData) {
      throw new Error("Library printer thermal tidak tersedia");
    }
    try {
      if (!connectedDevice) {
        await scanBluetoothDevices();
        if (bluetoothDevices.length === 0) {
          const raw = await BluetoothManager.scanDevices();
          let parsed: any = typeof raw === "string" ? JSON.parse(raw) : raw;
          const all = [...(parsed.paired || []), ...(parsed.found || [])];
          if (all.length > 0) {
            const first = all[0];
            const mac = first.address || first.MAC || first.mac;
            if (mac) {
              await BluetoothManager.connect(mac);
              setConnectedDevice({
                id: mac,
                name: first.name || "Printer",
                mac,
                type: "printer",
              });
            }
          }
        }
      }
      if (BluetoothEscposPrinter.printerInit) {
        await BluetoothEscposPrinter.printerInit();
      }
      const printText = generatePrintText();
      try {
        await BluetoothEscposPrinter.printText(printText + "\n", {
          encoding: "UTF-8",
          codepage: 0,
        });
      } catch (e) {
        await BluetoothEscposPrinter.printText(printText + "\n", {
          encoding: "GBK",
          codepage: 0,
        });
      }
      try {
        await BluetoothEscposPrinter.cut();
      } catch (e) {
        await BluetoothEscposPrinter.printAndFeed(3);
      }
      try {
        await BluetoothManager.disconnect();
      } catch (e) {
        console.warn("Disconnect after print failed", e);
      }
      Alert.alert("Berhasil", "Penerimaan Piutang berhasil dicetak!");
    } catch (error: any) {
      console.error("❌ Real Bluetooth failed:", error);
      throw error;
    }
  };

  const printViaBluetooth = async () => {
    if (!ppiData) {
      Alert.alert("Error", "Data penerimaan piutang tidak tersedia");
      return;
    }
    try {
      setPrinting(true);
      if (isBluetoothSupported && BluetoothEscposPrinter && BluetoothManager) {
        await printWithRealBluetooth();
      } else {
        Alert.alert(
          "Simulation",
          "Mode simulation aktif — hasil print akan diexport sebagai file atau bisa dilihat di Preview.",
          [
            { text: "Lihat Preview", onPress: () => setShowPreview(true) },
            { text: "Export TXT", onPress: exportTextFile },
            { text: "OK" },
          ]
        );
      }
    } catch (error: any) {
      console.error("❌ Print error:", error);
      Alert.alert(
        "Print Gagal",
        error.message || "Terjadi kesalahan saat mencetak",
        [
          { text: "OK" },
          { text: "Coba Export File", onPress: () => exportTextFile() },
        ]
      );
    } finally {
      setPrinting(false);
    }
  };

  // ================== PDF Print ==================
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
      Alert.alert("Error", "Gagal membuat PDF: " + (error.message || error));
    } finally {
      setPrinting(false);
    }
  };

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
          .summary { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { text-align: right; font-weight: bold; margin-top: 20px; font-size: 16px; }
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
            Tanggal: ${formatDateShort(ppiData.tanggal_ppi)}<br>
            Jenis: ${getCaraBayarText(ppiData.cara_bayar)}<br>
            Status: ${ppiData.status.toUpperCase()}<br>
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
          <div class="summary-row" style="border-top:1px solid #ddd; padding-top:8px; font-weight:bold;">
            <span>Sisa Outstanding:</span>
            <span>${formatCurrency(
              ppiData.summary.sisa_outstanding_faktur
            )}</span>
          </div>
        </div>
        <div style="text-align:center; font-size:12px; color:#666;">Dicetak pada: ${new Date().toLocaleString(
          "id-ID"
        )}</div>
      </body>
      </html>
    `;
  };

  // ================== Render ==================
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
      {/* Build info */}
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
              isBluetoothSupported ? styles.badgeSuccess : styles.badgeWarning,
            ]}
          >
            <Text style={styles.envBadgeText}>
              {isBluetoothSupported ? "BLUETOOTH" : "SIMULATION"}
            </Text>
          </View>
          <Text style={styles.envText}>{appEnv.toUpperCase()}</Text>
        </View>
      </View>

      {connectedDevice && (
        <View style={styles.connectionStatus}>
          <MaterialIcons name="bluetooth-connected" size={16} color="#fff" />
          <Text style={styles.connectionText}>
            Terhubung: {connectedDevice.name}
          </Text>
        </View>
      )}

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.bluetoothButton]}
          onPress={() => {
            if (!isBluetoothSupported) setShowPreview(true);
            else printViaBluetooth();
          }}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="print" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isBluetoothSupported ? "Print Bluetooth" : "Preview / Export"}
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
              {isBluetoothSupported ? "Cari Printer" : "Simulate Printers"}
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
                  {formatDateShort(ppiData.tanggal_ppi)}
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
                  <View key={detail.no_fj} style={styles.tableRow}>
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

          <View style={styles.printFooter}>
            <Text style={styles.printFooterText}>
              Dicetak pada: {new Date().toLocaleString("id-ID")} | Sumber:{" "}
              {ppiData.sumber_data}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bluetooth Modal */}
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
                {isBluetoothSupported
                  ? "Bluetooth Printers"
                  : "Simulated Printers"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isBluetoothSupported
                  ? "Printer yang sudah terpair / tersedia"
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
            <View style={{ height: 8 }} />
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: "#17a2b8" }]}
              onPress={() => {
                setBluetoothDevices([
                  {
                    id: "sim-1",
                    name: "Printer Sim 58mm",
                    mac: "00:11:22:33:44:55",
                    type: "printer",
                  },
                  {
                    id: "sim-2",
                    name: "Printer Sim X",
                    mac: "66:77:88:99:AA:BB",
                    type: "printer",
                  },
                ]);
              }}
            >
              <Text style={styles.scanButtonText}>Force Simulate</Text>
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
                {isBluetoothSupported
                  ? "Pastikan printer dalam mode pairing"
                  : "Simulation mode - Printer akan muncul dalam beberapa detik"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={bluetoothDevices}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceItem}
                  onPress={() => connectToDevice(item)}
                  disabled={connecting}
                >
                  <MaterialIcons
                    name={
                      connectedDevice?.id === item.id
                        ? "bluetooth-connected"
                        : "bluetooth"
                    }
                    size={24}
                    color={connectedDevice?.id === item.id ? "#007bff" : "#666"}
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
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#666"
                    />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.devicesList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Preview Modal */}
      <PrintPreviewModal />
    </SafeAreaView>
  );
}

// ================== Styles ==================
const styles = StyleSheet.create({
  // ... (SAMA PERSIS DENGAN ppiPrintBaru.txt ASLI)
  // Karena tidak ada perubahan UI, cukup gunakan styles dari file asli
  // Berikut hanya contoh ringkas — di implementasi asli, salin seluruh styles dari ppiPrintBaru.txt
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
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
  retryButtonText: { color: "#fff", fontWeight: "600" },
  buildInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  buildProduction: { backgroundColor: "#28a745" },
  buildPreview: { backgroundColor: "#6f42c1" },
  buildDevelopment: { backgroundColor: "#ff9800" },
  buildText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  buildBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  envBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeSuccess: { backgroundColor: "#155724" },
  badgeWarning: { backgroundColor: "#856404" },
  envBadgeText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
  envText: { color: "#fff", fontSize: 9, opacity: 0.8 },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  connectionText: { color: "#fff", fontWeight: "600", flex: 1 },
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
  bluetoothButton: { backgroundColor: "#007bff", flex: 1.5 },
  scanButton: { backgroundColor: "#6f42c1" },
  pdfButton: { backgroundColor: "#dc3545" },
  disconnectButton: { backgroundColor: "#dc3545" },
  actionButtonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  scrollView: { flex: 1 },
  printContainer: { padding: 16 },
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
  companyName: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  companyAddress: { fontSize: 14, color: "#666", marginBottom: 2 },
  companyContact: { fontSize: 12, color: "#666", marginBottom: 10 },
  documentTitle: { marginTop: 10 },
  documentTitleText: { fontSize: 18, fontWeight: "bold" },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoBox: { flex: 1 },
  infoLabel: { fontWeight: "bold", marginBottom: 8, fontSize: 14 },
  customerName: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  customerContact: { fontSize: 12, color: "#666" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoValue: { fontSize: 12 },
  statusText: { fontWeight: "600", color: "#28a745" },
  detailsSection: { marginBottom: 20 },
  paymentsSection: { marginBottom: 20 },
  summarySection: { marginBottom: 20 },
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
  tableCell: { padding: 8, fontSize: 10 },
  tableHeaderCell: { fontWeight: "bold" },
  colNo: { width: "8%", textAlign: "center" },
  colFj: { width: "20%" },
  colTgl: { width: "15%" },
  colTotal: { width: "19%", textAlign: "right" },
  colBayar: { width: "19%", textAlign: "right" },
  colSisa: { width: "19%", textAlign: "right" },
  colMetode: { width: "15%" },
  colJumlah: { width: "20%", textAlign: "right" },
  colKet: { width: "30%" },
  summaryContent: { backgroundColor: "#e8f5e8", padding: 16, borderRadius: 6 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 12, color: "#666" },
  summaryValue: { fontSize: 12, fontWeight: "500" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: "bold", color: "#333" },
  totalAmount: { fontSize: 16, fontWeight: "bold", color: "#28a745" },
  printFooter: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  printFooterText: { fontSize: 10, color: "#666", textAlign: "center" },
  modalContainer: { flex: 1, backgroundColor: "white" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  modalSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  closeButton: { padding: 4 },
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
  emptyDevicesSubtext: { fontSize: 14, color: "#999", textAlign: "center" },
  devicesList: { padding: 16 },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  deviceInfo: { flex: 1 },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  deviceType: { fontSize: 12, color: "#666", textTransform: "capitalize" },
  scanButtonText: { color: "#fff", fontWeight: "600" },
  previewContainer: { flex: 1, backgroundColor: "#fff" },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  previewTitle: { fontSize: 16, fontWeight: "700" },
  previewBody: { padding: 16 },
  monoText: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 12,
    lineHeight: 18,
    color: "#111",
  },
  previewActions: {
    flexDirection: "row",
    padding: 12,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  btn: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
