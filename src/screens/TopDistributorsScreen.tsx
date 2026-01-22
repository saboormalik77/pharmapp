import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Search,
  AlertCircle,
} from 'lucide-react-native';
import { distributorsService, TopDistributor } from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export function TopDistributorsScreen() {
  const [distributors, setDistributors] = useState<TopDistributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDistributors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await distributorsService.getTopDistributors();
      setDistributors(response.distributors);
    } catch (err: any) {
      setError(err.message || 'Failed to load distributors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistributors();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDistributors();
    setRefreshing(false);
  };

  // Filter distributors based on search
  const filteredDistributors = distributors.filter(dist =>
    dist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dist.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DistributorCard = ({ distributor }: { distributor: TopDistributor }) => {
    return (
      <View style={styles.distributorCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Building2 color="#14B8A6" size={moderateScale(18)} />
          </View>
          <View style={styles.distributorMainInfo}>
            <Text style={styles.distributorName}>{distributor.name}</Text>
          </View>
        </View>

        <View style={styles.contactInfo}>
          {distributor.email && (
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactText}>{distributor.email}</Text>
            </View>
          )}
          {distributor.phone && (
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Phone:</Text>
              <Text style={styles.contactText}>{distributor.phone}</Text>
            </View>
          )}
          {distributor.location && (
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>Location:</Text>
              <Text style={styles.contactText}>{distributor.location}</Text>
            </View>
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
          <Text style={styles.headerTitle}>Top Distributors</Text>
        </View>
      </LinearGradient>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle color="#DC2626" size={moderateScale(14)} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search color="#9CA3AF" size={moderateScale(16)} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search distributors..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14B8A6" />
            <Text style={styles.loadingText}>Loading top distributors...</Text>
          </View>
        ) : filteredDistributors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle color="#9CA3AF" size={moderateScale(40)} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No distributors found matching your search.' : 'No distributors found'}
            </Text>
          </View>
        ) : (
          <View style={styles.distributorsGrid}>
            {filteredDistributors.map((distributor) => (
              <DistributorCard key={distributor.id} distributor={distributor} />
            ))}
          </View>
        )}
        
        <View style={styles.bottomSpacer} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#DC2626',
  },
  searchContainer: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(8),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(10),
    borderWidth: 2,
    borderColor: '#99F6E4',
    gap: moderateScale(8),
  },
  searchInput: {
    flex: 1,
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#374151',
  },
  content: {
    flex: 1,
    paddingHorizontal: moderateScale(8),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
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
    fontSize: moderateScale(12),
    color: '#6B7280',
    textAlign: 'center',
  },
  distributorsGrid: {
    gap: moderateScale(10),
  },
  distributorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    borderWidth: 2,
    borderColor: '#99F6E4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(10),
  },
  iconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(10),
  },
  distributorMainInfo: {
    flex: 1,
  },
  distributorName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#1F2937',
  },
  contactInfo: {
    gap: moderateScale(6),
  },
  contactItem: {
    flexDirection: 'row',
  },
  contactLabel: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    width: moderateScale(60),
  },
  contactText: {
    fontSize: moderateScale(11),
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  bottomSpacer: {
    height: moderateScale(20),
  },
});
