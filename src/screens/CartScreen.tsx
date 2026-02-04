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
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  CreditCard,
  Shield,
  AlertCircle,
  Clock,
  Building2,
  X,
  Truck,
  CheckCircle,
} from 'lucide-react-native';
import {
  marketplaceService,
  CartItem,
  CartSummary,
  CartResponse,
} from '../api/services';
import { useAuthStore } from '../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatCurrency = (amount: number | undefined | null) => {
  const safeAmount = amount ?? 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(safeAmount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

interface Props {
  navigation: any;
}

export function CartScreen({ navigation }: Props) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const cartData = await marketplaceService.getCart();
      setCart(cartData);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCart();
    setRefreshing(false);
  };

  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > item.availableQuantity) {
      Alert.alert('Error', `Only ${item.availableQuantity} units available`);
      return;
    }
    if (item.minimumBuyQuantity && newQuantity < item.minimumBuyQuantity) {
      Alert.alert('Error', `Minimum order quantity is ${item.minimumBuyQuantity}`);
      return;
    }

    try {
      setUpdatingItemId(item.id);
      await marketplaceService.updateCartItem(item.id, newQuantity);
      await loadCart();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update quantity');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove "${item.productName}" from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingItemId(item.id);
              await marketplaceService.removeFromCart(item.id);
              await loadCart();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove item');
            } finally {
              setRemovingItemId(null);
            }
          },
        },
      ]
    );
  };

  const handleClearCart = async () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearingCart(true);
              await marketplaceService.clearCart();
              await loadCart();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to clear cart');
            } finally {
              setClearingCart(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }

    if (!user?.email) {
      Alert.alert('Login Required', 'Please log in to continue with checkout');
      return;
    }

    try {
      setCheckingOut(true);
      setError(null);

      // Use deep link URL - backend should redirect to this after Stripe checkout
      const returnUrl = 'pharmacollect://orders?checkout=success';
      
      const result = await marketplaceService.createCheckoutSession(
        user.email,
        user.pharmacy_name,
        returnUrl
      );

      if (result.url) {
        // Open Stripe checkout in browser
        const supported = await Linking.canOpenURL(result.url);
        if (supported) {
          await Linking.openURL(result.url);
        } else {
          Alert.alert('Error', 'Cannot open checkout URL. Please try again.');
        }
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      Alert.alert('Checkout Error', err.message || 'Failed to start checkout. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  // Calculate safe values
  const cartItems = cart?.items || [];
  const summary: CartSummary = cart?.summary || {
    itemCount: 0,
    subtotal: 0,
    totalSavings: 0,
    estimatedTax: 0,
    total: 0,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle color="#DC2626" size={moderateScale(16)} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <X color="#DC2626" size={moderateScale(16)} />
          </TouchableOpacity>
        </View>
      )}

      {cartItems.length === 0 ? (
        // Empty Cart
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <ShoppingCart color="#9CA3AF" size={moderateScale(48)} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Browse the marketplace to discover great deals on pharmaceutical products.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.browseButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
            }
          >
            {/* Cart Items */}
            <View style={styles.itemsSection}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  {/* Item Image */}
                  <View style={styles.itemImageContainer}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={styles.itemImagePlaceholder}>
                        <Package color="#9CA3AF" size={moderateScale(24)} />
                      </View>
                    )}
                    {item.savings > 0 && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>
                          {((item.savings / (item.originalPrice * item.quantity)) * 100).toFixed(0)}%
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Item Details */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                    <View style={styles.itemMeta}>
                      {item.ndc && (
                        <Text style={styles.itemNdc}>NDC: {item.ndc}</Text>
                      )}
                      <View style={styles.itemDistributorRow}>
                        <Building2 color="#6B7280" size={moderateScale(10)} />
                        <Text style={styles.itemDistributor}>{item.distributor}</Text>
                      </View>
                    </View>
                    <View style={styles.itemExpiryRow}>
                      <Clock color="#6B7280" size={moderateScale(10)} />
                      <Text style={styles.itemExpiry}>Exp: {formatDate(item.expiryDate)}</Text>
                    </View>

                    {/* Quantity Controls */}
                    <View style={styles.quantityRow}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={[styles.quantityButton, item.quantity <= (item.minimumBuyQuantity || 1) && styles.quantityButtonDisabled]}
                          onPress={() => handleUpdateQuantity(item, item.quantity - 1)}
                          disabled={updatingItemId === item.id || item.quantity <= (item.minimumBuyQuantity || 1)}
                        >
                          <Minus color={item.quantity <= (item.minimumBuyQuantity || 1) ? '#D1D5DB' : '#374151'} size={moderateScale(14)} />
                        </TouchableOpacity>
                        <View style={styles.quantityDisplay}>
                          {updatingItemId === item.id ? (
                            <ActivityIndicator size="small" color="#14B8A6" />
                          ) : (
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[styles.quantityButton, item.quantity >= item.availableQuantity && styles.quantityButtonDisabled]}
                          onPress={() => handleUpdateQuantity(item, item.quantity + 1)}
                          disabled={updatingItemId === item.id || item.quantity >= item.availableQuantity}
                        >
                          <Plus color={item.quantity >= item.availableQuantity ? '#D1D5DB' : '#374151'} size={moderateScale(14)} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(item)}
                        disabled={removingItemId === item.id}
                      >
                        {removingItemId === item.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Trash2 color="#EF4444" size={moderateScale(16)} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Item Price */}
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>{formatCurrency(item.totalPrice)}</Text>
                    <Text style={styles.itemUnitPrice}>
                      {formatCurrency(item.unitPrice)}/unit
                    </Text>
                    {item.savings > 0 && (
                      <Text style={styles.itemSavings}>
                        Save {formatCurrency(item.savings)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Shipping Info */}
            <View style={styles.shippingCard}>
              <View style={styles.shippingHeader}>
                <Truck color="#22C55E" size={moderateScale(18)} />
                <Text style={styles.shippingTitle}>Shipping</Text>
              </View>
              <View style={styles.shippingBadge}>
                <CheckCircle color="#22C55E" size={moderateScale(14)} />
                <Text style={styles.shippingBadgeText}>Free Standard Shipping</Text>
              </View>
              <Text style={styles.shippingEstimate}>Estimated delivery: 3-5 business days</Text>
            </View>

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.subtotal)}</Text>
              </View>
              {summary.totalSavings > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelGreen}>Total Savings</Text>
                  <Text style={styles.summaryValueGreen}>-{formatCurrency(summary.totalSavings)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated Tax (8%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.estimatedTax)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValueGreen}>Free</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(summary.total)}</Text>
              </View>
            </View>

            {/* Security Badge */}
            <View style={styles.securityCard}>
              <Shield color="#6B7280" size={moderateScale(18)} />
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Secure Checkout</Text>
                <Text style={styles.securityText}>
                  Your payment is secured by Stripe
                </Text>
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Fixed Checkout Button */}
          <View style={styles.checkoutContainer}>
            <View style={styles.checkoutButtonWrapper}>
              <TouchableOpacity 
                style={[styles.checkoutButton, checkingOut && styles.checkoutButtonDisabled]} 
                onPress={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.checkoutButtonText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.checkoutButtonLeft}>
                      <CreditCard color="#FFFFFF" size={moderateScale(20)} />
                      <Text style={styles.checkoutButtonText}>Checkout</Text>
                    </View>
                    <Text style={styles.checkoutTotal}>{formatCurrency(summary.total)}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    gap: moderateScale(8),
  },
  errorText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: '#DC2626',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(24),
  },
  emptyIconContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  emptyText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: moderateScale(24),
    lineHeight: moderateScale(18),
  },
  browseButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(10),
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: moderateScale(12),
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  itemsSection: {
    marginBottom: moderateScale(12),
  },
  // Cart Item
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: moderateScale(10),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImageContainer: {
    width: moderateScale(70),
    height: moderateScale(70),
    borderRadius: moderateScale(8),
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsBadge: {
    position: 'absolute',
    top: moderateScale(4),
    left: moderateScale(4),
    backgroundColor: '#EF4444',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontWeight: 'bold',
  },
  itemDetails: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  itemName: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(4),
  },
  itemMeta: {
    marginBottom: moderateScale(4),
  },
  itemNdc: {
    fontSize: moderateScale(9),
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: moderateScale(2),
  },
  itemDistributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  itemDistributor: {
    fontSize: moderateScale(9),
    color: '#6B7280',
  },
  itemExpiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginBottom: moderateScale(8),
  },
  itemExpiry: {
    fontSize: moderateScale(9),
    color: '#6B7280',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: moderateScale(8),
  },
  quantityButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityDisplay: {
    width: moderateScale(36),
    height: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  quantityText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1F2937',
  },
  removeButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: moderateScale(8),
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    marginLeft: moderateScale(8),
  },
  itemPrice: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemUnitPrice: {
    fontSize: moderateScale(9),
    color: '#9CA3AF',
    marginTop: moderateScale(2),
  },
  itemSavings: {
    fontSize: moderateScale(9),
    color: '#22C55E',
    fontWeight: '500',
    marginTop: moderateScale(2),
  },
  // Shipping Card
  shippingCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    marginBottom: moderateScale(10),
  },
  shippingTitle: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#166534',
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    marginBottom: moderateScale(4),
  },
  shippingBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#22C55E',
  },
  shippingEstimate: {
    fontSize: moderateScale(10),
    color: '#6B7280',
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
  summaryTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(12),
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
  // Security Card
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    gap: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  securityText: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  bottomSpacer: {
    height: moderateScale(100),
  },
  // Checkout Button
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: moderateScale(16),
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(24),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  checkoutButtonWrapper: {
    width: '100%',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(12),
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonDisabled: {
    opacity: 0.7,
  },
  checkoutButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  checkoutTotal: {
    color: '#FFFFFF',
    fontSize: moderateScale(18),
    fontWeight: 'bold',
  },
});


