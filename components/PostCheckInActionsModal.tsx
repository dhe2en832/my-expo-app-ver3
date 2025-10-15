// myExpoApp/components/PostCheckInActionsModal.tsx (Update)
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  PostCheckInAction,
  PostCheckInActionsModalProps
} from '../api/interface';

const PostCheckInActionsModal: React.FC<PostCheckInActionsModalProps> = ({
  visible,
  onClose,
  customerName,
  onOpenOrder,
  onCustomerVisit,
  onPayment,
  onStockCheck,
  onNotes,
  onSO,
  onCompetitorData,
}) => {
  const actions: PostCheckInAction[] = [
    // {
    //   id: "open-order",
    //   title: "Open Order",
    //   icon: "add-shopping-cart",
    //   color: "#4CAF50",
    //   onPress: onOpenOrder || onClose,
    // },
    // {
    //   id: "customer-visit",
    //   title: "Kunjungan\nCustomer",
    //   icon: "person",
    //   color: "#2196F3",
    //   onPress: onCustomerVisit || onClose,
    // },
    {
      id: "so",
      title: "SO",
      icon: "assignment",
      color: "#795548",
      onPress: onSO || onClose,
    },
    {
      id: "payment",
      title: "Tagihan",
      icon: "payment",
      color: "#FF9800",
      onPress: onPayment,
    },
    {
      id: "stock-check",
      title: "Cek Stok",
      icon: "inventory",
      color: "#9C27B0",
      onPress: onStockCheck,
    },
    {
      id: "notes",
      title: "Catatan",
      icon: "notes",
      color: "#607D8B",
      onPress: onNotes || onClose,
    },
    {
      id: "data-kompetitor",
      title: "Data Kompetitor",
      icon: "flag",
      color: "#2196F3",
      onPress: onCompetitorData || onClose,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.postCheckInModal}>
          {/* Header */}
          <View style={styles.postCheckInHeader}>
            <Text style={styles.postCheckInTitle}>Aksi Lanjutan</Text>
            <Text style={styles.postCheckInSubtitle}>
              Check-in berhasil di {"\n"}
              <Text style={styles.customerNameHighlight}>{customerName}</Text>
            </Text>
          </View>

          {/* Action Grid */}
          <View style={styles.postCheckInGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.postCheckInAction,
                  { backgroundColor: action.color },
                ]}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
              >
                <MaterialIcons
                  name={action.icon as any}
                  size={28}
                  color="#fff"
                />
                <Text style={styles.postCheckInActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.postCheckInClose} onPress={onClose}>
            <Text style={styles.postCheckInCloseText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  postCheckInModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postCheckInHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  postCheckInTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  postCheckInSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  customerNameHighlight: {
    fontWeight: "bold",
    color: "#667eea",
    fontSize: 16,
  },
  postCheckInGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  postCheckInAction: {
    width: "48%",
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
  },
  postCheckInActionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 14,
  },
  postCheckInClose: {
    padding: 14,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    alignItems: "center",
  },
  postCheckInCloseText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default PostCheckInActionsModal;