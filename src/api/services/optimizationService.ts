/**
 * Optimization API Service
 * Matches pharma-collect-ui optimizationService exactly
 */

import { apiClient } from '../client';

export interface AlternativeDistributor {
  name: string;
  price: number;
  difference: number;
  available: boolean;
}

export interface Recommendation {
  id?: string;
  ndc: string;
  productName: string;
  quantity: number;
  full?: number;
  partial?: number;
  recommendedDistributor: string;
  expectedPrice: number;
  worstPrice: number;
  alternativeDistributors: AlternativeDistributor[];
  savings: number;
  available: boolean;
  lotNumber?: string;
  expirationDate?: string;
}

export interface DistributorUsage {
  usedThisMonth: number;
  totalDistributors: number;
  stillAvailable: number;
}

export interface EarningsComparison {
  singleDistributorStrategy: number;
  multipleDistributorsStrategy: number;
  potentialAdditionalEarnings: number;
}

export interface OptimizationRecommendations {
  recommendations: Recommendation[];
  totalPotentialSavings: number;
  generatedAt: string;
  distributorUsage: DistributorUsage;
  earningsComparison: EarningsComparison;
}

export interface PackageSuggestionProduct {
  ndc: string;
  productId: string;
  productName: string;
  full: number;
  partial: number;
  pricePerUnit: number;
  totalValue: number;
}

export interface PackageSuggestion {
  distributorName: string;
  distributorId: string;
  distributorContact: {
    email: string;
    phone: string;
    location: string;
    feeRates?: {
      [key: string]: {
        percentage: number;
        reportDate: string;
      };
    };
  };
  products: PackageSuggestionProduct[];
  totalItems: number;
  totalEstimatedValue: number;
  averagePricePerUnit: number;
  alreadyCreated: boolean;
  recommended: boolean;
  existingPackage?: {
    id: string;
    packageNumber: string;
    totalItems: number;
    totalEstimatedValue: number;
    feeRate?: number;
    feeDuration?: number;
    createdAt: string;
  };
}

export interface PackageSuggestionsResponse {
  packages: PackageSuggestion[];
  totalProducts: number;
  totalPackages: number;
  totalEstimatedValue: number;
  generatedAt: string;
  summary: {
    productsWithPricing: number;
    productsWithoutPricing: number;
    distributorsUsed: number;
    packagesAlreadyCreated: number;
  };
}

export interface CustomPackageItem {
  ndc: string;
  productName: string;
  full: number;
  partial: number;
  pricePerUnit: number;
  totalValue: number;
  id?: string;
  ids?: string[];
}

export interface CreateCustomPackageRequest {
  distributorName: string;
  distributorId: string;
  items: CustomPackageItem[];
  notes?: string;
  feeRate?: number | null;
  feeDuration?: number | null;
}

export const optimizationService = {
  /**
   * Get optimization recommendations
   */
  async getRecommendations(input?: string | Array<{ ndc: string; fullCount: number; partialCount: number }>): Promise<OptimizationRecommendations> {
    if (!input || (Array.isArray(input) && input.length === 0)) {
      const response = await apiClient.getWithoutPharmacyId<OptimizationRecommendations>(
        '/optimization/recommendations',
        undefined
      );
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch optimization recommendations');
    }

    if (typeof input === 'string') {
      const params = { ndc: input };
      const response = await apiClient.getWithoutPharmacyId<OptimizationRecommendations>(
        '/optimization/recommendations',
        params
      );
      if (response.status === 'success' && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch optimization recommendations');
    }

    const ndcList: string[] = [];
    const fullCountList: string[] = [];
    const partialCountList: string[] = [];
    
    input.forEach(item => {
      ndcList.push(item.ndc);
      fullCountList.push(item.fullCount.toString());
      partialCountList.push(item.partialCount.toString());
    });

    const params = {
      ndc: ndcList.join(','),
      FullCount: fullCountList.join(','),
      PartialCount: partialCountList.join(','),
    };

    const response = await apiClient.getWithoutPharmacyId<OptimizationRecommendations>(
      '/optimization/recommendations',
      params
    );
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch optimization recommendations');
  },

  /**
   * Get package suggestions for products
   */
  async getPackageSuggestions(items: Array<{
    ndc: string;
    productId: string;
    productName: string;
    full: number;
    partial: number;
  }>): Promise<PackageSuggestionsResponse> {
    const response = await apiClient.post<PackageSuggestionsResponse>(
      '/optimization/packages/suggestions',
      { items }
    );
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch package suggestions');
  },

  /**
   * Create a custom package
   */
  async createCustomPackage(packageData: CreateCustomPackageRequest): Promise<any> {
    const response = await apiClient.post<any>(
      '/optimization/custom-packages',
      packageData
    );
    if (response.status === 'success') {
      return response.data || response;
    }
    throw new Error(response.message || 'Failed to create custom package');
  },

  /**
   * Add items to an existing custom package
   */
  async addItemsToPackage(packageId: string, items: CustomPackageItem[]): Promise<any> {
    const response = await apiClient.patch<any>(
      `/optimization/custom-packages/${packageId}/add-items`,
      { items }
    );
    if (response.status === 'success') {
      return response.data || response;
    }
    throw new Error(response.message || 'Failed to add items to package');
  },
};

