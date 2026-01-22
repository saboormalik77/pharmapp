import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { TrendingUp, TrendingDown, BarChart2, PieChart } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export function AnalyticsScreen() {
  const [stats] = useState({
    totalRevenue: 125430,
    revenueGrowth: 12.5,
    totalOrders: 1248,
    ordersGrowth: 8.3,
    averageOrderValue: 100.50,
    topProducts: [
      { name: 'Amoxicillin 500mg', sales: 15000, percentage: 25 },
      { name: 'Lisinopril 10mg', sales: 12000, percentage: 20 },
      { name: 'Metformin 500mg', sales: 10000, percentage: 17 },
      { name: 'Omeprazole 20mg', sales: 8000, percentage: 13 },
      { name: 'Other', sales: 15430, percentage: 25 },
    ],
  });

  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon,
    color,
  }: { 
    title: string; 
    value: string; 
    growth?: number; 
    icon: any;
    color: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon color={color} size={24} />
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {growth !== undefined && (
        <View style={styles.growthContainer}>
          {growth >= 0 ? (
            <TrendingUp color="#10B981" size={14} />
          ) : (
            <TrendingDown color="#EF4444" size={14} />
          )}
          <Text style={[styles.growthText, { color: growth >= 0 ? '#10B981' : '#EF4444' }]}>
            {Math.abs(growth)}%
          </Text>
          <Text style={styles.growthLabel}>vs last month</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Performance insights</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metricsRow}>
          <MetricCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            growth={stats.revenueGrowth}
            icon={TrendingUp}
            color="#14B8A6"
          />
          <MetricCard
            title="Total Orders"
            value={stats.totalOrders.toString()}
            growth={stats.ordersGrowth}
            icon={BarChart2}
            color="#8B5CF6"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartIcon}>
              <PieChart color="#14B8A6" size={24} />
            </View>
            {stats.topProducts.map((product, index) => (
              <View key={index} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <View style={[styles.productDot, { backgroundColor: getColor(index) }]} />
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                </View>
                <View style={styles.productStats}>
                  <Text style={styles.productSales}>${(product.sales / 1000).toFixed(1)}K</Text>
                  <View style={styles.progressContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { width: `${product.percentage}%`, backgroundColor: getColor(index) }
                      ]} 
                    />
                  </View>
                  <Text style={styles.productPercentage}>{product.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.keyMetricsCard}>
            <View style={styles.keyMetricRow}>
              <Text style={styles.keyMetricLabel}>Average Order Value</Text>
              <Text style={styles.keyMetricValue}>${stats.averageOrderValue.toFixed(2)}</Text>
            </View>
            <View style={styles.keyMetricDivider} />
            <View style={styles.keyMetricRow}>
              <Text style={styles.keyMetricLabel}>Conversion Rate</Text>
              <Text style={styles.keyMetricValue}>3.2%</Text>
            </View>
            <View style={styles.keyMetricDivider} />
            <View style={styles.keyMetricRow}>
              <Text style={styles.keyMetricLabel}>Customer Retention</Text>
              <Text style={styles.keyMetricValue}>78%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getColor = (index: number) => {
  const colors = ['#14B8A6', '#8B5CF6', '#F59E0B', '#3B82F6', '#9CA3AF'];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  growthLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  productRow: {
    marginBottom: 16,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  productName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  productStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productSales: {
    fontSize: 12,
    color: '#6B7280',
    width: 50,
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  productPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    width: 35,
    textAlign: 'right',
  },
  keyMetricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  keyMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  keyMetricLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  keyMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  keyMetricDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
});

