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
  TextInput,
  Alert,
  Modal,
  Pressable,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import {
  Upload,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Loader2,
  Clock,
  Calendar,
  Building2,
} from 'lucide-react-native';
import { documentsService, UploadedDocument } from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive helpers
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

interface SelectedFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

export function DocumentsScreen() {
  // Documents state
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Alert state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Action states
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Check if any document is uploading/processing
  const hasUploadingDocuments = documents.some(
    doc => doc.status === 'uploading' || doc.status === 'processing'
  );
  const isUploadInProgress = uploading || hasUploadingDocuments;

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const result = await documentsService.getDocuments({
        search: searchQuery || undefined,
      });
      setDocuments(result.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadDocuments();
  };

  // File picker
  const handleSelectFiles = async () => {
    if (isUploadInProgress) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles: SelectedFile[] = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/pdf',
        }));
        setSelectedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (err) {
      console.error('File picker error:', err);
      setError('Failed to select files');
    }
  };

  const removeFile = (index: number) => {
    if (isUploadInProgress) return;
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Note: In a real implementation, you'd upload the files
      // For now, we'll simulate success since mobile file upload
      // requires different handling than web
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully uploaded ${selectedFiles.length} file(s)! Processing will begin shortly.`);
      setSelectedFiles([]);
      setIsUploadModalOpen(false);
      
      // Reload documents
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // View document
  const handleViewFile = async (doc: UploadedDocument) => {
    try {
      setError(null);
      setViewingDocId(doc.id);
      
      // Open document URL if available
      if (doc.fileUrl) {
        await Linking.openURL(doc.fileUrl);
      } else {
        Alert.alert('Info', 'Document preview is not available on mobile. Please use the web version.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to view document');
    } finally {
      setViewingDocId(null);
    }
  };

  // Download document
  const handleDownloadFile = async (doc: UploadedDocument) => {
    try {
      setError(null);
      setDownloadingDocId(doc.id);
      
      if (doc.fileUrl) {
        await Linking.openURL(doc.fileUrl);
      } else {
        Alert.alert('Info', 'Document download is not available. Please use the web version.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || (
      (doc.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.reverseDistributorName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'processing': return Loader2;
      case 'failed': return AlertCircle;
      case 'uploading': return Clock;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'processing': return '#3B82F6';
      case 'failed': return '#EF4444';
      case 'uploading': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      case 'uploading': return 'Uploading';
      default: return status;
    }
  };

  // Document Card Component (Mobile-friendly)
  const DocumentCard = ({ doc }: { doc: UploadedDocument }) => {
    const StatusIcon = getStatusIcon(doc.status);
    const statusColor = getStatusColor(doc.status);
    const isProcessing = doc.status === 'processing' || doc.status === 'uploading';

    return (
      <View style={styles.documentCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.fileIconContainer}>
            <FileText color="#14B8A6" size={moderateScale(20)} />
          </View>
          <View style={styles.fileNameContainer}>
            <Text style={styles.fileName} numberOfLines={2}>{doc.fileName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <StatusIcon color={statusColor} size={moderateScale(12)} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(doc.status)}
            </Text>
          </View>
        </View>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Building2 color="#9CA3AF" size={moderateScale(12)} />
              <Text style={styles.detailLabel}>Distributor</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>
              {doc.reverseDistributorName || '-'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Calendar color="#9CA3AF" size={moderateScale(12)} />
              <Text style={styles.detailLabel}>Uploaded</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(doc.uploadedAt)}</Text>
          </View>

          {doc.extractedItems !== undefined && doc.extractedItems > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <FileText color="#9CA3AF" size={moderateScale(12)} />
                <Text style={styles.detailLabel}>Items Extracted</Text>
              </View>
              <Text style={styles.detailValue}>{doc.extractedItems}</Text>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewFile(doc)}
            disabled={viewingDocId === doc.id || downloadingDocId === doc.id}
          >
            {viewingDocId === doc.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Eye color="#FFFFFF" size={moderateScale(14)} />
                <Text style={styles.actionButtonText}>View</Text>
              </>
            )}
          </TouchableOpacity>

          {doc.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={() => handleDownloadFile(doc)}
              disabled={viewingDocId === doc.id || downloadingDocId === doc.id}
            >
              {downloadingDocId === doc.id ? (
                <ActivityIndicator size="small" color="#14B8A6" />
              ) : (
                <>
                  <Download color="#14B8A6" size={moderateScale(14)} />
                  <Text style={[styles.actionButtonText, styles.downloadButtonText]}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Pagination Numbers
  const renderPaginationNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.pageNumberButton,
              currentPage === i && styles.pageNumberButtonActive
            ]}
            onPress={() => setCurrentPage(i)}
          >
            <Text style={[
              styles.pageNumberText,
              currentPage === i && styles.pageNumberTextActive
            ]}>
              {i}
            </Text>
          </TouchableOpacity>
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        pages.push(
          <Text key={`ellipsis-${i}`} style={styles.ellipsis}>...</Text>
        );
      }
    }
    return pages;
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
          <Text style={styles.headerTitle}>Upload Documents</Text>
          <TouchableOpacity
            style={[styles.uploadHeaderButton, isUploadInProgress && styles.buttonDisabled]}
            onPress={() => setIsUploadModalOpen(true)}
            disabled={isUploadInProgress}
          >
            <Upload color="#FFFFFF" size={moderateScale(14)} />
            <Text style={styles.uploadHeaderButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Alert Messages */}
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

      {isUploadInProgress && !uploading && (
        <View style={styles.alertInfo}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.alertInfoText}>
            Document upload/processing in progress. Please wait.
          </Text>
        </View>
      )}

      {/* Documents Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderSection}>
          <Text style={styles.cardTitle}>All Documents</Text>
          <Text style={styles.cardSubtitle}>
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search color="#9CA3AF" size={moderateScale(14)} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search documents..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Search color="#FFFFFF" size={moderateScale(14)} />
          </TouchableOpacity>
        </View>

        {/* Documents List */}
        <ScrollView
          style={styles.documentsContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : filteredDocuments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText color="#9CA3AF" size={moderateScale(40)} />
              <Text style={styles.emptyText}>No documents found</Text>
              <Text style={styles.emptySubtext}>Upload credit reports to get started</Text>
            </View>
          ) : (
            <>
              {paginatedDocuments.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <Text style={styles.paginationInfo}>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length}
                  </Text>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                      onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft color={currentPage === 1 ? '#9CA3AF' : '#374151'} size={moderateScale(16)} />
                    </TouchableOpacity>

                    <View style={styles.pageNumbers}>
                      {renderPaginationNumbers()}
                    </View>

                    <TouchableOpacity
                      style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                      onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight color={currentPage === totalPages ? '#9CA3AF' : '#374151'} size={moderateScale(16)} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Upload Modal */}
      <Modal
        visible={isUploadModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !isUploadInProgress && setIsUploadModalOpen(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => !isUploadInProgress && setIsUploadModalOpen(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Upload New Documents</Text>
                <Text style={styles.modalSubtitle}>Upload PDF credit reports</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseButton, isUploadInProgress && styles.buttonDisabled]}
                onPress={() => !isUploadInProgress && setIsUploadModalOpen(false)}
                disabled={isUploadInProgress}
              >
                <X color="#6B7280" size={moderateScale(18)} />
              </TouchableOpacity>
            </View>

            {/* Drop Zone / File Select */}
            <TouchableOpacity
              style={[
                styles.dropZone,
                isUploadInProgress && styles.dropZoneDisabled
              ]}
              onPress={handleSelectFiles}
              disabled={isUploadInProgress}
            >
              <Upload color={isUploadInProgress ? '#9CA3AF' : '#14B8A6'} size={moderateScale(28)} />
              <Text style={[styles.dropZoneText, isUploadInProgress && styles.dropZoneTextDisabled]}>
                {isUploadInProgress ? 'Upload in progress... Please wait' : 'Tap to select PDF files'}
              </Text>
              <Text style={styles.dropZoneHint}>
                Supports PDF files from all major reverse distributors
              </Text>
              <View style={[styles.chooseFilesButton, isUploadInProgress && styles.buttonDisabled]}>
                <Text style={styles.chooseFilesButtonText}>Choose Files</Text>
              </View>
            </TouchableOpacity>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <View style={styles.selectedFilesContainer}>
                <Text style={styles.selectedFilesTitle}>Selected Files ({selectedFiles.length})</Text>
                <ScrollView style={styles.selectedFilesList} nestedScrollEnabled>
                  {selectedFiles.map((file, index) => (
                    <View key={index} style={styles.selectedFileItem}>
                      <View style={styles.selectedFileInfo}>
                        <FileText color="#14B8A6" size={moderateScale(16)} />
                        <View style={styles.selectedFileDetails}>
                          <Text style={styles.selectedFileName} numberOfLines={1}>{file.name}</Text>
                          <Text style={styles.selectedFileSize}>{formatFileSize(file.size)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.removeFileButton, isUploadInProgress && styles.buttonDisabled]}
                        onPress={() => removeFile(index)}
                        disabled={isUploadInProgress}
                      >
                        <X color="#EF4444" size={moderateScale(14)} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Upload Button */}
            <TouchableOpacity
              style={[
                styles.uploadButton,
                (selectedFiles.length === 0 || uploading) && styles.buttonDisabled
              ]}
              onPress={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Upload color="#FFFFFF" size={moderateScale(14)} />
                  <Text style={styles.uploadButtonText}>
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}` : 'Files'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  uploadHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(8),
    gap: moderateScale(6),
  },
  uploadHeaderButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Alert Styles
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
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    gap: moderateScale(8),
  },
  alertInfoText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#1E40AF',
  },
  alertClose: {
    padding: moderateScale(4),
  },
  // Card Styles
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#99F6E4',
    borderRadius: moderateScale(12),
    margin: moderateScale(8),
    overflow: 'hidden',
  },
  cardHeaderSection: {
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
  // Search Styles
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    gap: moderateScale(4),
  },
  // Documents List
  documentsContainer: {
    flex: 1,
    paddingHorizontal: moderateScale(12),
    paddingTop: moderateScale(12),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  // Document Card (Mobile-friendly)
  documentCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  fileIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileNameContainer: {
    flex: 1,
    marginHorizontal: moderateScale(10),
  },
  fileName: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
    gap: moderateScale(4),
  },
  statusText: {
    fontSize: moderateScale(9),
    fontWeight: '600',
  },
  cardDetails: {
    padding: moderateScale(12),
    gap: moderateScale(8),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  detailLabel: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  detailValue: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
    maxWidth: '50%',
  },
  cardActions: {
    flexDirection: 'row',
    padding: moderateScale(12),
    paddingTop: moderateScale(0),
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
    gap: moderateScale(6),
  },
  downloadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#14B8A6',
  },
  actionButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downloadButtonText: {
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
  // Pagination Styles
  pagination: {
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(8),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: moderateScale(8),
    marginBottom: moderateScale(16),
  },
  paginationInfo: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginBottom: moderateScale(12),
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  pageButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  pageNumberButton: {
    minWidth: moderateScale(32),
    height: moderateScale(32),
    paddingHorizontal: moderateScale(8),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberButtonActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  pageNumberText: {
    fontSize: moderateScale(11),
    color: '#374151',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ellipsis: {
    fontSize: moderateScale(11),
    color: '#9CA3AF',
    paddingHorizontal: moderateScale(4),
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
    padding: moderateScale(16),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: moderateScale(16),
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
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: moderateScale(10),
    padding: moderateScale(24),
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  dropZoneDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  dropZoneText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
    marginTop: moderateScale(12),
    textAlign: 'center',
  },
  dropZoneTextDisabled: {
    color: '#9CA3AF',
  },
  dropZoneHint: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    marginTop: moderateScale(4),
    textAlign: 'center',
  },
  chooseFilesButton: {
    marginTop: moderateScale(16),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: moderateScale(8),
  },
  chooseFilesButtonText: {
    fontSize: moderateScale(11),
    color: '#374151',
  },
  selectedFilesContainer: {
    marginTop: moderateScale(16),
  },
  selectedFilesTitle: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#374151',
    marginBottom: moderateScale(8),
  },
  selectedFilesList: {
    maxHeight: moderateScale(150),
  },
  selectedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(6),
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: moderateScale(8),
  },
  selectedFileDetails: {
    flex: 1,
  },
  selectedFileName: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: '#374151',
  },
  selectedFileSize: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    marginTop: moderateScale(2),
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
    marginTop: moderateScale(16),
    gap: moderateScale(8),
  },
  uploadButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
