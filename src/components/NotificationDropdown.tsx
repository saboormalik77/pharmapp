/**
 * Notification Dropdown Component
 * React Native version of pharma-collect-ui NotificationDropdown
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Bell, DollarSign, Package, AlertTriangle, Calendar, X } from 'lucide-react-native';
import { notificationService, Notification } from '../api/services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationDropdownProps {
  onNotificationPress?: (notification: Notification) => void;
}

export function NotificationDropdown({ onNotificationPress }: NotificationDropdownProps) {
  const navigation = useNavigation<any>();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({ limit: 50 });
      console.log('📬 Fetched notifications:', response.notifications.length);
      console.log('📬 Notifications data:', JSON.stringify(response.notifications.slice(0, 2), null, 2));
      setNotifications(response.notifications || []);
      const unread = (response.notifications || []).filter(n => n.status === 'unread').length;
      setUnreadCount(unread);
      setHasFetched(true);
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark all notifications as read when dropdown opens
  const markAllAsReadOnOpen = useCallback(async (notificationsList: Notification[]) => {
    const unreadNotifications = notificationsList.filter(n => n.status === 'unread');
    if (unreadNotifications.length === 0) return;

    // Mark all as read in parallel
    const promises = unreadNotifications.map(notification =>
      notificationService.markAsRead(notification.id).catch(err => {
        console.error('Failed to mark notification as read:', err);
      })
    );

    await Promise.all(promises);

    // Update local state
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, status: 'read' as const, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    if (!hasFetched) {
      fetchNotifications();
    }
  }, [fetchNotifications, hasFetched]);

  // Refresh notifications when modal opens
  useEffect(() => {
    if (isOpen && hasFetched) {
      fetchNotifications();
    }
  }, [isOpen, hasFetched, fetchNotifications]);

  // Auto mark all as read when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      if (unreadNotifications.length > 0) {
        markAllAsReadOnOpen(notifications);
      }
    }
  }, [isOpen, notifications, markAllAsReadOnOpen]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expiring_product':
        return <Calendar size={16} color="#EA580C" />;
      case 'credit_received':
        return <DollarSign size={16} color="#16A34A" />;
      case 'order_status':
        return <Package size={16} color="#2563EB" />;
      case 'system':
        return <AlertTriangle size={16} color="#CA8A04" />;
      default:
        return <Bell size={16} color="#6B7280" />;
    }
  };

  // Get notification background color based on type
  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'expiring_product':
        return '#FED7AA';
      case 'credit_received':
        return '#BBF7D0';
      case 'order_status':
        return '#BFDBFE';
      case 'system':
        return '#FEF08A';
      default:
        return '#F3F4F6';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const recentNotifications = notifications.slice(0, 10);

  // Handle notification press - navigate to Inventory Analysis with return tab
  const handleNotificationPress = (notification: Notification) => {
    setIsOpen(false);
    
    // Call custom handler if provided
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
    
    // Navigate to Inventory Analysis screen with return tab active
    // Navigate through MainStack -> Main (TabNavigator) -> More (Drawer) -> InventoryAnalysis
    try {
      navigation.navigate('MainStack', {
        screen: 'Main',
        params: {
          screen: 'More',
          params: {
            screen: 'InventoryAnalysis',
            params: {
              activeTab: 'return',
            },
          },
        },
      });
      
      // Drawer will be closed by InventoryAnalysisScreen when it receives the activeTab param
    } catch (error) {
      console.error('Error navigating to Inventory Analysis:', error);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        {/* Icon */}
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: getNotificationBgColor(item.notification_type) },
          ]}
        >
          {getNotificationIcon(item.notification_type)}
        </View>

        {/* Content */}
        <View style={styles.notificationTextContainer}>
          {/* Title */}
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {/* Message */}
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>

          {/* Potential value for expiring products */}
          {item.notification_type === 'expiring_product' &&
            item.total_potential_value &&
            item.total_potential_value > 0 && (
              <View style={styles.valueContainer}>
                <DollarSign size={14} color="#059669" />
                <Text style={styles.valueText}>
                  {formatCurrency(item.total_potential_value)}
                </Text>
                {item.recommended_distributor_name && (
                  <Text style={styles.distributorText}>
                    {' '}• {item.recommended_distributor_name}
                  </Text>
                )}
              </View>
            )}

          {/* Footer: time and expiration badge */}
          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
            {item.days_until_expiration !== undefined && (
              <View
                style={[
                  styles.expirationBadge,
                  item.days_until_expiration < 0
                    ? styles.expirationBadgeExpired
                    : item.days_until_expiration <= 30
                    ? styles.expirationBadgeWarning
                    : styles.expirationBadgeGood,
                ]}
              >
                <Text
                  style={[
                    styles.expirationBadgeText,
                    item.days_until_expiration < 0
                      ? styles.expirationBadgeTextExpired
                      : item.days_until_expiration <= 30
                      ? styles.expirationBadgeTextWarning
                      : styles.expirationBadgeTextGood,
                  ]}
                >
                  {item.days_until_expiration < 0
                    ? `Expired ${Math.abs(item.days_until_expiration)}d ago`
                    : `${item.days_until_expiration}d left`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={styles.bellButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Bell size={20} color="#FFFFFF" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Bell size={16} color="#14B8A6" />
                <Text style={styles.modalTitle}>Notifications</Text>
              </View>
              <View style={styles.modalHeaderRight}>
                <Text style={styles.modalCount}>{notifications.length} total</Text>
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#14B8A6" />
              </View>
            ) : recentNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>You're all caught up!</Text>
              </View>
            ) : (
              <View style={styles.notificationsListContainer}>
                <FlatList
                  data={recentNotifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={item => item.id}
                  style={styles.notificationsList}
                  contentContainerStyle={styles.notificationsListContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                />
              </View>
            )}

            {/* Footer */}
            {notifications.length > 10 && (
              <View style={styles.modalFooter}>
                <Text style={styles.modalFooterText}>
                  Showing 10 of {notifications.length} notifications
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bellButton: {
    position: 'relative',
    padding: 8,
    marginRight: 16,
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
    paddingLeft: 16,
  },
  modalContent: {
    width: Math.min(SCREEN_WIDTH - 32, 360),
    maxHeight: Dimensions.get('window').height * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  notificationsListContainer: {
    height: 400,
    minHeight: 200,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsListContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  notificationsListContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationContent: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  valueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  distributorText: {
    fontSize: 12,
    color: '#059669',
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expirationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  expirationBadgeExpired: {
    backgroundColor: '#FEE2E2',
  },
  expirationBadgeWarning: {
    backgroundColor: '#FED7AA',
  },
  expirationBadgeGood: {
    backgroundColor: '#D1FAE5',
  },
  expirationBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  expirationBadgeTextExpired: {
    color: '#991B1B',
  },
  expirationBadgeTextWarning: {
    color: '#9A3412',
  },
  expirationBadgeTextGood: {
    color: '#065F46',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

