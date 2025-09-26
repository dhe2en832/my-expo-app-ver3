// app/(tabs)/target.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import {
  Target as TargetIcon,
  TrendingUp,
  Award,
  Calendar,
  FileText,
  CreditCard,
  Plus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { targetAPI } from '../../api/services';
import { Target } from '../../api/mockData';
import { useRouter } from 'expo-router';

// === MOCK LEADERBOARD ===
interface LeaderboardEntry {
  rank: number;
  name: string;
  salesRealization: number;
  salesTarget: number;
  achievement: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Ahmad Wijaya',
    salesRealization: 42000000,
    salesTarget: 50000000,
    achievement: 84,
  },
  {
    rank: 2,
    name: 'Siti Nurhaliza',
    salesRealization: 38500000,
    salesTarget: 45000000,
    achievement: 85.6,
  },
  {
    rank: 3,
    name: 'John Doe (Anda)',
    salesRealization: 34000000,
    salesTarget: 50000000,
    achievement: 68,
  },
  {
    rank: 4,
    name: 'Budi Santoso',
    salesRealization: 29000000,
    salesTarget: 40000000,
    achievement: 72.5,
  },
];

// === COMPONENTS ===
interface ProgressBarProps {
  title: string;
  current: number;
  target: number;
  color: string;
  unit?: 'currency' | 'number';
  onPress?: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  title,
  current,
  target,
  color,
  unit = 'number',
  onPress,
}) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  const formatValue = (value: number) => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} style={onPress ? { flex: 1 } : undefined}>
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>{title}</Text>
          <Text style={[styles.progressPercentage, { color }]}>{percentage.toFixed(1)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
        <View style={styles.progressValues}>
          <Text style={styles.progressCurrent}>{formatValue(current)}</Text>
          <Text style={styles.progressTarget}>Target: {formatValue(target)}</Text>
        </View>
      </View>
    </Wrapper>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color }) => (
  <View style={styles.metricCard}>
    <LinearGradient colors={[color, `${color}CC`]} style={styles.metricGradient}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </LinearGradient>
  </View>
);

