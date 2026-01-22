import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  RotateCcw,
  CreditCard,
  Receipt,
  Calendar,
  AlertCircle,
  Building2,
  DollarSign,
} from 'lucide-react-native';
import { marketplaceService, Order, OrderItem } from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface Props {
  navigation: any;
  route: { params: { orderId: string } };
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await marketplaceService.getOrderById(orderId);
      setOrder(orderData);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
    setRefreshing(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
        return { icon: CheckCircle, color: '#22C55E', bgColor: '#DCFCE7', label: status.charAt(0).toUpperCase() + status.slice(1) };
      case 'pending':
      case 'processing':
        return { icon: Clock, color: '#F59E0B', bgColor: '#FEF3C7', label: status.charAt(0).toUpperCase() + status.slice(1) };
      case 'shipped':
        return { icon: Truck, color: '#3B82F6', bgColor: '#DBEAFE', label: 'Shipped' };
      case 'delivered':
        return { icon: CheckCircle, color: '#14B8A6', bgColor: '#CCFBF1', label: 'Delivered' };
      case 'cancelled':
        return { icon: XCircle, color: '#EF4444', bgColor: '#FEE2E2', label: 'Cancelled' };
      case 'refunded':
        return { icon: RotateCcw, color: '#6B7280', bgColor: '#F3F4F6', label: 'Refunded' };
      default:
        return { icon: Package, color: '#6B7280', bgColor: '#F3F4F6', label: status };
    }
  };

  const statusSteps = [
    { key: 'created', label: 'Order Placed', date: order?.createdAt },
    { key: 'paid', label: 'Payment Confirmed', date: order?.paidAt },
    { key: 'shipped', label: 'Shipped', date: order?.shippedAt },
    { key: 'delivered', label: 'Delivered', date: order?.deliveredAt },
  ];

  const getCurrentStepIndex = () => {
    if (order?.deliveredAt) return 3;
    if (order?.shippedAt) return 2;
    if (order?.paidAt) return 1;
    if (order?.createdAt) return 0;
    return -1;
  };

  const handleViewReceipt = () => {
    if (order?.stripeReceiptUrl) {
      Linking.openURL(order.stripeReceiptUrl);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle color="#EF4444" size={moderateScale(48)} />
          <Text style={styles.errorTitle}>Error Loading Order</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const currentStepIndex = getCurrentStepIndex();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1F2937" size={moderateScale(22)} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>{order.orderNumber}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon color={statusConfig.color} size={moderateScale(24)} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Order Status</Text>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Order Timeline</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCompleted = step.date !== null && step.date !== undefined;
              
              return (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, isActive && styles.timelineDotActive]} />
                    {index < statusSteps.length - 1 && (
                      <View style={[styles.timelineLine, index < currentStepIndex && styles.timelineLineActive]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                      {step.label}
                    </Text>
                    {isCompleted && (
                      <Text style={styles.timelineDate}>{formatDate(step.date!)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>Order Items ({order.items?.length || 0})</Text>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemIconContainer}>
                <Package color="#14B8A6" size={moderateScale(16)} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                <View style={styles.itemMeta}>
                  {item.ndc && <Text style={styles.itemNdc}>NDC: {item.ndc}</Text>}
                  {item.distributor && <Text style={styles.itemDistributor}>{item.distributor}</Text>}
                </View>
                <View style={styles.itemQuantityRow}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemUnitPrice}>@ {formatCurrency(item.unitPrice)}</Text>
                </View>
              </View>
              <View style={styles.itemPriceContainer}>
                <Text style={styles.itemTotal}>{formatCurrency(item.lineTotal)}</Text>
                {item.lineSavings > 0 && (
                  <Text style={styles.itemSavings}>Saved {formatCurrency(item.lineSavings)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.totalSavings > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelGreen}>Total Savings</Text>
              <Text style={styles.summaryValueGreen}>-{formatCurrency(order.totalSavings)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax ({((order.taxRate || 0) * 100).toFixed(0)}%)</Text>
            <Text style={styles.summaryValue}>{formatCurrency(order.taxAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValueGreen}>Free</Text>
          </View>
          {order.discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelGreen}>Discount</Text>
              <Text style={styles.summaryValueGreen}>-{formatCurrency(order.discountAmount)}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentCard}>
          <View style={styles.cardTitleRow}>
            <CreditCard color="#6B7280" size={moderateScale(16)} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>
          {order.paymentMethodBrand && order.paymentMethodLast4 ? (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentMethod}>
                {order.paymentMethodBrand} •••• {order.paymentMethodLast4}
              </Text>
              {order.stripeReceiptUrl && (
                <TouchableOpacity style={styles.receiptButton} onPress={handleViewReceipt}>
                  <Receipt color="#14B8A6" size={moderateScale(14)} />
                  <Text style={styles.receiptButtonText}>View Receipt</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.noPaymentText}>
              {order.status === 'pending' ? 'Awaiting payment' : 'Payment information not available'}
            </Text>
          )}
        </View>

        {/* Shipping Info */}
        <View style={styles.shippingCard}>
          <View style={styles.cardTitleRow}>
            <Truck color="#6B7280" size={moderateScale(16)} />
            <Text style={styles.cardTitle}>Shipping</Text>
          </View>
          <Text style={styles.shippingText}>Free Standard Shipping</Text>
          <Text style={styles.shippingEstimate}>Estimated delivery: 3-5 business days</Text>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(24),
  },
  errorTitle: {
    marginTop: moderateScale(16),
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  errorText: {
    marginTop: moderateScale(8),
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: moderateScale(20),
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  backButton: {
    marginTop: moderateScale(12),
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: moderateScale(14),
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
    fontFamily: 'monospace',
  },
  headerSpacer: {
    width: moderateScale(40),
  },
  content: {
    flex: 1,
    padding: moderateScale(12),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  // Status Card
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: moderateScale(12),
  },
  statusLabel: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  statusText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    marginTop: moderateScale(2),
  },
  // Timeline Card
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(12),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    marginBottom: moderateScale(12),
  },
  timeline: {
    paddingLeft: moderateScale(4),
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: moderateScale(50),
  },
  timelineLeft: {
    alignItems: 'center',
    width: moderateScale(20),
  },
  timelineDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: '#E5E7EB',
  },
  timelineDotActive: {
    backgroundColor: '#14B8A6',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: moderateScale(4),
  },
  timelineLineActive: {
    backgroundColor: '#14B8A6',
  },
  timelineContent: {
    flex: 1,
    marginLeft: moderateScale(12),
    paddingBottom: moderateScale(12),
  },
  timelineLabel: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
  },
  timelineLabelActive: {
    color: '#374151',
    fontWeight: '500',
  },
  timelineDate: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  // Items Card
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  itemName: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#1F2937',
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(6),
    marginTop: moderateScale(4),
  },
  itemNdc: {
    fontSize: moderateScale(9),
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  itemDistributor: {
    fontSize: moderateScale(9),
    color: '#6B7280',
  },
  itemQuantityRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginTop: moderateScale(4),
  },
  itemQuantity: {
    fontSize: moderateScale(10),
    color: '#374151',
  },
  itemUnitPrice: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  itemSavings: {
    fontSize: moderateScale(9),
    color: '#22C55E',
    marginTop: moderateScale(2),
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(10),
  },
  summaryLabel: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  summaryLabelGreen: {
    fontSize: moderateScale(12),
    color: '#22C55E',
  },
  summaryValueGreen: {
    fontSize: moderateScale(12),
    color: '#22C55E',
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: moderateScale(10),
  },
  totalLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  // Payment Card
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: moderateScale(12),
    color: '#374151',
    textTransform: 'capitalize',
  },
  noPaymentText: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  receiptButtonText: {
    fontSize: moderateScale(12),
    color: '#14B8A6',
    fontWeight: '500',
  },
  // Shipping Card
  shippingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shippingText: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  shippingEstimate: {
    fontSize: moderateScale(11),
    color: '#9CA3AF',
    marginTop: moderateScale(4),
  },
  // Notes Card
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    lineHeight: moderateScale(18),
  },
  bottomSpacer: {
    height: moderateScale(24),
  },
});
