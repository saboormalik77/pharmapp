/**
 * Services index file
 * Re-exports all services for easy importing
 */

export { dashboardService } from './dashboardService';
export type {
  DashboardSummary,
  PeriodEarning,
  DistributorEarning,
  EarningsHistoryResponse,
  EarningsHistoryParams,
  EarningsEstimationChartData,
  EarningsEstimationResponse,
} from './dashboardService';

export { documentsService } from './documentsService';
export type { UploadedDocument, DocumentsFilters } from './documentsService';

export { inventoryService } from './inventoryService';
export type {
  InventoryItem,
  CreateInventoryItemRequest,
  InventoryFilters,
  InventoryMetrics,
} from './inventoryService';

export { packagesService } from './packagesService';
export type {
  DistributorContact,
  PackageProduct,
  DeliveryInfo,
  Package,
  PackagesSummary,
  PackagesStats,
  PackagesResponse,
} from './packagesService';

export { distributorsService } from './distributorsService';
export type { TopDistributor, TopDistributorsResponse } from './distributorsService';

export { marketplaceService } from './marketplaceService';
export type {
  MarketplaceDeal,
  FeaturedDealsResponse,
  MarketplaceStats,
  CategoryOption,
  PaginationInfo,
  MarketplaceListResponse,
  MarketplaceFilters,
  CartItem,
  CartSummary,
  CartResponse,
  OrderItem,
  Order,
  OrderSummary,
  OrderListResponse,
} from './marketplaceService';

export { productListsService } from './productListsService';
export type {
  ProductListItem,
  ProductList,
} from './productListsService';

export { optimizationService } from './optimizationService';
export type {
  AlternativeDistributor,
  Recommendation,
  DistributorUsage,
  EarningsComparison,
  OptimizationRecommendations,
  PackageSuggestionProduct,
  PackageSuggestion,
  PackageSuggestionsResponse,
  CreateCustomPackageRequest,
} from './optimizationService';

export { settingsService } from './settingsService';
export type {
  UserSettings,
  ChangePasswordRequest,
} from './settingsService';

export { subscriptionService } from './subscriptionService';
export type {
  SubscriptionPlan,
  SubscriptionPlanType,
  SubscriptionStatus,
  Subscription,
  CheckoutSessionResponse,
  PortalSessionResponse,
} from './subscriptionService';
