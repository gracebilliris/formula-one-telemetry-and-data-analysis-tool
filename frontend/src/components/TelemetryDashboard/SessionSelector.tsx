import React, { useState, useEffect } from 'react';
import type { Session } from '../../types/openf1';
import { openF1Api } from '../../utils/openf1Api';

export interface SessionSelectorProps {
  onSessionSelect: (sessionKey: number) => void;
  selectedSessionKey?: number;
}

interface SessionWithMeeting extends Session {
  circuitName?: string;
  meetingLocation?: string;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({
  onSessionSelect,
  selectedSessionKey,
}) => {
  const [sessions, setSessions] = useState<SessionWithMeeting[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedGrandPrix, setSelectedGrandPrix] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('');

  // Extract unique years
  const years = Array.from(
    { length: 4 },
    (_, i) => new Date().getFullYear() - i
  ).sort((a, b) => b - a);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionsData, meetingsData] = await Promise.all([
          openF1Api.getSessions(),
          openF1Api.getMeetings(),
        ]);

        // Merge sessions with meeting info
        const enrichedSessions: SessionWithMeeting[] = sessionsData.map(
          (session) => {
            const meeting = meetingsData.find(
              (m) => m.meeting_key === session.meeting_key
            );
            return {
              ...session,
              circuitName: meeting?.circuit_short_name,
              meetingLocation: meeting?.meeting_location,
            };
          }
        );

        setSessions(enrichedSessions);
        setError(null);
      } catch (err) {
        setError('Failed to load sessions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter sessions based on selected filters
  useEffect(() => {
    let filtered = sessions;

    // Filter by year
    if (selectedYear) {
      filtered = filtered.filter((s) => {
        const year = new Date(s.date_start).getFullYear();
        return year === selectedYear;
      });
    }

    // Filter by Grand Prix (meeting location)
    if (selectedGrandPrix) {
      filtered = filtered.filter(
        (s) => s.meetingLocation === selectedGrandPrix
      );
    }

    // Filter by session type
    if (selectedSessionType) {
      filtered = filtered.filter((s) => s.session_type === selectedSessionType);
    }

    // Sort by date descending
    filtered.sort(
      (a, b) =>
        new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
    );

    setFilteredSessions(filtered);
  }, [sessions, selectedYear, selectedGrandPrix, selectedSessionType]);

  // Get unique Grand Prix names for the selected year
  const grandPrixOptions = Array.from(
    new Set(
      sessions
        .filter((s) => new Date(s.date_start).getFullYear() === selectedYear)
        .map((s) => s.meetingLocation)
        .filter(Boolean)
    )
  ).sort();

  const sessionTypes: Array<Session['session_type']> = [
    'Practice',
    'Qualifying',
    'Race',
    'Sprint',
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Select Session</h2>
        <p className="text-sm text-gray-400">
          Browse F1 sessions from 2023-2026
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Year Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Grand Prix Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Grand Prix
          </label>
          <select
            value={selectedGrandPrix}
            onChange={(e) => setSelectedGrandPrix(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Grand Prix</option>
            {grandPrixOptions.map((gp) => (
              <option key={gp} value={gp}>
                {gp}
              </option>
            ))}
          </select>
        </div>

        {/* Session Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Session Type
          </label>
          <select
            value={selectedSessionType}
            onChange={(e) => setSelectedSessionType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            {sessionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No sessions found matching your filters
          </div>
        ) : (
          filteredSessions.map((session) => (
            <button
              key={session.session_key}
              onClick={() => onSessionSelect(session.session_key)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                selectedSessionKey === session.session_key
                  ? 'bg-blue-900 border-blue-500 bg-opacity-30'
                  : 'bg-gray-800 border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {session.meetingLocation}
                  </p>
                  <p className="text-sm text-gray-400">
                    {session.session_type} • {session.circuitName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {formatDate(session.date_start)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${
                      session.session_type === 'Race'
                        ? 'bg-red-900 text-red-200'
                        : session.session_type === 'Qualifying'
                          ? 'bg-purple-900 text-purple-200'
                          : session.session_type === 'Sprint'
                            ? 'bg-orange-900 text-orange-200'
                            : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {session.session_type}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionSelector;
