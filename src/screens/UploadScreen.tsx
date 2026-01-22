import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

interface UploadedFile {
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
}

export function UploadScreen() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const newFile: UploadedFile = {
          name: file.name,
          size: file.size || 0,
          status: 'uploading',
        };

        setUploadedFiles(prev => [...prev, newFile]);
        setIsUploading(true);

        // Simulate upload
        setTimeout(() => {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.name === file.name ? { ...f, status: 'success' } : f
            )
          );
          setIsUploading(false);
          Toast.show({
            type: 'success',
            text1: 'Upload Complete',
            text2: `${file.name} uploaded successfully`,
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: 'Failed to pick document',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handleFilePick}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <View style={styles.uploadIcon}>
            <Upload color="#14B8A6" size={40} />
          </View>
          <Text style={styles.uploadTitle}>Upload Documents</Text>
          <Text style={styles.uploadSubtitle}>
            Tap to select PDF, CSV, or Excel files
          </Text>
          <View style={styles.supportedFormats}>
            <Text style={styles.formatText}>Supported: PDF, CSV, XLSX</Text>
          </View>
        </TouchableOpacity>

        {uploadedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.sectionTitle}>Uploaded Files</Text>
            {uploadedFiles.map((file, index) => (
              <View key={index} style={styles.fileCard}>
                <View style={styles.fileIconContainer}>
                  <FileText color="#14B8A6" size={24} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                </View>
                <View style={styles.fileStatus}>
                  {file.status === 'uploading' && (
                    <ActivityIndicator size="small" color="#14B8A6" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle color="#10B981" size={24} />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle color="#EF4444" size={24} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What can you upload?</Text>
          <View style={styles.infoItem}>
            <FileText color="#6B7280" size={16} />
            <Text style={styles.infoText}>Purchase orders and invoices</Text>
          </View>
          <View style={styles.infoItem}>
            <FileText color="#6B7280" size={16} />
            <Text style={styles.infoText}>Inventory spreadsheets</Text>
          </View>
          <View style={styles.infoItem}>
            <FileText color="#6B7280" size={16} />
            <Text style={styles.infoText}>Return documents</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  supportedFormats: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  formatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  fileStatus: {
    marginLeft: 12,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
});

