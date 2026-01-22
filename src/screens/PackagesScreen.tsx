import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Box,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Building2,
  ChevronRight,
  Eye,
  Trash2,
  Plus,
  X,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  Loader2,
  FileText,
  Info,
  CheckCircle2,
} from 'lucide-react-native';
import {
  packagesService,
  optimizationService,
  Package as PackageType,
  PackagesResponse,
  DeliveryInfo,
} from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const allowedCarriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];
const allowedConditions = ['good', 'damaged', 'partial', 'missing_items', 'other'];

export function PackagesScreen() {
  // Data State
  const [packagesData, setPackagesData] = useState<PackagesResponse | null>(null);
  const [packagesCache, setPackagesCache] = useState<PackagesResponse | null>(null);
  const [suggestedPackagesCache, setSuggestedPackagesCache] = useState<PackagesResponse | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [packageType, setPackageType] = useState<'packages' | 'suggested'>('packages');
  
  // Modal State
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<{ packageId: string; distributorName: string } | null>(null);
  const [deliveryPackage, setDeliveryPackage] = useState<PackageType | null>(null);
  const [deliveryInfoModal, setDeliveryInfoModal] = useState<{ open: boolean; data: DeliveryInfo | null }>({ open: false, data: null });
  
  // Loading States
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [selectingPackageId, setSelectingPackageId] = useState<string | null>(null);
  
  // Fee Rate Selection for Suggested Packages
  const [selectedFeeRates, setSelectedFeeRates] = useState<Map<string, string>>(new Map());
  
  // Delivery Form Data
  const [deliveryFormData, setDeliveryFormData] = useState({
    contactName: '',
    deliveryDate: '',
    deliveryTime: '',
    deliveryCondition: '',
    trackingNumber: '',
    carrier: '',
    notes: '',
  });
  const [showCarrierPicker, setShowCarrierPicker] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  // Fetch packages on mount
  useEffect(() => {
    const fetchBothPackages = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPackages('packages'),
          fetchPackages('suggested')
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchBothPackages();
  }, []);

  // Update displayed data when packageType changes
  useEffect(() => {
    if (packageType === 'packages') {
      if (packagesCache !== null || !loading) {
        setPackagesData(packagesCache);
      }
    } else {
      if (suggestedPackagesCache !== null || !loading) {
        setPackagesData(suggestedPackagesCache);
      }
    }
  }, [packageType, packagesCache, suggestedPackagesCache, loading]);

  const fetchPackages = async (type: 'packages' | 'suggested' = packageType, showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const packages = type === 'packages' 
        ? await packagesService.getCustomPackages()
        : await packagesService.getSuggestedPackages();
      
      // Transform packages: if items exist, convert to products
      const transformedPackages = (packages.packages || []).map((pkg: any) => {
        if (pkg.items && !pkg.products) {
          return {
            ...pkg,
            products: pkg.items.map((item: any) => ({
              ndc: item.ndc,
              productName: item.productName,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              totalValue: item.totalValue,
            })),
          };
        }
        return pkg;
      });
      
      const customData: PackagesResponse = {
        packages: transformedPackages,
        total: packages.total || transformedPackages.length,
        totalProducts: packages.stats?.totalProducts || packages.totalProducts || 0,
        totalPackages: packages.total || packages.totalPackages || transformedPackages.length,
        totalEstimatedValue: packages.stats?.totalValue || packages.totalEstimatedValue || 0,
        generatedAt: packages.generatedAt || new Date().toISOString(),
        summary: packages.summary || {
          productsWithPricing: 0,
          productsWithoutPricing: 0,
          distributorsUsed: transformedPackages.length,
        },
        stats: packages.stats,
      };
      
      if (type === 'packages') {
        setPackagesCache(customData);
        if (packageType === 'packages') {
          setPackagesData(customData);
        }
      } else {
        setSuggestedPackagesCache(customData);
        if (packageType === 'suggested') {
          setPackagesData(customData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load packages');
      console.error('Error fetching packages:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPackages('packages'),
      fetchPackages('suggested')
    ]);
    setRefreshing(false);
  };

  // Delete Package
  const handleDeletePackage = (packageId: string, distributorName: string) => {
    setError(null);
    setPackageToDelete({ packageId, distributorName });
  };

  const confirmDeletePackage = async () => {
    if (!packageToDelete) return;

    try {
      setDeletingId(packageToDelete.packageId);
      setError(null);
      await packagesService.deletePackage(packageToDelete.packageId);
      
      await Promise.all([
        fetchPackages('packages'),
        fetchPackages('suggested')
      ]);
      
      setPackageToDelete(null);
      setSuccess('Package deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete package');
    } finally {
      setDeletingId(null);
    }
  };

  // Delivery Submission
  const handleDeliverySubmit = async () => {
    if (!deliveryPackage || !deliveryPackage.id) {
      setError('Package information is missing');
      return;
    }

    if (!deliveryFormData.contactName || !deliveryFormData.deliveryDate || !deliveryFormData.deliveryCondition || !deliveryFormData.trackingNumber || !deliveryFormData.carrier) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setUpdatingStatusId(deliveryPackage.id);
      setError(null);
      
      const timePart = deliveryFormData.deliveryTime || '10:30';
      const deliveryDateTime = `${deliveryFormData.deliveryDate}T${timePart}:00Z`;
      
      const deliveryInfo = {
        deliveryDate: deliveryDateTime,
        receivedBy: deliveryFormData.contactName,
        deliveryCondition: deliveryFormData.deliveryCondition,
        deliveryNotes: deliveryFormData.notes || '',
        trackingNumber: deliveryFormData.trackingNumber,
        carrier: deliveryFormData.carrier,
      };

      const response = await packagesService.updatePackageStatus(deliveryPackage.id, true, deliveryInfo);

      if (response && response.status === true && response.deliveryInfo) {
        setDeliveryInfoModal({ open: true, data: response.deliveryInfo });
      }

      // Update local state
      if (packagesData && packagesData.packages) {
        const updatedPackages = packagesData.packages.map(pkg => 
          pkg.id === deliveryPackage.id ? { ...pkg, status: true, deliveryInfo: response.deliveryInfo || pkg.deliveryInfo } : pkg
        );
        
        const updatedStats = packagesData.stats ? { ...packagesData.stats } : undefined;
        if (updatedStats) {
          const wasDelivered = packagesData.packages.find(p => p.id === deliveryPackage.id)?.status;
          if (!wasDelivered) {
            updatedStats.deliveredPackages = (updatedStats.deliveredPackages || 0) + 1;
            updatedStats.nonDeliveredPackages = Math.max(0, (updatedStats.nonDeliveredPackages || 0) - 1);
          }
        }
        
        const updatedData = { ...packagesData, packages: updatedPackages, stats: updatedStats };
        setPackagesData(updatedData);
        setPackagesCache(updatedData);
      }

      closeDeliveryModal();
      setSuccess('Package marked as delivered');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit delivery information');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const closeDeliveryModal = () => {
    setDeliveryPackage(null);
    setDeliveryFormData({
      contactName: '',
      deliveryDate: '',
      deliveryTime: '',
      deliveryCondition: '',
      trackingNumber: '',
      carrier: '',
      notes: '',
    });
    setShowCarrierPicker(false);
    setShowConditionPicker(false);
  };

  // Select Package (Create from Suggested)
  const handleSelectPackage = async (pkg: PackageType) => {
    if (!pkg.distributorId || !pkg.distributorName) {
      setError('Package information is incomplete');
      return;
    }

    const items = (pkg as any).items || pkg.products || [];
    if (items.length === 0) {
      setError('No products found in this package');
      return;
    }

    setSelectingPackageId(pkg.distributorId);
    setError(null);

    try {
      const transformedItems = items.map((item: any) => ({
        productId: item.productId,
        ndc: item.ndc,
        productName: item.productName,
        full: item.full ?? 0,
        partial: item.partial ?? 0,
        pricePerUnit: item.pricePerUnit ?? 0,
        totalValue: item.totalValue ?? 0,
      }));

      const selectedFeeRateDays = selectedFeeRates.get(pkg.distributorId || '');
      const pkgAny = pkg as any;
      const feeRatePercentage = selectedFeeRateDays && pkgAny.distributorContact?.feeRates?.[selectedFeeRateDays]
        ? pkgAny.distributorContact.feeRates[selectedFeeRateDays].percentage
        : null;
      const feeDuration = selectedFeeRateDays ? parseInt(selectedFeeRateDays) : null;

      const payload: any = {
        distributorName: pkg.distributorName,
        distributorId: pkg.distributorId,
        items: transformedItems.map((item: any) => ({
          id: item.productId,
          ndc: item.ndc,
          productId: item.productId,
          product_id: item.productId,
          productName: item.productName,
          product_name: item.productName,
          full: item.full,
          partial: item.partial,
          pricePerUnit: item.pricePerUnit,
          price_per_unit: item.pricePerUnit,
          totalValue: item.totalValue,
          total_value: item.totalValue,
        })),
        notes: '',
      };

      if (feeRatePercentage !== null && feeDuration !== null) {
        payload.feeRate = feeRatePercentage;
        payload.feeDuration = feeDuration;
      }

      await optimizationService.createCustomPackage(payload);

      await fetchPackages('packages');
      await fetchPackages('suggested');
      
      setPackageType('packages');
      setSuccess('Package created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create package');
    } finally {
      setSelectingPackageId(null);
    }
  };

  const packages = packagesData?.packages || [];
  const stats = packagesData?.stats;

  // Stats Card Component
  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) => (
    <View style={[styles.statCard, { borderColor: `${color}40` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Icon color={color} size={moderateScale(16)} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  // Package Card Component
  const PackageCard = ({ pkg }: { pkg: PackageType }) => {
    const isDelivered = pkg.status === true;
    const items = (pkg as any).items || pkg.products || [];
    const pkgAny = pkg as any;
    
    // Fee rate calculation for suggested packages
    const selectedFeeRateDays = selectedFeeRates.get(pkg.distributorId || '');
    const feeRatePercentage = selectedFeeRateDays && pkgAny.distributorContact?.feeRates?.[selectedFeeRateDays]
      ? pkgAny.distributorContact.feeRates[selectedFeeRateDays].percentage
      : 0;
    const adjustedTotalValue = feeRatePercentage > 0
      ? pkg.totalEstimatedValue * (1 - feeRatePercentage / 100)
      : pkg.totalEstimatedValue;

    return (
      <View style={styles.packageCard}>
        {/* Header */}
        <View style={styles.packageHeader}>
          <View style={styles.packageIconContainer}>
            <Box color="#14B8A6" size={moderateScale(18)} />
          </View>
          <View style={styles.packageInfo}>
            {pkg.packageNumber && (
              <Text style={styles.packageNumber}>#{pkg.packageNumber}</Text>
            )}
            <View style={styles.distributorRow}>
              <Building2 color="#6B7280" size={moderateScale(12)} />
              <Text style={styles.distributorName} numberOfLines={1}>{pkg.distributorName}</Text>
            </View>
          </View>
          {packageType === 'packages' && (
            <View style={[styles.statusBadge, { backgroundColor: isDelivered ? '#DCFCE7' : '#FEF3C7' }]}>
              {isDelivered ? (
                <CheckCircle color="#22C55E" size={moderateScale(12)} />
              ) : (
                <Clock color="#F59E0B" size={moderateScale(12)} />
              )}
              <Text style={[styles.statusText, { color: isDelivered ? '#22C55E' : '#F59E0B' }]}>
                {isDelivered ? 'Delivered' : 'Pending'}
              </Text>
            </View>
          )}
        </View>

        {/* Contact Info */}
        {pkg.distributorContact && (
          <View style={styles.contactSection}>
            {pkg.distributorContact.email && (
              <View style={styles.contactItem}>
                <Mail color="#6B7280" size={moderateScale(12)} />
                <Text style={styles.contactText} numberOfLines={1}>{pkg.distributorContact.email}</Text>
              </View>
            )}
            {pkg.distributorContact.phone && (
              <View style={styles.contactItem}>
                <Phone color="#6B7280" size={moderateScale(12)} />
                <Text style={styles.contactText}>{pkg.distributorContact.phone}</Text>
              </View>
            )}
            {pkg.distributorContact.location && (
              <View style={styles.contactItem}>
                <MapPin color="#6B7280" size={moderateScale(12)} />
                <Text style={styles.contactText} numberOfLines={1}>{pkg.distributorContact.location}</Text>
              </View>
            )}
          </View>
        )}

        {/* Details */}
        <View style={styles.packageDetails}>
          <View style={styles.detailItem}>
            <Package color="#6B7280" size={moderateScale(14)} />
            <Text style={styles.detailText}>{items.length} items</Text>
          </View>
          <View style={styles.detailItem}>
            <DollarSign color="#6B7280" size={moderateScale(14)} />
            {packageType === 'suggested' && feeRatePercentage > 0 ? (
              <View>
                <Text style={styles.detailTextStrikethrough}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
                <Text style={styles.detailTextBold}>{formatCurrency(adjustedTotalValue)}</Text>
              </View>
            ) : (
              <Text style={styles.detailText}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
            )}
          </View>
        </View>

        {/* Fee Rate Selector for Suggested Packages */}
        {packageType === 'suggested' && pkgAny.distributorContact?.feeRates && Object.keys(pkgAny.distributorContact.feeRates).length > 0 && (
          <View style={styles.feeRateSection}>
            <Text style={styles.feeRateLabel}>Select Fee Rate</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.feeRateOptions}>
                {Object.entries(pkgAny.distributorContact.feeRates).map(([days, rate]: [string, any]) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.feeRateOption,
                      selectedFeeRates.get(pkg.distributorId || '') === days && styles.feeRateOptionSelected
                    ]}
                    onPress={() => {
                      const newMap = new Map(selectedFeeRates);
                      if (selectedFeeRates.get(pkg.distributorId || '') === days) {
                        newMap.delete(pkg.distributorId || '');
                      } else {
                        newMap.set(pkg.distributorId || '', days);
                      }
                      setSelectedFeeRates(newMap);
                    }}
                  >
                    <Text style={[
                      styles.feeRateOptionText,
                      selectedFeeRates.get(pkg.distributorId || '') === days && styles.feeRateOptionTextSelected
                    ]}>
                      {days}d - {rate.percentage}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Delivery Info */}
        {pkg.deliveryInfo && packageType === 'packages' && (
          <TouchableOpacity 
            style={styles.deliveryInfo}
            onPress={() => setDeliveryInfoModal({ open: true, data: pkg.deliveryInfo! })}
          >
            <Truck color="#22C55E" size={moderateScale(14)} />
            <Text style={styles.deliveryText}>
              Delivered on {formatDate(pkg.deliveryInfo.deliveryDate)}
            </Text>
            <ChevronRight color="#22C55E" size={moderateScale(14)} />
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setSelectedPackage(pkg)}
          >
            <Eye color="#FFFFFF" size={moderateScale(12)} />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>

          {packageType === 'packages' && !isDelivered && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDeliver]}
              onPress={() => setDeliveryPackage(pkg)}
              disabled={updatingStatusId === pkg.id}
            >
              {updatingStatusId === pkg.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Truck color="#FFFFFF" size={moderateScale(12)} />
                  <Text style={styles.actionButtonText}>Deliver</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {packageType === 'suggested' && (
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.actionButtonCreate,
                (selectingPackageId === pkg.distributorId || 
                  (pkgAny.distributorContact?.feeRates && Object.keys(pkgAny.distributorContact.feeRates).length > 0 && !selectedFeeRates.get(pkg.distributorId || ''))) 
                  && styles.actionButtonDisabled
              ]}
              onPress={() => handleSelectPackage(pkg)}
              disabled={
                selectingPackageId === pkg.distributorId ||
                (pkgAny.distributorContact?.feeRates && Object.keys(pkgAny.distributorContact.feeRates).length > 0 && !selectedFeeRates.get(pkg.distributorId || ''))
              }
            >
              {selectingPackageId === pkg.distributorId ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Plus color="#FFFFFF" size={moderateScale(12)} />
                  <Text style={styles.actionButtonText}>Create</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {packageType === 'packages' && pkg.id && !isDelivered && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDelete]}
              onPress={() => handleDeletePackage(pkg.id || '', pkg.distributorName)}
              disabled={deletingId === pkg.id}
            >
              {deletingId === pkg.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Trash2 color="#FFFFFF" size={moderateScale(12)} />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#F0FDFA', '#CCFBF1', '#F0FDFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Packages</Text>
        </View>
      </LinearGradient>

      {/* Alerts */}
      {error && (
        <View style={styles.alertError}>
          <AlertCircle color="#DC2626" size={moderateScale(16)} />
          <Text style={styles.alertErrorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={styles.alertClose}>
            <X color="#DC2626" size={moderateScale(14)} />
          </TouchableOpacity>
        </View>
      )}

      {success && (
        <View style={styles.alertSuccess}>
          <CheckCircle2 color="#16A34A" size={moderateScale(16)} />
          <Text style={styles.alertSuccessText}>{success}</Text>
          <TouchableOpacity onPress={() => setSuccess(null)} style={styles.alertClose}>
            <X color="#16A34A" size={moderateScale(14)} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, packageType === 'packages' && styles.tabActive]}
          onPress={() => setPackageType('packages')}
        >
          <Text style={[styles.tabText, packageType === 'packages' && styles.tabTextActive]}>
            Packages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, packageType === 'suggested' && styles.tabActive]}
          onPress={() => setPackageType('suggested')}
        >
          <Text style={[styles.tabText, packageType === 'suggested' && styles.tabTextActive]}>
            Suggested
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {/* Stats Summary */}
        {packagesData && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Packages"
              value={packagesData.total || packages.length}
              icon={Package}
              color="#14B8A6"
            />
            <StatCard
              title="Total Value"
              value={formatCurrency(stats?.totalValue || packagesData.totalEstimatedValue || 0)}
              icon={DollarSign}
              color="#3B82F6"
            />
            {packageType === 'packages' && stats && (
              <>
                <StatCard
                  title="Delivered"
                  value={stats.deliveredPackages || 0}
                  icon={CheckCircle}
                  color="#22C55E"
                />
                <StatCard
                  title="Pending"
                  value={stats.nonDeliveredPackages || 0}
                  icon={Clock}
                  color="#F59E0B"
                />
              </>
            )}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info color="#14B8A6" size={moderateScale(14)} />
          <Text style={styles.infoText}>
            {packageType === 'packages' 
              ? 'Custom packages are optimized collections of products grouped by distributor.'
              : 'Suggested packages are recommendations based on your product list.'
            }
          </Text>
        </View>

        {/* Package List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading packages...</Text>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Box color="#9CA3AF" size={moderateScale(40)} />
            <Text style={styles.emptyText}>No packages found</Text>
            {packageType === 'suggested' && (
              <Text style={styles.emptySubtext}>Add products to your list to see suggestions</Text>
            )}
          </View>
        ) : (
          <View style={styles.packagesSection}>
            {packages.map((pkg, index) => (
              <PackageCard key={pkg.id || index} pkg={pkg} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Package Detail Modal */}
      <Modal
        visible={!!selectedPackage}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPackage(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedPackage(null)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Package Details</Text>
              <TouchableOpacity onPress={() => setSelectedPackage(null)}>
                <X color="#6B7280" size={moderateScale(20)} />
              </TouchableOpacity>
            </View>
            
            {selectedPackage && (
              <ScrollView style={styles.modalBody}>
                {/* Distributor Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Distributor</Text>
                  <Text style={styles.modalDistributorName}>{selectedPackage.distributorName}</Text>
                  {selectedPackage.distributorContact && (
                    <View style={styles.modalContactInfo}>
                      {selectedPackage.distributorContact.email && (
                        <View style={styles.modalContactItem}>
                          <Mail color="#6B7280" size={moderateScale(12)} />
                          <Text style={styles.modalContactText}>{selectedPackage.distributorContact.email}</Text>
                        </View>
                      )}
                      {selectedPackage.distributorContact.phone && (
                        <View style={styles.modalContactItem}>
                          <Phone color="#6B7280" size={moderateScale(12)} />
                          <Text style={styles.modalContactText}>{selectedPackage.distributorContact.phone}</Text>
                        </View>
                      )}
                      {selectedPackage.distributorContact.location && (
                        <View style={styles.modalContactItem}>
                          <MapPin color="#6B7280" size={moderateScale(12)} />
                          <Text style={styles.modalContactText}>{selectedPackage.distributorContact.location}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Items */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Items ({((selectedPackage as any).items || selectedPackage.products || []).length})</Text>
                  {((selectedPackage as any).items || selectedPackage.products || []).map((item: any, index: number) => (
                    <View key={index} style={styles.modalItem}>
                      <View style={styles.modalItemHeader}>
                        <Text style={styles.modalItemName} numberOfLines={1}>{item.productName}</Text>
                        <Text style={styles.modalItemPrice}>{formatCurrency(item.totalValue || 0)}</Text>
                      </View>
                      <Text style={styles.modalItemNdc}>NDC: {item.ndc}</Text>
                      <View style={styles.modalItemDetails}>
                        <Text style={styles.modalItemDetail}>Full: {item.full ?? 0}</Text>
                        <Text style={styles.modalItemDetail}>Partial: {item.partial ?? 0}</Text>
                        <Text style={styles.modalItemDetail}>@ {formatCurrency(item.pricePerUnit || 0)}/unit</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.modalTotalSection}>
                  <Text style={styles.modalTotalLabel}>Total Estimated Value</Text>
                  <Text style={styles.modalTotalValue}>{formatCurrency(selectedPackage.totalEstimatedValue)}</Text>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delivery Form Modal */}
      <Modal
        visible={!!deliveryPackage}
        animationType="slide"
        transparent
        onRequestClose={closeDeliveryModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDeliveryModal}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Mark as Delivered</Text>
                <Text style={styles.modalSubtitle}>{deliveryPackage?.distributorName}</Text>
              </View>
              <TouchableOpacity onPress={closeDeliveryModal}>
                <X color="#6B7280" size={moderateScale(20)} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Received By */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Received By *</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryFormData.contactName}
                  onChangeText={(text) => setDeliveryFormData(prev => ({ ...prev, contactName: text }))}
                  placeholder="Enter name of person who received"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Delivery Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Delivery Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryFormData.deliveryDate}
                  onChangeText={(text) => setDeliveryFormData(prev => ({ ...prev, deliveryDate: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Delivery Time */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Delivery Time</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryFormData.deliveryTime}
                  onChangeText={(text) => setDeliveryFormData(prev => ({ ...prev, deliveryTime: text }))}
                  placeholder="HH:MM (optional)"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Tracking Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tracking Number *</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryFormData.trackingNumber}
                  onChangeText={(text) => setDeliveryFormData(prev => ({ ...prev, trackingNumber: text }))}
                  placeholder="Enter tracking number"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Carrier */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Carrier *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => setShowCarrierPicker(!showCarrierPicker)}
                >
                  <Text style={deliveryFormData.carrier ? styles.formSelectText : styles.formSelectPlaceholder}>
                    {deliveryFormData.carrier || 'Select carrier'}
                  </Text>
                  <ChevronDown color="#6B7280" size={moderateScale(16)} />
                </TouchableOpacity>
                {showCarrierPicker && (
                  <View style={styles.pickerOptions}>
                    {allowedCarriers.map((carrier) => (
                      <TouchableOpacity
                        key={carrier}
                        style={styles.pickerOption}
                        onPress={() => {
                          setDeliveryFormData(prev => ({ ...prev, carrier }));
                          setShowCarrierPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>{carrier}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Delivery Condition */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Delivery Condition *</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => setShowConditionPicker(!showConditionPicker)}
                >
                  <Text style={deliveryFormData.deliveryCondition ? styles.formSelectText : styles.formSelectPlaceholder}>
                    {deliveryFormData.deliveryCondition ? deliveryFormData.deliveryCondition.replace('_', ' ') : 'Select condition'}
                  </Text>
                  <ChevronDown color="#6B7280" size={moderateScale(16)} />
                </TouchableOpacity>
                {showConditionPicker && (
                  <View style={styles.pickerOptions}>
                    {allowedConditions.map((condition) => (
                      <TouchableOpacity
                        key={condition}
                        style={styles.pickerOption}
                        onPress={() => {
                          setDeliveryFormData(prev => ({ ...prev, deliveryCondition: condition }));
                          setShowConditionPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>{condition.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={deliveryFormData.notes}
                  onChangeText={(text) => setDeliveryFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Any additional notes..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, updatingStatusId === deliveryPackage?.id && styles.buttonDisabled]}
                onPress={handleDeliverySubmit}
                disabled={updatingStatusId === deliveryPackage?.id}
              >
                {updatingStatusId === deliveryPackage?.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Truck color="#FFFFFF" size={moderateScale(14)} />
                    <Text style={styles.submitButtonText}>Confirm Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delivery Info Modal */}
      <Modal
        visible={deliveryInfoModal.open}
        animationType="fade"
        transparent
        onRequestClose={() => setDeliveryInfoModal({ open: false, data: null })}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeliveryInfoModal({ open: false, data: null })}>
          <Pressable style={styles.modalContentSmall} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Information</Text>
              <TouchableOpacity onPress={() => setDeliveryInfoModal({ open: false, data: null })}>
                <X color="#6B7280" size={moderateScale(20)} />
              </TouchableOpacity>
            </View>
            
            {deliveryInfoModal.data && (
              <View style={styles.deliveryInfoContent}>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Received By</Text>
                  <Text style={styles.deliveryInfoValue}>{deliveryInfoModal.data.receivedBy}</Text>
                </View>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Date</Text>
                  <Text style={styles.deliveryInfoValue}>{formatDate(deliveryInfoModal.data.deliveryDate)}</Text>
                </View>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Tracking</Text>
                  <Text style={styles.deliveryInfoValue}>{deliveryInfoModal.data.trackingNumber}</Text>
                </View>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Carrier</Text>
                  <Text style={styles.deliveryInfoValue}>{deliveryInfoModal.data.carrier}</Text>
                </View>
                <View style={styles.deliveryInfoRow}>
                  <Text style={styles.deliveryInfoLabel}>Condition</Text>
                  <Text style={styles.deliveryInfoValue}>{deliveryInfoModal.data.deliveryCondition.replace('_', ' ')}</Text>
                </View>
                {deliveryInfoModal.data.deliveryNotes && (
                  <View style={styles.deliveryInfoRow}>
                    <Text style={styles.deliveryInfoLabel}>Notes</Text>
                    <Text style={styles.deliveryInfoValue}>{deliveryInfoModal.data.deliveryNotes}</Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!packageToDelete}
        animationType="fade"
        transparent
        onRequestClose={() => setPackageToDelete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPackageToDelete(null)}>
          <Pressable style={styles.modalContentSmall} onPress={e => e.stopPropagation()}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteIconContainer}>
                <AlertCircle color="#EF4444" size={moderateScale(32)} />
              </View>
              <Text style={styles.deleteTitle}>Delete Package</Text>
              <Text style={styles.deleteMessage}>
                Are you sure you want to delete the package for "{packageToDelete?.distributorName}"? This action cannot be undone.
              </Text>
              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPackageToDelete(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeleteButton, deletingId && styles.buttonDisabled]}
                  onPress={confirmDeletePackage}
                  disabled={!!deletingId}
                >
                  {deletingId ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    borderRadius: moderateScale(10),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  // Alerts
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    gap: moderateScale(8),
  },
  alertErrorText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#991B1B',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    gap: moderateScale(8),
  },
  alertSuccessText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#166534',
  },
  alertClose: {
    padding: moderateScale(4),
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    padding: moderateScale(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: moderateScale(10),
    alignItems: 'center',
    borderRadius: moderateScale(8),
  },
  tabActive: {
    backgroundColor: '#14B8A6',
  },
  tabText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: moderateScale(8),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
    marginBottom: moderateScale(8),
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    borderWidth: 2,
    alignItems: 'center',
  },
  statIcon: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(6),
  },
  statValue: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    gap: moderateScale(8),
    marginBottom: moderateScale(12),
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  infoText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#0F766E',
    lineHeight: moderateScale(16),
  },
  // Package Card
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: moderateScale(12),
    overflow: 'hidden',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  packageIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageInfo: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  packageNumber: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#14B8A6',
  },
  distributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: moderateScale(2),
  },
  distributorName: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
    gap: moderateScale(4),
  },
  statusText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  // Contact Section
  contactSection: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    marginBottom: moderateScale(4),
  },
  contactText: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    flex: 1,
  },
  // Package Details
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  detailText: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  detailTextStrikethrough: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  detailTextBold: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#14B8A6',
  },
  // Fee Rate Section
  feeRateSection: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feeRateLabel: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: moderateScale(6),
  },
  feeRateOptions: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  feeRateOption: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(16),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  feeRateOptionSelected: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  feeRateOptionText: {
    fontSize: moderateScale(10),
    color: '#374151',
  },
  feeRateOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Delivery Info
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    gap: moderateScale(6),
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  deliveryText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#22C55E',
  },
  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    padding: moderateScale(12),
    gap: moderateScale(8),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    gap: moderateScale(4),
  },
  actionButtonDeliver: {
    backgroundColor: '#3B82F6',
  },
  actionButtonCreate: {
    backgroundColor: '#22C55E',
  },
  actionButtonDelete: {
    backgroundColor: '#EF4444',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Loading & Empty
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(60),
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(60),
  },
  emptyText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: moderateScale(4),
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    textAlign: 'center',
  },
  packagesSection: {
    paddingBottom: moderateScale(16),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(16),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    width: '100%',
    maxWidth: moderateScale(400),
    maxHeight: '85%',
  },
  modalContentSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    width: '100%',
    maxWidth: moderateScale(360),
    padding: moderateScale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  modalBody: {
    padding: moderateScale(16),
  },
  modalSection: {
    marginBottom: moderateScale(16),
  },
  modalSectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(8),
  },
  modalDistributorName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContactInfo: {
    marginTop: moderateScale(8),
  },
  modalContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    marginBottom: moderateScale(4),
  },
  modalContactText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  modalItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(8),
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalItemName: {
    flex: 1,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#1F2937',
    marginRight: moderateScale(8),
  },
  modalItemPrice: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#14B8A6',
  },
  modalItemNdc: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
    fontFamily: 'monospace',
  },
  modalItemDetails: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginTop: moderateScale(6),
  },
  modalItemDetail: {
    fontSize: moderateScale(9),
    color: '#9CA3AF',
  },
  modalTotalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginTop: moderateScale(8),
  },
  modalTotalLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#0F766E',
  },
  modalTotalValue: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  // Form Styles
  formGroup: {
    marginBottom: moderateScale(16),
  },
  formLabel: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
    marginBottom: moderateScale(6),
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#374151',
  },
  formTextArea: {
    minHeight: moderateScale(80),
    textAlignVertical: 'top',
  },
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
  },
  formSelectText: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  formSelectPlaceholder: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
  },
  pickerOptions: {
    marginTop: moderateScale(4),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: moderateScale(12),
    color: '#374151',
    textTransform: 'capitalize',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
    marginTop: moderateScale(8),
  },
  submitButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Delivery Info Modal
  deliveryInfoContent: {
    marginTop: moderateScale(12),
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deliveryInfoLabel: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  deliveryInfoValue: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
    textAlign: 'right',
    flex: 1,
    marginLeft: moderateScale(8),
  },
  // Delete Modal
  deleteModalContent: {
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  deleteTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  deleteMessage: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(18),
    marginBottom: moderateScale(20),
  },
  deleteActions: {
    flexDirection: 'row',
    gap: moderateScale(12),
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
