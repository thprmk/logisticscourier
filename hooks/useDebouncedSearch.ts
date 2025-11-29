import { useState, useCallback, useRef, useEffect } from 'react';

interface UseDebouncedSearchOptions {
  delay?: number;
  maxLength?: number;
  minLength?: number;
}

/**
 * Custom hook for debounced search with optimizations
 * Prevents excessive API calls and re-renders
 * 
 * @example
 * const { query, setQuery, isSearching } = useDebouncedSearch({
 *   delay: 300,
 *   maxLength: 100,
 *   minLength: 2
 * });
 */
export function useDebouncedSearch(options: UseDebouncedSearchOptions = {}) {
  const {
    delay = 300,
    maxLength = 100,
    minLength = 0,
  } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousQueryRef = useRef('');

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearch = useCallback((value: string) => {
    // Limit input length
    const sanitized = value.slice(0, maxLength).trim();
    
    // Update immediate query (for input)
    setQuery(sanitized);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip debounce if same as previous
    if (sanitized === previousQueryRef.current) {
      return;
    }

    // Show searching state
    setIsSearching(true);

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // Only update debounced query if meets minimum length
      if (sanitized.length >= minLength) {
        setDebouncedQuery(sanitized);
        previousQueryRef.current = sanitized;
      } else {
        setDebouncedQuery('');
        previousQueryRef.current = '';
      }
      setIsSearching(false);
    }, delay);
  }, [delay, maxLength, minLength]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    previousQueryRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    query,           // Immediate query for input value
    setQuery: handleSearch,
    debouncedQuery,  // Debounced query for filtering/API calls
    isSearching,     // Show loading state
    clearSearch,
  };
}
