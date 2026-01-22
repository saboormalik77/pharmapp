import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  DollarSign, 
  Package, 
  Building2,
  Box,
  CheckCircle,
  XCircle,
  FileText,
  // Bell, // Commented out - notification icon disabled
  ChevronDown,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { 
  dashboardService, 
  DashboardSummary, 
  EarningsHistoryResponse,
  EarningsEstimationResponse 
} from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatCurrencyFull = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

type PeriodType = 'monthly' | 'yearly';

export function DashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsHistoryResponse | null>(null);
  const [earningsEstimation, setEarningsEstimation] = useState<EarningsEstimationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [estimationLoading, setEstimationLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Earnings History filters
  const [historyPeriodType, setHistoryPeriodType] = useState<PeriodType>('monthly');
  const [historyPeriods, setHistoryPeriods] = useState(12);
  const [historyPeriodsInput, setHistoryPeriodsInput] = useState('12');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  
  // Earnings Estimation filters
  const [estimationPeriodType, setEstimationPeriodType] = useState<PeriodType>('monthly');
  const [estimationPeriods, setEstimationPeriods] = useState(12);
  const [estimationPeriodsInput, setEstimationPeriodsInput] = useState('12');
  const [showEstimationDropdown, setShowEstimationDropdown] = useState(false);
  
  const user = useAuthStore((state) => state.user);

  const maxHistoryPeriods = historyPeriodType === 'monthly' ? 12 : 10;
  const maxEstimationPeriods = estimationPeriodType === 'monthly' ? 12 : 10;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarningsHistory = useCallback(async () => {
    try {
      setEarningsLoading(true);
      const history = await dashboardService.getEarningsHistory({
        periodType: historyPeriodType,
        periods: historyPeriods,
      });
      setEarningsData(history);
    } catch (error) {
      console.error('Failed to fetch earnings history:', error);
    } finally {
      setEarningsLoading(false);
    }
  }, [historyPeriodType, historyPeriods]);

  const fetchEarningsEstimation = useCallback(async () => {
    try {
      setEstimationLoading(true);
      const estimation = await dashboardService.getEarningsEstimation({
        periodType: estimationPeriodType,
        periods: estimationPeriods,
      });
      setEarningsEstimation(estimation);
    } catch (error) {
      console.error('Failed to fetch earnings estimation:', error);
    } finally {
      setEstimationLoading(false);
    }
  }, [estimationPeriodType, estimationPeriods]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchEarningsHistory();
  }, [fetchEarningsHistory]);

  useEffect(() => {
    fetchEarningsEstimation();
  }, [fetchEarningsEstimation]);

  // Handle history periods input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = parseInt(historyPeriodsInput) || 1;
      const clampedValue = Math.min(Math.max(1, value), maxHistoryPeriods);
      if (clampedValue !== historyPeriods) {
        setHistoryPeriods(clampedValue);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [historyPeriodsInput, maxHistoryPeriods]);

  // Handle estimation periods input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = parseInt(estimationPeriodsInput) || 1;
      const clampedValue = Math.min(Math.max(1, value), maxEstimationPeriods);
      if (clampedValue !== estimationPeriods) {
        setEstimationPeriods(clampedValue);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [estimationPeriodsInput, maxEstimationPeriods]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchEarningsHistory(), fetchEarningsEstimation()]);
    setRefreshing(false);
  };

  // Metric Card Component - matching web exactly
  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    bgGradient,
    borderColor,
    textColor,
    fullWidth = false,
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    bgGradient: string[];
    borderColor: string;
    textColor: string;
    fullWidth?: boolean;
  }) => {
    const cardWidth = fullWidth ? SCREEN_WIDTH - 32 : (SCREEN_WIDTH - 40) / 2;
    
    return (
      <LinearGradient
        colors={bgGradient as any}
        style={[styles.metricCard, { width: cardWidth, borderColor }]}
      >
        <View style={styles.metricContent}>
          <View style={styles.metricLeft}>
            <Icon color={textColor} size={moderateScale(12)} />
            <Text style={[styles.metricTitle, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
          )}
        </View>
      </LinearGradient>
    );
  };

  // Dropdown Component
  const Dropdown = ({ 
    value, 
    onSelect, 
    visible, 
    setVisible 
  }: { 
    value: PeriodType; 
    onSelect: (v: PeriodType) => void; 
    visible: boolean; 
    setVisible: (v: boolean) => void;
  }) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdown} 
        onPress={() => setVisible(!visible)}
      >
        <Text style={styles.dropdownText}>
          {value === 'monthly' ? 'Monthly' : 'Yearly'}
        </Text>
        <ChevronDown color="#6B7280" size={14} />
      </TouchableOpacity>
      
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={[styles.dropdownItem, value === 'monthly' && styles.dropdownItemActive]}
              onPress={() => { onSelect('monthly'); setVisible(false); }}
            >
              <Text style={[styles.dropdownItemText, value === 'monthly' && styles.dropdownItemTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dropdownItem, value === 'yearly' && styles.dropdownItemActive]}
              onPress={() => { onSelect('yearly'); setVisible(false); }}
            >
              <Text style={[styles.dropdownItemText, value === 'yearly' && styles.dropdownItemTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );

  // Bar Chart Component - matching web chart
  const BarChart = ({ data }: { data: { label: string; value: number }[] }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = moderateScale(140);
    const barWidth = Math.max(moderateScale(20), (SCREEN_WIDTH - 100) / data.length - 8);
    
    return (
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{formatCurrency(maxValue)}</Text>
          <Text style={styles.axisLabel}>{formatCurrency(maxValue * 0.5)}</Text>
          <Text style={styles.axisLabel}>$0</Text>
        </View>
        
        {/* Chart Area */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContent}
        >
          <View style={[styles.barsContainer, { height: chartHeight }]}>
            {data.map((item, index) => (
              <View key={index} style={[styles.barWrapper, { width: barWidth + 8 }]}>
                <View style={[styles.barContainer, { height: chartHeight - 20 }]}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: Math.max((item.value / maxValue) * (chartHeight - 20), 4),
                        width: barWidth,
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {item.label.length > 3 ? item.label.slice(0, 3) : item.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        
        {/* Legend */}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
            <Text style={styles.legendText}>Earnings</Text>
          </View>
        </View>
      </View>
    );
  };

  // Line Chart Component - for Earnings Estimation
  const LineChart = ({ data }: { data: { label: string; actual: number; potential: number }[] }) => {
    const allValues = data.flatMap(d => [d.actual, d.potential]);
    const maxValue = Math.max(...allValues, 1);
    const chartHeight = moderateScale(140);
    const chartWidth = Math.max(SCREEN_WIDTH - 100, data.length * 40);
    const pointSpacing = chartWidth / (data.length - 1 || 1);
    
    const getY = (value: number) => {
      return chartHeight - 30 - (value / maxValue) * (chartHeight - 40);
    };

    // Create SVG-like path for lines
    const renderLine = (values: number[], color: string) => {
      if (values.length === 0) return null;
      
      return (
        <View style={[styles.lineContainer, { width: chartWidth, height: chartHeight - 30 }]}>
          {values.map((value, index) => {
            if (index === values.length - 1) return null;
            const x1 = index * pointSpacing;
            const y1 = getY(value);
            const x2 = (index + 1) * pointSpacing;
            const y2 = getY(values[index + 1]);
            
            // Calculate line angle and length
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
            
            return (
              <View
                key={index}
                style={[
                  styles.lineSegment,
                  {
                    left: x1,
                    top: y1,
                    width: length,
                    backgroundColor: color,
                    transform: [{ rotate: `${angle}deg` }],
                  }
                ]}
              />
            );
          })}
          {/* Points */}
          {values.map((value, index) => (
            <View
              key={`point-${index}`}
              style={[
                styles.linePoint,
                {
                  left: index * pointSpacing - 4,
                  top: getY(value) - 4,
                  borderColor: color,
                }
              ]}
            />
          ))}
        </View>
      );
    };
    
    return (
      <View style={styles.chartContainer}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{formatCurrency(maxValue)}</Text>
          <Text style={styles.axisLabel}>{formatCurrency(maxValue * 0.5)}</Text>
          <Text style={styles.axisLabel}>$0</Text>
        </View>
        
        {/* Chart Area */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScrollContent}
        >
          <View style={{ width: chartWidth, height: chartHeight }}>
            {/* Grid lines */}
            <View style={[styles.gridLine, { top: 0 }]} />
            <View style={[styles.gridLine, { top: (chartHeight - 30) / 2 }]} />
            <View style={[styles.gridLine, { top: chartHeight - 30 }]} />
            
            {/* Actual Earnings Line */}
            {renderLine(data.map(d => d.actual), '#14B8A6')}
            
            {/* Potential Earnings Line */}
            {renderLine(data.map(d => d.potential), '#F59E0B')}
            
            {/* X-Axis Labels */}
            <View style={styles.xAxisLabels}>
              {data.map((item, index) => (
                <Text 
                  key={index} 
                  style={[
                    styles.xAxisLabel, 
                    { 
                      left: index * pointSpacing - 15,
                      width: 30,
                    }
                  ]}
                  numberOfLines={1}
                >
                  {item.label.slice(0, 3)}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
        
        {/* Legend */}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
            <Text style={styles.legendText}>Actual Earnings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Potential Earnings</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#14B8A6', '#0D9488']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          {/* Notification icon commented out as per user request
          <TouchableOpacity style={styles.notificationButton}>
            <Bell color="#FFFFFF" size={moderateScale(22)} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          */}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        <Text style={styles.sectionTitle}>Dashboard</Text>

        {/* Key Metrics - Row 1 */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Pharmacy Added Products"
            value={summary?.totalPharmacyAddedProducts ?? 0}
            icon={Package}
            bgGradient={['#F0FDFA', '#CCFBF1']}
            borderColor="#99F6E4"
            textColor="#0F766E"
          />
          <MetricCard
            title="Top Distributors"
            value={summary?.topDistributorCount ?? 0}
            icon={Building2}
            bgGradient={['#ECFEFF', '#CFFAFE']}
            borderColor="#A5F3FC"
            textColor="#0E7490"
          />
        </View>

        {/* Key Metrics - Row 2 */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Total Packages"
            value={summary?.totalPackages ?? 0}
            icon={Box}
            bgGradient={['#EFF6FF', '#DBEAFE']}
            borderColor="#BFDBFE"
            textColor="#1D4ED8"
          />
        </View>

        {/* Delivered / Non-Delivered Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Delivered Packages"
            value={summary?.deliveredPackages ?? 0}
            icon={CheckCircle}
            bgGradient={['#F0FDF4', '#DCFCE7']}
            borderColor="#BBF7D0"
            textColor="#15803D"
          />
          <MetricCard
            title="Non-Delivered Packages"
            value={summary?.nonDeliveredPackages ?? 0}
            icon={XCircle}
            bgGradient={['#FEF2F2', '#FEE2E2']}
            borderColor="#FECACA"
            textColor="#DC2626"
          />
        </View>

        {/* Total Earnings & Documents Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Total Earnings"
            value={earningsData ? formatCurrencyFull(earningsData.totalEarnings) : '$0.00'}
            icon={DollarSign}
            bgGradient={['#FFFFFF', '#FFFFFF']}
            borderColor="#99F6E4"
            textColor="#0F766E"
          />
          <MetricCard
            title="Total Documents"
            value={earningsData?.totalDocuments ?? 0}
            icon={FileText}
            bgGradient={['#FFFFFF', '#FFFFFF']}
            borderColor="#99F6E4"
            textColor="#0F766E"
          />
        </View>

        {/* Earnings History Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Earnings History</Text>
            <View style={styles.chartFilters}>
              <Dropdown
                value={historyPeriodType}
                onSelect={(v) => {
                  setHistoryPeriodType(v);
                  const newMax = v === 'monthly' ? 12 : 10;
                  if (historyPeriods > newMax) {
                    setHistoryPeriods(newMax);
                    setHistoryPeriodsInput(newMax.toString());
                  }
                }}
                visible={showHistoryDropdown}
                setVisible={setShowHistoryDropdown}
              />
              <TextInput
                style={styles.periodInput}
                value={historyPeriodsInput}
                onChangeText={setHistoryPeriodsInput}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
          
          {earningsLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={styles.chartLoadingText}>Loading earnings data...</Text>
            </View>
          ) : earningsData?.periodEarnings && earningsData.periodEarnings.length > 0 ? (
            <BarChart 
              data={earningsData.periodEarnings.map(item => ({
                label: item.label,
                value: item.earnings,
              }))}
            />
          ) : (
            <Text style={styles.noDataText}>No earnings data available</Text>
          )}
        </View>

        {/* Earnings Estimation Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Earnings Estimation</Text>
            <View style={styles.chartFilters}>
              <Dropdown
                value={estimationPeriodType}
                onSelect={(v) => {
                  setEstimationPeriodType(v);
                  const newMax = v === 'monthly' ? 12 : 10;
                  if (estimationPeriods > newMax) {
                    setEstimationPeriods(newMax);
                    setEstimationPeriodsInput(newMax.toString());
                  }
                }}
                visible={showEstimationDropdown}
                setVisible={setShowEstimationDropdown}
              />
              <TextInput
                style={styles.periodInput}
                value={estimationPeriodsInput}
                onChangeText={setEstimationPeriodsInput}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
          
          {estimationLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={styles.chartLoadingText}>Loading estimation data...</Text>
            </View>
          ) : earningsEstimation?.chartData && earningsEstimation.chartData.length > 0 ? (
            <LineChart 
              data={earningsEstimation.chartData.map(item => ({
                label: item.label,
                actual: item.actualEarnings,
                potential: item.potentialEarnings,
              }))}
            />
          ) : (
            <Text style={styles.noDataText}>No estimation data available</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(28),
    paddingHorizontal: moderateScale(16),
    borderBottomLeftRadius: moderateScale(20),
    borderBottomRightRadius: moderateScale(20),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  notificationButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: moderateScale(8),
    right: moderateScale(8),
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#EF4444',
  },
  content: {
    flex: 1,
    paddingHorizontal: moderateScale(12),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(12),
    marginTop: moderateScale(8),
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(8),
    gap: moderateScale(8),
  },
  metricCard: {
    borderRadius: moderateScale(10),
    padding: moderateScale(10),
    borderWidth: 2,
    flex: 1,
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: moderateScale(4),
  },
  metricTitle: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(12),
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  chartTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chartFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: moderateScale(6),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    gap: moderateScale(4),
  },
  dropdownText: {
    fontSize: moderateScale(11),
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(8),
    padding: moderateScale(4),
    minWidth: moderateScale(120),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(6),
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownItemText: {
    fontSize: moderateScale(13),
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  periodInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: moderateScale(6),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    fontSize: moderateScale(11),
    color: '#374151',
    width: moderateScale(50),
    textAlign: 'center',
  },
  chartContainer: {
    marginTop: moderateScale(8),
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: moderateScale(40),
    justifyContent: 'space-between',
    width: moderateScale(50),
    zIndex: 1,
  },
  axisLabel: {
    fontSize: moderateScale(9),
    color: '#6B7280',
  },
  chartScrollContent: {
    paddingLeft: moderateScale(55),
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: moderateScale(20),
  },
  barWrapper: {
    alignItems: 'center',
  },
  barContainer: {
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: '#14B8A6',
    borderTopLeftRadius: moderateScale(3),
    borderTopRightRadius: moderateScale(3),
  },
  barLabel: {
    fontSize: moderateScale(9),
    color: '#6B7280',
    marginTop: moderateScale(4),
    textAlign: 'center',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: moderateScale(20),
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: moderateScale(9),
    color: '#6B7280',
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: moderateScale(12),
    gap: moderateScale(16),
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  legendDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
  },
  legendText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  chartLoading: {
    height: moderateScale(150),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    marginTop: moderateScale(8),
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  noDataText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: moderateScale(11),
    paddingVertical: moderateScale(40),
  },
});
