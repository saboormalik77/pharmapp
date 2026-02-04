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
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Info,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from 'lucide-react-native';
import {
  inventoryAnalysisService,
  AnalysisResponse,
  AnalysisItem,
  DistributorLocation,
} from '../api/services/inventoryAnalysisService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Format helpers
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatLocation = (location: string | DistributorLocation | undefined): string => {
  if (!location) return '';
  if (typeof location === 'string') return location;

  const parts: string[] = [];
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  if (location.zipCode) parts.push(location.zipCode);

  return parts.join(', ') || '';
};

type TabType = 'keep' | 'return';

interface SelectedFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

export function InventoryAnalysisScreen() {
  // State
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [uploadResponseData, setUploadResponseData] = useState<AnalysisResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('keep');
  const [modalActiveTab, setModalActiveTab] = useState<TabType>('return');

  // Fetch analysis summary on page load
  useEffect(() => {
    fetchAnalysisSummary();
  }, []);

  const fetchAnalysisSummary = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryAnalysisService.getAnalysisSummary();
      if (data) {
        setAnalysisData(data);
      }
    } catch (err: any) {
      console.log('No analysis data available:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    await fetchAnalysisSummary();
    setRefreshing(false);
  };

  const handleSelectFile = async () => {
    try {
      setError(null);
      setSuccess(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedFile = result.assets[0];
        const fileName = selectedFile.name.toLowerCase();

        const isValidType =
          fileName.endsWith('.csv') ||
          fileName.endsWith('.xlsx') ||
          fileName.endsWith('.xls');

        if (!isValidType) {
          setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
          return;
        }

        setFile({
          name: selectedFile.name,
          uri: selectedFile.uri,
          size: selectedFile.size || 0,
          mimeType: selectedFile.mimeType || 'text/csv',
        });
      }
    } catch (err) {
      console.error('File picker error:', err);
      setError('Failed to select file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await inventoryAnalysisService.uploadInventoryFile(
        file.uri,
        file.name,
        file.mimeType
      );

      setUploadResponseData(response);
      setSuccess(`Successfully analyzed ${response.totalItems} inventory items`);
      setShowModal(true);
      setShowUploadSection(false);
      setModalActiveTab(response.itemsToReturn.length > 0 ? 'return' : 'keep');
      setFile(null);
      
      // Refresh summary data
      await fetchAnalysisSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  // Item Card Component (Mobile-optimized)
  const ItemCard = ({ item, type }: { item: AnalysisItem; type: 'return' | 'keep' }) => {
    const borderColor = type === 'return' ? '#10B981' : '#3B82F6';
    const bgColor = type === 'return' ? '#F0FDF4' : '#EFF6FF';

    return (
      <View style={[styles.itemCard, { borderLeftColor: borderColor, backgroundColor: bgColor }]}>
        {/* Product Info */}
        <View style={styles.itemHeader}>
          <Text style={styles.itemProductName} numberOfLines={2}>
            {item.productName}
          </Text>
          <Text style={styles.itemManufacturer}>{item.manufacturer}</Text>
        </View>

        {/* Details Grid */}
        <View style={styles.itemDetailsGrid}>
          <View style={styles.itemDetailRow}>
            <Text style={styles.itemDetailLabel}>NDC:</Text>
            <Text style={styles.itemDetailValue}>{item.ndcCode}</Text>
          </View>
          <View style={styles.itemDetailRow}>
            <Text style={styles.itemDetailLabel}>Lot #:</Text>
            <Text style={styles.itemDetailValue}>{item.lotNumber}</Text>
          </View>
          <View style={styles.itemDetailRow}>
            <Text style={styles.itemDetailLabel}>Qty:</Text>
            <Text style={styles.itemDetailValue}>
              {item.quantity} ({item.fullUnits} full, {item.partialUnits} partial)
            </Text>
          </View>
          <View style={styles.itemDetailRow}>
            <Text style={styles.itemDetailLabel}>Expiration:</Text>
            <Text style={styles.itemDetailValue}>{formatDate(item.expirationDate)}</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.itemPricing}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Full Price</Text>
            <Text style={[styles.priceValue, { color: '#3B82F6' }]}>
              {formatCurrency(item.bestFullPrice)}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Partial Price</Text>
            <Text style={[styles.priceValue, { color: '#8B5CF6' }]}>
              {formatCurrency(item.bestPartialPrice)}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Est. Return</Text>
            <Text style={[styles.priceValue, { color: '#10B981', fontWeight: '700' }]}>
              {formatCurrency(item.estimatedReturnValue)}
            </Text>
          </View>
        </View>

        {/* Distributor (for return items) */}
        {type === 'return' && item.recommendedDistributor && (
          <View style={styles.distributorInfo}>
            <Building2 color="#6B7280" size={moderateScale(12)} />
            <View style={styles.distributorText}>
              <Text style={styles.distributorName}>{item.recommendedDistributor.name}</Text>
              {formatLocation(item.recommendedDistributor.location) && (
                <Text style={styles.distributorLocation}>
                  {formatLocation(item.recommendedDistributor.location)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Reason */}
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      </View>
    );
  };

  // Items List Component
  const ItemsList = ({ items, type }: { items: AnalysisItem[]; type: 'return' | 'keep' }) => {
    if (items.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Package color="#9CA3AF" size={moderateScale(40)} />
          <Text style={styles.emptyText}>No items in this category</Text>
        </View>
      );
    }

    return (
      <View style={styles.itemsList}>
        {items.map((item, idx) => (
          <ItemCard key={item.id || `item-${idx}-${item.ndcCode}`} item={item} type={type} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#F0FDFA', '#CCFBF1', '#F0FDFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}> Analysis</Text>
              <Text style={styles.headerSubtitle}>
                Upload inventory to analyze return opportunities
              </Text>
            </View>
            <TouchableOpacity
              style={styles.uploadToggleButton}
              onPress={() => setShowUploadSection(!showUploadSection)}
            >
              <Upload color="#FFFFFF" size={moderateScale(14)} />
              <Text style={styles.uploadToggleButtonText}>Upload</Text>
              {showUploadSection ? (
                <ChevronUp color="#FFFFFF" size={moderateScale(12)} />
              ) : (
                <ChevronDown color="#FFFFFF" size={moderateScale(12)} />
              )}
            </TouchableOpacity>
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

        {/* Upload Section - Toggleable */}
        {showUploadSection && (
          <View style={styles.uploadCard}>
            <View style={styles.uploadCardHeader}>
              <View style={styles.uploadCardIconContainer}>
                <Upload color="#14B8A6" size={moderateScale(18)} />
              </View>
              <View style={styles.uploadCardTitleContainer}>
                <Text style={styles.uploadCardTitle}>Upload Inventory File</Text>
                <Text style={styles.uploadCardSubtitle}>
                  Upload Excel (.xlsx, .xls) or CSV files
                </Text>
              </View>
              <TouchableOpacity
                style={styles.uploadCardCloseButton}
                onPress={() => setShowUploadSection(false)}
              >
                <X color="#6B7280" size={moderateScale(16)} />
              </TouchableOpacity>
            </View>

            {/* Drop Zone */}
            <TouchableOpacity
              style={[styles.dropZone, isUploading && styles.dropZoneDisabled]}
              onPress={handleSelectFile}
              disabled={isUploading}
            >
              {!file ? (
                <>
                  <FileSpreadsheet
                    color={isUploading ? '#9CA3AF' : '#14B8A6'}
                    size={moderateScale(32)}
                  />
                  <Text style={[styles.dropZoneText, isUploading && styles.dropZoneTextDisabled]}>
                    Tap to select file
                  </Text>
                  <Text style={styles.dropZoneHint}>Supported: CSV, Excel (.xlsx, .xls)</Text>
                </>
              ) : (
                <View style={styles.selectedFileContainer}>
                  <View style={styles.selectedFileInfo}>
                    <FileSpreadsheet color="#14B8A6" size={moderateScale(24)} />
                    <View style={styles.selectedFileDetails}>
                      <Text style={styles.selectedFileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.selectedFileSize}>
                        {(file.size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.removeFileButton} onPress={clearFile}>
                      <X color="#6B7280" size={moderateScale(16)} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                    onPress={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.uploadButtonText}>Analyzing...</Text>
                      </>
                    ) : (
                      <>
                        <Upload color="#FFFFFF" size={moderateScale(14)} />
                        <Text style={styles.uploadButtonText}>Upload & Analyze</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Info color="#3B82F6" size={moderateScale(14)} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>File Requirements:</Text>
                <Text style={styles.infoText}>
                  • Must contain NDC codes, quantities, and expiration dates
                </Text>
                <Text style={styles.infoText}>
                  • Supported columns: NDC, Product Name, Quantity, Expiration Date, Lot Number
                </Text>
                <Text style={styles.infoText}>• Maximum file size: 10MB</Text>
              </View>
            </View>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading analysis data...</Text>
          </View>
        )}

        {/* Summary Cards */}
        {!isLoading && analysisData && (
          <View style={styles.summaryCardsContainer}>
            <View style={[styles.summaryCard, styles.summaryCardTeal]}>
              <Text style={styles.summaryCardLabel}>Total Items</Text>
              <Text style={[styles.summaryCardValue, { color: '#0F766E' }]}>
                {analysisData.totalItems}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardBlue]}>
              <Text style={styles.summaryCardLabel}>Items to Keep</Text>
              <Text style={[styles.summaryCardValue, { color: '#1D4ED8' }]}>
                {analysisData.summary.keep}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardGreen]}>
              <Text style={styles.summaryCardLabel}>Items to Return</Text>
              <Text style={[styles.summaryCardValue, { color: '#047857' }]}>
                {analysisData.summary.returnNow}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardCyan]}>
              <Text style={styles.summaryCardLabel}>Potential Value</Text>
              <Text style={[styles.summaryCardValue, { color: '#0E7490', fontSize: moderateScale(14) }]}>
                {formatCurrency(analysisData.totalPotentialValue)}
              </Text>
            </View>
          </View>
        )}

        {/* Tabs Section */}
        {!isLoading && analysisData && (
          <View style={styles.tabsContainer}>
            {/* Tab Navigation */}
            <View style={styles.tabNavigation}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'keep' && styles.tabButtonActiveBlue]}
                onPress={() => setActiveTab('keep')}
              >
                <Package
                  color={activeTab === 'keep' ? '#1D4ED8' : '#6B7280'}
                  size={moderateScale(14)}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'keep' && styles.tabButtonTextActiveBlue]}
                >
                  Keep
                </Text>
                <View
                  style={[styles.tabBadge, activeTab === 'keep' ? styles.tabBadgeBlue : styles.tabBadgeGray]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      activeTab === 'keep' ? styles.tabBadgeTextBlue : styles.tabBadgeTextGray,
                    ]}
                  >
                    {analysisData.itemsToKeep.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'return' && styles.tabButtonActiveGreen]}
                onPress={() => setActiveTab('return')}
              >
                <TrendingUp
                  color={activeTab === 'return' ? '#047857' : '#6B7280'}
                  size={moderateScale(14)}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'return' && styles.tabButtonTextActiveGreen,
                  ]}
                >
                  Return
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    activeTab === 'return' ? styles.tabBadgeGreen : styles.tabBadgeGray,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      activeTab === 'return' ? styles.tabBadgeTextGreen : styles.tabBadgeTextGray,
                    ]}
                  >
                    {analysisData.itemsToReturn.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'keep' && (
              <View style={styles.tabContent}>
                {analysisData.itemsToKeep.length > 0 && (
                  <View style={styles.tabInfoBox}>
                    <Text style={styles.tabInfoText}>
                      <Text style={styles.tabInfoBold}>{analysisData.itemsToKeep.length}</Text> items
                      recommended to keep in inventory
                    </Text>
                  </View>
                )}
                <ItemsList items={analysisData.itemsToKeep} type="keep" />
              </View>
            )}

            {activeTab === 'return' && (
              <View style={styles.tabContent}>
                {analysisData.itemsToReturn.length > 0 && (
                  <View style={[styles.tabInfoBox, styles.tabInfoBoxGreen]}>
                    <Text style={[styles.tabInfoText, { color: '#065F46' }]}>
                      <Text style={styles.tabInfoBold}>{analysisData.itemsToReturn.length}</Text> items
                      recommended for return with total potential value of{' '}
                      <Text style={styles.tabInfoBold}>
                        {formatCurrency(analysisData.totalPotentialValue)}
                      </Text>
                    </Text>
                  </View>
                )}
                <ItemsList items={analysisData.itemsToReturn} type="return" />
              </View>
            )}
          </View>
        )}

        {/* Empty State - No data yet */}
        {!isLoading && !analysisData && (
          <View style={styles.emptyStateContainer}>
            <Package color="#9CA3AF" size={moderateScale(60)} />
            <Text style={styles.emptyStateTitle}>No Analysis Data Available</Text>
            <Text style={styles.emptyStateSubtitle}>
              Upload an inventory file to analyze return opportunities and get recommendations
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowUploadSection(true)}
            >
              <Upload color="#FFFFFF" size={moderateScale(16)} />
              <Text style={styles.emptyStateButtonText}>Upload Inventory File</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Results Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalHeaderIconContainer}>
                  <TrendingUp color="#14B8A6" size={moderateScale(20)} />
                </View>
                <View style={styles.modalHeaderTextContainer}>
                  <Text style={styles.modalHeaderTitle}>Inventory Analysis Results</Text>
                  {uploadResponseData && (
                    <Text style={styles.modalHeaderSubtitle}>
                      Analyzed {uploadResponseData.totalItems} items • {formatDate(uploadResponseData.generatedAt)}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <X color="#6B7280" size={moderateScale(18)} />
              </TouchableOpacity>
            </View>

            {uploadResponseData && (
              <>
                {/* Modal Summary */}
                <View style={styles.modalSummary}>
                  <View style={styles.modalSummaryRow}>
                    <View style={[styles.modalSummaryCard, { borderColor: '#14B8A6' }]}>
                      <Text style={styles.modalSummaryLabel}>Total</Text>
                      <Text style={[styles.modalSummaryValue, { color: '#0F766E' }]}>
                        {uploadResponseData.totalItems}
                      </Text>
                    </View>
                    <View style={[styles.modalSummaryCard, { borderColor: '#3B82F6' }]}>
                      <Text style={styles.modalSummaryLabel}>Keep</Text>
                      <Text style={[styles.modalSummaryValue, { color: '#1D4ED8' }]}>
                        {uploadResponseData.summary.keep}
                      </Text>
                    </View>
                    <View style={[styles.modalSummaryCard, { borderColor: '#10B981' }]}>
                      <Text style={styles.modalSummaryLabel}>Return</Text>
                      <Text style={[styles.modalSummaryValue, { color: '#047857' }]}>
                        {uploadResponseData.summary.returnNow}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalPotentialValueContainer}>
                    <DollarSign color="#0E7490" size={moderateScale(14)} />
                    <Text style={styles.modalPotentialValueLabel}>Potential Value:</Text>
                    <Text style={styles.modalPotentialValueAmount}>
                      {formatCurrency(uploadResponseData.totalPotentialValue)}
                    </Text>
                  </View>
                </View>

                {/* Modal Tabs */}
                <View style={styles.modalTabNavigation}>
                  <TouchableOpacity
                    style={[
                      styles.modalTabButton,
                      modalActiveTab === 'keep' && styles.modalTabButtonActiveBlue,
                    ]}
                    onPress={() => setModalActiveTab('keep')}
                  >
                    <Package
                      color={modalActiveTab === 'keep' ? '#1D4ED8' : '#6B7280'}
                      size={moderateScale(12)}
                    />
                    <Text
                      style={[
                        styles.modalTabButtonText,
                        modalActiveTab === 'keep' && styles.modalTabButtonTextActiveBlue,
                      ]}
                    >
                      Keep ({uploadResponseData.itemsToKeep.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalTabButton,
                      modalActiveTab === 'return' && styles.modalTabButtonActiveGreen,
                    ]}
                    onPress={() => setModalActiveTab('return')}
                  >
                    <TrendingUp
                      color={modalActiveTab === 'return' ? '#047857' : '#6B7280'}
                      size={moderateScale(12)}
                    />
                    <Text
                      style={[
                        styles.modalTabButtonText,
                        modalActiveTab === 'return' && styles.modalTabButtonTextActiveGreen,
                      ]}
                    >
                      Return ({uploadResponseData.itemsToReturn.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Modal Tab Content */}
                <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                  {modalActiveTab === 'keep' && (
                    <ItemsList items={uploadResponseData.itemsToKeep} type="keep" />
                  )}
                  {modalActiveTab === 'return' && (
                    <ItemsList items={uploadResponseData.itemsToReturn} type="return" />
                  )}
                </ScrollView>

                {/* Modal Footer */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalCloseFooterButton} onPress={closeModal}>
                    <Text style={styles.modalCloseFooterButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
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
  scrollView: {
    flex: 1,
  },
  // Header
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
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  uploadToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(8),
    gap: moderateScale(4),
  },
  uploadToggleButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
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
  // Upload Card
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#99F6E4',
    borderRadius: moderateScale(12),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    padding: moderateScale(12),
  },
  uploadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  uploadCardIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardTitleContainer: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  uploadCardTitle: {
    fontSize: moderateScale(13),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  uploadCardSubtitle: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  uploadCardCloseButton: {
    padding: moderateScale(4),
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#99F6E4',
    borderRadius: moderateScale(10),
    padding: moderateScale(20),
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
  },
  dropZoneDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  dropZoneText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
    marginTop: moderateScale(10),
  },
  dropZoneTextDisabled: {
    color: '#9CA3AF',
  },
  dropZoneHint: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    marginTop: moderateScale(4),
  },
  selectedFileContainer: {
    width: '100%',
    gap: moderateScale(12),
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  selectedFileDetails: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
  },
  selectedFileSize: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
  },
  removeFileButton: {
    padding: moderateScale(4),
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginTop: moderateScale(12),
    gap: moderateScale(8),
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: moderateScale(4),
  },
  infoText: {
    fontSize: moderateScale(10),
    color: '#1E40AF',
    lineHeight: moderateScale(14),
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(60),
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  // Summary Cards
  summaryCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    gap: moderateScale(8),
  },
  summaryCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - moderateScale(40)) / 2,
    padding: moderateScale(12),
    borderRadius: moderateScale(10),
    borderWidth: 2,
  },
  summaryCardTeal: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  summaryCardBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  summaryCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  summaryCardCyan: {
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
  },
  summaryCardLabel: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: '#6B7280',
  },
  summaryCardValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    marginTop: moderateScale(2),
  },
  // Tabs
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(12),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    overflow: 'hidden',
  },
  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    padding: moderateScale(8),
    gap: moderateScale(8),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(8),
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: moderateScale(6),
  },
  tabButtonActiveBlue: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  tabButtonActiveGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  tabButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActiveBlue: {
    color: '#1D4ED8',
  },
  tabButtonTextActiveGreen: {
    color: '#047857',
  },
  tabBadge: {
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(10),
  },
  tabBadgeBlue: {
    backgroundColor: '#1D4ED8',
  },
  tabBadgeGreen: {
    backgroundColor: '#047857',
  },
  tabBadgeGray: {
    backgroundColor: '#9CA3AF',
  },
  tabBadgeText: {
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  tabBadgeTextBlue: {
    color: '#FFFFFF',
  },
  tabBadgeTextGreen: {
    color: '#FFFFFF',
  },
  tabBadgeTextGray: {
    color: '#FFFFFF',
  },
  tabContent: {
    padding: moderateScale(12),
  },
  tabInfoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(12),
  },
  tabInfoBoxGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  tabInfoText: {
    fontSize: moderateScale(11),
    color: '#1E40AF',
  },
  tabInfoBold: {
    fontWeight: '700',
  },
  itemsList: {
    gap: moderateScale(10),
  },
  // Item Card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    padding: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemProductName: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  itemManufacturer: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  itemDetailsGrid: {
    padding: moderateScale(10),
    gap: moderateScale(6),
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDetailLabel: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  itemDetailValue: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: '#374151',
    maxWidth: '60%',
    textAlign: 'right',
  },
  itemPricing: {
    flexDirection: 'row',
    padding: moderateScale(10),
    paddingTop: 0,
    gap: moderateScale(8),
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
    padding: moderateScale(8),
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(6),
  },
  priceLabel: {
    fontSize: moderateScale(8),
    color: '#6B7280',
    marginBottom: moderateScale(2),
  },
  priceValue: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  distributorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: moderateScale(10),
    paddingTop: 0,
    gap: moderateScale(6),
  },
  distributorText: {
    flex: 1,
  },
  distributorName: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: '#374151',
  },
  distributorLocation: {
    fontSize: moderateScale(9),
    color: '#6B7280',
  },
  reasonContainer: {
    padding: moderateScale(10),
    paddingTop: 0,
  },
  reasonText: {
    fontSize: moderateScale(9),
    color: '#6B7280',
    fontStyle: 'italic',
  },
  // Empty Container
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  emptyText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(12),
    color: '#9CA3AF',
  },
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(60),
    paddingHorizontal: moderateScale(20),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(12),
  },
  emptyStateTitle: {
    marginTop: moderateScale(16),
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    marginTop: moderateScale(8),
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    marginTop: moderateScale(20),
    gap: moderateScale(8),
  },
  emptyStateButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: moderateScale(100),
  },
  // Modal
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
    maxWidth: moderateScale(500),
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F0FDFA',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: moderateScale(10),
  },
  modalHeaderIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTextContainer: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalHeaderSubtitle: {
    fontSize: moderateScale(10),
    color: '#6B7280',
  },
  modalCloseButton: {
    padding: moderateScale(4),
  },
  modalSummary: {
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalSummaryRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  modalSummaryCard: {
    flex: 1,
    padding: moderateScale(10),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(8),
    borderWidth: 2,
    alignItems: 'center',
  },
  modalSummaryLabel: {
    fontSize: moderateScale(9),
    color: '#6B7280',
  },
  modalSummaryValue: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  modalPotentialValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(10),
    gap: moderateScale(4),
  },
  modalPotentialValueLabel: {
    fontSize: moderateScale(11),
    color: '#0E7490',
  },
  modalPotentialValueAmount: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#0E7490',
  },
  modalTabNavigation: {
    flexDirection: 'row',
    padding: moderateScale(8),
    gap: moderateScale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(10),
    borderRadius: moderateScale(8),
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: moderateScale(4),
  },
  modalTabButtonActiveBlue: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  modalTabButtonActiveGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  modalTabButtonText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#6B7280',
  },
  modalTabButtonTextActiveBlue: {
    color: '#1D4ED8',
  },
  modalTabButtonTextActiveGreen: {
    color: '#047857',
  },
  modalScrollContent: {
    padding: moderateScale(12),
    maxHeight: moderateScale(300),
  },
  modalFooter: {
    padding: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalCloseFooterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  modalCloseFooterButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
  },
});

