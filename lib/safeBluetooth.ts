// src/lib/safeBluetooth.ts
import { Platform } from "react-native";

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

try {
  // Coba load modul berbasis native
  const M = require("react-native-bluetooth-escpos-printer");

  if (M?.BluetoothManager && M?.BluetoothEscposPrinter) {
    BluetoothManager = M.BluetoothManager;
    BluetoothEscposPrinter = M.BluetoothEscposPrinter;
    console.log("🔵 ESC/POS native module loaded");
  } else {
    console.log("🟡 ESC/POS module detected but native part missing");
  }
} catch (err) {
  console.log("🟡 ESC/POS not available — using simulation mode", err);
}

export const SafeBluetooth = {
  isAvailable:
    Platform.OS === "android" &&
    BluetoothManager !== null &&
    BluetoothEscposPrinter !== null,

  BluetoothManager,
  BluetoothEscposPrinter,
};
