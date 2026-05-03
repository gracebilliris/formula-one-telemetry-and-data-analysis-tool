import axios from 'axios';
import type { 
  Driver, Session, Meeting, CarData, Location, Lap, Stint, 
  PitStop, Overtake, Weather, RaceControlMessage, Position, Interval 
} from '../types/openf1';

const API_BASE = 'https://api.openf1.org/v1';
const RATE_LIMIT_DELAY = 500; // 2 requests per second (safer limit)
let lastRequestTime = 0;
let requestQueue: Array<() => Promise<unknown>> = [];
let isProcessingQueue = false;

type QueryParams = Record<string, string | number | boolean | undefined>;

// Request deduplication map: stores in-flight requests by request signature
const inflightRequests = new Map<string, Promise<unknown>>();

const delay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate a cache key for deduplication
const generateRequestKey = (endpoint: string, params?: QueryParams): string => {
  const sortedParams = params 
    ? Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&')
    : '';
  return `${endpoint}?${sortedParams}`;
};

// Process request queue sequentially
const processQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      await request();
    }
  }
  
  isProcessingQueue = false;
};

// Retry logic with exponential backoff (with rate limiting)
const apiCallWithRetry = async <T>(
  endpoint: string,
  params?: QueryParams,
  retries = 3
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const request = async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
      }
      
      lastRequestTime = Date.now();
  
      let lastError: Error | unknown;
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await axios.get<T[]>(`${API_BASE}/${endpoint}`, { 
            params,
            timeout: 10000 
          });
          resolve(response.data);
          return;
        } catch (error: any) {
          lastError = error;
          // Extended backoff for 429 errors
          const backoffMultiplier = error?.response?.status === 429 ? 3 : 1;
          if (attempt < retries - 1) {
            const backoffDelay = Math.pow(2, attempt) * 1000 * backoffMultiplier;
            console.warn(
              `OpenF1 API Error (attempt ${attempt + 1}/${retries}): ${endpoint}. Retrying in ${backoffDelay}ms...`,
              error?.message
            );
            await delay(backoffDelay);
          }
        }
      }
      
      console.error(`OpenF1 API Error after ${retries} retries: ${endpoint}`, lastError);
      reject(lastError);
    };
    requestQueue.push(request);
    processQueue();
  });
};

// Main API call with deduplication
const apiCall = async <T>(endpoint: string, params?: QueryParams): Promise<T[]> => {
  const requestKey = generateRequestKey(endpoint, params);
  
  // Return cached in-flight request if it exists
  if (inflightRequests.has(requestKey)) {
    return inflightRequests.get(requestKey)! as Promise<T[]>;
  }
  
  // Create new request and cache it
  const promise = apiCallWithRetry<T>(endpoint, params);
  inflightRequests.set(requestKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    // Remove from in-flight cache after completion
    inflightRequests.delete(requestKey);
  }
};

/**
 * Fetches all pages of data from a paginated endpoint
 * OpenF1 API returns paginated results; this function handles fetching all pages
 */
const getAllPages = async <T>(
  endpoint: string,
  params?: QueryParams,
  pageSize: number = 1000
): Promise<T[]> => {
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const pageParams = { ...params, offset, limit: pageSize };
    const pageData = await apiCall<T>(endpoint, pageParams);
    
    if (pageData.length === 0) {
      hasMore = false;
    } else {
      allData.push(...pageData);
      offset += pageData.length;
      // If we got fewer items than the page size, we've reached the end
      if (pageData.length < pageSize) {
        hasMore = false;
      }
    }
  }

  return allData;
};

interface BatchRequest {
  endpoint: string;
  params?: QueryParams;
  key: string;
}

/**
 * Batch multiple API requests with rate limit awareness
 * Returns an object with results keyed by the provided keys
 */
const batch = async (
  requests: BatchRequest[]
): Promise<Record<string, unknown>> => {
  const results: Record<string, unknown> = {};
  
  // Process requests sequentially to respect rate limits
  for (const request of requests) {
    try {
      const data = await apiCall(request.endpoint, request.params);
      results[request.key] = data;
    } catch (error) {
      console.error(`Batch request failed for ${request.key}:`, error);
      results[request.key] = null;
    }
  }
  
  return results;
};

export const openF1Api = {
  // Driver endpoints
  getDrivers: (params?: QueryParams) => apiCall<Driver>('drivers', params),
  
  // Session endpoints
  getSessions: (params?: QueryParams) => apiCall<Session>('sessions', params),
  
  // Meeting endpoints
  getMeetings: (params?: QueryParams) => apiCall<Meeting>('meetings', params),
  
  // Telemetry endpoints
  getCarData: (params?: QueryParams) => apiCall<CarData>('car_data', params),
  getLocation: (params?: QueryParams) => apiCall<Location>('location', params),
  getLaps: (params?: QueryParams) => apiCall<Lap>('laps', params),
  getStints: (params?: QueryParams) => apiCall<Stint>('stints', params),
  getPitStops: (params?: QueryParams) => apiCall<PitStop>('pit', params),
  
  // Race data endpoints
  getOvertakes: (params?: QueryParams) => apiCall<Overtake>('overtakes', params),
  getWeather: (params?: QueryParams) => apiCall<Weather>('weather', params),
  getRaceControl: (params?: QueryParams) => apiCall<RaceControlMessage>('race_control', params),
  getPositions: (params?: QueryParams) => apiCall<Position>('position', params),
  getIntervals: (params?: QueryParams) => apiCall<Interval>('intervals', params),
  
  // Utility functions
  getAllPages,
  batch,
};
