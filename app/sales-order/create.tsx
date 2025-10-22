// app/sales-order/create.tsx
import SalesOrderForm from "@/components/components/SalesOrderForm";
import React from "react";

export default function CreateSalesOrder() {
  return <SalesOrderForm mode="create" isEditable={true} />;
}
