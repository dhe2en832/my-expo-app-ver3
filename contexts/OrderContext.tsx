// contexts/OrderContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

type OrderContextType = {
  refreshOrders: () => void;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [trigger, setTrigger] = useState(0);

  const refreshOrders = useCallback(() => {
    setTrigger(prev => prev + 1);
  }, []);

  return (
    <OrderContext.Provider value={{ refreshOrders }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within OrderProvider');
  }
  return context;
}