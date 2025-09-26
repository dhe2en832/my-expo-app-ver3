// app/(tabs)/index.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  ShoppingCart,
  DollarSign,
  Package,
  Target,
  TrendingUp,
  Users,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import ProgressBar from '@/components/ProgressBar';
import { getGreeting } from '@/utils/helpers';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <LinearGradient
      colors={[color, `${color}CC`]}
      style={styles.statGradient}
    >
      <View style={styles.statIcon}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

interface QuickActionProps {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, icon, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <View style={styles.quickActionIcon}>
      {icon}
    </View>
    <Text style={styles.quickActionText}>{title}</Text>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Sales Rep'}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            title="Penjualan Hari ini"
            value="Rp. 12,450"
            icon={<TrendingUp color="white" size={24} />}
            color="#4CAF50"
            onPress={() => router.push('/sales-order')}
          />
          <StatCard
            title="Tagihan"
            value="Rp. 8,200"
            icon={<DollarSign color="white" size={24} />}
            color="#2196F3"
            onPress={() => router.push('/collection')}
          />
          <StatCard
            title="Data Pelanggan"
            value="24"
            icon={<Users color="white" size={24} />}
            color="#FF9800"
            onPress={() => router.push('/customers')}
          />
          <StatCard
            title="Data Absensi"
            value="6"
            icon={<Clock color="white" size={24} />}
            color="#9C27B0"
            onPress={() => router.push('/attendance')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title="Data Absensi"
              icon={<Camera color="#667eea" size={24} />}
              onPress={() => router.push('/attendance')}
            />
            <QuickAction
              title="RKS"
              icon={<MapPin color="#667eea" size={24} />}
              onPress={() => router.push('/rks')}
            />            
            <QuickAction
              title="Sales Order"
              icon={<ShoppingCart color="#667eea" size={24} />}
              onPress={() => router.push('/sales-order')}
            />
            <QuickAction
              title="Tagihan"
              icon={<DollarSign color="#667eea" size={24} />}
              onPress={() => router.push('/collection')}
            />
            <QuickAction
              title="Stok & Harga Barang"
              icon={<Package color="#667eea" size={24} />}
              onPress={() => router.push('/inventory')}
            />
            <QuickAction
              title="Target"
              icon={<Target color="#667eea" size={24} />}
              onPress={() => router.push('/target')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Harian</Text>

          <View style={styles.progressCard}>
            <ProgressBar
              label="Target Sales Penjualan"
              progress={68}
              showPercentage
              progressColor="#4CAF50"
            />
            <Text style={styles.progressText}>$12,450 of $18,300</Text>
          </View>

          <View style={styles.progressCard}>
            <ProgressBar
              label="Target Tagihan"
              progress={45}
              showPercentage
              progressColor="#2196F3"
            />
            <Text style={styles.progressText}>$8,200 of $18,200</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  logoutText: {
    color: '#666',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    width: '48%',
    height: 120,
  },
  statGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  statIcon: {
    alignSelf: 'flex-end',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: '30%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});