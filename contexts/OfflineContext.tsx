// contexts/OfflineContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useMemo, useCallback } from 'react';

interface QueueItem {
  id: string;
  type: string;
  data: any;
  endpoint: string;
  method?: string;
  timestamp: string;
  retryCount: number;
}

interface OfflineContextType {
  queueItems: QueueItem[];
  isOnline: boolean;
  addToQueue: (item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
}

export const [OfflineProvider, useOfflineQueue] = createContextHook<OfflineContextType>(() => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isOnline] = useState<boolean>(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const storedQueue = await AsyncStorage.getItem('offlineQueue');
      if (storedQueue) {
        setQueueItems(JSON.parse(storedQueue));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  };

  const saveQueue = async (items: QueueItem[]) => {
    try {
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  };

  const sanitizeData = (data: any) => {
    const clone = { ...data };
    if (clone.photo && typeof clone.photo === 'string' && clone.photo.startsWith('file:')) {
      // jangan simpan file besar, pakai placeholder
      clone.photo = '[local-uri]';
    }
    return clone;
  };

  const addToQueue = useCallback((item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    try {
      const queueItem: QueueItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        data: sanitizeData(item.data),
      };

      const updatedQueue = [...queueItems, queueItem];
      setQueueItems(updatedQueue);
      saveQueue(updatedQueue);

      console.log('Added to offline queue:', queueItem);
    } catch (error) {
      console.error('Error adding to queue:', error);
      // jangan crash app
    }
  }, [queueItems]);

  const processQueue = useCallback(async () => {
    if (queueItems.length === 0) return;

    console.log('Processing offline queue:', queueItems.length, 'items');

    const remaining: QueueItem[] = [];

    for (const item of queueItems) {
      try {
        console.log('Processing item:', item.type, item.data);
        // TODO: ganti dengan call API nyata
        // sementara ini, kita anggap semua sukses -> tidak disimpan lagi
      } catch (err) {
        console.error('Error processing item:', item.id, err);
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }

    setQueueItems(remaining);
    saveQueue(remaining);
  }, [queueItems]);

  const clearQueue = useCallback(() => {
    setQueueItems([]);
    AsyncStorage.removeItem('offlineQueue');
  }, []);

  return useMemo(() => ({
    queueItems,
    isOnline,
    addToQueue,
    processQueue,
    clearQueue,
  }), [queueItems, isOnline, addToQueue, processQueue, clearQueue]);
});
