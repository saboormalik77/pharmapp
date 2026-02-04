import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Package,
  Building2,
  Mail,
  Phone,
  MapPin,
  Plus,
  AlertCircle,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  productListsService,
  optimizationService,
  ProductListItem,
  OptimizationSuggestionsResponse,
  OptimizationSuggestionDistributor,
  DistributorSuggestionResponse,
} from '../api/services';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export function PackageSuggestionsScreen() {
  const navigation = useNavigation();
  
  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  // Products state
  const [productItems, setProductItems] = useState<ProductListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, { full_units: number; partial_units: number; id: string }>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Suggestions state
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationSuggestionsResponse | null>(null);
  const [creatingPackageDistributorId, setCreatingPackageDistributorId] = useState<string | null>(null);
  
  // View distributor modal state
  const [viewDistributor, setViewDistributor] = useState<OptimizationSuggestionDistributor | null>(null);
  
  // Create Package Modal state (for existing/create new tabs)
  const [pendingDistributor, setPendingDistributor] = useState<OptimizationSuggestionDistributor | null>(null);
  const [distributorSuggestionData, setDistributorSuggestionData] = useState<DistributorSuggestionResponse | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'existing' | 'create'>('create');
  const [submittingAction, setSubmittingAction] = useState<'create' | 'add' | null>(null);
  const [selectedFeeRates, setSelectedFeeRates] = useState<Map<string, string>>(new Map()); // Map<distributorId, feeRateDays>
  const [feeRateDropdownVisible, setFeeRateDropdownVisible] = useState(false);
  const [feeRateDropdownData, setFeeRateDropdownData] = useState<{ distributorId: string; feeRates: Record<string, any> } | null>(null);
  
  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setError(null);
      const items = await productListsService.getItems();
      console.log('Fetched products:', items?.length || 0);
      setProductItems(items || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductToggle = (productId: string) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      const product = productItems.find(item => item.id === productId);
      if (product) {
        newSelected.set(productId, { full_units: 0, partial_units: 0, id: productId });
      }
    }
    setSelectedItems(newSelected);
  };

  const handleFullUnitsChange = (productId: string, full_units: number) => {
    if (full_units < 0) return;
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(productId) || { full_units: 0, partial_units: 0, id: productId };
    newSelected.set(productId, { ...current, full_units });
    setSelectedItems(newSelected);
  };

  const handlePartialUnitsChange = (productId: string, partial_units: number) => {
    if (partial_units < 0) return;
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(productId) || { full_units: 0, partial_units: 0, id: productId };
    newSelected.set(productId, { ...current, partial_units });
    setSelectedItems(newSelected);
  };

  const handleGetSuggestions = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one product');
      return;
    }

    const itemsWithUnits = Array.from(selectedItems.entries())
      .filter(([_, units]) => units.full_units > 0 || units.partial_units > 0)
      .map(([productId, units]) => {
        const product = productItems.find(item => item.id === productId);
        if (!product) return null;
        return {
          ndc: product.ndc,
          full: units.full_units,
          partial: units.partial_units,
          productId: productId,
        };
      })
      .filter(item => item !== null) as Array<{ ndc: string; full: number; partial: number; productId: string }>;

    if (itemsWithUnits.length === 0) {
      setError('Please enter at least one full unit or partial unit for selected products');
      return;
    }

    try {
      setLoadingSuggestions(true);
      setError(null);
      const results = await optimizationService.getSuggestions(itemsWithUnits);
      console.log('Optimization results:', results);
      setOptimizationResults(results);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error getting suggestions:', err);
      setError(err.message || 'Failed to get optimization suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Prepare items for API calls
  const prepareItems = (distributor: OptimizationSuggestionDistributor) => {
    return distributor.products.map((product: any) => {
      const selectedProduct = productItems.find(item => item.ndc === product.ndc && selectedItems.has(item.id));
      const selectedUnits = selectedProduct
        ? selectedItems.get(selectedProduct.id) || { full_units: 0, partial_units: 0, id: selectedProduct.id }
        : { full_units: 0, partial_units: 0, id: '' };

      const full = selectedUnits.full_units ?? 0;
      const partial = selectedUnits.partial_units ?? 0;
      const productId = selectedUnits.id || (selectedProduct?.id || '');

      return {
        ndc: product.ndc,
        productId: productId,
        productName: product.productName,
        full: full,
        partial: partial,
      };
    });
  };

  const handleCreatePackageFromDistributor = async (distributor: OptimizationSuggestionDistributor) => {
    const distributorId = distributor.distributorId || distributor.distributorName;
    
    try {
      setCreatingPackageDistributorId(distributorId);
      setError(null);

      // Prepare items for the distributor suggestion API
      const items = prepareItems(distributor);

      // Call the distributor suggestion API first
      const suggestionResponse = await optimizationService.getDistributorSuggestion(
        distributor.distributorId || '',
        items
      );

      // Store the response and show modal
      console.log('Distributor suggestion response:', JSON.stringify(suggestionResponse, null, 2));
      setDistributorSuggestionData(suggestionResponse);
      setPendingDistributor(distributor);
      // Set default tab: 'existing' if existing package exists, otherwise 'create'
      setActiveModalTab(suggestionResponse.packages[0]?.existingPackage ? 'existing' : 'create');
      // Clear submitting state when modal opens
      setCreatingPackageDistributorId(null);
    } catch (err: any) {
      console.error('Error getting distributor suggestion:', err);
      setError(err.message || 'Failed to get distributor suggestion');
      setCreatingPackageDistributorId(null);
    }
  };

  const handleCreateCustomPackage = async () => {
    if (!pendingDistributor || !distributorSuggestionData) return;

    const distributorId = pendingDistributor.distributorId || pendingDistributor.distributorName;
    try {
      setCreatingPackageDistributorId(distributorId);
      setSubmittingAction('create');
      setError(null);

      const items = distributorSuggestionData.packages[0].products.map((product: any) => {
        const selectedProduct = productItems.find(item => item.ndc === product.ndc && selectedItems.has(item.id));
        const selectedUnits = selectedProduct
          ? selectedItems.get(selectedProduct.id) || { full_units: 0, partial_units: 0, id: selectedProduct.id }
          : { full_units: 0, partial_units: 0, id: '' };

        const full = selectedUnits.full_units ?? 0;
        const partial = selectedUnits.partial_units ?? 0;
        const productId = selectedUnits.id || (selectedProduct?.id || '');
        const pricePerUnit = product.pricePerUnit || 0;
        const totalValue = product.totalValue || 0;

        return {
          id: productId,
          ndc: product.ndc,
          productId: productId,
          product_id: productId,
          productName: product.productName,
          product_name: product.productName,
          full: full,
          partial: partial,
          pricePerUnit: pricePerUnit,
          price_per_unit: pricePerUnit,
          totalValue: totalValue,
          total_value: totalValue,
        };
      });

      // Get selected feeRate for this distributor
      const selectedFeeRateDays = selectedFeeRates.get(pendingDistributor.distributorId || '');
      const distributorAny = pendingDistributor as any;
      const feeRatePercentage = selectedFeeRateDays && distributorAny.feeRates?.[selectedFeeRateDays]
        ? distributorAny.feeRates[selectedFeeRateDays].percentage
        : null;
      const feeDuration = selectedFeeRateDays ? parseInt(selectedFeeRateDays) : null;

      const payload: any = {
        distributorName: pendingDistributor.distributorName,
        distributorId: pendingDistributor.distributorId || '',
        items,
        notes: '',
      };

      // Only include feeRate and feeDuration if they were selected
      if (feeRatePercentage !== null && feeDuration !== null) {
        payload.feeRate = feeRatePercentage;
        payload.feeDuration = feeDuration;
      }

      await optimizationService.createCustomPackage(payload);

      // Close modal and go back
      setDistributorSuggestionData(null);
      setPendingDistributor(null);
      setSuccess('Package created successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating custom package:', err);
      setError(err.message || 'Failed to create custom package');
    } finally {
      setCreatingPackageDistributorId(null);
      setSubmittingAction(null);
    }
  };

  const handleAddToExistingPackage = async () => {
    if (!pendingDistributor || !distributorSuggestionData || !distributorSuggestionData.packages[0]?.existingPackage) return;

    const distributorId = pendingDistributor.distributorId || pendingDistributor.distributorName;
    const existingPackage = distributorSuggestionData.packages[0].existingPackage;

    try {
      setCreatingPackageDistributorId(distributorId);
      setSubmittingAction('add');
      setError(null);

      const items = distributorSuggestionData.packages[0].products.map((product: any) => {
        const selectedProduct = productItems.find(item => item.ndc === product.ndc && selectedItems.has(item.id));
        const selectedUnits = selectedProduct
          ? selectedItems.get(selectedProduct.id) || { full_units: 0, partial_units: 0, id: selectedProduct.id }
          : { full_units: 0, partial_units: 0, id: '' };

        const full = selectedUnits.full_units ?? 0;
        const partial = selectedUnits.partial_units ?? 0;
        const productId = selectedUnits.id || (selectedProduct?.id || '');
        const pricePerUnit = product.pricePerUnit || 0;
        const totalValue = product.totalValue || 0;

        return {
          id: productId,
          ndc: product.ndc,
          productId: productId,
          product_id: productId,
          productName: product.productName,
          product_name: product.productName,
          full: full,
          partial: partial,
          pricePerUnit: pricePerUnit,
          price_per_unit: pricePerUnit,
          totalValue: totalValue,
          total_value: totalValue,
        };
      });

      await optimizationService.addItemsToPackage(existingPackage.id, items);

      // Close modal and go back
      setDistributorSuggestionData(null);
      setPendingDistributor(null);
      setSuccess('Items added to existing package successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      console.error('Error adding items to existing package:', err);
      setError(err.message || 'Failed to add items to existing package');
    } finally {
      setCreatingPackageDistributorId(null);
      setSubmittingAction(null);
    }
  };

  const handleFeeRateChange = (distributorId: string, feeRateDays: string) => {
    const newMap = new Map(selectedFeeRates);
    if (feeRateDays) {
      newMap.set(distributorId, feeRateDays);
    } else {
      newMap.delete(distributorId);
    }
    setSelectedFeeRates(newMap);
  };

  const closeCreatePackageModal = () => {
    setDistributorSuggestionData(null);
    setPendingDistributor(null);
    setSubmittingAction(null);
    setFeeRateDropdownVisible(false);
    setFeeRateDropdownData(null);
  };

  const filteredProducts = productItems.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.ndc?.toLowerCase().includes(query) ||
        item.product_name?.toLowerCase().includes(query) ||
        item.productName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

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
          <TouchableOpacity
            onPress={() => {
              if (currentStep === 2) {
                setCurrentStep(1);
              } else {
                navigation.goBack();
              }
            }}
            style={styles.backButton}
          >
            <ArrowLeft color="#374151" size={moderateScale(18)} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Package Management</Text>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepItem, currentStep === 1 && styles.stepItemActive]}>
                {currentStep > 1 ? (
                  <View style={styles.stepCheckmark}>
                    <Check color="#FFFFFF" size={moderateScale(10)} />
                  </View>
                ) : (
                  <View style={[styles.stepCircle, currentStep === 1 && styles.stepCircleActive]}>
                    <Text style={[styles.stepNumber, currentStep === 1 && styles.stepNumberActive]}>1</Text>
                  </View>
                )}
                <Text style={[styles.stepText, currentStep === 1 && styles.stepTextActive]}>Select Products</Text>
              </View>
              <ArrowRight color="#9CA3AF" size={moderateScale(12)} />
              <View style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}>
                <View style={[styles.stepCircle, currentStep === 2 && styles.stepCircleActive]}>
                  <Text style={[styles.stepNumber, currentStep === 2 && styles.stepNumberActive]}>2</Text>
                </View>
                <Text style={[styles.stepText, currentStep === 2 && styles.stepTextActive]}>Choose Distributor</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Error Message */}
      {error && (
        <View style={styles.alertError}>
          <AlertCircle color="#DC2626" size={moderateScale(16)} />
          <Text style={styles.alertErrorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.alertClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Message */}
      {success && (
        <View style={styles.alertSuccess}>
          <CheckCircle color="#16A34A" size={moderateScale(16)} />
          <Text style={styles.alertSuccessText}>{success}</Text>
        </View>
      )}

      {/* Step 1: Select Products */}
      {currentStep === 1 && (
        <View style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search color="#9CA3AF" size={moderateScale(16)} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by NDC or product name..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Selected Count */}
          <View style={styles.selectedCountContainer}>
            <Text style={styles.selectedCount}>
              Select Products ({selectedItems.size} selected)
            </Text>
          </View>

          {/* Products List */}
          {loadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package color="#9CA3AF" size={moderateScale(40)} />
              <Text style={styles.emptyText}>
                {productItems.length === 0 ? 'No products in your list' : 'No products found'}
              </Text>
              <Text style={styles.emptySubtext}>
                {productItems.length === 0 ? 'Add products from the Products screen first' : 'Try a different search term'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.productsList} showsVerticalScrollIndicator={false}>
              {filteredProducts.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const units = selectedItems.get(item.id) || { full_units: 0, partial_units: 0, id: item.id };
                const itemFullUnits = item.full_units || 0;
                const itemPartialUnits = item.partial_units || 0;

                return (
                  <View key={item.id} style={[styles.productItem, isSelected && styles.productItemSelected]}>
                    <TouchableOpacity
                      style={styles.productCheckbox}
                      onPress={() => handleProductToggle(item.id)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Check color="#FFFFFF" size={moderateScale(12)} />}
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.productInfo}>
                      <Text style={styles.productNdc}>{item.ndc}</Text>
                      <Text style={styles.productName} numberOfLines={2}>
                        {item.product_name || item.productName || 'Unknown Product'}
                      </Text>
                      <Text style={styles.productUnitsAvailable}>
                        Available: Full {itemFullUnits} | Partial {itemPartialUnits}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={styles.unitsInputContainer}>
                        {itemFullUnits > 0 && (
                          <View style={styles.unitInputGroup}>
                            <Text style={styles.unitLabel}>Full</Text>
                            <TextInput
                              style={styles.unitInput}
                              value={units.full_units === 0 ? '' : units.full_units.toString()}
                              onChangeText={(text) => {
                                const val = text === '' ? 0 : parseInt(text) || 0;
                                handleFullUnitsChange(item.id, Math.min(val, itemFullUnits));
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        )}
                        {itemPartialUnits > 0 && (
                          <View style={styles.unitInputGroup}>
                            <Text style={styles.unitLabel}>Partial</Text>
                            <TextInput
                              style={styles.unitInput}
                              value={units.partial_units === 0 ? '' : units.partial_units.toString()}
                              onChangeText={(text) => {
                                const val = text === '' ? 0 : parseInt(text) || 0;
                                handlePartialUnitsChange(item.id, Math.min(val, itemPartialUnits));
                              }}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: moderateScale(100) }} />
            </ScrollView>
          )}

          {/* Next Button - Fixed at bottom */}
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={[styles.nextButton, (selectedItems.size === 0 || loadingSuggestions) && styles.buttonDisabled]}
              onPress={handleGetSuggestions}
              disabled={selectedItems.size === 0 || loadingSuggestions}
            >
              {loadingSuggestions ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.nextButtonText}>Getting Suggestions...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <ArrowRight color="#FFFFFF" size={moderateScale(16)} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2: Choose Distributor */}
      {currentStep === 2 && optimizationResults && (
        <View style={styles.content}>
          <Text style={styles.distributorListTitle}>
            Choose a Distributor ({optimizationResults.distributors?.length || 0} available)
          </Text>

          {optimizationResults.distributors?.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Building2 color="#9CA3AF" size={moderateScale(40)} />
              <Text style={styles.emptyText}>No distributors found</Text>
              <Text style={styles.emptySubtext}>No distributors available for the selected products</Text>
            </View>
          ) : (
            <ScrollView style={styles.distributorsList} showsVerticalScrollIndicator={false}>
              {optimizationResults.distributors?.map((distributor: OptimizationSuggestionDistributor, index: number) => {
                const distributorId = distributor.distributorId || distributor.distributorName;
                return (
                  <View key={index} style={styles.distributorCard}>
                    <View style={styles.distributorCardHeader}>
                      <View style={styles.distributorIconContainer}>
                        <Building2 color="#14B8A6" size={moderateScale(18)} />
                      </View>
                      <View style={styles.distributorInfo}>
                        <Text style={styles.distributorName}>{distributor.distributorName}</Text>
                        <Text style={styles.distributorStats}>
                          {distributor.totalItems} items • {formatCurrency(distributor.totalEstimatedValue)}
                        </Text>
                      </View>
                    </View>

                    {distributor.distributorContact && (
                      <View style={styles.distributorContact}>
                        {distributor.distributorContact.email && (
                          <View style={styles.contactRow}>
                            <Mail color="#6B7280" size={moderateScale(12)} />
                            <Text style={styles.contactText}>{distributor.distributorContact.email}</Text>
                          </View>
                        )}
                        {distributor.distributorContact.phone && (
                          <View style={styles.contactRow}>
                            <Phone color="#6B7280" size={moderateScale(12)} />
                            <Text style={styles.contactText}>{distributor.distributorContact.phone}</Text>
                          </View>
                        )}
                        {distributor.distributorContact.location && (
                          <View style={styles.contactRow}>
                            <MapPin color="#6B7280" size={moderateScale(12)} />
                            <Text style={styles.contactText}>{distributor.distributorContact.location}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.distributorButtonsRow}>
                      <TouchableOpacity
                        style={styles.viewDistributorButton}
                        onPress={() => setViewDistributor(distributor)}
                      >
                        <Eye color="#FFFFFF" size={moderateScale(14)} />
                        <Text style={styles.viewDistributorButtonText}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.createDistributorButton, creatingPackageDistributorId === distributorId && styles.buttonDisabled]}
                        onPress={() => handleCreatePackageFromDistributor(distributor)}
                        disabled={creatingPackageDistributorId === distributorId}
                      >
                        {creatingPackageDistributorId === distributorId ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Plus color="#FFFFFF" size={moderateScale(14)} />
                            <Text style={styles.createDistributorButtonText}>Create Package</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: moderateScale(20) }} />
            </ScrollView>
          )}
        </View>
      )}

      {/* View Distributor Products Modal */}
      <Modal
        visible={!!viewDistributor}
        animationType="slide"
        transparent
        onRequestClose={() => setViewDistributor(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setViewDistributor(null)}>
          <Pressable style={styles.viewModalContent} onPress={e => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.viewModalHeader}>
              <View style={styles.viewModalHeaderInfo}>
                <Text style={styles.viewModalTitle}>Products</Text>
                <Text style={styles.viewModalSubtitle}>{viewDistributor?.distributorName}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewDistributor(null)}>
                <X color="#6B7280" size={moderateScale(20)} />
              </TouchableOpacity>
            </View>

            {/* Distributor Contact */}
            {viewDistributor?.distributorContact && (
              <View style={styles.viewModalContact}>
                {viewDistributor.distributorContact.email && (
                  <View style={styles.viewModalContactRow}>
                    <Mail color="#6B7280" size={moderateScale(12)} />
                    <Text style={styles.viewModalContactText}>{viewDistributor.distributorContact.email}</Text>
                  </View>
                )}
                {viewDistributor.distributorContact.phone && (
                  <View style={styles.viewModalContactRow}>
                    <Phone color="#6B7280" size={moderateScale(12)} />
                    <Text style={styles.viewModalContactText}>{viewDistributor.distributorContact.phone}</Text>
                  </View>
                )}
                {viewDistributor.distributorContact.location && (
                  <View style={styles.viewModalContactRow}>
                    <MapPin color="#6B7280" size={moderateScale(12)} />
                    <Text style={styles.viewModalContactText}>{viewDistributor.distributorContact.location}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Products List */}
            <ScrollView style={styles.viewModalProductsList} showsVerticalScrollIndicator={false}>
              {/* Table Header */}
              <View style={styles.productTableHeader}>
                <Text style={[styles.productTableHeaderText, { flex: 2 }]}>Product</Text>
                <Text style={[styles.productTableHeaderText, { flex: 1 }]}>NDC</Text>
                <Text style={[styles.productTableHeaderText, { flex: 0.5, textAlign: 'center' }]}>Full</Text>
                <Text style={[styles.productTableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Full Price</Text>
                <Text style={[styles.productTableHeaderText, { flex: 0.5, textAlign: 'center' }]}>Partial</Text>
                <Text style={[styles.productTableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Partial Price</Text>
              </View>

              {viewDistributor?.products && viewDistributor.products.length > 0 ? (
                viewDistributor.products.map((product: any, idx: number) => {
                  const full = product.full || 0;
                  const partial = product.partial || 0;
                  const fullPricePerUnit = product.fullPricePerUnit || product.pricePerUnit || 0;
                  const partialPricePerUnit = product.partialPricePerUnit || product.pricePerUnit || 0;
                  const fullPrice = fullPricePerUnit * full;
                  const partialPrice = partialPricePerUnit * partial;

                  return (
                    <View key={`${product.ndc}-${idx}`} style={styles.productTableRow}>
                      <Text style={[styles.productTableCell, { flex: 2 }]} numberOfLines={2}>
                        {product.productName}
                      </Text>
                      <Text style={[styles.productTableCellMono, { flex: 1 }]} numberOfLines={1}>
                        {product.ndc}
                      </Text>
                      <Text style={[styles.productTableCell, { flex: 0.5, textAlign: 'center' }]}>
                        {full}
                      </Text>
                      <Text style={[styles.productTableCellPrice, { flex: 0.8, textAlign: 'right' }]}>
                        {formatCurrency(fullPrice)}
                      </Text>
                      <Text style={[styles.productTableCell, { flex: 0.5, textAlign: 'center' }]}>
                        {partial}
                      </Text>
                      <Text style={[styles.productTableCellPrice, { flex: 0.8, textAlign: 'right' }]}>
                        {formatCurrency(partialPrice)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyProductsContainer}>
                  <Package color="#9CA3AF" size={moderateScale(30)} />
                  <Text style={styles.emptyProductsText}>No products found</Text>
                </View>
              )}

              {/* Total Row */}
              {viewDistributor?.products && viewDistributor.products.length > 0 && (
                <View style={styles.productTableTotalRow}>
                  <Text style={[styles.productTableTotalLabel, { flex: 2 }]}>Total</Text>
                  <Text style={[styles.productTableTotalLabel, { flex: 1 }]}></Text>
                  <Text style={[styles.productTableTotalValue, { flex: 0.5, textAlign: 'center' }]}>
                    {viewDistributor.totalItems}
                  </Text>
                  <Text style={[styles.productTableTotalValue, { flex: 0.8, textAlign: 'right' }]}></Text>
                  <Text style={[styles.productTableTotalValue, { flex: 0.5, textAlign: 'center' }]}></Text>
                  <Text style={[styles.productTableTotalValue, { flex: 0.8, textAlign: 'right' }]}>
                    {formatCurrency(viewDistributor.totalEstimatedValue)}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.viewModalFooter}>
              <TouchableOpacity
                style={styles.viewModalCloseButton}
                onPress={() => setViewDistributor(null)}
              >
                <Text style={styles.viewModalCloseButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewModalCreateButton, creatingPackageDistributorId === (viewDistributor?.distributorId || viewDistributor?.distributorName) && styles.buttonDisabled]}
                onPress={() => {
                  if (viewDistributor) {
                    handleCreatePackageFromDistributor(viewDistributor);
                    setViewDistributor(null);
                  }
                }}
                disabled={creatingPackageDistributorId === (viewDistributor?.distributorId || viewDistributor?.distributorName)}
              >
                {creatingPackageDistributorId === (viewDistributor?.distributorId || viewDistributor?.distributorName) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus color="#FFFFFF" size={moderateScale(14)} />
                    <Text style={styles.viewModalCreateButtonText}>Create Package</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Package Modal (Existing/Create New Tabs) */}
      <Modal
        visible={!!distributorSuggestionData && !!pendingDistributor}
        animationType="slide"
        transparent
        onRequestClose={closeCreatePackageModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeCreatePackageModal}>
          <Pressable style={styles.createPackageModalContent} onPress={e => e.stopPropagation()}>
            {distributorSuggestionData && (
              <View 
                style={styles.createPackageModalWrapper}
                onStartShouldSetResponder={() => {
                  if (feeRateDropdownVisible) {
                    setFeeRateDropdownVisible(false);
                    setFeeRateDropdownData(null);
                  }
                  return false;
                }}
              >
                {/* Modal Header */}
                <View style={styles.createPackageModalHeader}>
                  <View>
                    <Text style={styles.createPackageModalTitle}>Create Package</Text>
                    <Text style={styles.createPackageModalSubtitle}>{pendingDistributor?.distributorName}</Text>
                  </View>
                  <TouchableOpacity onPress={closeCreatePackageModal}>
                    <X color="#6B7280" size={moderateScale(20)} />
                  </TouchableOpacity>
                </View>

                {/* Tabs - Only show if existing package exists */}
                {distributorSuggestionData.packages[0]?.existingPackage && (
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        activeModalTab === 'existing' && styles.tabActive,
                      ]}
                      onPress={() => setActiveModalTab('existing')}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          activeModalTab === 'existing' && styles.tabTextActive,
                        ]}
                      >
                        Existing Package
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        activeModalTab === 'create' && styles.tabActive,
                      ]}
                      onPress={() => setActiveModalTab('create')}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          activeModalTab === 'create' && styles.tabTextActive,
                        ]}
                      >
                        Create New
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Modal Content */}
                <ScrollView 
                  style={styles.createPackageModalScrollContent}
                  contentContainerStyle={styles.createPackageModalScrollContentContainer}
                  showsVerticalScrollIndicator={true}
                  scrollEnabled={!feeRateDropdownVisible}
                  onScrollBeginDrag={() => {
                    if (feeRateDropdownVisible) {
                      setFeeRateDropdownVisible(false);
                      setFeeRateDropdownData(null);
                    }
                  }}
                >
                  {distributorSuggestionData.packages && distributorSuggestionData.packages.length > 0 ? (
                    distributorSuggestionData.packages.map((pkg, idx) => {
                      const hasExistingPackage = pkg.existingPackage;

                      if (hasExistingPackage && activeModalTab === 'existing') {
                      // Existing Package Tab
                      return (
                        <View key={idx} style={styles.packageTabContent}>
                          {/* Existing Package Info */}
                          <View style={styles.existingPackageInfo}>
                            <Text style={styles.existingPackageTitle}>Existing Package Details</Text>
                            <View style={styles.existingPackageGrid}>
                              <View style={styles.existingPackageItem}>
                                <Text style={styles.existingPackageLabel}>Package Number</Text>
                                <Text style={styles.existingPackageValue}>{pkg.existingPackage?.packageNumber}</Text>
                              </View>
                              <View style={styles.existingPackageItem}>
                                <Text style={styles.existingPackageLabel}>Current Items</Text>
                                <Text style={styles.existingPackageValue}>{pkg.existingPackage?.totalItems}</Text>
                              </View>
                              <View style={styles.existingPackageItem}>
                                <Text style={styles.existingPackageLabel}>Current Value</Text>
                                <Text style={styles.existingPackageValue}>{formatCurrency(pkg.existingPackage?.totalEstimatedValue || 0)}</Text>
                              </View>
                              <View style={styles.existingPackageItem}>
                                <Text style={styles.existingPackageLabel}>Created</Text>
                                <Text style={styles.existingPackageValue}>
                                  {pkg.existingPackage?.createdAt ? new Date(pkg.existingPackage.createdAt).toLocaleDateString() : '-'}
                                </Text>
                              </View>
                              {pkg.existingPackage?.feeRate !== undefined && pkg.existingPackage?.feeRate !== null && (
                                <View style={styles.existingPackageItem}>
                                  <Text style={styles.existingPackageLabel}>Fee Rate</Text>
                                  <Text style={styles.existingPackageValue}>{pkg.existingPackage.feeRate}%</Text>
                                </View>
                              )}
                              {pkg.existingPackage?.feeDuration !== undefined && pkg.existingPackage?.feeDuration !== null && (
                                <View style={styles.existingPackageItem}>
                                  <Text style={styles.existingPackageLabel}>Fee Duration</Text>
                                  <Text style={styles.existingPackageValue}>{pkg.existingPackage.feeDuration} days</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Distributor Contact */}
                          {pkg.distributorContact && (
                            <View style={styles.distributorContactSection}>
                              {pkg.distributorContact.email && (
                                <View style={styles.contactRow}>
                                  <Mail color="#6B7280" size={moderateScale(12)} />
                                  <Text style={styles.contactText}>{pkg.distributorContact.email}</Text>
                                </View>
                              )}
                              {pkg.distributorContact.phone && (
                                <View style={styles.contactRow}>
                                  <Phone color="#6B7280" size={moderateScale(12)} />
                                  <Text style={styles.contactText}>{pkg.distributorContact.phone}</Text>
                                </View>
                              )}
                              {pkg.distributorContact.location && (
                                <View style={styles.contactRow}>
                                  <MapPin color="#6B7280" size={moderateScale(12)} />
                                  <Text style={styles.contactText}>{pkg.distributorContact.location}</Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Items to Add */}
                          <View style={styles.itemsToAddSection}>
                            <Text style={styles.itemsToAddTitle}>Items to Add ({pkg.products.length})</Text>
                            {pkg.products.map((product, prodIdx) => (
                              <View key={prodIdx} style={styles.productItem}>
                                <View style={styles.productInfo}>
                                  <Text style={styles.productName}>{product.productName}</Text>
                                  <Text style={styles.productNdc}>NDC: {product.ndc}</Text>
                                </View>
                                <View style={styles.productDetails}>
                                  <Text style={styles.productUnits}>
                                    {product.full} Full, {product.partial} Partial
                                  </Text>
                                  <Text style={styles.productPrice}>{formatCurrency(product.totalValue)}</Text>
                                </View>
                              </View>
                            ))}
                          </View>

                          {/* Total */}
                          <View style={styles.totalSection}>
                            <Text style={styles.totalLabel}>Total Value to Add</Text>
                            <Text style={styles.totalValue}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
                          </View>
                        </View>
                      );
                    } else if (!hasExistingPackage || activeModalTab === 'create') {
                      // Create New Tab (or default if no existing package)
                      const distributorId = pendingDistributor?.distributorId || '';
                      const selectedFeeRateDays = selectedFeeRates.get(distributorId);
                      const distributorAny = pendingDistributor as any;
                      const feeRatePercentage = selectedFeeRateDays && distributorAny?.feeRates?.[selectedFeeRateDays]
                        ? distributorAny.feeRates[selectedFeeRateDays].percentage
                        : null;
                      const adjustedTotalValue = feeRatePercentage !== null && feeRatePercentage > 0
                        ? pkg.totalEstimatedValue * (1 - feeRatePercentage / 100)
                        : pkg.totalEstimatedValue;

                      return (
                        <View key={idx} style={styles.packageTabContent}>
                          {/* Distributor Contact */}
                          {pkg.distributorContact && (
                            <View style={styles.distributorContactSection}>
                              {pkg.distributorContact.email && (
                                <View style={styles.contactRow}>
                                  <Mail color="#6B7280" size={moderateScale(12)} />
                                  <Text style={styles.contactText}>{pkg.distributorContact.email}</Text>
                                </View>
                              )}
                              {pkg.distributorContact.phone && (
                                <View style={styles.contactRow}>
                                  <Phone color="#6B7280" size={moderateScale(12)} />
                                  <Text style={styles.contactText}>{pkg.distributorContact.phone}</Text>
                                </View>
                              )}
                              {pkg.distributorContact.location && (
                                <View style={styles.contactRow}>
                                  <MapPin color="#6B7280" size={moderateScale(12)} />
                                  <Text style={styles.contactText}>{pkg.distributorContact.location}</Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Fee Rate Selection */}
                          {pkg.distributorContact?.feeRates && Object.keys(pkg.distributorContact.feeRates).length > 0 && (
                            <View style={styles.feeRateSection}>
                              <Text style={styles.feeRateLabel}>Select Fee Rate:</Text>
                              <Pressable 
                                style={styles.feeRateDropdownContainer}
                                onPress={(e) => e.stopPropagation()}
                              >
                                <TouchableOpacity
                                  style={styles.feeRateDropdownButton}
                                  onPress={() => {
                                    if (!pkg.distributorContact?.feeRates) return;
                                    setFeeRateDropdownData({
                                      distributorId: distributorId,
                                      feeRates: pkg.distributorContact.feeRates,
                                    });
                                    setFeeRateDropdownVisible(true);
                                  }}
                                >
                                  <Text style={styles.feeRateDropdownText}>
                                    {selectedFeeRateDays && pkg.distributorContact?.feeRates?.[selectedFeeRateDays]
                                      ? `${selectedFeeRateDays} days - ${pkg.distributorContact.feeRates[selectedFeeRateDays].percentage}%`
                                      : 'Select fee rate...'}
                                  </Text>
                                  <Text style={styles.feeRateDropdownArrow}>
                                    {feeRateDropdownVisible && feeRateDropdownData?.distributorId === distributorId ? '▲' : '▼'}
                                  </Text>
                                </TouchableOpacity>
                                
                                {/* Dropdown Menu */}
                                {feeRateDropdownVisible && feeRateDropdownData?.distributorId === distributorId && (
                                  <Pressable onPress={(e) => e.stopPropagation()}>
                                    <View style={styles.feeRateDropdownMenu}>
                                    <ScrollView 
                                      style={styles.feeRateDropdownMenuScroll}
                                      nestedScrollEnabled={true}
                                      showsVerticalScrollIndicator={true}
                                    >
                                      {Object.entries(feeRateDropdownData.feeRates).map(([duration, rate]: [string, any]) => (
                                        <TouchableOpacity
                                          key={duration}
                                          style={[
                                            styles.feeRateDropdownMenuItem,
                                            selectedFeeRateDays === duration && styles.feeRateDropdownMenuItemSelected,
                                          ]}
                                          onPress={() => {
                                            handleFeeRateChange(distributorId, duration);
                                            setFeeRateDropdownVisible(false);
                                            setFeeRateDropdownData(null);
                                          }}
                                        >
                                          <Text style={[
                                            styles.feeRateDropdownMenuItemText,
                                            selectedFeeRateDays === duration && styles.feeRateDropdownMenuItemTextSelected,
                                          ]}>
                                            {duration} days - {rate.percentage}%
                                          </Text>
                                          {selectedFeeRateDays === duration && (
                                            <Check color="#14B8A6" size={moderateScale(14)} />
                                          )}
                                        </TouchableOpacity>
                                      ))}
                                      <TouchableOpacity
                                        style={styles.feeRateDropdownMenuItem}
                                        onPress={() => {
                                          handleFeeRateChange(distributorId, '');
                                          setFeeRateDropdownVisible(false);
                                          setFeeRateDropdownData(null);
                                        }}
                                      >
                                        <Text style={styles.feeRateDropdownMenuItemText}>Clear Selection</Text>
                                      </TouchableOpacity>
                                    </ScrollView>
                                  </View>
                                  </Pressable>
                                )}
                              </Pressable>
                              {selectedFeeRateDays && pkg.distributorContact?.feeRates?.[selectedFeeRateDays] && (
                                <Text style={styles.feeRateSelectedText}>
                                  Selected: {pkg.distributorContact.feeRates[selectedFeeRateDays].percentage}% for {selectedFeeRateDays} days
                                </Text>
                              )}
                            </View>
                          )}

                          {/* Package Stats */}
                          <View style={styles.packageStatsSection}>
                            <View style={styles.packageStatItem}>
                              <Text style={styles.packageStatLabel}>Total Items</Text>
                              <Text style={styles.packageStatValue}>{pkg.totalItems}</Text>
                            </View>
                            <View style={styles.packageStatItem}>
                              <Text style={styles.packageStatLabel}>Total Value</Text>
                              {feeRatePercentage !== null && feeRatePercentage > 0 ? (
                                <View style={styles.adjustedPriceContainer}>
                                  <Text style={styles.originalPrice}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
                                  <Text style={styles.adjustedPrice}>{formatCurrency(adjustedTotalValue)}</Text>
                                </View>
                              ) : (
                                <Text style={styles.packageStatValue}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
                              )}
                            </View>
                            <View style={styles.packageStatItem}>
                              <Text style={styles.packageStatLabel}>Avg Price/Unit</Text>
                              <Text style={styles.packageStatValue}>{formatCurrency(pkg.averagePricePerUnit)}</Text>
                            </View>
                          </View>

                          {/* Products */}
                          <View style={styles.itemsToAddSection}>
                            <Text style={styles.itemsToAddTitle}>Products ({pkg.products.length})</Text>
                            {pkg.products.map((product, prodIdx) => {
                              const adjustedProductValue = feeRatePercentage !== null && feeRatePercentage > 0
                                ? product.totalValue * (1 - feeRatePercentage / 100)
                                : product.totalValue;

                              return (
                                <View key={prodIdx} style={styles.productItem}>
                                  <View style={styles.productInfo}>
                                    <Text style={styles.productName}>{product.productName}</Text>
                                    <Text style={styles.productNdc}>NDC: {product.ndc}</Text>
                                  </View>
                                  <View style={styles.productDetails}>
                                    <Text style={styles.productUnits}>
                                      {product.full} Full, {product.partial} Partial
                                    </Text>
                                    {feeRatePercentage !== null && feeRatePercentage > 0 ? (
                                      <View style={styles.adjustedPriceContainer}>
                                        <Text style={styles.originalPriceSmall}>{formatCurrency(product.totalValue)}</Text>
                                        <Text style={styles.productPrice}>{formatCurrency(adjustedProductValue)}</Text>
                                      </View>
                                    ) : (
                                      <Text style={styles.productPrice}>{formatCurrency(product.totalValue)}</Text>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          {/* Total */}
                          <View style={styles.totalSection}>
                            <Text style={styles.totalLabel}>Total Estimated Value</Text>
                            {feeRatePercentage !== null && feeRatePercentage > 0 ? (
                              <View>
                                <Text style={styles.originalPriceTotal}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
                                <Text style={styles.totalValue}>{formatCurrency(adjustedTotalValue)}</Text>
                              </View>
                            ) : (
                              <Text style={styles.totalValue}>{formatCurrency(pkg.totalEstimatedValue)}</Text>
                            )}
                          </View>
                        </View>
                      );
                      }
                      return null;
                    })
                  ) : (
                    <View style={styles.packageTabContent}>
                      <Text style={styles.itemsToAddTitle}>No package data available</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Modal Footer */}
                <View style={styles.createPackageModalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeCreatePackageModal}
                    disabled={submittingAction !== null}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  {(() => {
                    const hasExistingPackage = distributorSuggestionData.packages[0]?.existingPackage;

                    if (hasExistingPackage && activeModalTab === 'existing') {
                      // Existing Package Tab - Show Add to Existing button
                      return (
                        <TouchableOpacity
                          style={[styles.actionButton, submittingAction !== null && styles.buttonDisabled]}
                          onPress={handleAddToExistingPackage}
                          disabled={submittingAction !== null}
                        >
                          {submittingAction === 'add' ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Plus color="#FFFFFF" size={moderateScale(14)} />
                              <Text style={styles.actionButtonText}>Add to Existing</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    } else {
                      // Create New Tab - Show Create New button
                      const hasSelectedFeeRate = pendingDistributor ? selectedFeeRates.has(pendingDistributor.distributorId || '') : false;
                      const hasFeeRates = distributorSuggestionData.packages[0]?.distributorContact?.feeRates && Object.keys(distributorSuggestionData.packages[0].distributorContact.feeRates).length > 0;
                      const isDisabled = submittingAction !== null || (hasFeeRates && !hasSelectedFeeRate);

                      return (
                        <TouchableOpacity
                          style={[styles.actionButton, isDisabled && styles.buttonDisabled]}
                          onPress={handleCreateCustomPackage}
                          disabled={isDisabled}
                        >
                          {submittingAction === 'create' ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Plus color="#FFFFFF" size={moderateScale(14)} />
                              <Text style={styles.actionButtonText}>Create New Package</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    }
                  })()}
                </View>
              </View>
            )}
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
    alignItems: 'flex-start',
  },
  backButton: {
    padding: moderateScale(4),
    marginRight: moderateScale(8),
    marginTop: moderateScale(2),
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(8),
    gap: moderateScale(8),
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  stepItemActive: {},
  stepCircle: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    borderColor: '#14B8A6',
    backgroundColor: '#14B8A6',
  },
  stepCheckmark: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(9),
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    fontWeight: '600',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
  },
  stepTextActive: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
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
  alertClose: {
    fontSize: moderateScale(14),
    color: '#DC2626',
    fontWeight: 'bold',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
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
  content: {
    flex: 1,
    padding: moderateScale(8),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(10),
    paddingHorizontal: moderateScale(12),
    marginBottom: moderateScale(12),
  },
  searchInput: {
    flex: 1,
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(8),
    fontSize: moderateScale(13),
    color: '#374151',
  },
  selectedCountContainer: {
    marginBottom: moderateScale(8),
  },
  selectedCount: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: moderateScale(40),
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
    paddingHorizontal: moderateScale(20),
  },
  productsList: {
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: moderateScale(8),
  },
  productItemSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  productCheckbox: {
    marginRight: moderateScale(12),
  },
  checkbox: {
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(6),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  productInfo: {
    flex: 1,
  },
  productNdc: {
    fontSize: moderateScale(12),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#374151',
    fontWeight: '600',
  },
  productName: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  productUnitsAvailable: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    marginTop: moderateScale(4),
  },
  unitsInputContainer: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  unitInputGroup: {
    alignItems: 'center',
  },
  unitLabel: {
    fontSize: moderateScale(9),
    color: '#6B7280',
    marginBottom: moderateScale(4),
  },
  unitInput: {
    width: moderateScale(55),
    height: moderateScale(36),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(6),
    textAlign: 'center',
    fontSize: moderateScale(12),
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9FAFB',
    padding: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(10),
    gap: moderateScale(8),
  },
  nextButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  distributorListTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(12),
  },
  distributorsList: {
    flex: 1,
  },
  distributorCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    marginBottom: moderateScale(10),
  },
  distributorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(10),
  },
  distributorIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  distributorInfo: {
    flex: 1,
  },
  distributorName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  distributorStats: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  distributorContact: {
    marginBottom: moderateScale(12),
    paddingLeft: moderateScale(52),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    marginBottom: moderateScale(4),
  },
  contactText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  selectDistributorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  selectDistributorButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  distributorButtonsRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  viewDistributorButton: {
    flex: 0.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  viewDistributorButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createDistributorButton: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  createDistributorButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // View Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(16),
  },
  viewModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewModalHeaderInfo: {
    flex: 1,
    marginRight: moderateScale(12),
  },
  viewModalTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewModalSubtitle: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  viewModalContact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: moderateScale(12),
  },
  viewModalContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  viewModalContactText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  viewModalProductsList: {
    padding: moderateScale(12),
    maxHeight: moderateScale(350),
  },
  productTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(8),
    borderRadius: moderateScale(6),
    marginBottom: moderateScale(8),
  },
  productTableHeaderText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#6B7280',
  },
  productTableRow: {
    flexDirection: 'row',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  productTableCell: {
    fontSize: moderateScale(11),
    color: '#374151',
  },
  productTableCellMono: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  productTableCellPrice: {
    fontSize: moderateScale(11),
    color: '#14B8A6',
    fontWeight: '600',
  },
  productTableTotalRow: {
    flexDirection: 'row',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(8),
    backgroundColor: '#F0FDFA',
    borderRadius: moderateScale(6),
    marginTop: moderateScale(8),
    alignItems: 'center',
  },
  productTableTotalLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  productTableTotalValue: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#14B8A6',
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(40),
  },
  emptyProductsText: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginTop: moderateScale(8),
  },
  viewModalFooter: {
    flexDirection: 'row',
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: moderateScale(12),
  },
  viewModalCloseButton: {
    flex: 0.3,
    backgroundColor: '#F3F4F6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  viewModalCloseButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  viewModalCreateButton: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  viewModalCreateButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Create Package Modal Styles
  createPackageModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.9,
    minHeight: SCREEN_HEIGHT * 0.5,
    overflow: 'hidden',
  },
  createPackageModalWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  createPackageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createPackageModalTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  createPackageModalSubtitle: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: moderateScale(12),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#F0FDFA',
    borderBottomColor: '#14B8A6',
  },
  tabText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#14B8A6',
  },
  createPackageModalScrollContent: {
    flex: 1,
    minHeight: 200,
  },
  createPackageModalScrollContentContainer: {
    paddingBottom: moderateScale(16),
  },
  packageTabContent: {
    padding: moderateScale(16),
  },
  existingPackageInfo: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: moderateScale(12),
  },
  existingPackageTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  existingPackageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  existingPackageItem: {
    width: '45%',
    marginBottom: moderateScale(4),
  },
  existingPackageLabel: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  existingPackageValue: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#1F2937',
  },
  distributorContactSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(12),
    gap: moderateScale(6),
  },
  itemsToAddSection: {
    marginBottom: moderateScale(12),
  },
  itemsToAddTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  productDetails: {
    alignItems: 'flex-end' as const,
  },
  productUnits: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  productPrice: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#14B8A6',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    marginTop: moderateScale(8),
  },
  totalLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#14B8A6',
  },
  createPackageModalFooter: {
    flexDirection: 'row',
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: moderateScale(12),
  },
  cancelButton: {
    flex: 0.3,
    backgroundColor: '#F3F4F6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  actionButton: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  actionButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Fee Rate Selection Styles
  feeRateSection: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: moderateScale(12),
  },
  feeRateLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  feeRateDropdownContainer: {
    position: 'relative' as const,
    marginBottom: moderateScale(8),
    zIndex: 10,
  },
  feeRateDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
  },
  feeRateDropdownText: {
    fontSize: moderateScale(12),
    color: '#374151',
    flex: 1,
  },
  feeRateDropdownArrow: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginLeft: moderateScale(8),
  },
  feeRateDropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: moderateScale(8),
    marginTop: moderateScale(4),
    maxHeight: moderateScale(200),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  feeRateDropdownMenuScroll: {
    maxHeight: moderateScale(200),
  },
  feeRateDropdownMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feeRateDropdownMenuItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  feeRateDropdownMenuItemText: {
    fontSize: moderateScale(12),
    color: '#374151',
    flex: 1,
  },
  feeRateDropdownMenuItemTextSelected: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  feeRateSelectedText: {
    fontSize: moderateScale(11),
    color: '#14B8A6',
    fontWeight: '500',
  },
  // Package Stats Styles
  packageStatsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: moderateScale(12),
  },
  packageStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  packageStatLabel: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginBottom: moderateScale(4),
  },
  packageStatValue: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  adjustedPriceContainer: {
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: moderateScale(2),
  },
  adjustedPrice: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#14B8A6',
  },
  originalPriceSmall: {
    fontSize: moderateScale(9),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: moderateScale(2),
  },
  originalPriceTotal: {
    fontSize: moderateScale(11),
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: moderateScale(2),
  },
});

