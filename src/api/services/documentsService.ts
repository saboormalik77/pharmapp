/**
 * Documents API Service
 * Matches pharma-collect-ui documentsService exactly
 */

import { apiClient, storage } from '../client';

export interface UploadedDocument {
  id: string;
  pharmacyId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl?: string;
  reverseDistributorId: string;
  reverseDistributorName: string;
  source: 'manual_upload' | 'email' | 'api';
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review';
  uploadedAt: string;
  processedAt?: string;
  errorMessage?: string;
  extractedItems: number;
  totalCreditAmount?: number;
  processingProgress?: number;
}

export interface DocumentsFilters {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const documentsService = {
  /**
   * Get all documents
   * GET /documents
   */
  async getDocuments(filters?: DocumentsFilters): Promise<{ documents: UploadedDocument[]; total: number }> {
    const response = await apiClient.get<any[]>('/documents', filters);
    if (response.status === 'success' && response.data) {
      const documents = (Array.isArray(response.data) ? response.data : []).map((doc: any) => ({
        id: doc.id,
        pharmacyId: doc.pharmacy_id,
        fileName: doc.file_name || '',
        fileSize: doc.file_size || 0,
        fileType: doc.file_type || 'application/pdf',
        fileUrl: doc.file_url,
        reverseDistributorId: doc.reverse_distributor_id || '',
        reverseDistributorName: doc.reverse_distributor_name || 'Unknown Distributor',
        source: doc.source || 'manual_upload',
        status: doc.status || 'completed',
        uploadedAt: doc.uploaded_at || doc.created_at || new Date().toISOString(),
        processedAt: doc.processed_at,
        errorMessage: doc.error_message,
        extractedItems: doc.extracted_items || 0,
        totalCreditAmount: doc.total_credit_amount,
        processingProgress: doc.processing_progress,
      }));
      return {
        documents,
        total: response.total || documents.length,
      };
    }
    throw new Error(response.message || 'Failed to fetch documents');
  },

  /**
   * Get document by ID
   * GET /documents/:id
   */
  async getDocumentById(id: string): Promise<UploadedDocument> {
    const response = await apiClient.get<any>(`/documents/${id}`);
    if (response.status === 'success' && response.data) {
      const doc = response.data;
      return {
        id: doc.id,
        pharmacyId: doc.pharmacy_id,
        fileName: doc.file_name || '',
        fileSize: doc.file_size || 0,
        fileType: doc.file_type || 'application/pdf',
        fileUrl: doc.file_url,
        reverseDistributorId: doc.reverse_distributor_id || '',
        reverseDistributorName: doc.reverse_distributor_name || 'Unknown Distributor',
        source: doc.source || 'manual_upload',
        status: doc.status || 'completed',
        uploadedAt: doc.uploaded_at || doc.created_at || new Date().toISOString(),
        processedAt: doc.processed_at,
        errorMessage: doc.error_message,
        extractedItems: doc.extracted_items || 0,
        totalCreditAmount: doc.total_credit_amount,
        processingProgress: doc.processing_progress,
      };
    }
    throw new Error(response.message || 'Failed to fetch document');
  },

  /**
   * Delete a document
   * DELETE /documents/:id
   */
  async deleteDocument(id: string): Promise<void> {
    const response = await apiClient.delete(`/documents/${id}`);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete document');
    }
  },
};

