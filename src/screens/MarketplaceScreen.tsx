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
  TextInput,
  Image,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShoppingCart,
  Search,
  Star,
  Tag,
  Clock,
  ChevronRight,
  Plus,
  Minus,
  X,
  Filter,
  ChevronDown,
  Package,
  AlertCircle,
  CheckCircle2,
  ArrowDown,
  Building2,
  Calendar,
} from 'lucide-react-native';
import {
  marketplaceService,
  MarketplaceDeal,
  FeaturedDealsResponse,
  CartResponse,
  MarketplaceStats,
  CategoryOption,
  PaginationInfo,
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
    month: 'short',
    day: 'numeric',
  });
};

type SortOption = 'posted_date' | 'expiry_date' | 'deal_price' | 'savings' | 'product_name';
type StatusFilter = 'all' | 'active' | 'sold' | 'expired';

const SORT_OPTIONS = [
  { value: 'posted_date', label: 'Newest First' },
  { value: 'expiry_date', label: 'Expiring Soon' },
  { value: 'savings', label: 'Highest Discount' },
  { value: 'deal_price', label: 'Lowest Price' },
  { value: 'product_name', label: 'A-Z' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'expired', label: 'Expired' },
];

export function MarketplaceScreen({ navigation }: any) {
  // Data State
  const [deals, setDeals] = useState<MarketplaceDeal[]>([]);
  const [featuredDeals, setFeaturedDeals] = useState<FeaturedDealsResponse | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('posted_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal State
  const [selectedDeal, setSelectedDeal] = useState<MarketplaceDeal | null>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [dealQuantity, setDealQuantity] = useState(1);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload deals when filters change
  useEffect(() => {
    if (!loading) {
      loadDeals();
    }
  }, [sortBy, sortOrder, statusFilter, categoryFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dealsResponse, featured, cartData, categoriesData] = await Promise.all([
        marketplaceService.getDeals({ 
          limit: 12, 
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sortBy,
          sortOrder,
        }),
        marketplaceService.getFeaturedDeals(),
        marketplaceService.getCart().catch(() => ({ items: [], summary: { itemCount: 0, subtotal: 0, totalSavings: 0, estimatedTax: 0, total: 0 } })),
        marketplaceService.getCategories().catch(() => []),
      ]);
      
      setDeals(dealsResponse.deals);
      setStats(dealsResponse.stats);
      setPagination(dealsResponse.pagination);
      setFeaturedDeals(featured);
      setCart(cartData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async (page: number = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const filters: any = {
        page,
        limit: 12,
        sortBy,
        sortOrder,
      };
      
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const response = await marketplaceService.getDeals(filters);
      
      if (page === 1) {
        setDeals(response.deals);
      } else {
        setDeals(prev => [...prev, ...response.deals]);
      }
      setStats(response.stats);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load deals');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadDeals(1);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.totalPages && !loadingMore) {
      setLoadingMore(true);
      loadDeals(pagination.page + 1);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('active');
    setSortBy('posted_date');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || categoryFilter || statusFilter !== 'active';

  const handleAddToCart = async (deal: MarketplaceDeal, quantity: number = 1) => {
    try {
      setAddingToCart(deal.id);
      await marketplaceService.addToCart(deal.id, quantity);
      const cartData = await marketplaceService.getCart();
      setCart(cartData);
      showToast('Item added to cart!', 'success');
      setSelectedDeal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to add to cart', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const openDealModal = (deal: MarketplaceDeal) => {
    setSelectedDeal(deal);
    // Set default quantity to minimum buy quantity (just like web version)
    setDealQuantity(deal.minimumBuyQuantity > 0 ? deal.minimumBuyQuantity : 1);
  };

  // Featured Deal Card
  const FeaturedDealCard = ({ deal, type }: { deal: MarketplaceDeal | null; type: 'day' | 'week' | 'month' }) => {
    if (!deal) return null;

    const savings = deal.savings || ((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100;
    const colors: [string, string] = type === 'day' ? ['#F59E0B', '#D97706'] : type === 'week' ? ['#8B5CF6', '#7C3AED'] : ['#14B8A6', '#0D9488'];
    const typeLabel = type === 'day' ? 'Day' : type === 'week' ? 'Week' : 'Month';

    return (
      <TouchableOpacity style={styles.featuredCard} onPress={() => openDealModal(deal)}>
        <LinearGradient colors={colors} style={styles.featuredGradient}>
          <View style={styles.featuredBadge}>
            <Star color="#FFFFFF" size={moderateScale(10)} fill="#FFFFFF" />
            <Text style={styles.featuredBadgeText}>Deal of the {typeLabel}</Text>
          </View>
          <Text style={styles.featuredName} numberOfLines={2}>{deal.productName}</Text>
          <View style={styles.featuredPriceRow}>
            <Text style={styles.featuredPrice}>{formatCurrency(deal.dealPrice)}</Text>
            <Text style={styles.featuredOriginal}>{formatCurrency(deal.originalPrice)}</Text>
          </View>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{savings.toFixed(0)}% OFF</Text>
          </View>
          <View style={styles.featuredMeta}>
            <View style={styles.metaItem}>
              <Building2 color="rgba(255,255,255,0.8)" size={moderateScale(10)} />
              <Text style={styles.metaText}>{deal.distributor}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock color="rgba(255,255,255,0.8)" size={moderateScale(10)} />
              <Text style={styles.metaText}>Exp: {formatDate(deal.expiryDate)}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Deal Card
  const DealCard = ({ deal }: { deal: MarketplaceDeal }) => {
    const savings = deal.savings || ((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100;
    const isInCart = cart?.items.some(item => item.dealId === deal.id);

    return (
      <TouchableOpacity style={styles.dealCard} onPress={() => openDealModal(deal)}>
        <View style={styles.dealImageContainer}>
          {deal.imageUrl ? (
            <Image source={{ uri: deal.imageUrl }} style={styles.dealImage} />
          ) : (
            <View style={styles.dealImagePlaceholder}>
              <Tag color="#9CA3AF" size={moderateScale(24)} />
            </View>
          )}
          {savings > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{savings.toFixed(0)}%</Text>
            </View>
          )}
          {deal.status !== 'active' && (
            <View style={[styles.statusOverlay, { backgroundColor: deal.status === 'sold' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(107, 114, 128, 0.9)' }]}>
              <Text style={styles.statusOverlayText}>{deal.status === 'sold' ? 'SOLD OUT' : 'EXPIRED'}</Text>
            </View>
          )}
        </View>
        <View style={styles.dealContent}>
          <Text style={styles.dealCategory}>{deal.category}</Text>
          <Text style={styles.dealName} numberOfLines={2}>{deal.productName}</Text>
          <Text style={styles.dealDistributor}>{deal.distributor}</Text>
          <View style={styles.dealPriceRow}>
            <Text style={styles.dealPrice}>{formatCurrency(deal.dealPrice)}</Text>
            {deal.originalPrice > deal.dealPrice && (
              <Text style={styles.dealOriginalPrice}>{formatCurrency(deal.originalPrice)}</Text>
            )}
          </View>
          <View style={styles.dealFooter}>
            <View style={styles.expiryRow}>
              <Clock color="#6B7280" size={moderateScale(10)} />
              <Text style={styles.expiryText}>Exp: {formatDate(deal.expiryDate)}</Text>
            </View>
            {deal.status === 'active' && (
              <TouchableOpacity
                style={[styles.addButton, isInCart && styles.addButtonInCart]}
                onPress={() => !isInCart && handleAddToCart(deal, deal.minimumBuyQuantity > 0 ? deal.minimumBuyQuantity : 1)}
                disabled={addingToCart === deal.id || isInCart}
              >
                {addingToCart === deal.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : isInCart ? (
                  <Text style={styles.addButtonText}>In Cart</Text>
                ) : (
                  <>
                    <Plus color="#FFFFFF" size={moderateScale(12)} />
                    <Text style={styles.addButtonText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
          <View>
            <Text style={styles.headerTitle}>Marketplace</Text>
            {stats && (
              <Text style={styles.headerSubtitle}>
                {stats.activeDeals} active deals • Avg {stats.avgSavings.toFixed(0)}% savings
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation?.navigate?.('Cart')}
          >
            <ShoppingCart color="#14B8A6" size={moderateScale(20)} />
            {cart && cart.items.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.items.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search color="#9CA3AF" size={moderateScale(16)} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product, NDC, distributor..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadDeals(1); }}>
              <X color="#9CA3AF" size={moderateScale(16)} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFiltersModal(true)}>
          <Filter color="#14B8A6" size={moderateScale(16)} />
        </TouchableOpacity>
      </View>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFiltersText}>Filters active</Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toast */}
      {toast.show && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          {toast.type === 'success' ? (
            <CheckCircle2 color="#FFFFFF" size={moderateScale(16)} />
          ) : (
            <AlertCircle color="#FFFFFF" size={moderateScale(16)} />
          )}
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle color="#DC2626" size={moderateScale(16)} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <X color="#DC2626" size={moderateScale(14)} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {loading && deals.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading marketplace...</Text>
          </View>
        ) : (
          <>
            {/* Featured Deals */}
            {featuredDeals && (featuredDeals.dealOfTheDay || featuredDeals.dealOfTheWeek || featuredDeals.dealOfTheMonth) && (
              <View style={styles.featuredSection}>
                <Text style={styles.sectionTitle}>Featured Deals</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.featuredRow}>
                    <FeaturedDealCard deal={featuredDeals.dealOfTheDay} type="day" />
                    <FeaturedDealCard deal={featuredDeals.dealOfTheWeek} type="week" />
                    <FeaturedDealCard deal={featuredDeals.dealOfTheMonth} type="month" />
                  </View>
                </ScrollView>
              </View>
            )}

            {/* All Deals */}
            <View style={styles.dealsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Deals</Text>
                {pagination && (
                  <Text style={styles.dealsCount}>{pagination.total} deals</Text>
                )}
              </View>
              
              {deals.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Package color="#9CA3AF" size={moderateScale(40)} />
                  <Text style={styles.emptyTitle}>No deals found</Text>
                  <Text style={styles.emptySubtext}>
                    {hasActiveFilters ? 'Try adjusting your filters' : 'Check back later for new deals'}
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                      <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.dealsGrid}>
                    {deals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </View>

                  {/* Load More */}
                  {pagination && pagination.page < pagination.totalPages && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <ActivityIndicator size="small" color="#14B8A6" />
                      ) : (
                        <>
                          <Text style={styles.loadMoreText}>Load More Deals</Text>
                          <ArrowDown color="#14B8A6" size={moderateScale(14)} />
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFiltersModal(false)}>
          <Pressable style={styles.filtersModalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <X color="#6B7280" size={moderateScale(20)} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersBody}>
              {/* Category */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[styles.filterOption, !categoryFilter && styles.filterOptionActive]}
                      onPress={() => setCategoryFilter('')}
                    >
                      <Text style={[styles.filterOptionText, !categoryFilter && styles.filterOptionTextActive]}>All</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.filterOption, categoryFilter === cat.value && styles.filterOptionActive]}
                        onPress={() => setCategoryFilter(cat.value)}
                      >
                        <Text style={[styles.filterOptionText, categoryFilter === cat.value && styles.filterOptionTextActive]}>
                          {cat.label} ({cat.count})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Status */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.filterOptionsWrap}>
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOption, statusFilter === opt.value && styles.filterOptionActive]}
                      onPress={() => setStatusFilter(opt.value as StatusFilter)}
                    >
                      <Text style={[styles.filterOptionText, statusFilter === opt.value && styles.filterOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.filterOptionsWrap}>
                  {SORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOption, sortBy === opt.value && styles.filterOptionActive]}
                      onPress={() => setSortBy(opt.value as SortOption)}
                    >
                      <Text style={[styles.filterOptionText, sortBy === opt.value && styles.filterOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort Order */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Sort Order</Text>
                <View style={styles.filterOptionsRow}>
                  <TouchableOpacity
                    style={[styles.filterOption, sortOrder === 'desc' && styles.filterOptionActive]}
                    onPress={() => setSortOrder('desc')}
                  >
                    <Text style={[styles.filterOptionText, sortOrder === 'desc' && styles.filterOptionTextActive]}>Descending</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterOption, sortOrder === 'asc' && styles.filterOptionActive]}
                    onPress={() => setSortOrder('asc')}
                  >
                    <Text style={[styles.filterOptionText, sortOrder === 'asc' && styles.filterOptionTextActive]}>Ascending</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.filtersFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => { setShowFiltersModal(false); loadDeals(1); }}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Deal Detail Modal */}
      <Modal
        visible={!!selectedDeal}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDeal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedDeal(null)}>
          <Pressable style={styles.dealModalContent} onPress={e => e.stopPropagation()}>
            {selectedDeal && (
              <>
                <View style={styles.dealModalHeader}>
                  <View style={styles.dealModalImageContainer}>
                    {selectedDeal.imageUrl ? (
                      <Image source={{ uri: selectedDeal.imageUrl }} style={styles.dealModalImage} />
                    ) : (
                      <View style={styles.dealModalImagePlaceholder}>
                        <Tag color="#9CA3AF" size={moderateScale(40)} />
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={styles.dealModalClose} onPress={() => setSelectedDeal(null)}>
                    <X color="#6B7280" size={moderateScale(20)} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.dealModalBody}>
                  <View style={styles.dealModalBadges}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{selectedDeal.category}</Text>
                    </View>
                    {selectedDeal.savings > 0 && (
                      <View style={styles.savingBadge}>
                        <Text style={styles.savingBadgeText}>{selectedDeal.savings.toFixed(0)}% OFF</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.dealModalName}>{selectedDeal.productName}</Text>
                  
                  {selectedDeal.ndc && (
                    <Text style={styles.dealModalNdc}>NDC: {selectedDeal.ndc}</Text>
                  )}

                  <View style={styles.dealModalPriceRow}>
                    <Text style={styles.dealModalPrice}>{formatCurrency(selectedDeal.dealPrice)}</Text>
                    {selectedDeal.originalPrice > selectedDeal.dealPrice && (
                      <Text style={styles.dealModalOriginalPrice}>{formatCurrency(selectedDeal.originalPrice)}</Text>
                    )}
                  </View>

                  <View style={styles.dealModalInfo}>
                    <View style={styles.dealModalInfoItem}>
                      <Building2 color="#6B7280" size={moderateScale(14)} />
                      <Text style={styles.dealModalInfoText}>{selectedDeal.distributor}</Text>
                    </View>
                    <View style={styles.dealModalInfoItem}>
                      <Package color="#6B7280" size={moderateScale(14)} />
                      <Text style={styles.dealModalInfoText}>{selectedDeal.remainingQuantity} available</Text>
                    </View>
                    <View style={styles.dealModalInfoItem}>
                      <Calendar color="#6B7280" size={moderateScale(14)} />
                      <Text style={styles.dealModalInfoText}>Expires: {formatDate(selectedDeal.expiryDate)}</Text>
                    </View>
                  </View>

                  {selectedDeal.notes && (
                    <View style={styles.dealModalNotes}>
                      <Text style={styles.dealModalNotesLabel}>Notes</Text>
                      <Text style={styles.dealModalNotesText}>{selectedDeal.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                {selectedDeal.status === 'active' && (
                  <View style={styles.dealModalFooter}>
                    <View style={styles.quantitySelector}>
                      <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => setDealQuantity(q => Math.max(selectedDeal.minimumBuyQuantity || 1, q - 1))}
                      >
                        <Minus color="#374151" size={moderateScale(16)} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{dealQuantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => setDealQuantity(q => Math.min(selectedDeal.remainingQuantity, q + 1))}
                      >
                        <Plus color="#374151" size={moderateScale(16)} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={() => handleAddToCart(selectedDeal, dealQuantity)}
                      disabled={addingToCart === selectedDeal.id}
                    >
                      {addingToCart === selectedDeal.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <ShoppingCart color="#FFFFFF" size={moderateScale(16)} />
                          <Text style={styles.addToCartBtnText}>Add to Cart</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  cartButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#14B8A6',
  },
  cartBadge: {
    position: 'absolute',
    top: -moderateScale(4),
    right: -moderateScale(4),
    backgroundColor: '#EF4444',
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(10),
    fontWeight: 'bold',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(8),
    gap: moderateScale(8),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    paddingHorizontal: moderateScale(10),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: moderateScale(6),
  },
  searchInput: {
    flex: 1,
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#374151',
  },
  filterButton: {
    width: moderateScale(42),
    height: moderateScale(42),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#14B8A6',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    backgroundColor: '#F0FDFA',
    marginHorizontal: moderateScale(8),
    borderRadius: moderateScale(6),
  },
  activeFiltersText: {
    fontSize: moderateScale(11),
    color: '#0F766E',
  },
  clearFiltersText: {
    fontSize: moderateScale(11),
    color: '#14B8A6',
    fontWeight: '600',
  },
  // Toast
  toast: {
    position: 'absolute',
    top: moderateScale(120),
    left: moderateScale(16),
    right: moderateScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    zIndex: 100,
    gap: moderateScale(8),
  },
  toastSuccess: {
    backgroundColor: '#22C55E',
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginHorizontal: moderateScale(8),
    gap: moderateScale(8),
  },
  errorText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#DC2626',
  },
  content: {
    flex: 1,
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  // Featured Section
  featuredSection: {
    paddingHorizontal: moderateScale(8),
    marginBottom: moderateScale(16),
    marginTop: moderateScale(8),
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(10),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(10),
  },
  dealsCount: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  featuredRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  featuredCard: {
    width: SCREEN_WIDTH * 0.65,
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: moderateScale(14),
    minHeight: moderateScale(140),
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(10),
    alignSelf: 'flex-start',
    gap: moderateScale(4),
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  featuredName: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: moderateScale(10),
  },
  featuredPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(6),
    gap: moderateScale(8),
  },
  featuredPrice: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  featuredOriginal: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'line-through',
  },
  savingsBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
    borderRadius: moderateScale(6),
    alignSelf: 'flex-start',
    marginTop: moderateScale(8),
  },
  savingsText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: '#EF4444',
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginTop: moderateScale(10),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  metaText: {
    fontSize: moderateScale(9),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Deals Section
  dealsSection: {
    paddingHorizontal: moderateScale(8),
    paddingBottom: moderateScale(20),
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  dealCard: {
    width: (SCREEN_WIDTH - moderateScale(24)) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dealImageContainer: {
    height: moderateScale(100),
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dealImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: moderateScale(6),
    right: moderateScale(6),
    backgroundColor: '#EF4444',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: moderateScale(9),
    fontWeight: 'bold',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlayText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
  dealContent: {
    padding: moderateScale(10),
  },
  dealCategory: {
    fontSize: moderateScale(8),
    color: '#14B8A6',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dealName: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#1F2937',
    marginTop: moderateScale(3),
    minHeight: moderateScale(30),
  },
  dealDistributor: {
    fontSize: moderateScale(9),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(6),
    gap: moderateScale(4),
  },
  dealPrice: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  dealOriginalPrice: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: moderateScale(8),
    paddingTop: moderateScale(8),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(3),
  },
  expiryText: {
    fontSize: moderateScale(8),
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(5),
    borderRadius: moderateScale(6),
    gap: moderateScale(3),
  },
  addButtonInCart: {
    backgroundColor: '#6B7280',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  // Loading & Empty
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(60),
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  emptyTitle: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: moderateScale(4),
    fontSize: moderateScale(12),
    color: '#9CA3AF',
  },
  clearFiltersButton: {
    marginTop: moderateScale(12),
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(6),
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12),
    marginTop: moderateScale(12),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#14B8A6',
    gap: moderateScale(6),
  },
  loadMoreText: {
    fontSize: moderateScale(12),
    color: '#14B8A6',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(16),
    borderTopRightRadius: moderateScale(16),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filtersBody: {
    padding: moderateScale(16),
  },
  filterGroup: {
    marginBottom: moderateScale(20),
  },
  filterLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(10),
  },
  filterOptions: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  filterOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  filterOptionsRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  filterOption: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  filterOptionText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filtersFooter: {
    flexDirection: 'row',
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: moderateScale(12),
  },
  clearButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#14B8A6',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Deal Modal
  dealModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(16),
    borderTopRightRadius: moderateScale(16),
    maxHeight: '85%',
  },
  dealModalHeader: {
    position: 'relative',
  },
  dealModalImageContainer: {
    height: moderateScale(200),
    backgroundColor: '#F3F4F6',
  },
  dealModalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dealModalImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealModalClose: {
    position: 'absolute',
    top: moderateScale(12),
    right: moderateScale(12),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealModalBody: {
    padding: moderateScale(16),
  },
  dealModalBadges: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginBottom: moderateScale(12),
  },
  categoryBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  categoryBadgeText: {
    fontSize: moderateScale(10),
    color: '#14B8A6',
    fontWeight: '600',
  },
  savingBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  savingBadgeText: {
    fontSize: moderateScale(10),
    color: '#EF4444',
    fontWeight: '600',
  },
  dealModalName: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(6),
  },
  dealModalNdc: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: moderateScale(12),
  },
  dealModalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
    marginBottom: moderateScale(16),
  },
  dealModalPrice: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  dealModalOriginalPrice: {
    fontSize: moderateScale(16),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  dealModalInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    gap: moderateScale(10),
    marginBottom: moderateScale(16),
  },
  dealModalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  dealModalInfoText: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  dealModalNotes: {
    backgroundColor: '#FEF3C7',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
  },
  dealModalNotesLabel: {
    fontSize: moderateScale(10),
    color: '#D97706',
    fontWeight: '600',
    marginBottom: moderateScale(4),
  },
  dealModalNotesText: {
    fontSize: moderateScale(11),
    color: '#92400E',
    lineHeight: moderateScale(16),
  },
  dealModalFooter: {
    flexDirection: 'row',
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: moderateScale(12),
    alignItems: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  quantityBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
    minWidth: moderateScale(30),
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
  },
  addToCartBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
