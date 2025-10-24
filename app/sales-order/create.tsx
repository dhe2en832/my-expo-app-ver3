// app/sales-order/create.tsx
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import SalesOrderForm from "@/components/sales-order/SalesOrderForm";

export default function CreateSalesOrder() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SalesOrderForm mode="create" isEditable={true} />
    </SafeAreaView>
  );
}
