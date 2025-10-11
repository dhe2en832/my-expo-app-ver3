// contexts/OfflineContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useMemo, useCallback } from "react";
import { rksAPI } from "../api/services";
import { getPendingRKSLocal, updateRKSLocal } from "../utils/database";

interface OfflineContextType {
  isOnline: boolean;
  addToQueue: (type: string) => void;
  processQueue: () => Promise<void>;
}

export const [OfflineProvider, useOfflineQueue] =
  createContextHook<OfflineContextType>(() => {
    const [isOnline] = useState<boolean>(true);

    const addToQueue = useCallback((type: string) => {
      console.log("Added to offline queue (SQLite):", type);
    }, []);

    const processQueue = useCallback(async () => {
      try {
        const pendingRecords = await getPendingRKSLocal();
        if (pendingRecords.length === 0) return;

        const syncResult = await rksAPI.syncRKS(pendingRecords);
        if (syncResult.success) {
          for (const record of pendingRecords) {
            await updateRKSLocal(record.id, { status: "synced" });
          }
          console.log(
            `[OfflineContext] Synced ${pendingRecords.length} records`
          );
        }
      } catch (error) {
        console.error("[OfflineContext] Process queue error:", error);
      }
    }, []);

    return useMemo(
      () => ({
        isOnline,
        addToQueue,
        processQueue,
      }),
      [isOnline, addToQueue, processQueue]
    );
  });