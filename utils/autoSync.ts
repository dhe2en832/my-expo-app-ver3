// myExpoApp/utils/autoSync.ts
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { rksAPI, customerAPI, fasmapAPI } from "../api/services";
import {
  getPendingRKSLocal,
  updateRKSLocal,
  getPendingCustomersLocal,
  updateCustomerLocalStatus,
  getAllFasMapLocal,
  deleteFasMapLocal,
} from "./database";
// Menghapus import karena SyncProgressTracker didefinisikan di sini:

/**
 * SyncProgressTracker
 * Kelas utility untuk melacak dan melaporkan progres multi-langkah ke komponen UI (LoginScreen).
 */
class SyncProgressTracker {
  private stepNames: string[];
  private stepWeights: number[];
  private currentStepIndex: number = 0;
  private baseProgress: number = 0; // Akumulasi progress dari langkah yang sudah selesai

  // Callbacks dari komponen UI
  private reportProgress: ((progress: number) => void) | null = null;
  private reportMessage: ((message: string) => void) | null = null;

  constructor(stepNames: string[]) {
    this.stepNames = stepNames;
    // Default weights: distribusi merata
    this.stepWeights = stepNames.map(() => 100 / stepNames.length);
  }

  setWeights(weights: number[]) {
    // Hanya set bobot jika jumlahnya sesuai dan totalnya 100 (opsional: untuk skenario multi-langkah)
    if (
      weights.length === this.stepNames.length &&
      weights.reduce((a, b) => a + b, 0) === 100
    ) {
      this.stepWeights = weights;
    }
  }

  onProgress(callback: (progress: number) => void) {
    this.reportProgress = callback;
  }

  onMessage(callback: (message: string) => void) {
    this.reportMessage = callback;
  }

  // Resolves Error 1
  startStep(message: string) {
    if (this.reportMessage) {
      this.reportMessage(`Memulai: ${message}`);
    }
  }

  // Resolves Error 3
  endStep() {
    // Akumulasi bobot langkah yang selesai
    this.baseProgress += this.stepWeights[this.currentStepIndex];
    this.currentStepIndex++;

    // Pastikan progress total 100% jika semua langkah selesai
    if (this.currentStepIndex >= this.stepNames.length) {
      if (this.reportProgress) this.reportProgress(100);
    }
  }

  /**
   * Mengupdate progress di dalam langkah saat ini.
   * @param stepProgressPercentage Persentase progress di dalam langkah ini (0-100).
   */
  updateProgress(stepProgressPercentage: number) {
    const currentStepWeight = this.stepWeights[this.currentStepIndex] || 0;

    // Hitung kontribusi langkah saat ini berdasarkan bobotnya
    const stepContribution = (stepProgressPercentage / 100) * currentStepWeight;

    // Total progress = progress langkah selesai + kontribusi langkah saat ini
    const totalProgress = this.baseProgress + stepContribution;

    if (this.reportProgress) {
      this.reportProgress(Math.min(100, totalProgress));
    }
  }

  updateMessage(message: string) {
    if (this.reportMessage) {
      this.reportMessage(message);
    }
  }
}

// Callback untuk progress dan message (Global State)
export let onSyncProgress: ((progress: number) => void) | null = null;
export let onSyncMessage: ((message: string) => void) | null = null;

/**
 * Menetapkan callback dari komponen React ke variabel global di sini.
 */
export function setSyncCallbacks(
  onProgress: (progress: number) => void,
  onMessage: (message: string) => void
) {
  onSyncProgress = onProgress;
  onSyncMessage = onMessage;
}

let isSyncing = false;

/**
 * ✅ Fungsi untuk sync fasmap lokal ke server
 */
