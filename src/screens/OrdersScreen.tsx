import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  CreditCard,
  ChevronRight,
  DollarSign,
  ChevronLeft,
} from 'lucide-react-native';
import { marketplaceService, OrderSummary, OrderListResponse } from '../api/services';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function OrdersScreen({ navigation }: any) {
  const [ordersData, setOrdersData] = useState<OrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await marketplaceService.getOrders(currentPage, 10, statusFilter);
      setOrdersData(response);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentPage, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: '#F59E0B', bgColor: '#FEF3C7', label: 'Pending' };
      case 'processing':
        return { icon: Package, color: '#3B82F6', bgColor: '#DBEAFE', label: 'Processing' };
      case 'paid':
        return { icon: CreditCard, color: '#22C55E', bgColor: '#DCFCE7', label: 'Paid' };
      case 'confirmed':
        return { icon: CheckCircle, color: '#14B8A6', bgColor: '#CCFBF1', label: 'Confirmed' };
      case 'shipped':
        return { icon: Truck, color: '#8B5CF6', bgColor: '#EDE9FE', label: 'Shipped' };
      case 'delivered':
        return { icon: Package, color: '#10B981', bgColor: '#D1FAE5', label: 'Delivered' };
      case 'cancelled':
        return { icon: XCircle, color: '#EF4444', bgColor: '#FEE2E2', label: 'Cancelled' };
      case 'refunded':
        return { icon: DollarSign, color: '#6B7280', bgColor: '#F3F4F6', label: 'Refunded' };
      default:
        return { icon: ShoppingBag, color: '#6B7280', bgColor: '#F3F4F6', label: status };
    }
  };

  const OrderCard = ({ order }: { order: OrderSummary }) => {
    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation?.navigate?.('OrderDetail', { orderId: order.id })}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIconContainer}>
            <ShoppingBag color="#14B8A6" size={20} />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon color={statusConfig.color} size={12} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Items</Text>
            <Text style={styles.detailValue}>{order.itemCount}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.detailValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Savings</Text>
            <Text style={[styles.detailValue, { color: '#22C55E' }]}>
              {formatCurrency(order.totalSavings)}
            </Text>
          </View>
        </View>

        {order.paymentMethodBrand && (
          <View style={styles.paymentRow}>
            <CreditCard color="#6B7280" size={14} />
            <Text style={styles.paymentText}>
              {order.paymentMethodBrand} •••• {order.paymentMethodLast4}
            </Text>
          </View>
        )}

        <View style={styles.viewMoreRow}>
          <Text style={styles.viewMoreText}>View Details</Text>
          <ChevronRight color="#14B8A6" size={16} />
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ label, value }: { label: string; value: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, statusFilter === value && styles.filterButtonActive]}
      onPress={() => {
        setStatusFilter(value);
        setCurrentPage(1);
      }}
    >
      <Text style={[styles.filterButtonText, statusFilter === value && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const totalPages = ordersData?.pagination?.totalPages || 1;
  const orders = ordersData?.orders || [];

  return (
    <SafeAreaView style={styles.container}>
      

      {/* Status filters commented out as per user request
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <FilterButton label="All" value="all" />
        <FilterButton label="Pending" value="pending" />
        <FilterButton label="Processing" value="processing" />
        <FilterButton label="Paid" value="paid" />
        <FilterButton label="Shipped" value="shipped" />
        <FilterButton label="Delivered" value="delivered" />
      </ScrollView>
      */}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingBag color="#9CA3AF" size={48} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        ) : (
          <>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Text style={styles.paginationText}>
                  Page {currentPage} of {totalPages}
                </Text>
                <View style={styles.paginationButtons}>
                  <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft color={currentPage === 1 ? '#9CA3AF' : '#374151'} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight color={currentPage === totalPages ? '#9CA3AF' : '#374151'} size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
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
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  filtersContainer: {
    maxHeight: 50,
    marginTop: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // Extra padding for bottom tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentText: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  viewMoreText: {
    fontSize: 13,
    color: '#14B8A6',
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  paginationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
});

