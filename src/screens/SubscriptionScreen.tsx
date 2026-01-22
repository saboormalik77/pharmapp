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
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard,
  CheckCircle2,
  Crown,
  Zap,
  Settings,
  Building2,
  AlertCircle,
  X,
} from 'lucide-react-native';
import {
  subscriptionService,
  SubscriptionPlan,
  Subscription,
} from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

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
  });
};

export function SubscriptionScreen() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, subscriptionData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const subscriptionData = await subscriptionService.getSubscription();
      setSubscription(subscriptionData);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectPlan = async (planId: string) => {
    if (processing) return;

    try {
      setProcessing(planId);
      setError(null);

      const result = await subscriptionService.createCheckoutSession(planId, billingInterval);

      if (result.url) {
        // Open Stripe checkout in browser
        const supported = await Linking.canOpenURL(result.url);
        if (supported) {
          await Linking.openURL(result.url);
        } else {
          setError('Cannot open checkout URL');
        }
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
    } finally {
      setProcessing(null);
    }
  };

  const handleManageBilling = async () => {
    if (processing) return;

    try {
      setProcessing('billing');
      setError(null);

      const result = await subscriptionService.createPortalSession('pharmacollect://subscription');

      if (result.url) {
        const supported = await Linking.canOpenURL(result.url);
        if (supported) {
          await Linking.openURL(result.url);
        } else {
          setError('Cannot open billing portal');
        }
      } else {
        setError('Failed to create portal session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (processing) return;

            try {
              setProcessing('cancel');
              setError(null);

              await subscriptionService.cancelSubscription();
              await loadSubscription();
              Alert.alert('Success', 'Your subscription has been cancelled.');
            } catch (err: any) {
              setError(err.message || 'Failed to cancel subscription');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = async () => {
    if (processing) return;

    try {
      setProcessing('reactivate');
      setError(null);

      await subscriptionService.reactivateSubscription();
      await loadSubscription();
      Alert.alert('Success', 'Your subscription has been reactivated.');
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate subscription');
    } finally {
      setProcessing(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return Zap;
      case 'basic':
        return Settings;
      case 'premium':
        return Crown;
      case 'enterprise':
        return Building2;
      default:
        return CreditCard;
    }
  };

  const getPlanColors = (planId: string): [string, string] => {
    switch (planId) {
      case 'free':
        return ['#F3F4F6', '#E5E7EB'];
      case 'basic':
        return ['#DBEAFE', '#BFDBFE'];
      case 'premium':
        return ['#CCFBF1', '#99F6E4'];
      case 'enterprise':
        return ['#EDE9FE', '#DDD6FE'];
      default:
        return ['#F3F4F6', '#E5E7EB'];
    }
  };

  const getPlanIconColor = (planId: string) => {
    switch (planId) {
      case 'free':
        return '#6B7280';
      case 'basic':
        return '#3B82F6';
      case 'premium':
        return '#14B8A6';
      case 'enterprise':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getPriceForPlan = (plan: SubscriptionPlan) => {
    return billingInterval === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const currentPlanId = subscription?.plan || 'free';
  const currentPlan = plans.find((p) => p.id === currentPlanId);

  const PlanCard = ({ plan }: { plan: SubscriptionPlan }) => {
    const Icon = getPlanIcon(plan.id);
    const isCurrentPlan = plan.id === currentPlanId;
    const price = getPriceForPlan(plan);
    const colors = getPlanColors(plan.id);
    const iconColor = getPlanIconColor(plan.id);

    return (
      <View
        style={[
          styles.planCard,
          isCurrentPlan && styles.planCardCurrent,
        ]}
      >
        <LinearGradient
          colors={isCurrentPlan ? ['#F0FDFA', '#CCFBF1'] : colors}
          style={styles.planCardGradient}
        >
          <View style={styles.planHeader}>
            <View style={[styles.planIconContainer, { backgroundColor: isCurrentPlan ? '#CCFBF1' : '#FFFFFF' }]}>
              <Icon color={isCurrentPlan ? '#14B8A6' : iconColor} size={moderateScale(20)} />
            </View>
            <View style={styles.planHeaderInfo}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>
                  {price === 0 ? 'Free' : formatCurrency(price)}
                </Text>
                {price > 0 && (
                  <Text style={styles.planPriceInterval}>
                    /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                  </Text>
                )}
              </View>
            </View>
            {isCurrentPlan && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>

          <View style={styles.planFeatures}>
            {plan.features.slice(0, 4).map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <CheckCircle2 color="#22C55E" size={moderateScale(12)} />
                <Text style={styles.featureText} numberOfLines={2}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planLimits}>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Documents</Text>
              <Text style={styles.limitValue}>
                {plan.max_documents === null ? 'Unlimited' : plan.max_documents}
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Text style={styles.limitLabel}>Distributors</Text>
              <Text style={styles.limitValue}>
                {plan.max_distributors === null ? 'Unlimited' : plan.max_distributors}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.selectPlanButton,
              isCurrentPlan && styles.selectPlanButtonDisabled,
            ]}
            onPress={() => handleSelectPlan(plan.id)}
            disabled={isCurrentPlan || processing !== null}
          >
            {processing === plan.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.selectPlanButtonText, isCurrentPlan && styles.selectPlanButtonTextDisabled]}>
                {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#F0FDFA', '#CCFBF1', '#F0FDFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Subscription & Billing</Text>
          <Text style={styles.headerSubtitle}>Manage your subscription and payment</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle color="#DC2626" size={moderateScale(14)} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <X color="#DC2626" size={moderateScale(14)} />
            </TouchableOpacity>
          </View>
        )}

        {/* Current Subscription */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading subscription...</Text>
          </View>
        ) : subscription && currentPlan ? (
          <View style={styles.currentSubscriptionCard}>
            <View style={styles.currentSubHeader}>
              <View>
                <Text style={styles.currentSubTitle}>Current Plan</Text>
                <Text style={styles.currentSubStatus}>
                  {subscription.status === 'active' ? 'Active subscription' : `Status: ${subscription.status}`}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: subscription.status === 'active' ? '#DCFCE7' : '#FEF3C7' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: subscription.status === 'active' ? '#22C55E' : '#F59E0B' }
                ]}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.currentPlanInfo}>
              <View style={[styles.currentPlanIcon, { backgroundColor: getPlanColors(currentPlan.id)[0] }]}>
                {(() => {
                  const Icon = getPlanIcon(currentPlan.id);
                  return <Icon color={getPlanIconColor(currentPlan.id)} size={moderateScale(24)} />;
                })()}
              </View>
              <View style={styles.currentPlanDetails}>
                <Text style={styles.currentPlanName}>{currentPlan.name} Plan</Text>
                <Text style={styles.currentPlanPrice}>
                  {subscription.price ? formatCurrency(subscription.price) : 'Free'}/
                  {subscription.billingInterval === 'monthly' ? 'month' : 'year'}
                </Text>
              </View>
              {subscription.currentPeriodEnd && (
                <View style={styles.nextBillingInfo}>
                  <Text style={styles.nextBillingLabel}>Next billing</Text>
                  <Text style={styles.nextBillingDate}>{formatDate(subscription.currentPeriodEnd)}</Text>
                </View>
              )}
            </View>

            {/* Payment Method */}
            {subscription.paymentMethod && (
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodInfo}>
                  <CreditCard color="#6B7280" size={moderateScale(18)} />
                  <View style={styles.paymentMethodDetails}>
                    <Text style={styles.paymentMethodText}>
                      {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
                    </Text>
                    <Text style={styles.paymentMethodExpiry}>
                      Expires {subscription.paymentMethod.expiryMonth}/{subscription.paymentMethod.expiryYear}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={handleManageBilling}
                  disabled={processing !== null}
                >
                  {processing === 'billing' ? (
                    <ActivityIndicator size="small" color="#14B8A6" />
                  ) : (
                    <Text style={styles.manageButtonText}>Manage</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleManageBilling}
                disabled={processing !== null}
              >
                {processing === 'billing' ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <Text style={styles.actionButtonText}>Manage Billing</Text>
                )}
              </TouchableOpacity>

              {subscription.cancelAtPeriodEnd ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reactivateButton]}
                  onPress={handleReactivateSubscription}
                  disabled={processing !== null}
                >
                  {processing === 'reactivate' ? (
                    <ActivityIndicator size="small" color="#22C55E" />
                  ) : (
                    <Text style={[styles.actionButtonText, styles.reactivateButtonText]}>Reactivate</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancelSubscription}
                  disabled={processing !== null}
                >
                  {processing === 'cancel' ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}

        {/* Billing Interval Toggle */}
        <View style={styles.billingToggleSection}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingOption, billingInterval === 'monthly' && styles.billingOptionActive]}
              onPress={() => setBillingInterval('monthly')}
            >
              <Text style={[styles.billingOptionText, billingInterval === 'monthly' && styles.billingOptionTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOption, billingInterval === 'yearly' && styles.billingOptionActive]}
              onPress={() => setBillingInterval('yearly')}
            >
              <Text style={[styles.billingOptionText, billingInterval === 'yearly' && styles.billingOptionTextActive]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
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
  header: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    borderRadius: moderateScale(10),
  },
  headerContent: {},
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  content: {
    flex: 1,
    paddingHorizontal: moderateScale(8),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    marginBottom: moderateScale(10),
    gap: moderateScale(8),
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#DC2626',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  loadingText: {
    marginTop: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  currentSubscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    marginBottom: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
  },
  currentSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: moderateScale(12),
  },
  currentSubTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  currentSubStatus: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  statusBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  statusBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  currentPlanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currentPlanIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanDetails: {
    flex: 1,
    marginLeft: moderateScale(12),
  },
  currentPlanName: {
    fontSize: moderateScale(15),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currentPlanPrice: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  nextBillingInfo: {
    alignItems: 'flex-end',
  },
  nextBillingLabel: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
  },
  nextBillingDate: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
    marginTop: moderateScale(2),
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginTop: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  paymentMethodDetails: {},
  paymentMethodText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
  },
  paymentMethodExpiry: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  manageButton: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  manageButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: moderateScale(10),
    marginTop: moderateScale(14),
    paddingTop: moderateScale(14),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
  },
  reactivateButton: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  reactivateButtonText: {
    color: '#22C55E',
  },
  cancelButton: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    color: '#EF4444',
  },
  billingToggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: moderateScale(8),
    padding: moderateScale(3),
  },
  billingOption: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
  },
  billingOptionActive: {
    backgroundColor: '#14B8A6',
  },
  billingOptionText: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#6B7280',
  },
  billingOptionTextActive: {
    color: '#FFFFFF',
  },
  plansContainer: {
    gap: moderateScale(10),
  },
  planCard: {
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planCardCurrent: {
    borderColor: '#14B8A6',
  },
  planCardGradient: {
    padding: moderateScale(14),
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  planIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  planHeaderInfo: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  planName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: moderateScale(2),
  },
  planPrice: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  planPriceInterval: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginLeft: moderateScale(2),
  },
  currentBadge: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(10),
  },
  currentBadgeText: {
    fontSize: moderateScale(9),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planFeatures: {
    gap: moderateScale(6),
    marginBottom: moderateScale(12),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: moderateScale(6),
  },
  featureText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#374151',
    lineHeight: moderateScale(16),
  },
  planLimits: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(12),
  },
  limitItem: {
    flex: 1,
  },
  limitLabel: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  limitValue: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginTop: moderateScale(2),
  },
  selectPlanButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  selectPlanButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  selectPlanButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectPlanButtonTextDisabled: {
    color: '#6B7280',
  },
  bottomSpacer: {
    height: moderateScale(24),
  },
});

