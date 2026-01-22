import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Truck, Package, MapPin, Clock } from 'lucide-react-native';

interface Shipment {
  id: string;
  trackingNumber: string;
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'pending';
  carrier: string;
  estimatedDelivery: string;
  origin: string;
  destination: string;
}

export function ShipmentsScreen() {
  const [shipments] = useState<Shipment[]>([
    { id: '1', trackingNumber: 'SHIP-001234', status: 'in_transit', carrier: 'FedEx', estimatedDelivery: '2024-01-18', origin: 'New York', destination: 'Los Angeles' },
    { id: '2', trackingNumber: 'SHIP-001235', status: 'out_for_delivery', carrier: 'UPS', estimatedDelivery: '2024-01-16', origin: 'Chicago', destination: 'Miami' },
    { id: '3', trackingNumber: 'SHIP-001236', status: 'delivered', carrier: 'USPS', estimatedDelivery: '2024-01-15', origin: 'Boston', destination: 'Seattle' },
    { id: '4', trackingNumber: 'SHIP-001237', status: 'pending', carrier: 'DHL', estimatedDelivery: '2024-01-20', origin: 'Dallas', destination: 'Denver' },
  ]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Pending' };
      case 'in_transit':
        return { color: '#3B82F6', bgColor: '#DBEAFE', label: 'In Transit' };
      case 'out_for_delivery':
        return { color: '#8B5CF6', bgColor: '#EDE9FE', label: 'Out for Delivery' };
      case 'delivered':
        return { color: '#10B981', bgColor: '#D1FAE5', label: 'Delivered' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', label: status };
    }
  };

  const renderShipmentItem = ({ item }: { item: Shipment }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity style={styles.shipmentCard} activeOpacity={0.7}>
        <View style={styles.shipmentHeader}>
          <View style={styles.iconContainer}>
            <Truck color="#14B8A6" size={24} />
          </View>
          <View style={styles.shipmentInfo}>
            <Text style={styles.trackingNumber}>{item.trackingNumber}</Text>
            <Text style={styles.carrier}>{item.carrier}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <Package color="#9CA3AF" size={16} />
            <Text style={styles.routeText}>{item.origin}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <MapPin color="#14B8A6" size={16} />
            <Text style={styles.routeText}>{item.destination}</Text>
          </View>
        </View>

        <View style={styles.shipmentFooter}>
          <View style={styles.deliveryInfo}>
            <Clock color="#6B7280" size={14} />
            <Text style={styles.deliveryText}>
              Est. Delivery: {item.estimatedDelivery}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={shipments}
        renderItem={renderShipmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Truck color="#9CA3AF" size={64} />
            <Text style={styles.emptyTitle}>No shipments yet</Text>
            <Text style={styles.emptyText}>Your shipments will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 20,
  },
  shipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shipmentInfo: {
    flex: 1,
  },
  trackingNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  carrier: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 6,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    borderStyle: 'dashed',
  },
  shipmentFooter: {
    paddingTop: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});

