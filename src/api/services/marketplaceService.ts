/**
 * Marketplace API Service
 * Matches pharma-collect-ui marketplaceService exactly
 */

import { apiClient } from '../client';

// ============================================================
// Types - Marketplace Deals
// ============================================================

export interface MarketplaceDeal {
  id: string;
  dealNumber: string;
  productName: string;
  category: string;
  ndc: string | null;
  quantity: number;
  originalQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  minimumBuyQuantity: number;
  unit: string;
  originalPrice: number;
  dealPrice: number;
  savings: number;
  featuredUntil: string;
  totalSavingsAmount: number;
  distributor: string;
  expiryDate: string;
  postedDate: string;
  status: 'active' | 'sold' | 'expired';
  imageUrl: string | null;
  notes: string | null;
  inCart?: boolean;
  cartQuantity?: number;
  isDealOfTheDay?: boolean;
  featuredDealType?: 'day' | 'week' | 'month';
  isFeaturedDeal?: boolean;
}

export interface FeaturedDealsResponse {
  dealOfTheDay: MarketplaceDeal | null;
  dealOfTheWeek: MarketplaceDeal | null;
  dealOfTheMonth: MarketplaceDeal | null;
}

export interface MarketplaceStats {
  totalDeals: number;
  activeDeals: number;
  soldDeals: number;
  expiredDeals: number;
  totalItems: number;
  avgSavings: number;
  categories: string[];
}

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MarketplaceListResponse {
  deals: MarketplaceDeal[];
  stats: MarketplaceStats;
  pagination: PaginationInfo;
}

export interface MarketplaceFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'all' | 'active' | 'sold' | 'expired';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// Types - Cart
// ============================================================

export interface CartItem {
  id: string;
  dealId: string;
  productName: string;
  ndc: string | null;
  category: string;
  distributor: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  totalPrice: number;
  savings: number;
  savingsPercent: number;
  imageUrl: string | null;
  availableQuantity: number;
  minimumBuyQuantity?: number;
  dealStatus: string;
  expiryDate: string;
  addedAt: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  totalSavings: number;
  estimatedTax: number;
  total: number;
}

export interface CartResponse {
  items: CartItem[];
  summary: CartSummary;
}

export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

// ============================================================
// Types - Orders
// ============================================================

