import { useState, useEffect, useRef, useMemo } from 'react';
import { openF1Api } from '../utils/openf1Api';

type QueryParams = Record<string, string | number | boolean | undefined>;

interface UseOpenF1APIState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook for fetching data from OpenF1 API
 * Features:
 * - Automatic request deduplication (in-flight requests are cached)
 * - Error retry with exponential backoff (built into apiCall)
 * - Automatic refetch on dependency changes
 * - Type-safe response data
 * 
 * @param endpoint - The API endpoint to call (e.g., 'laps', 'car_data')
 * @param params - Optional query parameters
 * @returns Object with data, loading, and error states
 * 
 * @example
 * ```ts
 * const { data: laps, loading, error } = useOpenF1API('laps', { session_key: 9161 });
 * ```
 */
export function useOpenF1API<T>(
  endpoint: keyof typeof openF1Api | string,
  params?: QueryParams
): UseOpenF1APIState<T> {
  const [state, setState] = useState<UseOpenF1APIState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Track mounted status to prevent state updates on unmounted component
  const isMountedRef = useRef(true);
  
  // Memoize params string for dependency tracking
  const paramsString = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Get the appropriate API function
        const apiFunction = (openF1Api as Record<string, unknown>)[endpoint];
        
        if (!apiFunction || typeof apiFunction !== 'function') {
          throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        const data = await (apiFunction as (params?: QueryParams) => Promise<T[]>)(params);

        if (isMountedRef.current) {
          setState({ data, loading: false, error: null });
        }
      } catch (err) {
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState({ data: null, loading: false, error });
        }
      }
    };

    fetchData();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [endpoint, params, paramsString]);

  return state;
}
