/**
 * Notification API Service
 * Matches pharma-collect-ui notification API exactly
 */

import { apiClient } from '../client';

export interface Notification {
  id: string;
  pharmacy_id: string;
  title: string;
  message: string;
  notification_type: 'expiring_product' | 'order_status' | 'credit_received' | 'system';
  ndc_code?: string;
  product_name?: string;
  expiration_date?: string;
  days_until_expiration?: number;
  full_units?: number;
  partial_units?: number;
  full_price?: number;
  partial_price?: number;
  total_potential_value?: number;
  recommended_distributor_id?: string;
  recommended_distributor_name?: string;
  status: 'unread' | 'read' | 'dismissed';
  read_at: string | null;
  dismissed_at: string | null;
  inventory_item_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
}

export const notificationService = {
  /**
   * Get notifications for current pharmacy
   * GET /notifications
   */
  async getNotifications(filters?: NotificationFilters): Promise<NotificationResponse> {
    const params: Record<string, string> = {};
    
    if (filters?.status) {
      params.status = filters.status;
    }
    if (filters?.type) {
      params.type = filters.type;
    }
    if (filters?.limit) {
      params.limit = filters.limit.toString();
    }
    if (filters?.offset) {
      params.offset = filters.offset.toString();
    }

    const response = await apiClient.get<Notification[]>('/notifications', params);
    
    if (response.status === 'success' && response.data) {
      // Handle both array response and object with notifications property
      const notifications = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).notifications || [];
      
      return {
        notifications,
        total: response.total || notifications.length,
      };
    }
    throw new Error(response.message || 'Failed to fetch notifications');
  },

  /**
   * Get unread notification count
   * GET /notifications/unread-count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    
    if (response.status === 'success' && response.data) {
      return response.data.count;
    }
    throw new Error(response.message || 'Failed to fetch unread count');
  },

  /**
   * Mark notification as read
   * PUT /notifications/:id/read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const response = await apiClient.put(`/notifications/${notificationId}/read`, {});
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to mark notification as read');
    }
  },

  /**
   * Dismiss notification
   * PUT /notifications/:id/dismiss
   */
  async dismiss(notificationId: string): Promise<void> {
    const response = await apiClient.put(`/notifications/${notificationId}/dismiss`, {});
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to dismiss notification');
    }
  },
};

