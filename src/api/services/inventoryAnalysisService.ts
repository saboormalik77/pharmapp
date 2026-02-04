/**
 * Inventory Analysis API Service
 * Handles inventory analysis upload and summary
 */

import { apiClient } from '../client';

// Types based on API response
export interface DistributorLocation {
  city?: string;
  state?: string;
  street?: string;
  country?: string;
  zipCode?: string;
}

export interface RecommendedDistributor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string | DistributorLocation;
}

export interface AnalysisItem {
  id?: string;
  ndcCode: string;
  ndcNormalized: string;
  productName: string;
  manufacturer: string;
  quantity: number;
  fullUnits: number;
  partialUnits: number;
  expirationDate: string;
  lotNumber: string;
  recommendationType: 'return_now' | 'keep' | 'monitor' | 'no_data';
  recommendedDistributor: RecommendedDistributor | null;
  estimatedReturnValue: number;
  bestFullPrice: number;
  bestPartialPrice: number;
  confidenceScore: number;
  reason: string;
}

export interface AnalysisSummary {
  returnNow: number;
  keep: number;
  monitor: number;
  noData: number;
}

export interface AnalysisResponse {
  uploadId: string;
  totalItems: number;
  itemsToReturn: AnalysisItem[];
  itemsToKeep: AnalysisItem[];
  itemsNoData: AnalysisItem[];
  totalPotentialValue: number;
  summary: AnalysisSummary;
  generatedAt: string;
}

export const inventoryAnalysisService = {
  /**
   * Get inventory analysis summary
   * GET /inventory-analysis/summary
   */
  async getAnalysisSummary(): Promise<AnalysisResponse | null> {
    try {
      const response = await apiClient.getWithoutPharmacyId<AnalysisResponse>(
        '/inventory-analysis/summary'
      );

      if (response.status === 'success' && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.log('No analysis data available:', error);
      return null;
    }
  },

  /**
   * Upload inventory file for analysis
   * POST /inventory-analysis/upload
   */
  async uploadInventoryFile(fileUri: string, fileName: string, mimeType: string): Promise<AnalysisResponse> {
    const formData = new FormData();
    
    // Create file object for React Native
    const file = {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    };
    
    formData.append('file', file as any);

    const response = await apiClient.uploadFile<AnalysisResponse>(
      '/inventory-analysis/upload',
      formData
    );

    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to analyze inventory');
  },
};

