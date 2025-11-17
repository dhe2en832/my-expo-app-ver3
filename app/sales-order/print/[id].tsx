// app/sales-order/print/[id].tsx
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
import { dataUmumAPI, salesOrderAPI } from "@/api/services";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { Perusahaan } from "@/api/interface";
import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";
import {
  generateQRCodeBase64,
  prepareQRForPrint,
  generateQRPatternText,
} from "../../../utils/qrCodeService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_CONNECTED_PRINTER_KEY = "lastConnectedPrinterMac";

/**
 * Menyimpan MAC address printer ke AsyncStorage setelah koneksi berhasil.
 */
const saveConnectedDevice = async (mac: string) => {
  try {
    await AsyncStorage.setItem(LAST_CONNECTED_PRINTER_KEY, mac);
  } catch (e) {
    console.error("Gagal menyimpan MAC printer:", e);
  }
};

/**
 * Mencoba koneksi otomatis ke printer yang terakhir terhubung saat komponen dimuat.
 * @param isSupported: Nilai isBluetoothSupported
 * @param setConnectedDevice: Setter state untuk connectedDevice.
 */
const attemptAutoConnect = async (
  isSupported: boolean,
  setConnectedDevice: React.Dispatch<
    React.SetStateAction<BluetoothDevice | null>
  >
) => {
  // Keluar jika Bluetooth tidak didukung atau library tidak tersedia
  if (!isSupported || !BluetoothManager || !BluetoothManager.connect) return;

  try {
    const lastPrinterMac = await AsyncStorage.getItem(
      LAST_CONNECTED_PRINTER_KEY
    );

    if (lastPrinterMac) {
      console.log(`Mencoba koneksi otomatis ke: ${lastPrinterMac}`);

      // Coba koneksi ke printer terakhir.
      const isConnected = await BluetoothManager.connect(lastPrinterMac);

      if (isConnected) {
        // Cari info printer dari daftar paired devices untuk mendapatkan nama
        const devices = await BluetoothManager.getBondedDevices();
        const lastDevice = devices.find((d: any) => d.mac === lastPrinterMac);

        if (lastDevice) {
          setConnectedDevice(lastDevice);
        } else {
          // Fallback jika nama tidak ditemukan
          setConnectedDevice({
            mac: lastPrinterMac,
            name: "Printer Otomatis",
            type: "printer",
          } as BluetoothDevice);
        }
        console.log("✅ Koneksi otomatis berhasil.");
      } else {
        console.log("❌ Koneksi otomatis gagal.");
      }
    }
  } catch (e) {
    console.error("Kesalahan saat mencoba koneksi otomatis:", e);
  }
};

// import BluetoothEscposPrinter from "@ccdilan/react-native-bluetooth-escpos-printer";
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
  console.log("Available methods:", Object.keys(lib));
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
interface SalesOrderData {
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
  kode_termin?: string;
  nama_termin?: string;
  cara_kirim?: "KG" | "KP" | "AG" | "AP";
  cara_kirim_deskripsi?: string;
  ppn_percent: number;
  ppn_value: number;
  diskon_header: number;
  diskon_header_percent: number;
  uang_muka: number;
  subtotal: number;
  total: number;
  synced: "Y" | "N";
  sumber_data: "MOBILE" | "ERP";
  items: Array<{
    no_item: string;
    nama_item: string;
    quantity: number;
    harga: number;
    subtotal: number;
    diskon_value: number;
    satuan?: string;
  }>;
  perusahaan: {
    nama: string;
    alamat: string;
    kota: string;
    telepon: string;
    email: string;
  };

  summary?: {
    subtotal: number;
    diskon_detail: number;
    diskon_header: number;
    ppn: number;
    uang_muka: number;
    total: number;
  };
}

interface BluetoothDevice {
  id: string;
  name: string;
  mac?: string;
  type: string;
}