const syncPendingFasMaps = async (tracker: SyncProgressTracker | null) => {
  try {
    const pendingFasMaps = await getAllFasMapLocal();

    if (pendingFasMaps.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    let syncedCount = 0;

    if (tracker) {
      tracker.updateMessage(
        `Sinkronisasi ${pendingFasMaps.length} data fasmap...`
      );
    }

    for (const fasmap of pendingFasMaps) {
      try {
        const result = await fasmapAPI.saveFasMap({
          kode_cust: fasmap.kode_cust,
          latitude: fasmap.latitude,
          longitude: fasmap.longitude,
        });

        if (result.success) {
          await deleteFasMapLocal(fasmap.kode_cust);
          syncedCount++;

          if (tracker) {
            const progress = (syncedCount / pendingFasMaps.length) * 100;
            tracker.updateProgress(progress);
            tracker.updateMessage(
              `Sync fasmap: ${syncedCount}/${pendingFasMaps.length}`
            );
          }
        }
      } catch (error) {
        console.error(
          `[AutoSync] Gagal sync fasmap untuk ${fasmap.kode_cust}:`,
          error
        );
      }
    }

    console.log(`[AutoSync] Synced ${syncedCount} fasmap records`);
    return { success: true, syncedCount };
  } catch (error) {
    console.error("[AutoSync] Error during syncPendingFasMaps:", error);
    return { success: false, syncedCount: 0 };
  }
};

/**
 * Fungsi inti untuk menyinkronkan data yang tertunda (RKS, Customer, FasMap)
 * Menerima SyncProgressTracker untuk melaporkan progres per record.
 */
const syncPendingRecords = async (tracker: SyncProgressTracker | null) => {
  try {
    const pendingRKS = await getPendingRKSLocal();
    const pendingCustomers = await getPendingCustomersLocal();
    const pendingFasMaps = await getAllFasMapLocal();

    const totalRecords =
      pendingRKS.length + pendingCustomers.length + pendingFasMaps.length;
    let syncedCount = 0;

    // Jika ada tracker, laporkan langkah sync data
    if (tracker) {
      tracker.startStep("Sinkronisasi Data (RKS, Customer, FasMap)"); // Resolves Error 1
    }

    // Jika tidak ada record, langsung selesaikan tracker jika ada
    if (totalRecords === 0) {
      if (tracker) {
        tracker.updateProgress(100); // Resolves Error 2 (karena sekarang updateProgress punya argumen)
        tracker.endStep(); // Resolves Error 3
      }
      return;
    }

    // --- Fungsi Helper untuk Update Progress Real-Time ---
    const updateProgress = (tableName: string, currentCount: number) => {
      syncedCount = currentCount;
      if (tracker) {
        // Hitung persentase progres dalam langkah ini berdasarkan jumlah record
        const stepProgress = (syncedCount / totalRecords) * 100;
        tracker.updateProgress(stepProgress);
        tracker.updateMessage(
          `Sync ${tableName}: ${syncedCount}/${totalRecords} records`
        );
      }
    };

    // ✅ Sync FasMap (prioritas pertama karena diperlukan untuk check-in)
    if (pendingFasMaps.length > 0) {
      const fasmapResult = await syncPendingFasMaps(tracker);
      updateProgress("FasMap", fasmapResult.syncedCount);
    }

    // ✅ Sync RKS
    if (pendingRKS.length > 0) {
      const syncRKSResult = await rksAPI.syncRKS(pendingRKS);
      if (syncRKSResult.success) {
        for (const record of pendingRKS) {
          await updateRKSLocal(record.id, { status: "synced" });
          updateProgress("RKS", syncedCount + 1);
        }
        console.log(`[AutoSync] Synced ${pendingRKS.length} RKS records`);
      }
    }

    // ✅ Sync Customer Baru (NOO)
    if (pendingCustomers.length > 0) {
      for (const cust of pendingCustomers) {
        const res = await customerAPI.createNewCustomer({
          name: cust.name,
          store_name: cust.store_name || "",
          address: cust.address,
          phone: cust.phone || "",
          city: cust.city || "",
          latitude: cust.latitude,
          longitude: cust.longitude,
          kode_sales: cust.kode_sales,
        });

        if (res.success) {
          await updateCustomerLocalStatus(cust.id, "synced");
          updateProgress("Customer", syncedCount + 1);
          console.log(`[AutoSync] Synced customer: ${cust.name}`);
        }
      }
    }

    if (tracker) tracker.endStep(); // Selesaikan langkah tracker
  } catch (error) {
    console.error("[AutoSync] Error during syncPendingRecords:", error);
    throw error; // Lempar kembali agar error ditangkap di LoginScreen
  }
};

/**
 * 1. FUNGSI UNTUK SINKRONISASI AWAL (WAJIB DI-AWAIT)
 * Ini adalah fungsi yang dipanggil HANYA SEKALI setelah login berhasil.
 */
export const performInitialFullSync = async () => {
  // Tracker untuk progress di LoginScreen (10% - 90%)
  const tracker = new SyncProgressTracker(["Sinkronisasi Data"]);
  tracker.setWeights([100]); // 100% dari langkah sync

  if (onSyncProgress) tracker.onProgress(onSyncProgress);
  if (onSyncMessage) tracker.onMessage(onSyncMessage);

  // Tunggu hingga sync data selesai
  await syncPendingRecords(tracker);
};

/**
 * 2. FUNGSI UNTUK AUTO SYNC DI BACKGROUND (LISTENER)
 * Ini adalah fungsi yang berjalan terus-menerus setelah initial sync.
 */
export const startAutoSync = () => {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected && !isSyncing) {
      isSyncing = true;
      // Tracker diset null karena kita tidak ingin mengganggu progress overlay
      syncPendingRecords(null).finally(() => {
        isSyncing = false;
      });
    }
  });
  return unsubscribe;
};

/**
 * ✅ Fungsi untuk manual sync fasmap (bisa dipanggil dari UI)
 */
export const manualSyncFasMaps = async (): Promise<{
  success: boolean;
  syncedCount: number;
}> => {
  try {
    const result = await syncPendingFasMaps(null);
    return result;
  } catch (error) {
    console.error("[ManualSync] Error syncing fasmaps:", error);
    return { success: false, syncedCount: 0 };
  }
};