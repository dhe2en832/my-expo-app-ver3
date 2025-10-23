// app/sales-order/[id].tsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import SalesOrderForm from "@/components/sales-order/SalesOrderForm";

export default function EditSalesOrder() {
  const params = useLocalSearchParams();
  const { id, status, isEditable } = params;
  const isEditableForm =
    isEditable === "true" ||
    status === "draft" ||
    (Array.isArray(status)
      ? status[0].toLowerCase() === "terbuka"
      : status?.toLowerCase() === "terbuka");
  return (
    <SalesOrderForm
      mode="edit"
      orderId={id as string}
      // isEditable={isEditable === "true" || status === "draft"}
      isEditable={isEditableForm}
    />
  );
}
