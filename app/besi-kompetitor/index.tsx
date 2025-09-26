// app/besi-competitor/index.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Stack, useRouter,useLocalSearchParams, useFocusEffect } from "expo-router";
import { competitorBesiAPI } from "../../api/services";
import { BesiCompetitor } from "../../api/mockData";
import { SafeAreaView } from "react-native-safe-area-context";
 
export default function CompetitorBesiList() {
  const router = useRouter();
  const [list, setList] = useState<BesiCompetitor[]>([]);
  const { rksId, customerName } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // 🔹 Sync otomatis offline queue → sementara di-comment
      // await competitorBesiAPI.syncOfflineQueue();
      setLoading(true);
      const resp = await competitorBesiAPI.getAll();
      if (resp.success && resp.data) {
        setList(resp.data); // ✅ ambil data sebelum setState
      }
    } catch (err) {
      console.error("Failed to load competitor besi data", err);
      Alert.alert("Error", "Gagal memuat data kompetitor");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    router.push({
      pathname: "/besi-kompetitor/create",
      params: { rksId, customerName },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={{ marginTop: 12 }}>Memproses...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{
          title: "Daftar Besi Kompetitor", // custom title
        }}
      />
      {/* <Text style={styles.title}>Daftar Besi Kompetitor</Text> */}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: "/besi-kompetitor/[id]",
                params: {
                  id: item.id,           // 🔹 penting! ID item dikirim
                  rksId: item.rksId,     // optional, biar bisa tampil customer
                  customerName: item.customerName,
                },
              })
            }
          >
            <Text style={styles.itemText} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemSub}>Qty: {item.quantity}</Text>
            <Text style={styles.itemSub} numberOfLines={1}>
              Customer: {item.customerName}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>Belum ada data kompetitor</Text>
        )}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>{
         router.push({
           pathname: "/besi-kompetitor/create",
           params: { rksId, customerName },
         })
        }
        }
      >
        <Text style={styles.addButtonText}>+ Tambah Data</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    borderRadius: 6,
    marginBottom: 8,
  },
  itemText: { fontWeight: "bold", fontSize: 16 },
  itemSub: { color: "#666", fontSize: 13, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  addButton: {
    backgroundColor: "#667eea",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },  
});
