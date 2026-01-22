/**
 * Inventory API Service
 * Matches pharma-collect-ui inventoryService exactly
 */

import { apiClient } from '../client';

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  ndc: string;
  productName: string;
  manufacturer?: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  unit?: string;
  location?: string;
  boxes?: number;
  tabletsPerBox?: number;
  status: 'active' | 'expiring_soon' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemRequest {
  ndc: string;
  product_name: string;
  lot_number: string;
  expiration_date: string;
  quantity: number;
  unit?: string;
  location?: string;
  boxes?: number;
  tablets_per_box?: number;
}

export interface InventoryFilters {
  status?: 'active' | 'expiring_soon' | 'expired';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InventoryMetrics {
  totalItems: number;
  activeItems: number;
  expiringSoonItems: number;
  expiredItems: number;
  totalValue: number;
}

export const inventoryService = {
  /**
   * Get all inventory items
   * GET /inventory
   */
  async getInventoryItems(filters?: InventoryFilters): Promise<{ items: InventoryItem[]; total: number }> {
    const response = await apiClient.get<any[]>('/inventory', filters);
    if (response.status === 'success' && response.data) {
      const items = (Array.isArray(response.data) ? response.data : []).map((item: any) => ({
        id: item.id,
        pharmacyId: item.pharmacy_id,
        ndc: item.ndc,
        productName: item.product_name,
        manufacturer: item.manufacturer,
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        boxes: item.boxes,
        tabletsPerBox: item.tablets_per_box,
        status: item.status || 'active',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      return {
        items,
        total: response.total || items.length,
      };
    }
    throw new Error(response.message || 'Failed to fetch inventory items');
  },

  /**
   * Get inventory item by ID
   * GET /inventory/:id
   */
  async getInventoryItemById(id: string): Promise<InventoryItem> {
    const response = await apiClient.get<any>(`/inventory/${id}`);
    if (response.status === 'success' && response.data) {
      const item = response.data;
      return {
        id: item.id,
        pharmacyId: item.pharmacy_id,
        ndc: item.ndc,
        productName: item.product_name,
        manufacturer: item.manufacturer,
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        boxes: item.boxes,
        tabletsPerBox: item.tablets_per_box,
        status: item.status || 'active',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }
    throw new Error(response.message || 'Failed to fetch inventory item');
  },

  /**
   * Create a new inventory item
   * POST /inventory
   */
  async createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    const response = await apiClient.post<any>('/inventory', data);
    if (response.status === 'success' && response.data) {
      const item = response.data;
      return {
        id: item.id,
        pharmacyId: item.pharmacy_id,
        ndc: item.ndc,
        productName: item.product_name,
        manufacturer: item.manufacturer,
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        boxes: item.boxes,
        tabletsPerBox: item.tablets_per_box,
        status: item.status || 'active',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }
    throw new Error(response.message || 'Failed to create inventory item');
  },

  /**
   * Update an inventory item
   * PATCH /inventory/:id
   */
  async updateInventoryItem(id: string, data: Partial<CreateInventoryItemRequest>): Promise<InventoryItem> {
    const response = await apiClient.patch<any>(`/inventory/${id}`, data);
    if (response.status === 'success' && response.data) {
      const item = response.data;
      return {
        id: item.id,
        pharmacyId: item.pharmacy_id,
        ndc: item.ndc,
        productName: item.product_name,
        manufacturer: item.manufacturer,
        lotNumber: item.lot_number,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        boxes: item.boxes,
        tabletsPerBox: item.tablets_per_box,
        status: item.status || 'active',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }
    throw new Error(response.message || 'Failed to update inventory item');
  },

  /**
   * Delete an inventory item
   * DELETE /inventory/:id
   */
  async deleteInventoryItem(id: string): Promise<void> {
    const response = await apiClient.delete(`/inventory/${id}`);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete inventory item');
    }
  },

  /**
   * Get inventory metrics
   * GET /inventory/metrics
   */
  async getInventoryMetrics(): Promise<InventoryMetrics> {
    const response = await apiClient.get<InventoryMetrics>('/inventory/metrics');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch inventory metrics');
  },
};

