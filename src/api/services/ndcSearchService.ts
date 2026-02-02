/**
 * NDC Search Service
 * API client matching /api/optimization/recommendations format
 */

import { apiClient } from '../client';

// ============================================================
// Types - Matching optimization API response
// ============================================================

export interface AlternativeDistributor {
  id?: string;
  name: string;
  price?: number;
  fullPrice: number;
  partialPrice: number;
  difference?: number;
  available?: boolean;
  email?: string;
  phone?: string;
  location?: string;
  reportDate?: string;
}

export interface NDCSearchResult {
  // Core fields
  ndc: string;
  ndcNormalized: string;
  productName: string;
  
  // Recommended distributor (matching optimization API)
  recommendedDistributor: string;
  recommendedDistributorId?: string;
  
  // Prices per unit
  fullPricePerUnit: number;
  partialPricePerUnit: number;
  
  // Best prices
  bestFullPrice: number;
  bestPartialPrice: number;
  
  // All distributors
  distributors: AlternativeDistributor[];
  alternativeDistributors: AlternativeDistributor[];
  
  lastUpdated?: string;
}

export interface NDCSearchResponse {
  results: NDCSearchResult[];
  count: number;
  searchTerm: string;
}

export interface NDCIndexResponse {
  data: NDCSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================
// Service
// ============================================================

export const ndcSearchService = {
  /**
   * Fast NDC search
   */
  async searchNDC(
    searchTerm: string,
    limit: number = 50
  ): Promise<NDCSearchResponse> {
    const params: Record<string, string> = {
      q: searchTerm,
      limit: String(Math.min(limit, 100))
    };

    const response = await apiClient.getWithoutPharmacyId<NDCSearchResponse>(
      '/ndc-search',
      params
    );

    if (response.status === 'success' && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to search NDCs');
  },

  /**
   * Get NDC index for caching
   */
  async getNDCIndex(
    limit: number = 10000,
    offset: number = 0,
    updatedAfter?: string
  ): Promise<NDCIndexResponse> {
    const params: Record<string, string> = {
      limit: String(Math.min(limit, 50000)),
      offset: String(offset)
    };

    if (updatedAfter) {
      params.updatedAfter = updatedAfter;
    }

    const response = await apiClient.getWithoutPharmacyId<NDCIndexResponse>(
      '/ndc-search/index',
      params
    );

    if (response.status === 'success' && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to fetch NDC index');
  },

  async getCacheStats(): Promise<{ size: number }> {
    const response = await apiClient.getWithoutPharmacyId<{ size: number }>(
      '/ndc-search/cache-stats'
    );

    if (response.status === 'success' && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to get cache stats');
  },

  async clearCache(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/ndc-search/clear-cache'
    );

    if (response.status === 'success' && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to clear cache');
  }
};