// === MAIN SCREEN ===
export default function TargetScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [targetData, setTargetData] = useState<Target | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // === FAB STATE & ANIMATION ===
  const [fabOpen, setFabOpen] = useState(false);
  const mainFabAnim = useRef(new Animated.Value(0)).current;
  const salesFabAnim = useRef(new Animated.Value(0)).current;
  const collectionFabAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const toggleFab = () => {
    if (fabOpen) {
      Animated.parallel([
        Animated.spring(mainFabAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
        Animated.spring(salesFabAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
        Animated.spring(collectionFabAnim, { toValue: 0, useNativeDriver: true, friction: 5 }),
      ]).start();
    } else {
      Animated.stagger(100, [
        Animated.spring(salesFabAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.spring(collectionFabAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();

      Animated.spring(mainFabAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

      tooltipAnim.setValue(0);
      Animated.sequence([
        Animated.timing(tooltipAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(tooltipAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
    setFabOpen(!fabOpen);
  };

  const salesFabStyle = {
    transform: [
      { scale: salesFabAnim },
      {
        translateY: salesFabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -70],
        }),
      },
    ],
    opacity: salesFabAnim,
  };

  const collectionFabStyle = {
    transform: [
      { scale: collectionFabAnim },
      {
        translateY: collectionFabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -140],
        }),
      },
    ],
    opacity: collectionFabAnim,
  };

  const mainFabRotate = mainFabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.extractOffset();
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => {
      pan.flattenOffset();
    },
  });

  // === TARGET DATA ===
  const fetchTarget = async (period: string) => {
    try {
      const res = await targetAPI.getTargets({ userId: user?.id, period, type: 'monthly' });
      if (res.success && res.targets.length > 0) {
        setTargetData(res.targets[0]);
      } else {
        setTargetData(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Gagal memuat target');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTarget(selectedPeriod);
    }
  }, [user?.id, selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTarget(selectedPeriod);
  };

  const handlePeriodChange = (offset: number) => {
    const [year, month] = selectedPeriod.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedPeriod(newPeriod);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Memuat...</Text>
      </View>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const salesAchievement = targetData?.salesTarget
    ? (targetData.salesRealization / targetData.salesTarget) * 100
    : 0;
  const collectionAchievement = targetData?.collectionTarget
    ? (targetData.collectionRealization / targetData.collectionTarget) * 100
    : 0;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.periodSelector}>
            <TouchableOpacity onPress={() => handlePeriodChange(-1)}>
              <Text style={styles.periodNav}>{"<"}</Text>
            </TouchableOpacity>
            <View style={styles.periodContainer}>
              <Calendar color="#667eea" size={20} />
              <Text style={styles.periodText}>
                {targetData?.period || selectedPeriod}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handlePeriodChange(1)}>
              <Text style={styles.periodNav}>{">"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {targetData ? (
          <>
            <View style={styles.metricsContainer}>
              <MetricCard
                title="Pencapaian Penjualan"
                value={`${salesAchievement.toFixed(1)}%`}
                subtitle={formatCurrency(targetData.salesRealization)}
                icon={<TrendingUp color="white" size={24} />}
                color="#4CAF50"
              />
              <MetricCard
                title="Pencapaian Tagihan"
                value={`${collectionAchievement.toFixed(1)}%`}
                subtitle={formatCurrency(targetData.collectionRealization)}
                icon={<TargetIcon color="white" size={24} />}
                color="#2196F3"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ringkasan Progress</Text>

              <TouchableOpacity onPress={() => router.push('/rekap/penjualan')}>
                <View style={styles.progressCard}>
                  <ProgressBar
                    title="Target Penjualan"
                    current={targetData.salesRealization}
                    target={targetData.salesTarget}
                    color="#4CAF50"
                    unit="currency"
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/rekap/tagihan')}>
                <View style={styles.progressCard}>
                  <ProgressBar
                    title="Target Tagihan"
                    current={targetData.collectionRealization}
                    target={targetData.collectionTarget}
                    color="#2196F3"
                    unit="currency"
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.progressCard}>
                <ProgressBar
                  title="Kunjungan Pelanggan"
                  current={targetData.visitRealization}
                  target={targetData.visitTarget}
                  color="#FF9800"
                  unit="number"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Peringkat Tim</Text>
              <View style={styles.leaderboardCard}>
                {mockLeaderboard.map((entry) => (
                  <View
                    key={entry.rank}
                    style={[
                      styles.leaderboardRow,
                      entry.name.includes('Anda') && styles.currentUserRow,
                    ]}
                  >
                    <View style={styles.leaderboardRank}>
                      {entry.rank <= 3 ? (
                        <Award color={getRankColor(entry.rank)} size={20} />
                      ) : (
                        <Text style={styles.rankNumber}>{entry.rank}</Text>
                      )}
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text
                        style={[
                          styles.leaderboardName,
                          entry.name.includes('Anda') && styles.currentUserName,
                        ]}
                      >
                        {entry.name}
                      </Text>
                      <Text style={styles.leaderboardSales}>
                        {formatCurrency(entry.salesRealization)}
                      </Text>
                    </View>
                    <View style={styles.leaderboardAchievement}>
                      <Text
                        style={[
                          styles.achievementPercentage,
                          {
                            color: getAchievementColor(entry.achievement),
                          },
                        ]}
                      >
                        {entry.achievement.toFixed(1)}%
                      </Text>
                      <View style={styles.achievementBar}>
                        <View
                          style={[
                            styles.achievementFill,
                            {
                              width: `${Math.min(entry.achievement, 100)}%`,
                              backgroundColor: getAchievementColor(entry.achievement),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rincian Bulanan</Text>
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Sisa Hari</Text>
                  <Text style={styles.breakdownValue}>
                    {daysRemaining > 0 ? `${daysRemaining} hari` : 'Bulan berakhir'}
                  </Text>
                </View>
                {daysRemaining > 0 && (
                  <>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Penjualan Harian Dibutuhkan</Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(
                          (targetData.salesTarget - targetData.salesRealization) / daysRemaining
                        )}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Tagihan Harian Dibutuhkan</Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(
                          (targetData.collectionTarget - targetData.collectionRealization) /
                            daysRemaining
                        )}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Kunjungan Tersisa</Text>
                  <Text style={styles.breakdownValue}>
                    {Math.max(0, targetData.visitTarget - targetData.visitRealization)} kunjungan
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <Text>Tidak ada data target untuk periode ini.</Text>
          </View>
        )}
      </ScrollView>

      {/* Draggable FAB Container */}
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Rekap Penjualan */}
        <Animated.View style={[styles.fabOption, salesFabStyle]}>
          <Animated.View style={{ opacity: tooltipAnim, marginBottom: 4, right: 60 }}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>Rekap Penjualan</Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            style={[styles.fabOptionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => {
              toggleFab();
              router.push('/rekap/penjualan');
            }}
          >
            <FileText color="#fff" size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Rekap Tagihan */}
        <Animated.View style={[styles.fabOption, collectionFabStyle]}>
          <Animated.View style={{ opacity: tooltipAnim, marginBottom: 4, right: 60 }}>
            <View style={[styles.tooltip, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.tooltipText}>Rekap Tagihan</Text>
            </View>
          </Animated.View>
          <TouchableOpacity
            style={[styles.fabOptionButton, { backgroundColor: '#2196F3' }]}
            onPress={() => {
              toggleFab();
              router.push('/rekap/tagihan');
            }}
          >
            <CreditCard color="#fff" size={20} />
          </TouchableOpacity>
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity style={styles.fabMain} onPress={toggleFab}>
          <Animated.View style={{ transform: [{ rotate: mainFabRotate }] }}>
            <Plus color="#fff" size={24} />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// === HELPER FUNCTIONS ===
const getRankColor = (rank: number) => {
  switch (rank) {
    case 1: return '#FFD700';
    case 2: return '#C0C0C0';
    case 3: return '#CD7F32';
    default: return '#e0e0e0';
  }
};

const getAchievementColor = (achievement: number) => {
  if (achievement >= 80) return '#4CAF50';
  if (achievement >= 60) return '#FF9800';
  return '#f44336';
};

// === STYLES ===
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  periodNav: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    height: 120,
  },
  metricGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  metricIcon: {
    alignSelf: 'flex-end',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  metricTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  metricSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCurrent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressTarget: {
    fontSize: 14,
    color: '#666',
  },
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentUserRow: {
    backgroundColor: '#f8f9ff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  currentUserName: {
    color: '#667eea',
  },
  leaderboardSales: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  leaderboardAchievement: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  achievementPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementBar: {
    width: 60,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  achievementFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    alignItems: 'center',
  },
  fabOption: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    marginBottom: 8,
  },
  fabOptionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabMain: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  tooltip: {
    position: 'absolute',
    // right: 60,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: "600",
  },
});