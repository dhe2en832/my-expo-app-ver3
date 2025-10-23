// my-expo-app/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import {
  House,
  ShoppingCart,
  Warehouse,
  Coins,
  Users,
  CalendarCheck,
  MapPin,
} from "lucide-react-native";
import { Platform, View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function TabsLayout() {
  const { user } = useAuth();
  // console.log("user auth ", user);
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#667eea",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          // height: Platform.OS === "ios" ? 85 : 60,
          // paddingBottom: Platform.OS === "ios" ? 25 : 8,
          // paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      {/* PRIMARY FEATURES - Sering digunakan sehari-hari */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => <House color={color} size={22} />,
          headerRight: () => (
            <View style={{ paddingRight: 20 }}>
              {/* <Text style={styles.entitasLabel}>{user?.keterangan}</Text> */}
              <Text style={styles.entitasLabel}>
                [{user?.kodeCabang}] {user?.namaCabang}
              </Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="customers/index"
        options={{
          title: "Pelanggan",
          tabBarIcon: ({ color, size }) => <Users color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="rks"
        options={{
          title: "RKS",
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={22} />,
        }}
      />
      {/*
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Kunjungan",
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck color={color} size={22} />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="sales-order"
        options={{
          title: "Pesanan",
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart color={color} size={22} />
          ),
        }}
      />

      {/* SECONDARY FEATURES - Tetap accessible */}
      <Tabs.Screen
        name="collection"
        options={{
          title: "Tagihan",
          tabBarIcon: ({ color, size }) => <Coins color={color} size={22} />,
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: "Stok",
          tabBarIcon: ({ color, size }) => (
            <Warehouse color={color} size={22} />
          ),
        }}
      />

      {/* SEMBUNYIKAN YANG TIDAK PERLU DI TAB BAR */}
      <Tabs.Screen
        name="target"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="customers/create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="customers/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  entitasLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    // marginLeft: "auto",
    flexShrink: 1,
  },
});