// ================== Component ==================
export default function PrintSalesOrder() {
  const params = useLocalSearchParams();
  const orderId = (params.id as string) || "";
  const namaCustomer = (params.nama_customer as string) || "";

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<SalesOrderData | null>(null);
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
  const [infoPerusahaan, setInfoPerusahaan] = useState<Perusahaan[]>([]);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");
  const viewShotRef = useRef<ViewShot>(null);

  const caraKirimMap: Record<"KG" | "KP" | "AG" | "AP", string> = {
    KG: "Dikirim Gudang",
    KP: "Dikirim Langsung (Pabrik)",
    AG: "Ambil Sendiri (Gudang)",
    AP: "Ambil Sendiri (Pabrik)",
  };

  const loadDataPerusahaan = async () => {
    try {
      const res = await dataUmumAPI.getInfoPerusahaan();
      console.log("res info ", res.data);

      const data = Array.isArray(res.data) ? res.data : [];
      setInfoPerusahaan(data);

      return data; // always return array
    } catch (err: any) {
      console.error("Error loading info perusahaan:", err);
      return infoPerusahaan || []; // gunakan state terakhir
    }
  };

  useEffect(() => {
    if (orderData) {
      const qrData = generateQRData(orderData);
      setQrCodeData(qrData);
    }
  }, [orderData]);

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
    if (isBluetoothSupported) {
      // Panggil fungsi untuk mencoba koneksi otomatis
      attemptAutoConnect(isBluetoothSupported, setConnectedDevice);
    }
  }, []);

  // ================== Load Sales Order ==================
  useEffect(() => {
    if (orderId) {
      loadSalesOrderData();
    }
  }, [orderId]);

  const generateQRData = (order: SalesOrderData): string => {
    const qrObject = {
      type: "SALES_ORDER",
      so_number: order.no_so,
      so_id: order.kode_so,
      customer: order.nama_cust,
      date: order.tgl_so,
      total: order.total,
      items_count: order.items.length,
      sales: order.nama_sales,
      status: order.status,
      sync: order.synced,
      timestamp: new Date().toISOString(),
      company: order.perusahaan.nama,
    };
    return JSON.stringify(qrObject);
  };

  const captureQRCode = async (): Promise<string> => {
    if (!viewShotRef.current?.capture) {
      throw new Error("ViewShot not available");
    }

    try {
      const uri = await viewShotRef.current.capture();
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error("QR Code capture failed:", error);
      throw error;
    }
  };

  const loadSalesOrderData = async () => {
    try {
      setLoading(true);
      setError(null);
      const perusahaanData = await loadDataPerusahaan();
      const res = await salesOrderAPI.getSoDetailCombined(orderId);
      if (res.success && res.data) {
        let formattedData = mapApiDataToPrintFormat(res.data, perusahaanData);

        if (formattedData.cara_kirim) {
          formattedData.cara_kirim_deskripsi =
            caraKirimMap[formattedData.cara_kirim];
        }
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

  const mapApiDataToPrintFormat = (
    apiData: any,
    infoPerusahaan: Perusahaan[] = []
  ): SalesOrderData => {
    const header = apiData.header || {};
    const items = apiData.items || [];
    const summary = apiData.summary || {};
    const calculatedSubtotal = items.reduce(
      (total: number, item: any) =>
        total +
        (item.harga || 0) * (item.qty || item.qty_std || item.quantity || 0),
      0
    );
    const calculatedDiscountDetail = items.reduce(
      (total: number, item: any) => total + (item.diskon_value || 0),
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
      kode_termin: header.kode_termin,
      nama_termin: header.nama_termin,
      cara_kirim: header.cara_kirim,
      cara_kirim_deskripsi: header.cara_kirim_deskripsi,
      ppn_percent: header.ppn_percent || 0,
      ppn_value: ppnValue,
      diskon_header: discountHeader,
      diskon_header_percent: header.diskon_header_percent || 0,
      uang_muka: header.uang_muka || 0,
      subtotal: header.subtotal || calculatedSubtotal,
      total: header.total || calculatedTotal,
      synced: header.synced || "N",
      sumber_data: header.sumber_data || "MOBILE",
      items: items.map((item: any) => ({
        no_item: item.no_item || "",
        nama_item: item.nama_item,
        quantity: item.qty || item.qty_std || item.quantity || 0,
        harga: item.harga || 0,
        subtotal:
          (item.harga || 0) * (item.qty || item.qty_std || item.quantity || 0),
        diskon_value: item.diskon_value || 0,
        satuan: item.satuan || "pcs",
      })),
      perusahaan,
    };
  };

  // ================== Generate Print Text (48 chars, full numbers, wrap text) ==================
  // const generatePrintText = (): string => {
  //   if (!orderData) return "";
  //   const PRINT_WIDTH = 32;
  //   const MAX_CHAR_PER_LINE = 32;

  //   const wrapText = (
  //     text: string,
  //     width: number = MAX_CHAR_PER_LINE
  //   ): string[] => {
  //     if (!text?.trim()) return [""];
  //     const words = text.trim().split(" ");
  //     const lines: string[] = [];
  //     let currentLine = "";

  //     for (const word of words) {
  //       const testLine = currentLine ? `${currentLine} ${word}` : word;

  //       if (testLine.length <= width) {
  //         currentLine = testLine;
  //       } else {
  //         if (currentLine) lines.push(currentLine);
  //         currentLine = word.length > width ? word.substring(0, width) : word;
  //       }
  //     }

  //     if (currentLine) lines.push(currentLine);
  //     return lines;
  //   };

  //   const centerText = (text: string): string => {
  //     if (!text) return "";
  //     const cleanText = text.trim();
  //     if (cleanText.length >= PRINT_WIDTH) return cleanText;

  //     const padding = Math.floor((PRINT_WIDTH - cleanText.length) / 2);
  //     return " ".repeat(Math.max(0, padding)) + cleanText;
  //   };

  //   const formatLine = (left: string, right: string = ""): string => {
  //     const availableWidth = PRINT_WIDTH - left.length;
  //     if (right.length >= availableWidth) {
  //       return left + right.substring(0, availableWidth);
  //     }
  //     return left + " ".repeat(availableWidth - right.length) + right;
  //   };

  //   const formatCurrency = (amount: number): string => {
  //     const value = Math.round(amount || 0);
  //     return `${value.toLocaleString("id-ID")}`;
  //   };

  //   const formatDateShort = (dateString: string): string => {
  //     try {
  //       const date = new Date(dateString);
  //       return date.toLocaleDateString("id-ID");
  //     } catch {
  //       return dateString;
  //     }
  //   };

  //   const lines: string[] = [];

  //   // HEADER
  //   lines.push("=".repeat(PRINT_WIDTH));

  //   // Wrap untuk header yang panjang
  //   const wrappedNamaPerusahaan = wrapText(
  //     orderData.perusahaan.nama.toUpperCase(),
  //     PRINT_WIDTH
  //   );
  //   wrappedNamaPerusahaan.forEach((line) => lines.push(centerText(line)));

  //   const wrappedAlamat = wrapText(orderData.perusahaan.alamat, PRINT_WIDTH);
  //   wrappedAlamat.forEach((line) => lines.push(centerText(line)));

  //   lines.push(
  //     centerText(
  //       `${orderData.perusahaan.kota} - Telp: ${orderData.perusahaan.telepon}`
  //     )
  //   );
  //   lines.push("");
  //   lines.push(centerText("SALES ORDER"));
  //   lines.push("=".repeat(PRINT_WIDTH));

  //   // KEPADA
  //   lines.push("KEPADA:");
  //   wrapText(orderData.nama_cust, PRINT_WIDTH).forEach((line) =>
  //     lines.push(line)
  //   );
  //   wrapText(orderData.alamat, PRINT_WIDTH).forEach((line) => lines.push(line));

  //   if (orderData.kota_kirim) {
  //     wrapText(orderData.kota_kirim, PRINT_WIDTH).forEach((line) =>
  //       lines.push(line)
  //     );
  //   }

  //   if (orderData.hp) {
  //     lines.push(`HP: ${orderData.hp}`);
  //   }
  //   lines.push("");

  //   // INFO ORDER
  //   lines.push("INFO ORDER:");
  //   lines.push("-".repeat(PRINT_WIDTH));
  //   lines.push(formatLine("No SO", orderData.no_so));
  //   lines.push(formatLine("Tgl", formatDateShort(orderData.tgl_so)));
  //   lines.push(formatLine("Sales", orderData.nama_sales));
  //   lines.push(formatLine("Status", orderData.status.toUpperCase()));

  //   if (orderData.kode_termin) {
  //     lines.push(formatLine("Termin", orderData.nama_termin));
  //   }

  //   if (orderData.cara_kirim_deskripsi) {
  //     lines.push("Kirim:");
  //     wrapText(orderData.cara_kirim_deskripsi, PRINT_WIDTH).forEach((line) =>
  //       lines.push(line)
  //     );
  //   }
  //   lines.push("");

  //   // KETERANGAN
  //   if (orderData.keterangan && orderData.keterangan.trim() !== "") {
  //     lines.push("KET:");
  //     lines.push("-".repeat(PRINT_WIDTH));
  //     wrapText(orderData.keterangan, PRINT_WIDTH).forEach((line) =>
  //       lines.push(line)
  //     );
  //     lines.push("");
  //   }

  //   // TABEL ITEM - DENGAN FORMAT YANG BENAR
  //   lines.push("ITEM:");
  //   lines.push("-".repeat(PRINT_WIDTH));

  //   orderData.items.forEach((item, index) => {
  //     const no = `${index + 1}.`;

  //     // Kode item + nama
  //     const itemLine = `${no} ${item.no_item}`;
  //     lines.push(itemLine);

  //     // Nama item di baris berikutnya jika panjang
  //     const wrappedName = wrapText(item.nama_item, PRINT_WIDTH - 2);
  //     wrappedName.forEach((line) => lines.push(`  ${line}`));

  //     // FORMAT DETAIL YANG BENAR: "Qty @ Harga = Subtotal"
  //     const qtyStr = `${item.quantity}`;
  //     const satuan = `${item.satuan}`;
  //     const hargaStr = formatCurrency(item.harga);
  //     const subtotalStr = formatCurrency(item.subtotal);

  //     // Format: "  2 @ 500.000 = 1.000.000"
  //     const detailLine = `  ${qtyStr}${satuan} @ ${hargaStr} = ${subtotalStr}`;

  //     // Cek jika line terlalu panjang, buat format alternatif
  //     if (detailLine.length <= PRINT_WIDTH) {
  //       lines.push(detailLine);
  //     } else {
  //       // Fallback: "  2 = 1.000.000"
  //       lines.push(`  ${qtyStr} = ${subtotalStr}`);
  //     }

  //     // Diskon item (jika ada)
  //     if (item.diskon_value > 0) {
  //       lines.push(`  Disc: -${formatCurrency(item.diskon_value)}`);
  //     }

  //     // Spasi antar item
  //     if (index < orderData.items.length - 1) {
  //       lines.push("");
  //     }
  //   });

  //   lines.push("-".repeat(PRINT_WIDTH));
  //   lines.push("");

  //   // RINCIAN
  //   lines.push("RINCIAN:");
  //   lines.push("-".repeat(PRINT_WIDTH));

  //   const diskonDetail =
  //     orderData.summary?.diskon_detail ??
  //     orderData.items.reduce((sum, item) => sum + (item.diskon_value || 0), 0);

  //   lines.push(formatLine("Subtotal", formatCurrency(orderData.subtotal)));

  //   if (diskonDetail > 0) {
  //     lines.push(formatLine("Disc Item", `-${formatCurrency(diskonDetail)}`));
  //   }

  //   if (orderData.diskon_header > 0) {
  //     lines.push(
  //       formatLine("Disc Hdr", `-${formatCurrency(orderData.diskon_header)}`)
  //     );
  //   }

  //   if (orderData.ppn_value > 0) {
  //     lines.push(
  //       formatLine(
  //         `PPN${orderData.ppn_percent}%`,
  //         `+${formatCurrency(orderData.ppn_value)}`
  //       )
  //     );
  //   }

  //   if (orderData.uang_muka > 0) {
  //     lines.push(
  //       formatLine("Uang Muka", `-${formatCurrency(orderData.uang_muka)}`)
  //     );
  //   }

  //   lines.push("-".repeat(PRINT_WIDTH));
  //   lines.push(centerText(`TOTAL: ${formatCurrency(orderData.total)}`));
  //   lines.push("-".repeat(PRINT_WIDTH));
  //   lines.push("");

  //   // FOOTER
  //   lines.push(centerText("HORMAT KAMI"));
  //   lines.push("");
  //   lines.push(centerText(orderData.perusahaan.nama));
  //   lines.push("");
  //   lines.push(centerText("CUSTOMER"));
  //   lines.push("");
  //   lines.push("-".repeat(PRINT_WIDTH));
  //   lines.push(centerText(`Print: ${new Date().toLocaleString("id-ID")}`));
  //   lines.push(centerText(orderData.synced === "Y" ? "SYNCED" : "PENDING"));
  //   lines.push("");
  //   lines.push("=".repeat(PRINT_WIDTH));

  //   return lines.join("\n");
  // };

  const generatePrintText = (): string => {
    if (!orderData) return "";
    const PRINT_WIDTH = 32;
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
      return `${value.toLocaleString("id-ID")}`;
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

    // HEADER
    lines.push("=".repeat(PRINT_WIDTH));

    // Wrap untuk header yang panjang
    const wrappedNamaPerusahaan = wrapText(
      orderData.perusahaan.nama.toUpperCase(),
      PRINT_WIDTH
    );
    wrappedNamaPerusahaan.forEach((line) => lines.push(centerText(line)));

    const wrappedAlamat = wrapText(orderData.perusahaan.alamat, PRINT_WIDTH);
    wrappedAlamat.forEach((line) => lines.push(centerText(line)));

    lines.push(
      centerText(
        `${orderData.perusahaan.kota} - Telp: ${orderData.perusahaan.telepon}`
      )
    );
    lines.push("");
    lines.push(centerText("SALES ORDER"));
    lines.push("=".repeat(PRINT_WIDTH));

    // KEPADA
    lines.push("KEPADA:");
    wrapText(orderData.nama_cust, PRINT_WIDTH).forEach((line) =>
      lines.push(line)
    );
    wrapText(orderData.alamat, PRINT_WIDTH).forEach((line) => lines.push(line));

    if (orderData.kota_kirim) {
      wrapText(orderData.kota_kirim, PRINT_WIDTH).forEach((line) =>
        lines.push(line)
      );
    }

    if (orderData.hp) {
      lines.push(`HP: ${orderData.hp}`);
    }
    lines.push("");

    // INFO ORDER
    lines.push("INFO ORDER:");
    lines.push("-".repeat(PRINT_WIDTH));
    lines.push(formatLine("No SO", orderData.no_so));
    lines.push(formatLine("Tgl", formatDateShort(orderData.tgl_so)));
    lines.push(formatLine("Sales", orderData.nama_sales));
    lines.push(formatLine("Status", orderData.status.toUpperCase()));

    if (orderData.kode_termin) {
      lines.push(formatLine("Termin", orderData.nama_termin));
    }

    if (orderData.cara_kirim_deskripsi) {
      lines.push("Kirim:");
      wrapText(orderData.cara_kirim_deskripsi, PRINT_WIDTH).forEach((line) =>
        lines.push(line)
      );
    }
    lines.push("");

    // KETERANGAN
    if (orderData.keterangan && orderData.keterangan.trim() !== "") {
      lines.push("KET:");
      lines.push("-".repeat(PRINT_WIDTH));
      wrapText(orderData.keterangan, PRINT_WIDTH).forEach((line) =>
        lines.push(line)
      );
      lines.push("");
    }

    // TABEL ITEM - DENGAN FORMAT YANG BENAR
    lines.push("ITEM:");
    lines.push("-".repeat(PRINT_WIDTH));

    orderData.items.forEach((item, index) => {
      const no = `${index + 1}.`;

      // Kode item + nama
      const itemLine = `${no} ${item.no_item}`;
      lines.push(itemLine);

      // Nama item di baris berikutnya jika panjang
      const wrappedName = wrapText(item.nama_item, PRINT_WIDTH - 2);
      wrappedName.forEach((line) => lines.push(`  ${line}`));

      // FORMAT DETAIL YANG BENAR: "Qty @ Harga = Subtotal"
      const qtyStr = `${item.quantity}`;
      const satuan = `${item.satuan}`;
      const hargaStr = formatCurrency(item.harga);
      const subtotalStr = formatCurrency(item.subtotal);

      // Format: "  2 @ 500.000 = 1.000.000"
      const detailLine = `  ${qtyStr}${satuan} @ ${hargaStr} = ${subtotalStr}`;

      // Cek jika line terlalu panjang, buat format alternatif
      if (detailLine.length <= PRINT_WIDTH) {
        lines.push(detailLine);
      } else {
        // Fallback: "  2 = 1.000.000"
        lines.push(`  ${qtyStr} = ${subtotalStr}`);
      }

      // Diskon item (jika ada)
      if (item.diskon_value > 0) {
        lines.push(`  Disc: -${formatCurrency(item.diskon_value)}`);
      }

      // Spasi antar item
      if (index < orderData.items.length - 1) {
        lines.push("");
      }
    });

    lines.push("-".repeat(PRINT_WIDTH));
    lines.push("");

    // RINCIAN
    lines.push("RINCIAN:");
    lines.push("-".repeat(PRINT_WIDTH));

    const diskonDetail =
      orderData.summary?.diskon_detail ??
      orderData.items.reduce((sum, item) => sum + (item.diskon_value || 0), 0);

    lines.push(formatLine("Subtotal", formatCurrency(orderData.subtotal)));

    if (diskonDetail > 0) {
      lines.push(formatLine("Disc Item", `-${formatCurrency(diskonDetail)}`));
    }

    if (orderData.diskon_header > 0) {
      lines.push(
        formatLine("Disc Hdr", `-${formatCurrency(orderData.diskon_header)}`)
      );
    }

    if (orderData.ppn_value > 0) {
      lines.push(
        formatLine(
          `PPN${orderData.ppn_percent}%`,
          `+${formatCurrency(orderData.ppn_value)}`
        )
      );
    }

    if (orderData.uang_muka > 0) {
      lines.push(
        formatLine("Uang Muka", `-${formatCurrency(orderData.uang_muka)}`)
      );
    }

    lines.push("-".repeat(PRINT_WIDTH));
    lines.push(centerText(`TOTAL: ${formatCurrency(orderData.total)}`));
    lines.push("-".repeat(PRINT_WIDTH));
    lines.push("");

    // FOOTER - HANYA INFO PRINT & STATUS (HILANGKAN HORMAT KAMI)
    lines.push("-".repeat(PRINT_WIDTH));
    lines.push(centerText(`Print: ${new Date().toLocaleString("id-ID")}`));
    lines.push(centerText(orderData.synced === "Y" ? "SYNCED" : "PENDING"));
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

  // ================== Print Preview Modal ==================
  // const PrintPreviewModal = () => {
  //   const text = generatePrintText();
  //   return (
  //     <Modal visible={showPreview} animationType="slide">
  //       <SafeAreaView style={styles.previewContainer}>
  //         <View style={styles.previewHeader}>
  //           <Text style={styles.previewTitle}>Print Preview SO</Text>
  //           <TouchableOpacity
  //             onPress={() => setShowPreview(false)}
  //             style={{ padding: 8 }}
  //           >
  //             <MaterialIcons name="close" size={20} color="#333" />
  //           </TouchableOpacity>
  //         </View>
  //         <ScrollView contentContainerStyle={styles.previewBody}>
  //           <Text style={styles.monoText}>{text}</Text>
  //         </ScrollView>
  //         <View style={styles.previewActions}>
  //           <TouchableOpacity
  //             style={[
  //               styles.btn,
  //               { backgroundColor: "#007bff", marginRight: 8 },
  //             ]}
  //             onPress={() => {
  //               setShowPreview(false);
  //               printViaBluetooth();
  //             }}
  //           >
  //             <Text style={styles.btnText}>Print</Text>
  //           </TouchableOpacity>
  //           <TouchableOpacity
  //             style={[styles.btn, { backgroundColor: "#6f42c1" }]}
  //             onPress={() => setShowPreview(false)}
  //           >
  //             <Text style={styles.btnText}>Tutup</Text>
  //           </TouchableOpacity>
  //         </View>
  //       </SafeAreaView>
  //     </Modal>
  //   );
  // };

  const PrintPreviewModal = () => {
    const textContent = generatePrintText();
    const qrData = `SO:${orderData?.no_so}|TOTAL:${orderData?.total}`;

    return (
      <Modal visible={showPreview} animationType="slide">
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Print Preview</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewBody}>
            <Text style={styles.monoText}>{textContent}</Text>

            <View style={styles.sectionDivider} />

            <Text style={styles.sectionTitle}>QR Code Area:</Text>
            <Text style={styles.monoText}>
              QR CODE VERIFIKASI{"\n"}
              ================{"\n"}
              [QR CODE WILL APPEAR HERE]{"\n"}
              {"\n"}
              SCAN UNTUK VERIFIKASI{"\n"}
              SO: {orderData?.no_so}
            </Text>

            <View style={styles.qrPreview}>
              <Text style={styles.qrPreviewTitle}>
                Visual QR Code (Reference):
              </Text>
              <QRCode
                value={qrData}
                size={120}
                color="black"
                backgroundColor="white"
              />
              <Text style={styles.qrDataText}>{qrData}</Text>
            </View>
          </ScrollView>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => {
                setShowPreview(false);
                printViaBluetooth();
              }}
            >
              <Text style={styles.printButtonText}>Print dengan QR Code</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // ================== Export TXT ==================
  const exportTextFile = async () => {
    if (!orderData) {
      Alert.alert("Error", "Data order tidak tersedia");
      return;
    }
    const text = generatePrintText();
    const filename = `SO-${orderData.kode_so}.txt`;
    const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, text, {
        encoding: "utf8",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: `Print SO - ${orderData.kode_so}`,
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
    if (!item.mac) {
      Alert.alert("Error", "MAC Address printer tidak tersedia.");
      return;
    }

    if (!isBluetoothSupported || !BluetoothManager) {
      setConnectedDevice(item);
      setShowBluetoothModal(false);
      Alert.alert("Simulation Mode", `Terhubung ke ${item.name} (Simulated)`);
      return;
    }
    try {
      setConnecting(true);
      await BluetoothManager.connect(item.mac);
      await saveConnectedDevice(item.mac);
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
  // const disconnectBluetooth = async () => {
  //   if (connectedDevice && isBluetoothSupported && BluetoothManager) {
  //     try {
  //       await BluetoothManager.disconnect();
  //     } catch (error) {
  //       console.error("Disconnect error:", error);
  //     }
  //   }
  //   setConnectedDevice(null);
  // };
  const disconnectBluetooth = async () => {
    // Tambahkan Alert untuk konfirmasi pemutusan koneksi
    if (!connectedDevice) return;

    Alert.alert(
      "Putuskan Koneksi",
      `Apakah Anda yakin ingin memutus koneksi dari ${connectedDevice.name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Putuskan",
          onPress: async () => {
            if (connectedDevice && isBluetoothSupported && BluetoothManager) {
              try {
                // Cek apakah disconnect memerlukan mac address,
                // jika tidak, panggil tanpa argumen seperti kode Anda:
                await BluetoothManager.disconnect();

                // Opsional: Hapus MAC address dari penyimpanan
                // agar koneksi otomatis tidak mencoba menyambung kembali
                await AsyncStorage.removeItem(LAST_CONNECTED_PRINTER_KEY);

                Alert.alert(
                  "Berhasil",
                  `Koneksi ke ${connectedDevice.name} telah diputus.`
                );
              } catch (error) {
                console.error("Disconnect error:", error);
                Alert.alert("Gagal", "Gagal memutus koneksi printer.");
              }
            }
            setConnectedDevice(null);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const printQRCodeBluetooth = async (orderData: SalesOrderData) => {
    if (!BluetoothEscposPrinter) return;

    try {
      // Generate QR data
      const qrData = generateQRData(orderData);

      // Beri jarak sebelum QR code
      await BluetoothEscposPrinter.printAndFeed(2);

      // Center the QR code
      await BluetoothEscposPrinter.printText("\n", {});

      // Print QR Code menggunakan ESC/POS commands
      // Ukuran QR code (1-16, biasanya 3-6 untuk thermal printer)
      const qrSize = 4;

      // Error correction level: L(7%), M(15%), Q(25%), H(30%)
      const errorCorrectionLevel = "M";

      // Print QR code menggunakan command ESC/POS
      await BluetoothEscposPrinter.printQRCode(
        qrData,
        qrSize,
        errorCorrectionLevel
      );

      // Beri jarak setelah QR code
      await BluetoothEscposPrinter.printAndFeed(1);

      // Print teks di bawah QR code
      await BluetoothEscposPrinter.printText(
        centerTextThermal("VERIFIKASI DIGITAL") + "\n",
        {}
      );
      await BluetoothEscposPrinter.printText(
        centerTextThermal(`SO: ${orderData.no_so}`) + "\n",
        {}
      );
      await BluetoothEscposPrinter.printText(
        centerTextThermal("SCAN UNTUK DETAIL") + "\n",
        {}
      );

      await BluetoothEscposPrinter.printAndFeed(2);
    } catch (error) {
      console.error("❌ QR Code print failed:", error);
      // Fallback: print text pattern jika QR code gagal
      await BluetoothEscposPrinter.printAndFeed(1);
      await BluetoothEscposPrinter.printText(
        centerTextThermal("VERIFIKASI DIGITAL") + "\n",
        {}
      );
      await BluetoothEscposPrinter.printText(
        centerTextThermal("(QR CODE GAGAL DICETAK)") + "\n",
        {}
      );
      await BluetoothEscposPrinter.printText(
        centerTextThermal(`SO: ${orderData.no_so}`) + "\n",
        {}
      );
      await BluetoothEscposPrinter.printAndFeed(1);
    }
  };

  // Helper function untuk center text di thermal printer
  const centerTextThermal = (text: string): string => {
    const PRINT_WIDTH = 32;
    if (text.length >= PRINT_WIDTH) return text;

    const padding = Math.floor((PRINT_WIDTH - text.length) / 2);
    return " ".repeat(Math.max(0, padding)) + text;
  };

  // ================== Print via Bluetooth ==================
  const printWithRealBluetooth = async (includeQRCode: boolean = true) => {
    if (!BluetoothEscposPrinter || !BluetoothManager || !orderData) {
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

        if (includeQRCode) {
          await printQRCodeBluetooth(orderData);
        }
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
      Alert.alert("Berhasil", "Sales Order berhasil dicetak!");
    } catch (error: any) {
      console.error("❌ Real Bluetooth failed:", error);
      throw error;
    }
  };

  const printViaBluetooth = async () => {
    if (!orderData) {
      Alert.alert("Error", "Data order tidak tersedia");
      return;
    }

    try {
      setPrinting(true);

      if (isBluetoothSupported && BluetoothEscposPrinter) {
        await BluetoothEscposPrinter.printerInit();

        // 1. Print sales order text
        const printText = generatePrintText();
        // const qrData = `SO:${orderData?.no_so}|TOTAL:${orderData?.total}`;
        const qrData = JSON.stringify({
          t: "SO",
          n: orderData?.no_so,
          d: orderData?.tgl_so,
          a: orderData?.total,
          c: orderData?.nama_cust?.substring(0, 15),
        });

        await BluetoothEscposPrinter.printText(printText + "\n", {});

        // 2. Print Barcode Section
        await BluetoothEscposPrinter.printAndFeed(3);
        await BluetoothEscposPrinter.printText("KODE VERIFIKASI\n", {});
        await BluetoothEscposPrinter.printText("==================\n", {});
        // GANTI DENGAN INI UNTUK MENCETAK QR CODE:
        await BluetoothEscposPrinter.printQRCode(
          qrData, // Data yang akan di-encode
          200, // Ukuran (250 adalah nilai umum untuk ukuran medium)
          2 // (Beberapa library meminta dua kali nilai ukuran)
        );

        // 3. Print info
        await BluetoothEscposPrinter.printAndFeed(2);
        await BluetoothEscposPrinter.printText("VERIFIKASI DIGITAL\n", {});
        await BluetoothEscposPrinter.printText(`SO: ${orderData.no_so}\n`, {});
        await BluetoothEscposPrinter.printText("SCAN UNTUK DETAIL\n", {});

        // 4. Finish
        if (BluetoothEscposPrinter.cut) {
          await BluetoothEscposPrinter.cut();
        } else {
          await BluetoothEscposPrinter.printAndFeed(6); // Extra feed jika cut tidak ada
        }

        Alert.alert("✅ Berhasil", "Sales Order berhasil dicetak!");
      } else {
        setShowPreview(true);
      }
    } catch (error: any) {
      console.error("❌ Print error:", error);
      Alert.alert("❌ Print Gagal", "Gagal mencetak");
    } finally {
      setPrinting(false);
    }
  };

  // Helper function untuk print barcode text fallback
  const printTextBarcode = async (barcodeData: string) => {
    await BluetoothEscposPrinter.printText("┌──────────────────┐\n", {});
    await BluetoothEscposPrinter.printText("│  ║║║║║║║║║║║║  │\n", {});
    await BluetoothEscposPrinter.printText("│  ║║║║║║║║║║║║  │\n", {});
    await BluetoothEscposPrinter.printText(`│    ${barcodeData}    │\n`, {});
    await BluetoothEscposPrinter.printText("└──────────────────┘\n", {});
  };

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
      Alert.alert("Error", "Gagal membuat PDF: " + (error.message || error));
    } finally {
      setPrinting(false);
    }
  };

  // const generatePDFHTML = () => {
  //   if (!orderData) return "";
  //   const diskonDetail =
  //     orderData.summary?.diskon_detail ??
  //     orderData.items.reduce((sum, item) => sum + (item.diskon_value || 0), 0);
  //   return `
  //     <!DOCTYPE html>
  //     <html>
  //     <head>
  //       <meta charset="utf-8">
  //       <title>Sales Order - ${orderData.kode_so}</title>
  //       <style>
  //         body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
  //         .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
  //         .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
  //         .document-title { font-size: 18px; font-weight: bold; margin-top: 20px; }
  //         .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
  //         .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  //         .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  //         .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
  //         .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
  //         .total { text-align: right; font-weight: bold; margin-top: 20px; font-size: 16px; }
  //       </style>
  //     </head>
  //     <body>
  //       <div class="header">
  //         <div class="company-name">${orderData.perusahaan.nama}</div>
  //         <div>${orderData.perusahaan.alamat}</div>
  //         <div>${orderData.perusahaan.kota} - Telp: ${
  //     orderData.perusahaan.telepon
  //   }</div>
  //         <div class="document-title">SALES ORDER - ${orderData.kode_so}</div>
  //       </div>
  //       <div class="info-section">
  //         <div>
  //           <strong>Kepada:</strong><br>
  //           ${orderData.nama_cust}<br>
  //           ${orderData.alamat}<br>
  //           ${orderData.kota_kirim || ""}<br>
  //           ${orderData.hp ? `Telp: ${orderData.hp}` : ""}
  //         </div>
  //         <div>
  //           <strong>Info Order:</strong><br>
  //           Tanggal: ${formatDateShort(orderData.tgl_so)}<br>
  //           Sales: ${orderData.nama_sales}<br>
  //           Status: ${orderData.status}<br>
  //           ${
  //             orderData.kode_termin
  //               ? `Termin: ${orderData.nama_termin}<br>`
  //               : ""
  //           }
  //           ${
  //             orderData.cara_kirim_deskripsi
  //               ? `Pengiriman: ${orderData.cara_kirim_deskripsi}<br>`
  //               : ""
  //           }
  //           Sync: ${orderData.synced === "Y" ? "SYNCED" : "PENDING"}
  //         </div>
  //       </div>
  //       ${
  //         orderData.keterangan
  //           ? `<div style="margin-bottom:20px;"><strong>Keterangan:</strong><br>${orderData.keterangan}</div>`
  //           : ""
  //       }
  //       <table class="table">
  //         <thead>
  //           <tr>
  //             <th>No</th><th>Item</th><th>Qty</th><th>Harga</th><th>Diskon</th><th>Subtotal</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           ${orderData.items
  //             .map(
  //               (item, i) => `
  //             <tr>
  //               <td>${i + 1}</td>
  //               <td>${item.nama_item}</td>
  //               <td>${item.quantity}</td>
  //               <td>${formatCurrency(item.harga)}</td>
  //               <td>${
  //                 item.diskon_value > 0
  //                   ? "-" + formatCurrency(item.diskon_value)
  //                   : "-"
  //               }</td>
  //               <td>${formatCurrency(item.subtotal)}</td>
  //             </tr>
  //           `
  //             )
  //             .join("")}
  //         </tbody>
  //       </table>
  //       <div class="summary">
  //         <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(
  //           orderData.subtotal
  //         )}</span></div>
  //         ${
  //           diskonDetail > 0
  //             ? `<div class="summary-row"><span>Diskon Detail</span><span>-${formatCurrency(
  //                 diskonDetail
  //               )}</span></div>`
  //             : ""
  //         }
  //         ${
  //           orderData.diskon_header > 0
  //             ? `<div class="summary-row"><span>Diskon Header</span><span>-${formatCurrency(
  //                 orderData.diskon_header
  //               )}</span></div>`
  //             : ""
  //         }
  //         ${
  //           orderData.ppn_value > 0
  //             ? `<div class="summary-row"><span>PPN</span><span>+${formatCurrency(
  //                 orderData.ppn_value
  //               )}</span></div>`
  //             : ""
  //         }
  //         <div class="summary-row" style="border-top:1px solid #ddd; padding-top:8px; font-weight:bold;"><span>TOTAL</span><span>${formatCurrency(
  //           orderData.total
  //         )}</span></div>
  //       </div>
  //       <div style="text-align:center; font-size:12px; color:#666;">Dicetak pada: ${new Date().toLocaleString(
  //         "id-ID"
  //       )}</div>
  //     </body>
  //     </html>
  //   `;
  // };
  const generatePDFHTML = () => {
    if (!orderData) return "";
    const diskonDetail =
      orderData.summary?.diskon_detail ??
      orderData.items.reduce((sum, item) => sum + (item.diskon_value || 0), 0);

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
        .qr-section { text-align: center; margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .qr-title { font-weight: bold; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <!-- Existing content... -->

      <!-- Add QR Code Section -->
      <div class="qr-section">
        <div class="qr-title">Scan QR Code untuk Verifikasi</div>
        <div style="margin: 10px 0;">
          <!-- QR Code will be generated by the PDF printer -->
          <div style="display: inline-block; padding: 10px; border: 1px solid #ccc; background: white;">
            [QR Code: ${orderData.no_so}]
          </div>
        </div>
        <div style="font-size: 12px; color: #666;">
          SO: ${orderData.no_so} | Customer: ${orderData.nama_cust}
        </div>
      </div>

      <div style="text-align:center; font-size:12px; color:#666;">
        Dicetak pada: ${new Date().toLocaleString("id-ID")}
      </div>
    </body>
    </html>
  `;
  };
  // ================== Render ==================
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Memuat data sales order...</Text>
      </SafeAreaView>
    );
  }
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
      {/* build info */}
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
        {/* <Text style={styles.buildText}>
          {isEASBuild ? `EAS ${buildProfile.toUpperCase()}` : "LOCAL DEV"}
        </Text> */}
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
          disabled={printing || (isBluetoothSupported && !connectedDevice)}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="print" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isBluetoothSupported
                  ? `Print Bluetooth${
                      connectedDevice ? " ke " + connectedDevice.name : ""
                    }` // Tampilkan nama printer jika terhubung
                  : "Preview / Export"}
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
            <Text style={styles.actionButtonText}>Putus Koneksi</Text>
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

        {/* <TouchableOpacity
          style={[styles.actionButton, styles.pdfButton]}
          onPress={handlePrintPDF}
          disabled={printing}
        >
          <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>PDF</Text>
        </TouchableOpacity> */}
      </View>

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

          {/* Informasi Customer & SO */}
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
                <Text style={styles.infoValue}>{orderData.no_so}</Text>
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
              {orderData.kode_termin && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Termin:</Text>
                  <Text style={styles.infoValue}>{orderData.nama_termin}</Text>
                </View>
              )}
              {orderData.cara_kirim_deskripsi && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pengiriman:</Text>
                  <Text style={styles.infoValue}>
                    {orderData.cara_kirim_deskripsi}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Keterangan */}
          {orderData.keterangan && (
            <View style={styles.remarksSection}>
              <Text style={styles.remarksLabel}>Keterangan:</Text>
              <Text style={styles.remarksText}>{orderData.keterangan}</Text>
            </View>
          )}

          {/* Tabel Items */}
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
                No. Item
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
              <View key={`${item.no_item}-${index}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colNo]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colKode]}>
                  {item.no_item}
                </Text>
                <Text style={[styles.tableCell, styles.colNama]}>
                  {item.nama_item}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.quantity}
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

          {/* Summary */}
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
                (sum, item) => sum + (item.diskon_value || 0),
                0
              )) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diskon Detail:</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -
                  {formatCurrency(
                    orderData.summary?.diskon_detail ??
                      orderData.items.reduce(
                        (sum, item) => sum + (item.diskon_value || 0),
                        0
                      )
                  )}
                </Text>
              </View>
            )}
            {orderData.diskon_header > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diskon Header:</Text>
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

          <View style={styles.printFooter}>
            <Text style={styles.printFooterText}>
              Dicetak pada: {new Date().toLocaleString("id-ID")} | Sumber:{" "}
              {orderData.sumber_data} | Sync: {orderData.synced}
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
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  sectionDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  qrPreview: {
    // alignItems: "center",
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  qrDataText: {
    fontSize: 10,
    marginTop: 8,
    color: "#666",
  },
  printButton: {
    backgroundColor: "#007bff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  printButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  qrPreviewSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    alignItems: "center",
  },
  qrPreviewDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#ddd",
    marginBottom: 16,
  },
  qrPreviewTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  qrCodeVisual: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrPreviewText: {
    fontSize: 12,
    color: "#333",
    marginBottom: 4,
    fontWeight: "500",
  },
  qrPreviewInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
    gap: 6,
  },
  qrPreviewInfoText: {
    fontSize: 11,
    color: "#007bff",
    fontWeight: "500",
    textAlign: "center",
  },
  qrContainer: {
    alignItems: "center",
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  qrPlaceholder: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    padding: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 4,
  },
  qrCaption: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
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
  customerAddress: { fontSize: 12, color: "#666", marginBottom: 2 },
  customerContact: { fontSize: 12, color: "#666" },
  infoRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  infoValue: { fontSize: 12 },
  remarksSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  remarksLabel: { fontWeight: "bold", marginBottom: 4, fontSize: 14 },
  remarksText: { fontSize: 12, color: "#666" },
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
  colKode: { width: "12%" },
  colNama: { width: "25%" },
  colQty: { width: "10%", textAlign: "center" },
  colHarga: { width: "15%", textAlign: "right" },
  colDiskon: { width: "12%", textAlign: "right" },
  colSubtotal: { width: "18%", textAlign: "right" },
  discountText: { color: "#F44336" },
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
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
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
