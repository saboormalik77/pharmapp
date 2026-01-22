/**
 * Product Lists API Service
 * Matches pharma-collect-ui productListsService exactly
 */

import { apiClient } from '../client';

export interface ProductListItem {
  id: string;
  product_list_id: string;
  ndc: string;
  product_name: string;
  productName: string; // Alias for product_name
  quantity: number;
  full_units?: number;
  partial_units?: number;
  lot_number?: string;
  lotNumber?: string; // Alias
  expiration_date?: string;
  expirationDate?: string; // Alias
  notes?: string;
  added_at: string;
  addedAt?: string; // Alias
  added_by?: string;
  addedBy?: string; // Alias
  recommendedDistributor?: string;
  price?: number;
  expectedPrice?: number;
}

export interface ProductList {
  id: string;
  pharmacy_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items?: ProductListItem[];
}

export const productListsService = {
  /**
   * Get default product list (My Products)
   */
  async getDefaultList(): Promise<ProductList> {
    const response = await apiClient.get<ProductList>('/product-lists/default');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch default product list');
  },

  /**
   * Get all product list items directly
   * Uses GET /api/product-lists which returns items array
   */
  async getItems(): Promise<ProductListItem[]> {
    const response = await apiClient.getWithoutPharmacyId<ProductListItem[]>('/product-lists/items');
    if (response.status === 'success' && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.message || 'Failed to fetch product list items');
  },

  /**
   * Add item to product list directly
   * Uses POST /api/product-lists with the specified payload format
   */
  async addItem(
    listId: string,
    item: {
      ndc: string;
      product_name: string;
      full_units?: number;
      partial_units?: number;
      quantity?: number;
      lot_number?: string;
      expiration_date?: string;
      notes?: string;
    }
  ): Promise<ProductListItem> {
    const payload: any = {
      ndc: item.ndc,
      product_name: item.product_name,
      lot_number: item.lot_number,
      expiration_date: item.expiration_date,
    };

    if (item.full_units !== undefined) {
      payload.full_units = item.full_units;
    }
    if (item.partial_units !== undefined) {
      payload.partial_units = item.partial_units;
    }
    if (item.quantity !== undefined) {
      payload.quantity = item.quantity;
    }
    if (item.notes !== undefined) {
      payload.notes = item.notes;
    }

    const response = await apiClient.post<ProductListItem>('/product-lists/items', payload);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to add item to list');
  },

  /**
   * Update item in product list
   */
  async updateItem(
    itemId: string,
    item: {
      ndc?: string;
      product_name?: string;
      full_units?: number;
      partial_units?: number;
      quantity?: number;
      lot_number?: string;
      expiration_date?: string;
      notes?: string;
    }
  ): Promise<ProductListItem> {
    const payload: any = {};

    if (item.ndc !== undefined) payload.ndc = item.ndc;
    if (item.product_name !== undefined) payload.product_name = item.product_name;
    if (item.full_units !== undefined) payload.full_units = item.full_units;
    if (item.partial_units !== undefined) payload.partial_units = item.partial_units;
    if (item.quantity !== undefined) payload.quantity = item.quantity;
    if (item.lot_number !== undefined) payload.lot_number = item.lot_number;
    if (item.expiration_date !== undefined) payload.expiration_date = item.expiration_date;
    if (item.notes !== undefined) payload.notes = item.notes;

    const response = await apiClient.put<ProductListItem>(`/product-lists/items/${itemId}`, payload);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update item');
  },

  /**
   * Remove item from product list
   */
  async removeItem(itemId: string): Promise<void> {
    const response = await apiClient.delete(`/product-lists/items/${itemId}`);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to remove item from list');
    }
  },

  /**
   * Clear all items from product list
   */
  async clearAllItems(): Promise<void> {
    const response = await apiClient.delete('/product-lists/items');
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to clear all items');
    }
  },
};

