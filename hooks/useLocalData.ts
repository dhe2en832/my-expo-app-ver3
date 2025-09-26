// hooks/useLocalData.ts
import { useEffect, useState } from 'react';
import { getCustomers, getSuppliers } from '../utils/database';

export const useLocalCustomers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Gagal muat customer lokal:', error);
    } finally {
      setLoading(false);
    }
  };

  return { customers, loading, refetch: loadCustomers };
};