// app/sales-order/create.tsx
import SalesOrderForm from "@/components/sales-order/SalesOrderForm";
import React from "react";

export default function CreateSalesOrder() {
  return <SalesOrderForm mode="create" isEditable={true} />;
}
