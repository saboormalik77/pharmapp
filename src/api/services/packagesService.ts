/**
 * Packages API Service
 * Matches pharma-collect-ui packagesService exactly
 */

import { apiClient } from '../client';

export interface DistributorContact {
  email?: string;
  phone?: string;
  location?: string;
}

export interface PackageProduct {
  ndc: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

export interface DeliveryInfo {
  deliveryDate: string;
  receivedBy: string;
  deliveryCondition: string;
  deliveryNotes?: string;
  trackingNumber: string;
  carrier: string;
}

export interface Package {
  id?: string;
  packageNumber?: string;
  pharmacyId?: string;
  distributorName: string;
  distributorId: string;
  distributorContact?: DistributorContact;
  products?: PackageProduct[];
  items?: PackageProduct[];
  totalItems: number;
  totalEstimatedValue: number;
  averagePricePerUnit?: number;
  notes?: string;
  status?: boolean;
  deliveryInfo?: DeliveryInfo;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackagesSummary {
  productsWithPricing: number;
  productsWithoutPricing: number;
  distributorsUsed: number;
}

export interface PackagesStats {
  totalProducts: number;
  totalValue: number;
  deliveredPackages: number;
  nonDeliveredPackages: number;
}

export interface PackagesResponse {
  packages?: Package[];
  total?: number;
  totalProducts?: number;
  totalPackages?: number;
  totalEstimatedValue?: number;
  generatedAt?: string;
  summary?: PackagesSummary;
  stats?: PackagesStats;
}

export const packagesService = {
  /**
   * Get packages
   * GET /optimization/packages
   */
  async getPackages(): Promise<PackagesResponse> {
    const response = await apiClient.get<PackagesResponse>('/optimization/packages');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch packages');
  },

  /**
   * Get custom packages
   * GET /optimization/custom-packages
   */
  async getCustomPackages(): Promise<PackagesResponse> {
    const response = await apiClient.get<PackagesResponse>('/optimization/custom-packages');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch custom packages');
  },

  /**
   * Get suggested packages
   * GET /optimization/packages
   */
  async getSuggestedPackages(): Promise<PackagesResponse> {
    const response = await apiClient.get<PackagesResponse>('/optimization/packages');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch suggested packages');
  },

  /**
   * Delete a custom package
   * DELETE /optimization/custom-packages/:packageId
   */
  async deletePackage(packageId: string): Promise<void> {
    const response = await apiClient.delete(`/optimization/custom-packages/${packageId}`);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete package');
    }
  },

  /**
   * Update package status
   * PATCH /optimization/custom-packages/:packageId/mark-status
   */
  async updatePackageStatus(
    packageId: string,
    status: boolean,
    deliveryInfo?: DeliveryInfo
  ): Promise<any> {
    const payload: any = {};
    if (deliveryInfo) {
      payload.deliveryInfo = deliveryInfo;
    }
    const response = await apiClient.patch(
      `/optimization/custom-packages/${packageId}/mark-status`,
      payload
    );
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to update package status');
    }
    return response.data || response;
  },
};

