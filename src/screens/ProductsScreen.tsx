import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Pressable,
  Dimensions,
  Switch,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Package,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Camera as CameraIcon,
  Keyboard as KeyboardIcon,
  ArrowLeft,
  Calendar,
  Hash,
  FileText,
  DollarSign,
  Building2,
  AlertCircle,
} from 'lucide-react-native';
import { productListsService, optimizationService, ProductListItem, Recommendation } from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Product type combining ProductListItem and Recommendation
interface Product {
  id: string;
  ndc: string;
  productName: string;
  full_units: number;
  partial_units: number;
  quantity: number;
  lotNumber?: string;
  expirationDate?: string;
  notes?: string;
  recommendedDistributor?: string;
  price?: number;
  expectedPrice?: number;
  addedAt?: string;
  addedBy?: string;
}

export function ProductsScreen() {
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expirationFilter, setExpirationFilter] = useState<'all' | 'expired'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Alert state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Action states
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<'initial' | 'scan' | 'manual'>('initial');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Form fields
  const [ndcInput, setNdcInput] = useState('');
  const [productName, setProductName] = useState('');
  const [isFullChecked, setIsFullChecked] = useState(false);
  const [isPartialChecked, setIsPartialChecked] = useState(false);
  const [fullUnits, setFullUnits] = useState(0);
  const [partialUnits, setPartialUnits] = useState(0);
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lotNumberError, setLotNumberError] = useState<string | null>(null);
  const [ndcLookupSuccess, setNdcLookupSuccess] = useState(false);
  const [ndcLookupLoading, setNdcLookupLoading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // NDC lookup debounce
  const ndcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('Loading products from optimization recommendations...');

      const recommendations = await optimizationService.getRecommendations();
      console.log(`Loaded ${recommendations.recommendations.length} products`);

      const transformed: Product[] = recommendations.recommendations.map((rec: Recommendation) => ({
        id: rec.id || rec.ndc,
        ndc: rec.ndc,
        productName: rec.productName,
        full_units: rec.full ?? 0,
        partial_units: rec.partial ?? 0,
        quantity: (rec.full ?? 0) + (rec.partial ?? 0),
        lotNumber: rec.lotNumber || '',
        expirationDate: rec.expirationDate || '',
        recommendedDistributor: rec.recommendedDistributor || '',
        price: rec.expectedPrice ?? 0,
        expectedPrice: rec.expectedPrice ?? 0,
        addedAt: recommendations.generatedAt,
      }));

      setProducts(transformed);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // NDC lookup effect
  useEffect(() => {
    if (entryMode !== 'manual' || !isModalOpen) return;
    if (!ndcInput.trim()) return;

    // Only lookup if product name is empty (new entry) or NDC changed during edit
    if (productName.trim() && !editingProductId) return;

    if (ndcDebounceRef.current) {
      clearTimeout(ndcDebounceRef.current);
    }

    ndcDebounceRef.current = setTimeout(async () => {
      const cleanNdc = ndcInput.replace(/[-\s]/g, '');
      
      if (cleanNdc.length < 10 || cleanNdc.length > 11) return;

      try {
        setNdcLookupLoading(true);
        const response = await fetch(
          `https://rxnav.nlm.nih.gov/REST/ndcstatus.json?ndc=${cleanNdc}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        
        if (data?.ndcStatus?.conceptName) {
          if (!productName.trim()) {
            setProductName(data.ndcStatus.conceptName);
            setNdcLookupSuccess(true);
          }
        } else {
          setNdcLookupSuccess(false);
        }
      } catch (err) {
        console.log('Could not lookup NDC:', cleanNdc);
        setNdcLookupSuccess(false);
      } finally {
        setNdcLookupLoading(false);
      }
    }, 800);

    return () => {
      if (ndcDebounceRef.current) {
        clearTimeout(ndcDebounceRef.current);
      }
    };
  }, [ndcInput, entryMode, isModalOpen, editingProductId]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    await loadProducts();
    setRefreshing(false);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    Keyboard.dismiss();
  };

  // Validate lot number
  const validateLotNumber = (lot: string): { isValid: boolean; error?: string } => {
    const trimmed = lot.trim();
    
    if (!trimmed) {
      return { isValid: false, error: 'Lot number is required' };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, error: 'Lot number must be at least 3 characters' };
    }
    
    if (trimmed.length > 30) {
      return { isValid: false, error: 'Lot number must not exceed 30 characters' };
    }
    
    const lotPattern = /^[A-Za-z0-9\s\-_/]+$/;
    if (!lotPattern.test(trimmed)) {
      return { isValid: false, error: 'Invalid characters in lot number' };
    }
    
    if (!/[A-Za-z0-9]/.test(trimmed)) {
      return { isValid: false, error: 'Must contain at least one letter or number' };
    }
    
    return { isValid: true };
  };

  const resetForm = () => {
    setNdcInput('');
    setProductName('');
    setIsFullChecked(false);
    setIsPartialChecked(false);
    setFullUnits(0);
    setPartialUnits(0);
    setLotNumber('');
    setExpirationDate('');
    setNotes('');
    setLotNumberError(null);
    setNdcLookupSuccess(false);
    setEditingProductId(null);
    setEntryMode('initial');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setShowCamera(false);
    resetForm();
    setError(null);
  };

  const openAddModal = () => {
    resetForm();
    setError(null);
    setIsModalOpen(true);
    setEntryMode('initial');
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setNdcInput(product.ndc);
    setProductName(product.productName);
    
    const hasFullUnits = product.full_units > 0;
    const hasPartialUnits = product.partial_units > 0;
    
    setIsFullChecked(hasFullUnits && !hasPartialUnits);
    setIsPartialChecked(hasPartialUnits);
    setFullUnits(product.full_units);
    setPartialUnits(product.partial_units);
    setLotNumber(product.lotNumber || '');
    setExpirationDate(product.expirationDate || '');
    setNotes(product.notes || '');
    setNdcLookupSuccess(true);
    setEntryMode('manual');
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!ndcInput.trim()) {
      setError('Please enter an NDC code');
      return;
    }

    if (!productName.trim()) {
      setError('Please enter a product name');
      return;
    }

    const lotValidation = validateLotNumber(lotNumber);
    if (!lotValidation.isValid) {
      setLotNumberError(lotValidation.error || 'Invalid lot number');
      setError(lotValidation.error || 'Invalid lot number');
      return;
    }
    setLotNumberError(null);

    if (!expirationDate.trim()) {
      setError('Please enter an expiration date');
      return;
    }

    if (!isFullChecked && !isPartialChecked) {
      setError('Please select either Full or Partial');
      return;
    }

    if (isFullChecked && fullUnits <= 0) {
      setError('Please enter valid full units');
      return;
    }

    if (isPartialChecked && partialUnits <= 0) {
      setError('Please enter valid partial units');
      return;
    }

    setError(null);
    setSavingProduct(true);

    try {
      const finalFullUnits = isFullChecked ? fullUnits : 0;
      const finalPartialUnits = isPartialChecked ? partialUnits : 0;

      const payload = {
        ndc: ndcInput.trim(),
        product_name: productName.trim(),
        full_units: finalFullUnits,
        partial_units: finalPartialUnits,
        lot_number: lotNumber.trim(),
        expiration_date: expirationDate.trim(),
        notes: notes.trim() || undefined,
      };

      if (editingProductId) {
        await productListsService.updateItem(editingProductId, payload);
        setSuccess(`Product updated: ${productName}`);
      } else {
        await productListsService.addItem('', payload);
        setSuccess(`Product added: ${productName}`);
      }

      closeModal();
      await loadProducts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingProductId(productId);
              await productListsService.removeItem(productId);
              setProducts(prev => prev.filter(p => p.id !== productId));
              setSuccess('Product removed successfully');
              setTimeout(() => setSuccess(null), 3000);
            } catch (err: any) {
              setError(err.message || 'Failed to remove product');
            } finally {
              setDeletingProductId(null);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = async () => {
    setShowClearAllModal(false);
    setClearingAll(true);
    setError(null);

    try {
      await productListsService.clearAllItems();
      setProducts([]);
      setSuccess('All products cleared successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear products');
    } finally {
      setClearingAll(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.ndc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (expirationFilter === 'expired') {
      if (!p.expirationDate) return false;
      try {
        const expirationDateObj = new Date(p.expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expirationDateObj.setHours(0, 0, 0, 0);
        return expirationDateObj < today;
      } catch {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Product Card Component
  const ProductCard = ({ product }: { product: Product }) => {
    const isExpired = (() => {
      if (!product.expirationDate) return false;
      try {
        const expDate = new Date(product.expirationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);
        return expDate < today;
      } catch {
        return false;
      }
    })();

    return (
      <View style={[styles.productCard, isExpired && styles.productCardExpired]}>
        {/* Card Header */}
        <View style={styles.productHeader}>
          <View style={styles.productIconContainer}>
            <Package color="#14B8A6" size={moderateScale(18)} />
          </View>
          <View style={styles.productTitleContainer}>
            <Text style={styles.productName} numberOfLines={2}>{product.productName}</Text>
            <Text style={styles.productNdc}>NDC: {product.ndc}</Text>
          </View>
          {isExpired && (
            <View style={styles.expiredBadge}>
              <AlertTriangle color="#EF4444" size={moderateScale(10)} />
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>

        {/* Card Details */}
        <View style={styles.productDetails}>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Full Units</Text>
              <Text style={styles.detailValue}>{product.full_units}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Partial Units</Text>
              <Text style={styles.detailValue}>{product.partial_units}</Text>
            </View>
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Distributor</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {product.recommendedDistributor || '-'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price/Unit</Text>
              <Text style={[styles.detailValue, styles.priceValue]}>
                {product.price ? formatCurrency(product.price) : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Lot #</Text>
              <Text style={styles.detailValue}>{product.lotNumber || '-'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Expires</Text>
              <Text style={[styles.detailValue, isExpired && styles.expiredValue]}>
                {formatDate(product.expirationDate || '')}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Actions */}
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditProduct(product)}
          >
            <Edit3 color="#14B8A6" size={moderateScale(14)} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(product.id)}
            disabled={deletingProductId === product.id}
          >
            {deletingProductId === product.id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Trash2 color="#EF4444" size={moderateScale(14)} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Filter Button Component
  const FilterButton = ({ label, value, color }: { label: string; value: typeof expirationFilter; color?: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        expirationFilter === value && [
          styles.filterButtonActive,
          color === 'red' && styles.filterButtonRed
        ]
      ]}
      onPress={() => {
        setExpirationFilter(value);
        setCurrentPage(1);
      }}
    >
      <Text style={[
        styles.filterButtonText,
        expirationFilter === value && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <Text style={styles.paginationInfo}>
          {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
        </Text>
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft color={currentPage === 1 ? '#9CA3AF' : '#374151'} size={moderateScale(16)} />
          </TouchableOpacity>
          <Text style={styles.pageNumber}>{currentPage} / {totalPages}</Text>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight color={currentPage === totalPages ? '#9CA3AF' : '#374151'} size={moderateScale(16)} />
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>My Products</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Plus color="#FFFFFF" size={moderateScale(14)} />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Alerts */}
      {error && (
        <View style={styles.alertError}>
          <AlertTriangle color="#DC2626" size={moderateScale(16)} />
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

      {/* Products Card */}
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>All Products ({products.length})</Text>
            <Text style={styles.cardSubtitle}>View and manage your products</Text>
          </View>
        </View>

        {/* Search and Actions */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search color="#9CA3AF" size={moderateScale(14)} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          {products.length > 0 && (
            <TouchableOpacity
              style={[styles.clearAllButton, clearingAll && styles.buttonDisabled]}
              onPress={() => setShowClearAllModal(true)}
              disabled={clearingAll}
            >
              {clearingAll ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Trash2 color="#EF4444" size={moderateScale(12)} />
                  <Text style={styles.clearAllText}>Clear</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <FilterButton label="All" value="all" />
          <FilterButton label="Expired" value="expired" color="red" />
        </View>

        {/* Products List */}
        <ScrollView
          style={styles.productsContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package color="#9CA3AF" size={moderateScale(40)} />
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Add products using the button above</Text>
            </View>
          ) : (
            <>
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              {renderPagination()}
            </>
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingProductId ? 'Edit Product' : 'Add Product'}
                </Text>
                {entryMode !== 'initial' && (
                  <Text style={styles.modalSubtitle}>
                    {entryMode === 'scan' ? 'Scan barcode' : 'Enter product details'}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <X color="#6B7280" size={moderateScale(18)} />
              </TouchableOpacity>
            </View>

            {/* Error in modal */}
            {error && entryMode !== 'initial' && (
              <View style={styles.modalError}>
                <AlertCircle color="#DC2626" size={moderateScale(14)} />
                <Text style={styles.modalErrorText}>{error}</Text>
              </View>
            )}

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Initial Mode - Choose Entry Method */}
              {entryMode === 'initial' && !editingProductId && (
                <View style={styles.initialModeContainer}>
                  <TouchableOpacity
                    style={styles.entryModeButton}
                    onPress={async () => {
                      // Check camera permissions
                      if (!cameraPermission) {
                        // Permission is still loading
                        return;
                      }
                      
                      if (!cameraPermission.granted) {
                        // Request permission
                        const { granted } = await requestCameraPermission();
                        if (!granted) {
                          Alert.alert(
                            'Camera Permission Required',
                            'Please allow camera access to scan barcodes.',
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                      }
                      
                      // Open camera
                      setShowCamera(true);
                    }}
                  >
                    <CameraIcon color="#FFFFFF" size={moderateScale(16)} />
                    <Text style={styles.entryModeButtonText}>Scan Barcode</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.entryModeButton}
                    onPress={() => setEntryMode('manual')}
                  >
                    <KeyboardIcon color="#FFFFFF" size={moderateScale(16)} />
                    <Text style={styles.entryModeButtonText}>Manual Entry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back Button (when not in initial mode and not editing) */}
              {entryMode !== 'initial' && !editingProductId && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setEntryMode('initial')}
                >
                  <ArrowLeft color="#374151" size={moderateScale(14)} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {/* Manual Entry Form */}
              {(entryMode === 'manual' || editingProductId) && (
                <View style={styles.formContainer}>
                  {/* NDC Code */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>NDC Code *</Text>
                    <View style={styles.inputWithIcon}>
                      <TextInput
                        style={styles.formInput}
                        value={ndcInput}
                        onChangeText={(text) => {
                          setNdcInput(text);
                          if (!editingProductId) {
                            setNdcLookupSuccess(false);
                            setProductName('');
                          }
                        }}
                        placeholder="00093-2263-01"
                        placeholderTextColor="#9CA3AF"
                      />
                      {ndcLookupLoading && (
                        <ActivityIndicator size="small" color="#14B8A6" style={styles.inputIcon} />
                      )}
                    </View>
                    <Text style={styles.formHint}>Format: XXXXX-XXXX-XX (dashes optional)</Text>
                  </View>

                  {/* Product Name (shown after NDC lookup or always when editing) */}
                  {(ndcLookupSuccess || productName.trim() || editingProductId) && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Product Name *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={productName}
                          onChangeText={(text) => {
                            setProductName(text);
                            if (text.trim()) setNdcLookupSuccess(true);
                          }}
                          placeholder="Enter product name"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>

                      {/* Full/Partial Units */}
                      <View style={styles.unitsSection}>
                        {/* Full Units */}
                        <View style={styles.unitCheckboxRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => {
                              setIsFullChecked(!isFullChecked);
                              if (!isFullChecked) {
                                setIsPartialChecked(false);
                                setPartialUnits(0);
                              }
                            }}
                          >
                            <View style={[styles.checkboxInner, isFullChecked && styles.checkboxChecked]}>
                              {isFullChecked && <CheckCircle2 color="#FFFFFF" size={moderateScale(12)} />}
                            </View>
                            <Text style={styles.checkboxLabel}>Full</Text>
                          </TouchableOpacity>
                        </View>
                        {isFullChecked && (
                          <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Full Units *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={fullUnits > 0 ? fullUnits.toString() : ''}
                              onChangeText={(text) => setFullUnits(parseInt(text) || 0)}
                              placeholder="Enter full units"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="number-pad"
                            />
                          </View>
                        )}

                        {/* Partial Units */}
                        <View style={styles.unitCheckboxRow}>
                          <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => {
                              setIsPartialChecked(!isPartialChecked);
                              if (!isPartialChecked) {
                                setIsFullChecked(false);
                                setFullUnits(0);
                              }
                            }}
                          >
                            <View style={[styles.checkboxInner, isPartialChecked && styles.checkboxChecked]}>
                              {isPartialChecked && <CheckCircle2 color="#FFFFFF" size={moderateScale(12)} />}
                            </View>
                            <Text style={styles.checkboxLabel}>Partial</Text>
                          </TouchableOpacity>
                        </View>
                        {isPartialChecked && (
                          <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Partial Units *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={partialUnits > 0 ? partialUnits.toString() : ''}
                              onChangeText={(text) => setPartialUnits(parseInt(text) || 0)}
                              placeholder="Enter partial units"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="number-pad"
                            />
                          </View>
                        )}
                      </View>

                      {/* Lot Number */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Lot Number *</Text>
                        <TextInput
                          style={[styles.formInput, lotNumberError && styles.formInputError]}
                          value={lotNumber}
                          onChangeText={(text) => {
                            setLotNumber(text);
                            if (text.trim()) {
                              const validation = validateLotNumber(text);
                              setLotNumberError(validation.isValid ? null : validation.error || null);
                            } else {
                              setLotNumberError(null);
                            }
                          }}
                          placeholder="LOT-2024-001"
                          placeholderTextColor="#9CA3AF"
                        />
                        {lotNumberError && (
                          <Text style={styles.errorText}>{lotNumberError}</Text>
                        )}
                        {!lotNumberError && lotNumber.trim() && (
                          <View style={styles.validIndicator}>
                            <CheckCircle2 color="#22C55E" size={moderateScale(12)} />
                            <Text style={styles.validText}>Valid lot number</Text>
                          </View>
                        )}
                      </View>

                      {/* Expiration Date */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Expiration Date *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={expirationDate}
                          onChangeText={setExpirationDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9CA3AF"
                        />
                        <Text style={styles.formHint}>Format: YYYY-MM-DD (e.g., 2025-12-31)</Text>
                      </View>

                      {/* Notes */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Notes (Optional)</Text>
                        <TextInput
                          style={[styles.formInput, styles.textArea]}
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Additional notes..."
                          placeholderTextColor="#9CA3AF"
                          multiline
                          numberOfLines={3}
                        />
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[styles.saveButton, savingProduct && styles.buttonDisabled]}
                          onPress={handleSaveProduct}
                          disabled={savingProduct}
                        >
                          {savingProduct ? (
                            <>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                              <Text style={styles.saveButtonText}>
                                {editingProductId ? 'Updating...' : 'Adding...'}
                              </Text>
                            </>
                          ) : (
                            <>
                              {editingProductId ? (
                                <Edit3 color="#FFFFFF" size={moderateScale(14)} />
                              ) : (
                                <Plus color="#FFFFFF" size={moderateScale(14)} />
                              )}
                              <Text style={styles.saveButtonText}>
                                {editingProductId ? 'Update Product' : 'Add Product'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.clearButton}
                          onPress={resetForm}
                        >
                          <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        visible={showClearAllModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearAllModal(false)}
      >
        <Pressable style={styles.confirmModalOverlay} onPress={() => setShowClearAllModal(false)}>
          <Pressable style={styles.confirmModalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmModalIcon}>
              <AlertTriangle color="#EF4444" size={moderateScale(32)} />
            </View>
            <Text style={styles.confirmModalTitle}>Clear All Products?</Text>
            <Text style={styles.confirmModalText}>
              This will remove all {products.length} products. This action cannot be undone.
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowClearAllModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={handleClearAll}
              >
                <Trash2 color="#FFFFFF" size={moderateScale(14)} />
                <Text style={styles.confirmDeleteText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowCamera(false);
          setEntryMode('initial');
        }}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
          >
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraCloseButton}
                onPress={() => {
                  setShowCamera(false);
                  setEntryMode('initial');
                }}
              >
                <X color="#FFFFFF" size={moderateScale(24)} />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Scan Barcode</Text>
              <View style={styles.cameraPlaceholder} />
            </View>
            <View style={styles.cameraFooter}>
              <Text style={styles.cameraHint}>
                Point your camera at a barcode to scan
              </Text>
              <Text style={styles.cameraNote}>
                Barcode scanning functionality coming soon
              </Text>
            </View>
          </CameraView>
        </View>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  addButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  // Card
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#99F6E4',
    borderRadius: moderateScale(12),
    margin: moderateScale(8),
    overflow: 'hidden',
  },
  cardHeader: {
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cardSubtitle: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    padding: moderateScale(12),
    gap: moderateScale(8),
  },
  searchInputContainer: {
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
  searchInput: {
    flex: 1,
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#374151',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(8),
    gap: moderateScale(4),
  },
  clearAllText: {
    fontSize: moderateScale(11),
    color: '#EF4444',
    fontWeight: '500',
  },
  // Filters
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(12),
    paddingBottom: moderateScale(12),
    gap: moderateScale(8),
    justifyContent: 'center',
  },
  filterButton: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  filterButtonRed: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterButtonText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Products List
  productsContainer: {
    flex: 1,
    paddingHorizontal: moderateScale(12),
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: moderateScale(10),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productCardExpired: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
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
    marginHorizontal: moderateScale(10),
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
    fontFamily: 'monospace',
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
    gap: moderateScale(4),
  },
  expiredText: {
    fontSize: moderateScale(9),
    fontWeight: '600',
    color: '#EF4444',
  },
  productDetails: {
    padding: moderateScale(12),
    gap: moderateScale(10),
  },
  detailsRow: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    marginBottom: moderateScale(2),
  },
  detailValue: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
  },
  priceValue: {
    color: '#059669',
    fontWeight: '600',
  },
  expiredValue: {
    color: '#EF4444',
  },
  productActions: {
    flexDirection: 'row',
    padding: moderateScale(12),
    paddingTop: 0,
    gap: moderateScale(8),
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#14B8A6',
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  editButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#14B8A6',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  deleteButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#EF4444',
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
  },
  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(16),
    marginBottom: moderateScale(16),
  },
  paginationInfo: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  pageButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumber: {
    fontSize: moderateScale(11),
    color: '#374151',
    fontWeight: '500',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  modalCloseButton: {
    padding: moderateScale(4),
  },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: moderateScale(10),
    marginHorizontal: moderateScale(16),
    marginTop: moderateScale(16),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
  },
  modalErrorText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#991B1B',
  },
  modalBody: {
    padding: moderateScale(16),
    maxHeight: '80%',
  },
  // Initial Mode
  initialModeContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(32),
    gap: moderateScale(12),
  },
  entryModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(24),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
    width: '80%',
  },
  entryModeButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(16),
    gap: moderateScale(4),
  },
  backButtonText: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  // Form
  formContainer: {
    gap: moderateScale(16),
  },
  formGroup: {
    gap: moderateScale(6),
  },
  formLabel: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#374151',
  },
  formInputError: {
    borderColor: '#EF4444',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: moderateScale(12),
    top: moderateScale(12),
  },
  formHint: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
  },
  textArea: {
    minHeight: moderateScale(80),
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: moderateScale(10),
    color: '#EF4444',
  },
  validIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  validText: {
    fontSize: moderateScale(10),
    color: '#22C55E',
  },
  // Units Section
  unitsSection: {
    gap: moderateScale(12),
  },
  unitCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  checkboxInner: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(4),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  checkboxLabel: {
    fontSize: moderateScale(12),
    color: '#374151',
    fontWeight: '500',
  },
  // Form Actions
  formActions: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginTop: moderateScale(8),
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
  },
  saveButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearButton: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  clearButtonText: {
    fontSize: moderateScale(12),
    color: '#374151',
  },
  // Confirm Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(16),
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(24),
    width: '90%',
    maxWidth: moderateScale(320),
    alignItems: 'center',
  },
  confirmModalIcon: {
    marginBottom: moderateScale(16),
  },
  confirmModalTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: moderateScale(8),
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: moderateScale(20),
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: moderateScale(12),
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: moderateScale(12),
    color: '#374151',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#EF4444',
    gap: moderateScale(6),
  },
  confirmDeleteText: {
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: moderateScale(50),
    paddingHorizontal: moderateScale(20),
    paddingBottom: moderateScale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cameraCloseButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraPlaceholder: {
    width: moderateScale(40),
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: moderateScale(40),
    paddingHorizontal: moderateScale(20),
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: moderateScale(20),
  },
  cameraHint: {
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: moderateScale(8),
  },
  cameraNote: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
