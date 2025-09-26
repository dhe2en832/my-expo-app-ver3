// my-expo-app/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { House, ShoppingCart, Warehouse, Target, Coins, CalendarCheck, MapPin } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Absensi',
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rks"
        options={{
          title: 'RKS',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Tagihan',
          tabBarIcon: ({ color, size }) => <Coins color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Stok & Harga Barang',
          tabBarIcon: ({ color, size }) => <Warehouse color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sales-order"
        options={{
          title: 'Pesanan Penjualan',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="target"
        options={{
          title: 'Target',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
