/**
 * NDC Cache Store - Local Caching for Instant Search
 * 
 * Types match /api/optimization/recommendations response format exactly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Types - Matching optimization API response exactly
// ============================================================

export interface AlternativeDistributor {
  id?: string;
  name: string;
  price?: number;
  fullPrice: number;
  partialPrice: number;
  difference?: number;
  available?: boolean;
  email?: string;
  phone?: string;
  location?: string;
}

export interface NDCPricingData {
  // Core fields (matching Recommendation interface)
  ndc: string;
  ndcNormalized: string;
  productName: string;
  
  // Recommended distributor (first/best one)
  recommendedDistributor: string;
  recommendedDistributorId?: string;
  
  // Prices per unit (for search mode)
  fullPricePerUnit: number;
  partialPricePerUnit: number;
  
  // All distributors
  distributors: AlternativeDistributor[];
  alternativeDistributors: AlternativeDistributor[];
  
  // Best prices across all distributors
  bestFullPrice: number;
  bestPartialPrice: number;
  
  // Cache metadata
  lastUpdated?: number;
}

// ============================================================
// Constants
// ============================================================

const CACHE_KEY = '@ndc_pricing_data';
const CACHE_EXPIRY_KEY = '@ndc_cache_expiry';
const CACHE_VERSION_KEY = '@ndc_cache_version';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CURRENT_VERSION = 2; // Bumped for new format

// ============================================================
// In-Memory HashMap for O(1) Lookups
// ============================================================

const ndcHashMap = new Map<string, NDCPricingData>();
const productNameIndex = new Map<string, Set<string>>();

let isInitialized = false;
let isInitializing = false;

// ============================================================
// Helper Functions
// ============================================================

function tokenizeProductName(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2);
}

function indexProductName(ndcNormalized: string, productName: string): void {
  const tokens = tokenizeProductName(productName);
  tokens.forEach(token => {
    if (!productNameIndex.has(token)) {
      productNameIndex.set(token, new Set());
    }
    productNameIndex.get(token)!.add(ndcNormalized);
  });
}

function removeFromIndex(ndcNormalized: string): void {
  productNameIndex.forEach((ndcSet) => {
    ndcSet.delete(ndcNormalized);
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Initialize cache from storage
 */
export async function initializeNDCCache(): Promise<void> {
  if (isInitialized || isInitializing) return;
  isInitializing = true;

  try {
    const version = await AsyncStorage.getItem(CACHE_VERSION_KEY);
    if (version !== String(CURRENT_VERSION)) {
      console.log('📦 NDC Cache version mismatch, clearing...');
      await clearNDCCache();
      await AsyncStorage.setItem(CACHE_VERSION_KEY, String(CURRENT_VERSION));
      isInitialized = true;
      isInitializing = false;
      return;
    }

    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const data: NDCPricingData[] = JSON.parse(cachedData);
      
      data.forEach(item => {
        ndcHashMap.set(item.ndcNormalized, item);
        const altKey = item.ndc.replace(/-/g, '').toLowerCase();
        if (altKey !== item.ndcNormalized) {
          ndcHashMap.set(altKey, item);
        }
        if (item.productName) {
          indexProductName(item.ndcNormalized, item.productName);
        }
      });

      console.log(`📦 Loaded ${ndcHashMap.size} NDC records into memory`);
    }

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing NDC cache:', error);
    isInitialized = true;
  } finally {
    isInitializing = false;
  }
}

/**
 * Search NDCs locally - instant results
 */
export function searchNDCLocal(searchTerm: string): NDCPricingData[] {
  if (!searchTerm || searchTerm.length < 2) return [];

  const normalizedSearch = searchTerm.replace(/-/g, '').toLowerCase();
  const results: NDCPricingData[] = [];
  const addedNdcs = new Set<string>();

  // 1. Exact match (O(1))
  const exactMatch = ndcHashMap.get(normalizedSearch);
  if (exactMatch && !addedNdcs.has(exactMatch.ndcNormalized)) {
    results.push(exactMatch);
    addedNdcs.add(exactMatch.ndcNormalized);
  }

  // 2. Product name search
  const searchTokens = tokenizeProductName(searchTerm);
  if (searchTokens.length > 0) {
    let matchingNdcs: Set<string> | null = null;
    
    for (const token of searchTokens) {
      const tokenMatches = new Set<string>();
      productNameIndex.forEach((ndcSet, indexedWord) => {
        if (indexedWord.includes(token) || token.includes(indexedWord)) {
          ndcSet.forEach(ndc => tokenMatches.add(ndc));
        }
      });

      if (matchingNdcs === null) {
        matchingNdcs = tokenMatches;
      } else {
        matchingNdcs = new Set([...matchingNdcs].filter(x => tokenMatches.has(x)));
      }
    }

    if (matchingNdcs) {
      matchingNdcs.forEach(ndcNormalized => {
        if (!addedNdcs.has(ndcNormalized)) {
          const item = ndcHashMap.get(ndcNormalized);
          if (item) {
            results.push(item);
            addedNdcs.add(ndcNormalized);
          }
        }
      });
    }
  }

  // 3. NDC prefix/contains match
  if (results.length < 50) {
    ndcHashMap.forEach((value, key) => {
      if (!addedNdcs.has(value.ndcNormalized)) {
        if (
          key.includes(normalizedSearch) ||
          value.ndc.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          results.push(value);
          addedNdcs.add(value.ndcNormalized);
        }
      }
    });
  }

  // Sort: exact matches first, then by best price
  results.sort((a, b) => {
    const aExact = a.ndcNormalized === normalizedSearch;
    const bExact = b.ndcNormalized === normalizedSearch;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return (b.bestFullPrice || 0) - (a.bestFullPrice || 0);
  });

  return results.slice(0, 50);
}

