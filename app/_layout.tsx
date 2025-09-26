// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { OrderProvider } from "@/contexts/OrderContext";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <OfflineProvider>
            <OrderProvider>
              <Stack screenOptions={{ headerBackTitle: "Back" }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                <Stack.Screen name="rks/create" options={{ title: 'Buat RKS' }} />
                <Stack.Screen name="rks/detail" options={{ title: 'Detail RKS' }} />
                <Stack.Screen name="rks/edit" options={{ title: 'Edit RKS' }} />
                <Stack.Screen name="sales-order/create" options={{ title: 'Buat Pesanan Penjualan' }} />
                <Stack.Screen name="sales-order/edit/[id]" options={{ title: 'Edit Pesanan Penjualan' }} />
                <Stack.Screen name="sales-order/[id]" options={{ title: 'Detail Pesanan Penjualan' }} />
                <Stack.Screen name="collection/invoice/[id]" options={{ title: 'Detail Invoice' }} />
                <Stack.Screen name="collection/print/[id]" options={{ title: 'Cetak Invoice' }} />
                <Stack.Screen name="collection/record/[id]" options={{ title: 'Detail Rekaman' }} />
                <Stack.Screen name="inventory/adjustment/create" options={{ title: 'Buat Penyesuaian Stok Barang' }} />
                <Stack.Screen name="inventory/product/[id]" options={{ title: 'Detail Produk' }} />
                <Stack.Screen name="+not-found" options={{ title: 'Halaman Tidak Ditemukan' }} />
              </Stack>
            </OrderProvider>
          </OfflineProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}