// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { startAutoSync } from "@/utils/autoSync";
import { initDatabase, resetRKSLocalTable } from "@/utils/database";
import { SyncLoadingOverlay } from "@/components/SyncLoadingOverlay ";
import * as Notifications from "expo-notifications";
import type { NotificationBehavior } from "expo-notifications";
import { PaperProvider } from "react-native-paper";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncMessage, setSyncMessage] = useState("Menginisialisasi database");
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const requestPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permission not granted");
      }
    };

    requestPermission();
  }, []);

  // ✅ Mulai auto-sync saat layout pertama kali dimuat
  // Gunakan useEffect dengan array dependency kosong
  useEffect(() => {
    const initAndSync = async () => {
      try {
        const startTime = Date.now();

        // Step 1: Initialize Database
        console.log("[App] Initializing local database...");
        setSyncMessage("Menginisialisasi database");
        setSyncProgress(0);

        await initDatabase();
        console.log("[App] Database initialized ✅");
        await resetRKSLocalTable();

        // Step 2: Start Auto Sync
        console.log("[App] Starting auto sync...");
        setSyncMessage("Sinkronisasi otomatis");
        setSyncProgress(30);

        const unsubscribe = startAutoSync();

        // Step 3: Monitor sync progress (opsional)
        // Jika Anda ingin track progress sync lebih detail,
        // Anda bisa pass callback atau observable ke startAutoSync
        setSyncProgress(60);

        // Step 4: Complete
        // Tunggu minimal 1.5 detik untuk animasi terlihat bagus
        const minLoadingTime = 1500;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        setTimeout(() => {
          setSyncProgress(100);
          setSyncMessage("Sinkronisasi selesai");

          // Delay sebelum benar-benar hide overlay
          setTimeout(() => {
            setIsSyncing(false);
            console.log("[App] Sync completed ✅");
          }, 500);
        }, remainingTime);

        return () => unsubscribe();
      } catch (error) {
        console.error("[App] Error initializing DB:", error);
        // Tetap lanjutkan meski ada error
        setSyncProgress(100);
        setSyncMessage("Terjadi kesalahan");

        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    };

    initAndSync();
  }, []);

  // Auto hide overlay ketika progress mencapai 100%
  // GAK DIPAKE NIH
  // useEffect(() => {
  //   const initAndSync = async () => {
  //     try {
  //       const startTime = Date.now();

  //       // Step 1: Initialize Database
  //       console.log("[App] Initializing local database...");
  //       setSyncMessage("Menginisialisasi database");
  //       setSyncProgress(0);

  //       await initDatabase();
  //       console.log("[App] Database initialized ✅");

  //       // Step 2: Start Auto Sync
  //       console.log("[App] Starting auto sync...");
  //       setSyncMessage("Sinkronisasi otomatis");
  //       setSyncProgress(30);

  //       const unsubscribe = startAutoSync();

  //       // Step 3: Monitor sync progress (opsional)
  //       // Jika Anda ingin track progress sync lebih detail,
  //       // Anda bisa pass callback atau observable ke startAutoSync
  //       setSyncProgress(60);

  //       // Step 4: Complete
  //       // Tunggu minimal 1.5 detik untuk animasi terlihat bagus
  //       const minLoadingTime = 1500;
  //       const elapsedTime = Date.now() - startTime;
  //       const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

  //       setTimeout(() => {
  //         setSyncProgress(100);
  //         setSyncMessage("Sinkronisasi selesai");

  //         // Delay sebelum benar-benar hide overlay
  //         setTimeout(() => {
  //           setIsSyncing(false);
  //           console.log("[App] Sync completed ✅");
  //         }, 500);
  //       }, remainingTime);

  //       return () => unsubscribe();
  //     } catch (error) {
  //       console.error("[App] Error initializing DB:", error);
  //       // Tetap lanjutkan meski ada error
  //       setSyncProgress(100);
  //       setSyncMessage("Terjadi kesalahan");

  //       setTimeout(() => {
  //         setIsSyncing(false);
  //       }, 1000);
  //     }
  //   };

  //   initAndSync();
  // }, []);

  // Auto hide overlay ketika progress mencapai 100%
  // useEffect(() => {
  //   if (syncProgress === 100) {
  //     const timer = setTimeout(() => {
  //       setIsSyncing(false);
  //       console.log("[App] Sync completed ✅");
  //     }, 800); // Delay kecil untuk smooth transition

  //     return () => clearTimeout(timer);
  //   }
  // }, [syncProgress]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider>
          <AuthProvider>
            <OfflineProvider>
              <OrderProvider>
                {/* Sync Loading Overlay */}
                {/* Sync Loading Overlay */}
                {/* <SyncLoadingOverlay
                isVisible={isSyncing}
                message={syncMessage}
                progress={syncProgress}
              /> */}
                {/* <SyncLoadingOverlay isVisible={isSyncing} message={syncMessage} /> */}

                <Stack screenOptions={{ headerBackTitle: "Back" }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  {/* <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal" }}
                />
                <Stack.Screen
                  name="customers/index"
                  options={{ title: "Daftar Pelanggan" }}
                />
                <Stack.Screen
                  name="rks/create"
                  options={{ title: "Buat RKS" }}
                />
                <Stack.Screen
                  name="rks/detail"
                  options={{ title: "Detail RKS" }}
                />
                <Stack.Screen name="rks/edit" options={{ title: "Edit RKS" }} />
                <Stack.Screen
                  name="sales-order/create"
                  options={{ title: "Buat Pesanan Penjualan" }}
                />
                <Stack.Screen
                  name="sales-order/edit/[id]"
                  options={{ title: "Edit Pesanan Penjualan" }}
                />
                <Stack.Screen
                  name="sales-order/[id]"
                  options={{ title: "Detail Pesanan Penjualan" }}
                />
                <Stack.Screen
                  name="collection/invoice/[id]"
                  options={{ title: "Detail Invoice" }}
                />
                <Stack.Screen
                  name="collection/print/[id]"
                  options={{ title: "Cetak Invoice" }}
                />
                <Stack.Screen
                  name="collection/record/[id]"
                  options={{ title: "Detail Rekaman" }}
                />
                <Stack.Screen
                  name="inventory/adjustment/create"
                  options={{ title: "Buat Penyesuaian Stok Barang" }}
                />
                <Stack.Screen
                  name="inventory/product/[id]"
                  options={{ title: "Detail Produk" }}
                />
                <Stack.Screen
                  name="+not-found"
                  options={{ title: "Halaman Tidak Ditemukan" }}
                /> */}
                </Stack>
              </OrderProvider>
            </OfflineProvider>
          </AuthProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