/**
 * Update cache with new data
 * IMPORTANT: Distributors should already be sorted by price (highest first)
 * The first distributor is the recommended one (best price for returns)
 */
export async function updateNDCCache(data: NDCPricingData[]): Promise<void> {
  if (!data || data.length === 0) return;

  const now = Date.now();

  data.forEach(item => {
    item.lastUpdated = now;
    
    // If distributors are not sorted, sort them now
    // Sort by main price: fullPrice > 0 ? fullPrice : partialPrice (highest first)
    if (item.distributors && item.distributors.length > 0) {
      item.distributors.sort((a, b) => {
        const priceA = (a.fullPrice || 0) > 0 ? a.fullPrice : (a.partialPrice || 0);
        const priceB = (b.fullPrice || 0) > 0 ? b.fullPrice : (b.partialPrice || 0);
        return (priceB || 0) - (priceA || 0);
      });
    }
    
    // Best distributor is the first one (highest price)
    const bestDist = item.distributors?.[0];
    
    // Set recommended distributor from BEST (first) distributor
    if (!item.recommendedDistributor && bestDist) {
      item.recommendedDistributor = bestDist.name;
      item.recommendedDistributorId = bestDist.id;
    }
    
    // Set fullPricePerUnit and partialPricePerUnit from BEST distributor (not bestFullPrice/bestPartialPrice)
    if (item.fullPricePerUnit === undefined && bestDist) {
      item.fullPricePerUnit = bestDist.fullPrice || 0;
    }
    if (item.partialPricePerUnit === undefined && bestDist) {
      item.partialPricePerUnit = bestDist.partialPrice || 0;
    }
    
    // Alternative distributors are all except the first (best)
    if (!item.alternativeDistributors) {
      item.alternativeDistributors = item.distributors?.slice(1) || [];
    }
    
    const existingItem = ndcHashMap.get(item.ndcNormalized);
    if (existingItem && existingItem.productName) {
      removeFromIndex(item.ndcNormalized);
    }
    
    ndcHashMap.set(item.ndcNormalized, item);
    const altKey = item.ndc.replace(/-/g, '').toLowerCase();
    if (altKey !== item.ndcNormalized) {
      ndcHashMap.set(altKey, item);
    }
    
    if (item.productName) {
      indexProductName(item.ndcNormalized, item.productName);
    }
  });

  persistCache();
}

async function persistCache(): Promise<void> {
  try {
    const uniqueItems = new Map<string, NDCPricingData>();
    ndcHashMap.forEach((value) => {
      uniqueItems.set(value.ndcNormalized, value);
    });

    const allData = Array.from(uniqueItems.values());
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(allData));
    await AsyncStorage.setItem(CACHE_EXPIRY_KEY, Date.now().toString());
    
    console.log(`💾 Persisted ${allData.length} NDC records to storage`);
  } catch (error) {
    console.error('Error persisting NDC cache:', error);
  }
}

export async function isCacheStale(): Promise<boolean> {
  try {
    const expiryStr = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
    if (!expiryStr) return true;
    const expiry = parseInt(expiryStr, 10);
    return Date.now() - expiry > CACHE_DURATION;
  } catch {
    return true;
  }
}

export async function clearNDCCache(): Promise<void> {
  ndcHashMap.clear();
  productNameIndex.clear();
  try {
    await AsyncStorage.multiRemove([CACHE_KEY, CACHE_EXPIRY_KEY]);
  } catch (error) {
    console.error('Error clearing NDC cache:', error);
  }
}

export function getCacheStats(): { 
  size: number; 
  uniqueNdcs: number;
  isInitialized: boolean;
} {
  const uniqueNdcs = new Set<string>();
  ndcHashMap.forEach((value) => {
    uniqueNdcs.add(value.ndcNormalized);
  });
  
  return {
    size: ndcHashMap.size,
    uniqueNdcs: uniqueNdcs.size,
    isInitialized
  };
}

export function getNDCByCode(ndc: string): NDCPricingData | null {
  const normalized = ndc.replace(/-/g, '').toLowerCase();
  return ndcHashMap.get(normalized) || null;
}

export function hasCacheData(): boolean {
  return ndcHashMap.size > 0;
}
