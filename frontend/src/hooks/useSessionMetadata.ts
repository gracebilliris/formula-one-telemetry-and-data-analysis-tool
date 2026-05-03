import { useState, useEffect, useMemo } from 'react';
import type { Session, Meeting } from '../types/openf1';
import { cache } from '../utils/cache';
import { openF1Api } from '../utils/openf1Api';

interface SessionMetadata extends Session {
  meeting?: Meeting;
  displayName?: string;
}

interface UseSessionMetadataFilters {
  year?: number;
  gpName?: string;
  sessionType?: 'Practice' | 'Qualifying' | 'Race' | 'Sprint';
}

interface UseSessionMetadataState {
  sessions: SessionMetadata[];
  selectedSession: SessionMetadata | null;
  setSelectedSession: (session: SessionMetadata | null) => void;
  isLoading: boolean;
  error: Error | null;
  filters: UseSessionMetadataFilters;
  setFilters: (filters: UseSessionMetadataFilters) => void;
  filteredSessions: SessionMetadata[];
}

const SESSIONS_CACHE_KEY = 'sessions_metadata';
const MEETINGS_CACHE_KEY = 'meetings_metadata';

/**
 * Custom hook for browsing and searching available F1 sessions
 * Features:
 * - Browse all available sessions
 * - Filter by year, GP, and session type
 * - Cache session and meeting metadata
 * - Select individual sessions
 * - Type-safe session and meeting data
 * 
 * @returns Object with sessions, selected session, filters, and loading state
 * 
 * @example
 * ```ts
 * const { sessions, selectedSession, setSelectedSession, filters, setFilters, filteredSessions } = 
 *   useSessionMetadata();
 * 
 * // Filter by year and session type
 * setFilters({ year: 2024, sessionType: 'Race' });
 * 
 * // Select a session
 * const raceSession = filteredSessions[0];
 * setSelectedSession(raceSession);
 * ```
 */
export function useSessionMetadata(): UseSessionMetadataState {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<UseSessionMetadataFilters>({});

  // Fetch and cache sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to get from cache first
        let sessionsData = cache.get<Session[]>(SESSIONS_CACHE_KEY);
        let meetingsData = cache.get<Meeting[]>(MEETINGS_CACHE_KEY);

        // If not in cache, fetch from API
        if (!sessionsData) {
          sessionsData = await openF1Api.getSessions();
          cache.set(SESSIONS_CACHE_KEY, sessionsData);
        }

        if (!meetingsData) {
          meetingsData = await openF1Api.getMeetings();
          cache.set(MEETINGS_CACHE_KEY, meetingsData);
        }

        // Merge session and meeting data
        const enrichedSessions: SessionMetadata[] = sessionsData.map(session => {
          const meeting = meetingsData?.find(m => m.meeting_key === session.meeting_key);
          
          return {
            ...session,
            meeting,
            displayName: meeting 
              ? `${meeting.meeting_official_name} - ${session.session_name}`
              : session.session_name,
          };
        });

        // Sort by date descending (most recent first)
        enrichedSessions.sort((a, b) => 
          new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
        );

        setSessions(enrichedSessions);
        setIsLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);
        console.error('Failed to fetch sessions metadata:', error);
      }
    };

    fetchSessions();
  }, []);

  // Filter sessions based on active filters
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Filter by year
      if (filters.year && session.meeting?.year !== filters.year) {
        return false;
      }

      // Filter by GP name (case-insensitive substring match)
      if (filters.gpName) {
        const gpNameLower = filters.gpName.toLowerCase();
        const sessionGpName = (session.meeting?.meeting_official_name || '').toLowerCase();
        if (!sessionGpName.includes(gpNameLower)) {
          return false;
        }
      }

      // Filter by session type
      if (filters.sessionType && session.session_type !== filters.sessionType) {
        return false;
      }

      return true;
    });
  }, [sessions, filters]);

  return {
    sessions,
    selectedSession,
    setSelectedSession: (session: SessionMetadata | null) => setSelectedSession(session),
    isLoading,
    error,
    filters,
    setFilters: (newFilters: UseSessionMetadataFilters) => setFilters(newFilters),
    filteredSessions,
  };
}
