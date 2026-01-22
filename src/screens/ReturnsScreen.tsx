import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { RotateCcw, Clock, CheckCircle, XCircle } from 'lucide-react-native';

interface Return {
  id: string;
  returnNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  amount: number;
  createdAt: string;
  itemCount: number;
}

export function ReturnsScreen() {
  const [returns] = useState<Return[]>([
    { id: '1', returnNumber: 'RET-001', status: 'completed', amount: 250.00, createdAt: '2024-01-15', itemCount: 3 },
    { id: '2', returnNumber: 'RET-002', status: 'approved', amount: 180.50, createdAt: '2024-01-14', itemCount: 2 },
    { id: '3', returnNumber: 'RET-003', status: 'pending', amount: 340.00, createdAt: '2024-01-13', itemCount: 5 },
    { id: '4', returnNumber: 'RET-004', status: 'rejected', amount: 120.25, createdAt: '2024-01-12', itemCount: 1 },
  ]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: '#F59E0B', bgColor: '#FEF3C7', label: 'Pending' };
      case 'approved':
        return { icon: CheckCircle, color: '#3B82F6', bgColor: '#DBEAFE', label: 'Approved' };
      case 'completed':
        return { icon: CheckCircle, color: '#10B981', bgColor: '#D1FAE5', label: 'Completed' };
      case 'rejected':
        return { icon: XCircle, color: '#EF4444', bgColor: '#FEE2E2', label: 'Rejected' };
      default:
        return { icon: Clock, color: '#6B7280', bgColor: '#F3F4F6', label: status };
    }
  };

  const renderReturnItem = ({ item }: { item: Return }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity style={styles.returnCard} activeOpacity={0.7}>
        <View style={styles.returnHeader}>
          <View style={styles.returnInfo}>
            <Text style={styles.returnNumber}>{item.returnNumber}</Text>
            <Text style={styles.returnDate}>{item.createdAt}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon color={statusConfig.color} size={14} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <View style={styles.returnFooter}>
          <Text style={styles.itemCount}>{item.itemCount} items</Text>
          <Text style={styles.amount}>Credit: ${item.amount.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={returns}
        renderItem={renderReturnItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <RotateCcw color="#9CA3AF" size={64} />
            <Text style={styles.emptyTitle}>No returns yet</Text>
            <Text style={styles.emptyText}>Your returns will appear here</Text>
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
  returnCard: {
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
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  returnInfo: {
    flex: 1,
  },
  returnNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  returnDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  returnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14B8A6',
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