export interface OrderItem {
  id: string;
  dealId: string;
  productName: string;
  ndc: string | null;
  category: string | null;
  distributor: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  lineSavings: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalSavings: number;
  paymentMethodType: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  stripeReceiptUrl: string | null;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items?: OrderItem[];
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  totalSavings: number;
  itemCount: number;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface OrderListResponse {
  orders: OrderSummary[];
  pagination: PaginationInfo;
}

// ============================================================
// Marketplace Service
// ============================================================

export const marketplaceService = {
  // ============================================================
  // Marketplace Deals
  // ============================================================

  /**
   * Get marketplace deals with pagination and filters
   * GET /marketplace
   */
  async getDeals(filters?: MarketplaceFilters): Promise<MarketplaceListResponse> {
    const response = await apiClient.getWithoutPharmacyId<MarketplaceListResponse>('/marketplace', filters);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch marketplace deals');
  },

  /**
   * Get marketplace deal by ID
   * GET /marketplace/:id
   */
  async getDealById(id: string): Promise<MarketplaceDeal> {
    const response = await apiClient.getWithoutPharmacyId<{ deal: MarketplaceDeal }>(`/marketplace/${id}`);
    if (response.status === 'success' && response.data) {
      return response.data.deal;
    }
    throw new Error(response.message || 'Failed to fetch marketplace deal');
  },

  /**
   * Get marketplace categories
   * GET /marketplace/categories
   */
  async getCategories(): Promise<CategoryOption[]> {
    const response = await apiClient.getWithoutPharmacyId<{ categories: CategoryOption[] }>('/marketplace/categories');
    if (response.status === 'success' && response.data) {
      return response.data.categories;
    }
    throw new Error(response.message || 'Failed to fetch marketplace categories');
  },

  /**
   * Get Deal of the Day
   * GET /marketplace/deal-of-the-day
   */
  async getDealOfTheDay(): Promise<MarketplaceDeal | null> {
    const response = await apiClient.getWithoutPharmacyId<{ deal: MarketplaceDeal | null }>('/marketplace/deal-of-the-day');
    if (response.status === 'success' && response.data) {
      return response.data.deal;
    }
    return null;
  },

  /**
   * Get Featured Deals (day, week, month)
   * GET /marketplace/featured-deals
   */
  async getFeaturedDeals(): Promise<FeaturedDealsResponse> {
    const response = await apiClient.getWithoutPharmacyId<FeaturedDealsResponse>('/marketplace/featured-deals');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    return { dealOfTheDay: null, dealOfTheWeek: null, dealOfTheMonth: null };
  },

  // ============================================================
  // Cart Operations
  // ============================================================

  /**
   * Get pharmacy cart
   * GET /marketplace/cart
   */
  async getCart(): Promise<CartResponse> {
    const response = await apiClient.getWithoutPharmacyId<CartResponse>('/marketplace/cart');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch cart');
  },

  /**
   * Get cart item count
   * GET /marketplace/cart/count
   */
  async getCartCount(): Promise<number> {
    const response = await apiClient.getWithoutPharmacyId<{ count: number }>('/marketplace/cart/count');
    if (response.status === 'success' && response.data) {
      return response.data.count;
    }
    throw new Error(response.message || 'Failed to fetch cart count');
  },

  /**
   * Add item to cart
   * POST /marketplace/cart
   */
  async addToCart(dealId: string, quantity: number = 1): Promise<{ message: string }> {
    const response = await apiClient.post<any>('/marketplace/cart', {
      dealId,
      quantity,
    });
    if (response.status === 'success') {
      return {
        message: response.message || 'Item added to cart',
      };
    }
    throw new Error(response.message || 'Failed to add item to cart');
  },

  /**
   * Update cart item quantity
   * PATCH /marketplace/cart/:itemId
   */
  async updateCartItem(itemId: string, quantity: number): Promise<{ message: string }> {
    const response = await apiClient.patch<any>(`/marketplace/cart/${itemId}`, {
      quantity,
    });
    if (response.status === 'success') {
      return {
        message: response.message || 'Cart updated successfully',
      };
    }
    throw new Error(response.message || 'Failed to update cart item');
  },

  /**
   * Remove item from cart
   * DELETE /marketplace/cart/:itemId
   */
  async removeFromCart(itemId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<any>(`/marketplace/cart/${itemId}`);
    if (response.status === 'success') {
      return { message: response.message || 'Item removed from cart' };
    }
    throw new Error(response.message || 'Failed to remove item from cart');
  },

  /**
   * Clear entire cart
   * DELETE /marketplace/cart
   */
  async clearCart(): Promise<{ message: string }> {
    const response = await apiClient.delete<any>('/marketplace/cart');
    if (response.status === 'success') {
      return {
        message: response.message || 'Cart cleared successfully',
      };
    }
    throw new Error(response.message || 'Failed to clear cart');
  },

  // ============================================================
  // Orders
  // ============================================================

  /**
   * Get pharmacy orders list
   * GET /marketplace/orders
   */
  async getOrders(page: number = 1, limit: number = 10, status?: string): Promise<OrderListResponse> {
    const params: Record<string, any> = { page, limit };
    if (status && status !== 'all') {
      params.status = status;
    }
    const response = await apiClient.getWithoutPharmacyId<OrderListResponse>('/marketplace/orders', params);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch orders');
  },

  /**
   * Get order by ID
   * GET /marketplace/orders/:orderId
   */
  async getOrderById(orderId: string): Promise<Order> {
    const response = await apiClient.getWithoutPharmacyId<{ order: Order }>(`/marketplace/orders/${orderId}`);
    if (response.status === 'success' && response.data) {
      return response.data.order;
    }
    throw new Error(response.message || 'Failed to fetch order');
  },

  // ============================================================
  // Checkout
  // ============================================================

  /**
   * Create Stripe checkout session
   * POST /marketplace/checkout
   */
  async createCheckoutSession(email: string, pharmacyName?: string, returnUrl?: string): Promise<CheckoutResponse> {
    const response = await apiClient.post<CheckoutResponse>('/marketplace/checkout', {
      email,
      pharmacyName,
      returnUrl,
    });
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create checkout session');
  },
};

