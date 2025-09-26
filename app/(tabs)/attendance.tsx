// app/(tabs)/attendance.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Clock, CheckCircle, XCircle } from "lucide-react-native";
import { AttendanceRecord } from "@/api/mockData";

export default function AttendancePage() {
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("attendanceHistory");
      const arr: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
      const todayStr = new Date().toDateString();
      setTodayRecords(
        arr.filter((r) => new Date(r.timestamp).toDateString() === todayStr)
      );
    } catch (err) {
      console.error("loadAttendance error:", err);
      setTodayRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();

    // listen for updates from RKS
    const listener = DeviceEventEmitter.addListener("attendanceUpdated", () => {
      loadAttendance();
    });

    return () => listener.remove();
  }, []);

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordType}>
            {item.type === "check-in" ? "Check In" : "Check Out"}
          </Text>
          <Text style={styles.recordTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <View
          style={[
            styles.recordStatus,
            {
              backgroundColor:
                item.type === "check-in" ? "#4CAF50" : "#f44336",
            },
          ]}
        >
          {item.type === "check-in" ? (
            <CheckCircle color="white" size={16} />
          ) : (
            <XCircle color="white" size={16} />
          )}
        </View>
      </View>
      <View style={styles.recordDetails}>
        <Image source={{ uri: item.photo }} style={styles.recordPhoto} />
        <View style={styles.recordLocation}>
          <Text style={styles.recordAddress}>{item.location.address}</Text>
          <Text style={styles.recordCoords}>
            {item.location.latitude.toFixed(6)}, {item.location.longitude.toFixed(6)}
          </Text>
          <Text style={styles.recordAccuracy}>
            Accuracy: ±{item.location.accuracy.toFixed(0)}m
          </Text>
          {item.notes && <Text style={{ color: "#f44336" }}>{item.notes}</Text>}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Absensi Hari Ini</Text>
        {todayRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock color="#ccc" size={48} />
            <Text style={styles.emptyText}>No attendance records today</Text>
          </View>
        ) : (
          <FlatList
            data={todayRecords}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  section: { padding: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: { color: "#999", marginTop: 12 },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
  },
  recordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recordInfo: {},
  recordType: { fontWeight: "700", fontSize: 14 },
  recordTime: { fontSize: 12, color: "#666", marginTop: 2 },
  recordStatus: { padding: 4, borderRadius: 6 },
  recordDetails: { flexDirection: "row", marginTop: 8 },
  recordPhoto: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  recordLocation: { flex: 1 },
  recordAddress: { fontWeight: "600", fontSize: 14 },
  recordCoords: { color: "#666", fontSize: 12, marginTop: 2 },
  recordAccuracy: { color: "#999", fontSize: 12, marginTop: 2 },
});
