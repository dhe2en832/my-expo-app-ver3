// my-expo-app/app/(tabs)/more.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import {
  CalendarCheck,
  MapPin,
  Target,
  BarChart3,
  Settings,
  User,
  HelpCircle,
  Shield,
} from "lucide-react-native";

interface MenuItemProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  onPress: () => void;
  color?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  title,
  icon,
  description,
  onPress,
  color = "#667eea",
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
      {icon}
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {description && <Text style={styles.menuDescription}>{description}</Text>}
    </View>
  </TouchableOpacity>
);

export default function MoreScreen() {
  const menuItems = [
    {
      title: "Absensi",
      description: "Catat kehadiran dan kunjungan",
      icon: <CalendarCheck color="#10B981" size={24} />,
      color: "#10B981",
      route: "/attendance",
    },
    {
      title: "RKS",
      description: "Rencana Kunjungan Sales",
      icon: <MapPin color="#8B5CF6" size={24} />,
      color: "#8B5CF6",
      route: "/rks",
    },
    {
      title: "Target",
      description: "Lihat dan kelola target penjualan",
      icon: <Target color="#EC4899" size={24} />,
      color: "#EC4899",
      route: "/target",
    },
    {
      title: "Laporan",
      description: "Analisis performa penjualan",
      icon: <BarChart3 color="#6366F1" size={24} />,
      color: "#6366F1",
      route: "/reports",
    },
    {
      title: "Profil",
      description: "Kelola akun dan informasi pribadi",
      icon: <User color="#3B82F6" size={24} />,
      color: "#3B82F6",
      route: "/profile",
    },
    {
      title: "Pengaturan",
      description: "Pengaturan aplikasi dan notifikasi",
      icon: <Settings color="#6B7280" size={24} />,
      color: "#6B7280",
      route: "/settings",
    },
    {
      title: "Bantuan",
      description: "Panduan penggunaan aplikasi",
      icon: <HelpCircle color="#F59E0B" size={24} />,
      color: "#F59E0B",
      route: "/help",
    },
    {
      title: "Privasi & Keamanan",
      description: "Pengaturan privasi dan keamanan",
      icon: <Shield color="#EF4444" size={24} />,
      color: "#EF4444",
      route: "/privacy",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Menu Lainnya</Text>
          <Text style={styles.subtitle}>
            Akses fitur lainnya yang tersedia
          </Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <MenuItem
              key={index}
              title={item.title}
              description={item.description}
              icon={item.icon}
              color={item.color}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 22,
  },
  menuGrid: {
    padding: 20,
    gap: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
});