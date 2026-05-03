import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSessionMetadata } from '../hooks/useSessionMetadata';
import { motion } from 'framer-motion';
import type { Session, Driver, Meeting } from '../types/openf1';
import { openF1Api } from '../utils/openf1Api';
import {
  extractRaceEvents,
  analyzeStrategy,
  analyzeOvertakes,
  buildDriversMap,
  buildTeamColorsMap,
  generateRaceNarrative,
  getSummaryMetrics,
  type RaceEvent,
  type RaceStrategy,
} from '../utils/raceAnalysis';
import {
  RaceTimeline,
  OvertakeAnalysis,
  StrategyGantt,
  RaceStats,
} from '../components/RaceSummariser';
import { StatusCard } from '../components/UI';

type RaceSummariserTab = 'timeline' | 'overtakes' | 'strategy' | 'stats';

export const RaceSummariser = () => {
  const { isDark } = useTheme();
  const { sessions, filters, setFilters } = useSessionMetadata();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<RaceSummariserTab>('timeline');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Race analysis data
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [raceStrategy, setRaceStrategy] = useState<RaceStrategy[]>([]);
  const [overtakes, setOvertakes] = useState<any[]>([]);
  const [driversMap, setDriversMap] = useState<Map<number, string>>(new Map());
  const [teamColorsMap, setTeamColorsMap] = useState<Map<number, string>>(new Map());
  const [raceNarrative, setRaceNarrative] = useState<string>('');

  // Fetch meetings and drivers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetingsData, driversData] = await Promise.all([
          openF1Api.getMeetings(),
          openF1Api.getDrivers(),
        ]);

        setMeetings(meetingsData || []);

        if (Array.isArray(driversData)) {
          const seenNumbers = new Set<number>();
          const uniqueDrivers = driversData.filter((d) => {
            if (seenNumbers.has(d.driver_number)) return false;
            seenNumbers.add(d.driver_number);
            return true;
          });
          setDrivers(uniqueDrivers);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load race data');
      }
    };

    fetchData();
  }, []);

  // Helper: check if session is future
  const isSessionInFuture = (dateStart: string): boolean => {
    if (!dateStart) return false;
    return new Date(dateStart) > new Date();
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    if (isSessionInFuture(s.date_start)) return false;
    if (filters.year && s.date_start) {
      const year = new Date(s.date_start).getFullYear();
      if (year !== filters.year) return false;
    }
    if (filters.gpName && s.meeting_key?.toString() !== filters.gpName) return false;
    if (filters.sessionType && s.session_type !== filters.sessionType) return false;
    return true;
  });

  // Get unique years and GPs
  const years = Array.from(
    new Set(
      sessions
        .map((s) => (s.date_start ? new Date(s.date_start).getFullYear().toString() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => parseInt(b) - parseInt(a));

  const gpMeetings = meetings.filter((m) => {
    if (!filters.year) return false;
    if (m.year !== filters.year) return false;
    const meetingHasCompletedSessions = sessions.some(
      (s) => s.meeting_key === m.meeting_key && !isSessionInFuture(s.date_start)
    );
    return meetingHasCompletedSessions;
  });

  // Analyze race when session is selected
  useEffect(() => {
    if (!selectedSession) {
      setRaceEvents([]);
      setRaceStrategy([]);
      setOvertakes([]);
      setRaceNarrative('');
      return;
    }

    const analyzeRace = async () => {
      setIsAnalyzing(true);
      setError(null);

      try {
        // Build driver and team maps
        const driverMap = buildDriversMap(drivers);
        const teamColorMap = buildTeamColorsMap(drivers);
        setDriversMap(driverMap);
        setTeamColorsMap(teamColorMap);

        // Extract race events
        const events = await extractRaceEvents(selectedSession.session_key);
        setRaceEvents(events);

        // Analyze strategy
        const [lapsData, pitStopsData] = await Promise.all([
          openF1Api.getLaps({ session_key: selectedSession.session_key }).catch(() => []),
          openF1Api.getPitStops({ session_key: selectedSession.session_key }).catch(() => []),
        ]);

        const strategies = await analyzeStrategy(
          selectedSession.session_key,
          lapsData,
          pitStopsData
        );
        setRaceStrategy(strategies);

        // Analyze overtakes (returns Map, convert to array of overtake events)
        const overtakeEventsFromAnalysis = events.filter(e => e.type === 'overtake');
        setOvertakes(overtakeEventsFromAnalysis);

        // Generate narrative
        const narrative = generateRaceNarrative(events, strategies, driverMap);
        setRaceNarrative(narrative);
      } catch (err) {
        console.error('Error analyzing race:', err);
        setError('Failed to analyze race data');
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeRace();
  }, [selectedSession, drivers]);

  const sessionHasData = selectedSession && raceEvents.length > 0;

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-black' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="relative">
            <div className="absolute -top-6 left-0 h-1 w-24 bg-gradient-to-r from-red-600 to-red-500 rounded-full"></div>
            <h1 className={`text-5xl md:text-6xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-950'}`}>
              Race Summariser
            </h1>
            <p className={`mt-3 text-lg font-light ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              AI-powered race analysis with automatic insights
            </p>
          </div>
        </motion.div>

        {/* Session Selector */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl border backdrop-blur-xl transition-all mb-8 ${
            isDark
              ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
              : 'bg-white/70 border-gray-200/50 shadow-lg'
          }`}
        >
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Year */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Season
                </label>
                <select
                  value={filters.year?.toString() || ''}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined })}
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  <option value="">All</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* GP */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Grand Prix
                </label>
                <select
                  value={filters.gpName || ''}
                  onChange={(e) => setFilters({ ...filters, gpName: e.target.value || undefined })}
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  <option value="">All</option>
                  {gpMeetings.map((meeting) => (
                    <option key={meeting.meeting_key} value={meeting.meeting_key}>
                      {meeting.meeting_official_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Type */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Type
                </label>
                <select
                  value={filters.sessionType || ''}
                  onChange={(e) => setFilters({ ...filters, sessionType: (e.target.value as any) || undefined })}
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  <option value="">All</option>
                  {['Practice', 'Qualifying', 'Race', 'Sprint'].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Session
                </label>
                <select
                  value={selectedSession?.session_key || ''}
                  onChange={(e) => {
                    const session = filteredSessions.find((s) => s.session_key.toString() === e.target.value);
                    if (session) setSelectedSession(session);
                  }}
                  className={`w-full bg-transparent text-sm font-semibold outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  <option value="">Select</option>
                  {filteredSessions.map((session) => (
                    <option key={session.session_key} value={session.session_key}>
                      {session.session_name} • {new Date(session.date_start).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <div className="mb-8">
            <StatusCard
              variant="warning"
              title="Race data unavailable"
              message={error}
              hint="Try a completed Grand Prix race weekend (not pre-season testing)."
            />
          </div>
        )}

        {/* Analysis Summary */}
        {sessionHasData && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-6 rounded-2xl border backdrop-blur-xl ${
              isDark
                ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
                : 'bg-white/70 border-gray-200/50 shadow-lg'
            }`}
          >
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedSession?.session_name}
            </h3>
            <div className="prose dark:prose-invert max-w-none text-sm">
              <div dangerouslySetInnerHTML={{ __html: raceNarrative.replace(/\n/g, '<br />') }} />
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        {sessionHasData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex gap-2 flex-wrap">
              {(['timeline', 'overtakes', 'strategy', 'stats'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30'
                      : isDark
                      ? 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-6xl mb-4 inline-block"
              >
                🏎️
              </motion.div>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Analyzing race data...
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab Content */}
        {sessionHasData && !isAnalyzing && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {activeTab === 'timeline' && (
              <RaceTimeline
                events={raceEvents}
                drivers={driversMap}
                teamColors={teamColorsMap}
              />
            )}
            {activeTab === 'overtakes' && (
              <OvertakeAnalysis
                events={raceEvents}
                drivers={driversMap}
                teamColors={teamColorsMap}
              />
            )}
            {activeTab === 'strategy' && (
              <StrategyGantt
                strategies={raceStrategy}
                drivers={driversMap}
                teamColors={teamColorsMap}
              />
            )}
            {activeTab === 'stats' && (
              <RaceStats
                events={raceEvents}
                drivers={driversMap}
                teamColors={teamColorsMap}
              />
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-20"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏁</div>
              <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Select a Race
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Choose a season, GP, and session to view race analysis
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
