/**
 * SearchScreen - NDC Search with 100% Local Storage
 * 
 * ALL data comes from local cache - NO API calls to /api/optimization/recommendations
 * This provides instant results with the same functionality as the original API.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Plus,
  X,
  ChevronDown,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle2,
  Building2,
  Hash,
  Zap,
} from 'lucide-react-native';
import { Recommendation, OptimizationRecommendations, AlternativeDistributor } from '../api/services';
import { useNDCSearch, NDCPricingData } from '../hooks/useNDCSearch';
import { getNDCByCode } from '../store/ndcCacheStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

interface NdcItem {
  ndc: string;
}

export function SearchScreen({ navigation }: any) {
  // ============================================================
  // State for EXISTING optimization API (same functionality)
  // ============================================================
  const [recommendation, setRecommendation] = useState<OptimizationRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // NDC selection state
  const [ndcSearchInput, setNdcSearchInput] = useState('');
  const [selectedNdcs, setSelectedNdcs] = useState<NdcItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Distributor selection for each product (by NDC)
  const [selectedDistributors, setSelectedDistributors] = useState<Record<string, string>>({});
  
  // Editable quantities for each product
  const [editableFullQuantities, setEditableFullQuantities] = useState<Record<string, number>>({});
  const [editablePartialQuantities, setEditablePartialQuantities] = useState<Record<string, number>>({});

  // Dropdown state
  const [openDropdownNdc, setOpenDropdownNdc] = useState<string | null>(null);

  // ============================================================
  // NEW: Instant autocomplete using fast search API
  // ============================================================
  const {
    results: autocompleteResults,
    isLoading: isAutocompleting,
    search: searchAutocomplete,
    clearResults: clearAutocomplete,
    isFromCache,
    cacheStats
  } = useNDCSearch({
    debounceMs: 100,
    minSearchLength: 2
  });

  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Trigger autocomplete on input change
  useEffect(() => {
    if (ndcSearchInput.length >= 2) {
      searchAutocomplete(ndcSearchInput);
      setShowAutocomplete(true);
    } else {
      clearAutocomplete();
      setShowAutocomplete(false);
    }
  }, [ndcSearchInput]);

  // ============================================================
  // Existing Logic (unchanged)
  // ============================================================

  // Get displayed data for a recommendation
  const getDisplayedData = (rec: Recommendation) => {
    const selectedDist = selectedDistributors[rec.ndc];
    const recAny = rec as any;
    const fullQuantity = editableFullQuantities[rec.ndc] ?? 1;
    const partialQuantity = editablePartialQuantities[rec.ndc] ?? 1;
    
    let fullPrice = recAny.fullPricePerUnit ?? 0;
    let partialPrice = recAny.partialPricePerUnit ?? 0;
    
    if (selectedDist && selectedDist !== rec.recommendedDistributor) {
      const selectedAlt = rec.alternativeDistributors.find(alt => alt.name === selectedDist);
      if (selectedAlt) {
        const altAny = selectedAlt as any;
        fullPrice = altAny.fullPrice ?? 0;
        partialPrice = altAny.partialPrice ?? 0;
      }
    }
    
    const totalPrice = (fullPrice * fullQuantity) + (partialPrice * partialQuantity);
    
    return {
      distributor: selectedDist || rec.recommendedDistributor,
      fullPrice,
      partialPrice,
      fullQuantity,
      partialQuantity,
      totalPrice,
    };
  };

  // Get all distributors for a product
  const getAllDistributors = (rec: Recommendation) => {
    const recAny = rec as any;
    const distributors = [
      {
        name: rec.recommendedDistributor,
        id: recAny.recommendedDistributorId || '',
        fullPrice: recAny.fullPricePerUnit ?? 0,
        partialPrice: recAny.partialPricePerUnit ?? 0,
        isRecommended: true,
      },
      ...rec.alternativeDistributors.map(alt => {
        const altAny = alt as any;
        return {
          name: alt.name,
          id: altAny.id || '',
          fullPrice: altAny.fullPrice ?? 0,
          partialPrice: altAny.partialPrice ?? 0,
          isRecommended: false,
        };
      }),
    ];
    return distributors;
  };

  // Calculate top distributor total
  const topDistributorTotal = useMemo(() => {
    if (!recommendation) return 0;
    return recommendation.recommendations.reduce((total, rec) => {
      const recAny = rec as any;
      const fullPrice = recAny.fullPricePerUnit ?? 0;
      const partialPrice = recAny.partialPricePerUnit ?? 0;
      const fullQty = editableFullQuantities[rec.ndc] ?? 1;
      const partialQty = editablePartialQuantities[rec.ndc] ?? 1;
      return total + (fullPrice * fullQty) + (partialPrice * partialQty);
    }, 0);
  }, [recommendation, editableFullQuantities, editablePartialQuantities]);

  // Calculate total savings
  const totalSavings = useMemo(() => {
    if (!recommendation) return 0;
    return recommendation.recommendations.reduce((total, rec) => {
      const displayedData = getDisplayedData(rec);
      return total + displayedData.totalPrice;
    }, 0);
  }, [recommendation, selectedDistributors, editableFullQuantities, editablePartialQuantities]);

  // Check if NDC already exists
  const isDuplicateNdc = (ndc: string): boolean => {
    return selectedNdcs.some(item => item.ndc === ndc);
  };

  // Handle add NDC from autocomplete
  const handleAddFromAutocomplete = (item: NDCPricingData) => {
    if (isDuplicateNdc(item.ndc)) {
      setError('This NDC is already added');
      return;
    }

    setSelectedNdcs([...selectedNdcs, { ndc: item.ndc }]);
    setNdcSearchInput('');
    setShowAutocomplete(false);
    clearAutocomplete();
    setError(null);
  };

  // Handle add NDC manually
  const handleAddNdc = () => {
    const trimmedNdc = ndcSearchInput.trim();
    if (!trimmedNdc) {
      setError('Please enter an NDC code');
      return;
    }

    if (isDuplicateNdc(trimmedNdc)) {
      setError('This NDC is already added');
      return;
    }

    setSelectedNdcs([...selectedNdcs, { ndc: trimmedNdc }]);
    setNdcSearchInput('');
    setShowAutocomplete(false);
    clearAutocomplete();
    setError(null);
  };

  // Handle remove NDC
  const handleRemoveNdc = (ndcToRemove: string) => {
    setSelectedNdcs(selectedNdcs.filter(item => item.ndc !== ndcToRemove));
  };

  // Handle search - 100% LOCAL (no API call)
  // EXACT same logic as /api/optimization/recommendations
  const handleSearch = async () => {
    if (selectedNdcs.length === 0) {
      setError('Please add at least one NDC code to search');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Build recommendations from LOCAL CACHE - EXACT same format as optimization API
      const recommendations: Recommendation[] = [];
      
      for (const item of selectedNdcs) {
        // Get data from local cache
        const cachedData = getNDCByCode(item.ndc);
        
        if (cachedData && cachedData.distributors && cachedData.distributors.length > 0) {
          // Step 1: Calculate main "price" for each distributor
          // In search mode: price = fullPrice if available, else partialPrice
          // This matches the backend logic at optimizationService.ts lines 1047-1060
          const distributorsWithPrice = cachedData.distributors.map(dist => {
            const fullPrice = dist.fullPrice || 0;
            const partialPrice = dist.partialPrice || 0;
            // Main price = fullPrice if > 0, else partialPrice
            const price = fullPrice > 0 ? fullPrice : partialPrice;
            return {
              ...dist,
              fullPrice,
              partialPrice,
              price, // Main price for sorting
            };
          });

          // Step 2: Filter out distributors with no valid price
          const validDistributors = distributorsWithPrice.filter(d => d.price > 0);

          if (validDistributors.length === 0) {
            // No valid distributors - return empty recommendation
            recommendations.push({
              ndc: cachedData.ndc,
              productName: cachedData.productName || `Product ${cachedData.ndc}`,
              quantity: 1,
              recommendedDistributor: '',
              expectedPrice: 0,
              worstPrice: 0,
              alternativeDistributors: [],
              savings: 0,
              available: true,
            });
            continue;
          }

          // Step 3: Sort by price (highest first = best for returns)
          // This matches backend logic at optimizationService.ts line 1133
          validDistributors.sort((a, b) => b.price - a.price);

          // Step 4: Best distributor = first (highest price)
          const bestDistributor = validDistributors[0];
          const alternativeDistributors = validDistributors.slice(1);

          // Step 5: Calculate prices (matching backend exactly)
          // expectedPrice = best distributor's main price
          const expectedPrice = bestDistributor.price;
          
          // worstPrice = worst distributor's main price (last in sorted list)
          const worstDistributor = validDistributors[validDistributors.length - 1];
          const worstPrice = worstDistributor.price;

          // savings = expectedPrice - worstPrice
          const savings = expectedPrice - worstPrice;

          // Step 6: fullPricePerUnit and partialPricePerUnit come from BEST distributor
          // This matches backend response format
          const fullPricePerUnit = bestDistributor.fullPrice;
          const partialPricePerUnit = bestDistributor.partialPrice;

          const recommendation: Recommendation = {
            ndc: cachedData.ndc,
            productName: cachedData.productName || `Product ${cachedData.ndc}`,
            quantity: 1,
            recommendedDistributor: bestDistributor.name || '',
            expectedPrice,
            worstPrice,
            alternativeDistributors: alternativeDistributors.map(dist => {
              const altDist: AlternativeDistributor = {
                name: dist.name,
                // Main price for this distributor
                price: dist.price,
                // Difference from best price
                difference: dist.price - expectedPrice,
                available: true,
              };
              // Add additional properties for internal use (not in type definition)
              (altDist as any).fullPrice = dist.fullPrice;
              (altDist as any).partialPrice = dist.partialPrice;
              (altDist as any).id = dist.id;
              (altDist as any).email = dist.email;
              (altDist as any).phone = dist.phone;
              (altDist as any).location = dist.location;
              return altDist;
            }),
            savings,
            available: true,
          };
          
          // Add additional properties as any to match usage in getDisplayedData
          (recommendation as any).recommendedDistributorId = bestDistributor.id;
          (recommendation as any).recommendedDistributorContact = {
            email: bestDistributor.email,
            phone: bestDistributor.phone,
            location: bestDistributor.location,
          };
          (recommendation as any).fullPricePerUnit = fullPricePerUnit;
          (recommendation as any).partialPricePerUnit = partialPricePerUnit;

          recommendations.push(recommendation);
        } else {
          // NDC not found in cache or has no distributors - add with empty values
          const recommendation: Recommendation = {
            ndc: item.ndc,
            productName: cachedData?.productName || `Product ${item.ndc}`,
            quantity: 1,
            recommendedDistributor: '',
            expectedPrice: 0,
            worstPrice: 0,
            alternativeDistributors: [],
            savings: 0,
            available: false,
          };
          recommendations.push(recommendation);
        }
      }

      // Build response in same format as optimization API
      const data: OptimizationRecommendations = {
        recommendations,
        totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.savings, 0),
        generatedAt: new Date().toISOString(),
        distributorUsage: {
          usedThisMonth: recommendations.length,
          totalDistributors: recommendations.reduce((sum, r) => sum + r.alternativeDistributors.length + 1, 0),
          stillAvailable: recommendations.reduce((sum, r) => sum + r.alternativeDistributors.filter(alt => alt.available).length + (r.available ? 1 : 0), 0),
        },
        earningsComparison: {
          singleDistributorStrategy: recommendations.reduce((sum, r) => sum + r.worstPrice, 0),
          multipleDistributorsStrategy: recommendations.reduce((sum, r) => sum + r.expectedPrice, 0),
          potentialAdditionalEarnings: recommendations.reduce((sum, r) => sum + r.savings, 0),
        },
      };
      
      setRecommendation(data);
      setSelectedDistributors({});
      
      // Initialize quantities
      const initialFull: Record<string, number> = {};
      const initialPartial: Record<string, number> = {};
      data.recommendations.forEach(rec => {
        initialFull[rec.ndc] = 1;
        initialPartial[rec.ndc] = 1;
      });
      setEditableFullQuantities(initialFull);
      setEditablePartialQuantities(initialPartial);
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setNdcSearchInput('');
    setSelectedNdcs([]);
    setRecommendation(null);
    setHasSearched(false);
    setSelectedDistributors({});
    setEditableFullQuantities({});
    setEditablePartialQuantities({});
    setError(null);
    setShowAutocomplete(false);
    clearAutocomplete();
  };

  // Handle quantity change
  const handleFullQuantityChange = (ndc: string, value: number) => {
    if (value < 0) return;
    setEditableFullQuantities(prev => ({ ...prev, [ndc]: value }));
  };

  const handlePartialQuantityChange = (ndc: string, value: number) => {
    if (value < 0) return;
    setEditablePartialQuantities(prev => ({ ...prev, [ndc]: value }));
  };

  // Handle distributor selection
  const handleSelectDistributor = (ndc: string, distributorName: string) => {
    setSelectedDistributors(prev => ({ ...prev, [ndc]: distributorName }));
    setOpenDropdownNdc(null);
  };

  // Refresh handler
  const onRefresh = async () => {
    if (selectedNdcs.length > 0) {
      setRefreshing(true);
      await handleSearch();
      setRefreshing(false);
    }
  };

  // ============================================================
  // Render Functions
  // ============================================================

  // Render autocomplete item
  const renderAutocompleteItem = ({ item }: { item: NDCPricingData }) => (
    <TouchableOpacity
      style={styles.autocompleteItem}
      onPress={() => handleAddFromAutocomplete(item)}
    >
      <View style={styles.autocompleteItemLeft}>
        <Text style={styles.autocompleteNdc}>{item.ndc}</Text>
        <Text style={styles.autocompleteProduct} numberOfLines={1}>
          {item.productName || 'Unknown Product'}
        </Text>
      </View>
      <View style={styles.autocompleteItemRight}>
        <Text style={styles.autocompletePrice}>
          {formatCurrency(item.bestFullPrice || 0)}
        </Text>
        <Text style={styles.autocompletePriceLabel}>Best Price</Text>
      </View>
    </TouchableOpacity>
  );

  // Product Card Component (UNCHANGED from original)
  const ProductCard = ({ rec }: { rec: Recommendation }) => {
    const displayedData = getDisplayedData(rec);
    const distributors = getAllDistributors(rec);
    const isDropdownOpen = openDropdownNdc === rec.ndc;

    return (
      <View style={styles.productCard}>
        {/* Header */}
        <View style={styles.productHeader}>
          <View style={styles.productIconContainer}>
            <Package color="#14B8A6" size={moderateScale(18)} />
          </View>
          <View style={styles.productTitleContainer}>
            <Text style={styles.productName} numberOfLines={2}>{rec.productName}</Text>
            <Text style={styles.productNdc}>NDC: {rec.ndc}</Text>
          </View>
        </View>

        {/* Distributor Selector */}
        <View style={styles.distributorSection}>
          <Text style={styles.sectionLabel}>Distributor</Text>
          <TouchableOpacity
            style={styles.distributorDropdown}
            onPress={() => setOpenDropdownNdc(isDropdownOpen ? null : rec.ndc)}
          >
            <Building2 color="#6B7280" size={moderateScale(14)} />
            <Text style={styles.distributorText} numberOfLines={1}>
              {displayedData.distributor}
            </Text>
            <ChevronDown color="#6B7280" size={moderateScale(16)} />
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {distributors.map((dist, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dropdownItem,
                      displayedData.distributor === dist.name && styles.dropdownItemSelected
                    ]}
                    onPress={() => handleSelectDistributor(rec.ndc, dist.name)}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={[
                        styles.dropdownItemText,
                        displayedData.distributor === dist.name && styles.dropdownItemTextSelected
                      ]}>
                        {dist.name}
                      </Text>
                      {dist.isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.dropdownItemPrice}>
                      {formatCurrency(dist.fullPrice)}/unit
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Quantities and Prices */}
        <View style={styles.quantityPriceSection}>
          {/* Full Units */}
          <View style={styles.quantityRow}>
            <View style={styles.quantityLabelContainer}>
              <Text style={styles.quantityLabel}>Full Units</Text>
              <Text style={styles.pricePerUnit}>
                @ {formatCurrency(displayedData.fullPrice)}/unit
              </Text>
            </View>
            <View style={styles.quantityInputContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleFullQuantityChange(rec.ndc, Math.max(0, displayedData.fullQuantity - 1))}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                value={displayedData.fullQuantity.toString()}
                onChangeText={(text) => handleFullQuantityChange(rec.ndc, parseInt(text) || 0)}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleFullQuantityChange(rec.ndc, displayedData.fullQuantity + 1)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtotal}>
              {formatCurrency(displayedData.fullPrice * displayedData.fullQuantity)}
            </Text>
          </View>

          {/* Partial Units */}
          <View style={styles.quantityRow}>
            <View style={styles.quantityLabelContainer}>
              <Text style={styles.quantityLabel}>Partial Units</Text>
              <Text style={styles.pricePerUnit}>
                @ {formatCurrency(displayedData.partialPrice)}/unit
              </Text>
            </View>
            <View style={styles.quantityInputContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handlePartialQuantityChange(rec.ndc, Math.max(0, displayedData.partialQuantity - 1))}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                value={displayedData.partialQuantity.toString()}
                onChangeText={(text) => handlePartialQuantityChange(rec.ndc, parseInt(text) || 0)}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handlePartialQuantityChange(rec.ndc, displayedData.partialQuantity + 1)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtotal}>
              {formatCurrency(displayedData.partialPrice * displayedData.partialQuantity)}
            </Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Value</Text>
          <Text style={styles.totalValue}>{formatCurrency(displayedData.totalPrice)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}

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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Section */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Enter NDC Codes</Text>
          <Text style={styles.searchSubtitle}>Add one or more NDC codes to search for recommendations</Text>
          
          {/* NDC Input with Autocomplete */}
          <View style={styles.ndcInputRow}>
            <View style={styles.ndcInputContainer}>
              <Hash color="#9CA3AF" size={moderateScale(14)} />
              <TextInput
                style={styles.ndcInput}
                value={ndcSearchInput}
                onChangeText={setNdcSearchInput}
                placeholder="Enter NDC code (e.g., 00093-2263-01)"
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleAddNdc}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {isAutocompleting && (
                <ActivityIndicator size="small" color="#14B8A6" />
              )}
              {isFromCache && autocompleteResults.length > 0 && (
                <Zap color="#14B8A6" size={moderateScale(12)} />
              )}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNdc}>
              <Plus color="#FFFFFF" size={moderateScale(16)} />
            </TouchableOpacity>
          </View>

          {/* Autocomplete Dropdown */}
          {showAutocomplete && autocompleteResults.length > 0 && (
            <View style={styles.autocompleteDropdown}>
              <FlatList
                data={autocompleteResults.slice(0, 10)}
                keyExtractor={(item) => item.ndcNormalized}
                renderItem={renderAutocompleteItem}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={styles.autocompleteList}
              />
            </View>
          )}

          {/* Selected NDCs */}
          {selectedNdcs.length > 0 && (
            <View style={styles.selectedNdcsContainer}>
              <Text style={styles.selectedNdcsLabel}>Selected NDCs ({selectedNdcs.length})</Text>
              <View style={styles.ndcChipsContainer}>
                {selectedNdcs.map((item, index) => (
                  <View key={index} style={styles.ndcChip}>
                    <Text style={styles.ndcChipText}>{item.ndc}</Text>
                    <TouchableOpacity onPress={() => handleRemoveNdc(item.ndc)}>
                      <X color="#14B8A6" size={moderateScale(14)} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.searchButton, selectedNdcs.length === 0 && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={selectedNdcs.length === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Search color="#FFFFFF" size={moderateScale(14)} />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>
            
            {(selectedNdcs.length > 0 || hasSearched) && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                <X color="#6B7280" size={moderateScale(14)} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results Section */}
        {hasSearched && (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#14B8A6" />
                <Text style={styles.loadingText}>Searching for recommendations...</Text>
              </View>
            ) : recommendation && recommendation.recommendations.length > 0 ? (
              <>
                {/* Total Savings Card */}
                <View style={styles.savingsCard}>
                  <View style={styles.savingsIconContainer}>
                    <DollarSign color="#14B8A6" size={moderateScale(24)} />
                  </View>
                  <View style={styles.savingsContent}>
                    <Text style={styles.savingsLabel}>Total Potential Value</Text>
                    <Text style={styles.savingsValue}>{formatCurrency(totalSavings)}</Text>
                  </View>
                  <View style={styles.savingsStats}>
                    <Text style={styles.savingsStatText}>
                      {recommendation.recommendations.length} products found
                    </Text>
                  </View>
                </View>

                {/* Products List */}
                <View style={styles.productsSection}>
                  <Text style={styles.productsSectionTitle}>Product Recommendations</Text>
                  {recommendation.recommendations.map((rec, index) => (
                    <ProductCard key={rec.ndc || index} rec={rec} />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Search color="#9CA3AF" size={moderateScale(40)} />
                <Text style={styles.emptyText}>No recommendations found</Text>
                <Text style={styles.emptySubtext}>Try searching with different NDC codes</Text>
              </View>
            )}
          </>
        )}

        {/* Empty State - Before Search */}
        {!hasSearched && selectedNdcs.length === 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Search color="#14B8A6" size={moderateScale(24)} />
            </View>
            <Text style={styles.infoTitle}>Search for Best Prices</Text>
            <Text style={styles.infoText}>
              Enter NDC codes to find the best distributor prices for your products. 
              Compare multiple distributors and see potential savings.
            </Text>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: moderateScale(100) }} />
      </ScrollView>
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
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    backgroundColor: '#F0FDFA',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  cacheText: {
    fontSize: moderateScale(10),
    color: '#0F766E',
    fontWeight: '500',
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
  content: {
    flex: 1,
    padding: moderateScale(8),
    paddingTop: moderateScale(16),
  },
  // Search Card
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
  },
  searchTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchSubtitle: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
    marginBottom: moderateScale(12),
  },
  ndcInputRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  ndcInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(10),
    gap: moderateScale(6),
  },
  ndcInput: {
    flex: 1,
    paddingVertical: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#374151',
  },
  addButton: {
    backgroundColor: '#14B8A6',
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Autocomplete Dropdown
  autocompleteDropdown: {
    marginTop: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: moderateScale(200),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  autocompleteList: {
    maxHeight: moderateScale(200),
  },
  autocompleteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  autocompleteItemLeft: {
    flex: 1,
    marginRight: moderateScale(12),
  },
  autocompleteNdc: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  autocompleteProduct: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  autocompleteItemRight: {
    alignItems: 'flex-end',
  },
  autocompletePrice: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  autocompletePriceLabel: {
    fontSize: moderateScale(9),
    color: '#9CA3AF',
  },
  // Selected NDCs
  selectedNdcsContainer: {
    marginTop: moderateScale(12),
  },
  selectedNdcsLabel: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
    marginBottom: moderateScale(8),
  },
  ndcChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  ndcChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#14B8A6',
    borderRadius: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    gap: moderateScale(6),
  },
  ndcChipText: {
    fontSize: moderateScale(11),
    color: '#0F766E',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginTop: moderateScale(16),
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  searchButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  clearButtonText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  // Savings Card
  savingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsContent: {
    flex: 1,
    marginLeft: moderateScale(12),
  },
  savingsLabel: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  savingsValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  savingsStats: {
    alignItems: 'flex-end',
  },
  savingsStatText: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  // Products Section
  productsSection: {
    marginBottom: moderateScale(16),
  },
  productsSectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(12),
  },
  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: moderateScale(12),
    overflow: 'hidden',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  productIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTitleContainer: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  productName: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  productNdc: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  // Distributor Section
  distributorSection: {
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionLabel: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: moderateScale(6),
  },
  distributorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    gap: moderateScale(8),
  },
  distributorText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: '#374151',
  },
  dropdownMenu: {
    marginTop: moderateScale(4),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    maxHeight: moderateScale(180),
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: moderateScale(180),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  dropdownItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  dropdownItemText: {
    fontSize: moderateScale(11),
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  recommendedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  recommendedText: {
    fontSize: moderateScale(8),
    color: '#22C55E',
    fontWeight: '600',
  },
  dropdownItemPrice: {
    fontSize: moderateScale(10),
    color: '#14B8A6',
    fontWeight: '600',
  },
  // Quantity Price Section
  quantityPriceSection: {
    padding: moderateScale(12),
    gap: moderateScale(12),
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabelContainer: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
  },
  pricePerUnit: {
    fontSize: moderateScale(9),
    color: '#9CA3AF',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(2),
  },
  quantityButton: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(6),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: moderateScale(16),
    color: '#374151',
    fontWeight: '600',
  },
  quantityInput: {
    width: moderateScale(50),
    height: moderateScale(28),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(6),
    textAlign: 'center',
    fontSize: moderateScale(12),
    color: '#374151',
  },
  subtotal: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#374151',
    minWidth: moderateScale(60),
    textAlign: 'right',
  },
  // Total Row
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: moderateScale(12),
    backgroundColor: '#F0FDFA',
    borderTopWidth: 1,
    borderTopColor: '#99F6E4',
  },
  totalLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#0F766E',
  },
  totalValue: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#14B8A6',
  },
  // Loading & Empty States
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
  },
  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
    padding: moderateScale(24),
    alignItems: 'center',
  },
  infoIconContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  infoTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(8),
  },
  infoText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
});
