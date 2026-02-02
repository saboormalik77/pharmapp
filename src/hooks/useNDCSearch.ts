/**
 * useNDCSearch - Optimized NDC Search Hook
 * 
 * Returns data matching /api/optimization/recommendations format
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  searchNDCLocal,
  updateNDCCache,
  initializeNDCCache,
  isCacheStale,
  hasCacheData,
  getCacheStats,
  NDCPricingData,
  AlternativeDistributor
} from '../store/ndcCacheStore';
import { ndcSearchService } from '../api/services/ndcSearchService';

// Re-export types
export type { NDCPricingData, AlternativeDistributor };

interface UseNDCSearchOptions {
  debounceMs?: number;
  minSearchLength?: number;
  autoInitialize?: boolean;
  autoSync?: boolean;
}

interface UseNDCSearchResult {
  results: NDCPricingData[];
  isLoading: boolean;
  error: string | null;
  search: (term: string) => void;
  clearResults: () => void;
  isFromCache: boolean;
  cacheStats: { size: number; uniqueNdcs: number; isInitialized: boolean };
  refreshCache: () => Promise<void>;
}

export function useNDCSearch(options: UseNDCSearchOptions = {}): UseNDCSearchResult {
  const {
    debounceMs = 150,
    minSearchLength = 2,
    autoInitialize = true,
    autoSync = true
  } = options;

  const [results, setResults] = useState<NDCPricingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheStats, setCacheStats] = useState({ size: 0, uniqueNdcs: 0, isInitialized: false });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchRef = useRef<string>('');

  useEffect(() => {
    if (autoInitialize) {
      initializeCache();
    }
  }, [autoInitialize]);

  useEffect(() => {
    if (autoSync) {
      checkAndSyncCache();
    }
  }, [autoSync]);

  const initializeCache = async () => {
    try {
      await initializeNDCCache();
      setCacheStats(getCacheStats());
    } catch (err) {
      console.warn('Failed to initialize NDC cache:', err);
    }
  };

  const checkAndSyncCache = async () => {
    try {
      const stale = await isCacheStale();
      if (stale || !hasCacheData()) {
        console.log('📡 Cache is stale, syncing...');
        await syncCacheFromAPI();
      }
    } catch (err) {
      console.warn('Failed to check/sync cache:', err);
    }
  };

  const syncCacheFromAPI = async () => {
    try {
      let offset = 0;
      const limit = 5000;
      let hasMore = true;

      while (hasMore) {
        const response = await ndcSearchService.getNDCIndex(limit, offset);
        
        if (response.data && response.data.length > 0) {
          // Transform API response to match expected format
          // IMPORTANT: Sort distributors by price (highest first) to find recommended distributor
          const transformedData = response.data.map(item => {
            // Calculate main price for each distributor (fullPrice > 0 ? fullPrice : partialPrice)
            const distributorsWithPrice = (item.distributors || []).map(dist => ({
              ...dist,
              price: (dist.fullPrice || 0) > 0 ? dist.fullPrice : (dist.partialPrice || 0)
            }));
            
            // Sort by price descending (highest = best for returns)
            distributorsWithPrice.sort((a, b) => (b.price || 0) - (a.price || 0));
            
            // Best distributor is the first one
            const bestDist = distributorsWithPrice[0];
            
            return {
              ...item,
              distributors: distributorsWithPrice,
              // Recommended distributor is the one with highest price
              recommendedDistributor: bestDist?.name || 'Unknown',
              recommendedDistributorId: bestDist?.id,
              // fullPricePerUnit and partialPricePerUnit from BEST distributor (not bestFullPrice/bestPartialPrice)
              fullPricePerUnit: bestDist?.fullPrice || 0,
              partialPricePerUnit: bestDist?.partialPrice || 0,
              alternativeDistributors: distributorsWithPrice.slice(1)
            };
          });
          
          await updateNDCCache(transformedData);
          offset += response.data.length;
          hasMore = response.data.length === limit && offset < response.total;
        } else {
          hasMore = false;
        }
      }

      setCacheStats(getCacheStats());
      console.log(`✅ Cache synced: ${offset} total records`);
    } catch (err) {
      console.warn('Failed to sync cache from API:', err);
    }
  };

  const search = useCallback((term: string) => {
    lastSearchRef.current = term;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!term || term.length < minSearchLength) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      setIsFromCache(false);
      return;
    }

    setError(null);

    // Search local cache first (instant)
    const localResults = searchNDCLocal(term);
    
    if (localResults.length > 0) {
      setResults(localResults);
      setIsFromCache(true);
      setIsLoading(false);
      
      // Background API search with longer debounce
      debounceRef.current = setTimeout(async () => {
        await searchAPI(term, true);
      }, debounceMs * 2);
      
      return;
    }

    // No local results - search API
    setIsLoading(true);
    setIsFromCache(false);

    debounceRef.current = setTimeout(async () => {
      await searchAPI(term, false);
    }, debounceMs);
  }, [debounceMs, minSearchLength]);

  const searchAPI = async (term: string, isBackgroundUpdate: boolean) => {
    try {
      abortControllerRef.current = new AbortController();

      const response = await ndcSearchService.searchNDC(term, 50);

      if (term !== lastSearchRef.current) {
        return;
      }

      if (response.results && response.results.length > 0) {
        // Transform results to match expected format
        // IMPORTANT: Sort distributors by price (highest first) to find recommended distributor
        const transformedResults = response.results.map(item => {
          // Calculate main price for each distributor (fullPrice > 0 ? fullPrice : partialPrice)
          const distributorsWithPrice = (item.distributors || []).map(dist => ({
            ...dist,
            price: (dist.fullPrice || 0) > 0 ? dist.fullPrice : (dist.partialPrice || 0)
          }));
          
          // Sort by price descending (highest = best for returns)
          distributorsWithPrice.sort((a, b) => (b.price || 0) - (a.price || 0));
          
          // Best distributor is the first one
          const bestDist = distributorsWithPrice[0];
          
          return {
            ...item,
            distributors: distributorsWithPrice,
            // Recommended distributor is the one with highest price
            recommendedDistributor: item.recommendedDistributor || bestDist?.name || 'Unknown',
            recommendedDistributorId: item.recommendedDistributorId || bestDist?.id,
            // fullPricePerUnit and partialPricePerUnit from BEST distributor
            fullPricePerUnit: item.fullPricePerUnit || bestDist?.fullPrice || 0,
            partialPricePerUnit: item.partialPricePerUnit || bestDist?.partialPrice || 0,
            alternativeDistributors: item.alternativeDistributors || distributorsWithPrice.slice(1)
          };
        });

        if (isBackgroundUpdate && results.length > 0) {
          if (transformedResults.length > results.length) {
            setResults(transformedResults);
          }
        } else {
          setResults(transformedResults);
        }

        setIsFromCache(false);
        await updateNDCCache(transformedResults);
        setCacheStats(getCacheStats());
      } else if (!isBackgroundUpdate) {
        setResults([]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        if (!isBackgroundUpdate) {
          setError(err.message || 'Search failed');
          if (!isFromCache) {
            setResults([]);
          }
        }
      }
    } finally {
      if (!isBackgroundUpdate) {
        setIsLoading(false);
      }
    }
  };

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setIsFromCache(false);
    lastSearchRef.current = '';
  }, []);

  const refreshCache = useCallback(async () => {
    setIsLoading(true);
    try {
      await syncCacheFromAPI();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
    isFromCache,
    cacheStats,
    refreshCache
  };
}
