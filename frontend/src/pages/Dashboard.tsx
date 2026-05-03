import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSessionMetadata } from '../hooks/useSessionMetadata';
import { motion, AnimatePresence } from 'framer-motion';
import type { Session, Driver, Meeting } from '../types/openf1';
import { openF1Api } from '../utils/openf1Api';
import { TelemetryViewer, LapComparison, TyreAnalysis } from '../components/TelemetryDashboard';
import { StatusCard } from '../components/UI';

export const Dashboard = () => {
  const { isDark } = useTheme();
  const { sessions, isLoading: sessionsLoading, filters, setFilters } = useSessionMetadata();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedDriverNumbers, setSelectedDriverNumbers] = useState<number[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  // Fetch all meetings and drivers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching meetings and drivers...');
        const [meetingsData, driversData] = await Promise.all([
          openF1Api.getMeetings(),
          openF1Api.getDrivers(),
        ]);
        console.log('Meetings fetched:', meetingsData?.length);
        console.log('Drivers fetched (before dedup):', driversData?.length);
        
        setMeetings(meetingsData || []);
        if (Array.isArray(driversData) && driversData.length > 0) {
          // Deduplicate drivers by driver_number (keep first occurrence)
          const seenNumbers = new Set<number>();
          const uniqueDrivers = driversData.filter((d) => {
            if (seenNumbers.has(d.driver_number)) return false;
            seenNumbers.add(d.driver_number);
            return true;
          });
          console.log('Drivers after deduplication:', uniqueDrivers.length);
          setDrivers(uniqueDrivers);
        } else {
          console.warn('No drivers returned from API or invalid format:', driversData);
          setDrivers([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMeetings([]);
        setDrivers([]);
      }
    };
    fetchData();
  }, []);

  // Helper function to check if session is in the future
  // Includes 2-hour buffer for:
  // 1. Telemetry sync delay (OpenF1 API takes 1-4 hours to process)
  // 2. Timezone discrepancies
  const isSessionInFuture = (dateStart: string): boolean => {
    if (!dateStart) return false;
    const sessionDate = new Date(dateStart);
    const now = new Date();
    const buffer = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    return sessionDate.getTime() - buffer > now.getTime();
  };

  const filteredSessions = sessions.filter((s) => {
    // Exclude future sessions
    if (isSessionInFuture(s.date_start)) return false;

    if (filters.year && s.date_start) {
      const year = new Date(s.date_start).getFullYear();
      if (year !== filters.year) return false;
    }
    if (filters.gpName) {
      // Check that the session belongs to the selected GP
      if (s.meeting_key?.toString() !== filters.gpName) return false;
    }
    if (filters.sessionType && s.session_type !== filters.sessionType) return false;
    return true;
  });

  // Get unique years
  const years = Array.from(
    new Set(
      sessions
        .map((s) => (s.date_start ? new Date(s.date_start).getFullYear().toString() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => parseInt(b) - parseInt(a));

  // Get unique GPs for selected year (only those with past/completed sessions)
  const gpMeetings = meetings.filter((m) => {
    if (!filters.year) return false;
    if (m.year !== filters.year) return false;
    
    // Only include meetings that have at least one completed (non-future) session
    const meetingHasCompletedSessions = sessions.some(
      (s) => s.meeting_key === m.meeting_key && !isSessionInFuture(s.date_start)
    );
    return meetingHasCompletedSessions;
  });

  const sessionTypes = ['Practice', 'Qualifying', 'Race', 'Sprint'];

  const filteredDrivers = drivers.filter(
    (d) => {
      // If no search term, show all drivers
      if (!driverSearch) return true;
      // Otherwise filter by name or number
      return (
        d.broadcast_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.driver_number.toString().includes(driverSearch)
      );
    }
  );

  const handleSessionSelect = (session: Session) => {
    console.log('🔍 SESSION SELECTION:', {
      session_key: session.session_key,
      session_type: session.session_type,
      date_start: session.date_start,
      date_start_timestamp: new Date(session.date_start).getTime(),
      current_timestamp_utc: new Date().getTime(),
      timezone_offset_minutes: new Date().getTimezoneOffset(),
    });
    setSelectedSession(session);
  };

  const toggleDriver = (driverNumber: number) => {
    console.log('toggleDriver called with driver:', driverNumber);
    console.log('Currently selected:', selectedDriverNumbers);
    if (selectedDriverNumbers.includes(driverNumber)) {
      console.log('Driver already selected, removing...');
      setSelectedDriverNumbers(selectedDriverNumbers.filter((d) => d !== driverNumber));
    } else if (selectedDriverNumbers.length < 5) {
      console.log('Adding driver to selection');
      setSelectedDriverNumbers([...selectedDriverNumbers, driverNumber]);
    } else {
      console.log('Max drivers (5) already selected');
    }
  };

  // Convert selected driver numbers to actual driver objects
  const selectedDrivers = selectedDriverNumbers
    .map(num => drivers.find(d => d.driver_number === num))
    .filter((d): d is Driver => d !== undefined);

  // Debug: Log when modal opens
  useEffect(() => {
    if (showDriverModal) {
      console.log('Driver modal opened. Available drivers:', drivers.length, drivers);
      console.log('Filtered drivers:', filteredDrivers.length);
    }
  }, [showDriverModal, drivers, filteredDrivers]);

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-black' : 'bg-gradient-to-br from-gray-50 to-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="relative">
            {/* Background accent line */}
            <div className="absolute -top-6 left-0 h-1 w-24 bg-gradient-to-r from-red-600 to-red-500 rounded-full"></div>
            <h1 className={`text-5xl md:text-6xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-950'}`}>
              Telemetry Analysis
            </h1>
            <p className={`mt-3 text-lg font-light ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Real-time F1 telemetry comparison and race analysis
            </p>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Filters */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div
              className={`rounded-2xl border backdrop-blur-xl transition-all ${
                isDark
                  ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
                  : 'bg-white/70 border-gray-200/50 shadow-lg'
              }`}
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-red-600 to-red-500 rounded-full"></div>
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Session Selection
                  </h2>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {/* Season */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700/50 hover:border-red-500/50'
                        : 'bg-gray-50 border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Season
                    </label>
                    <select
                      value={filters.year?.toString() || ''}
                      onChange={(e) => {
                        setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined });
                        setSelectedSession(null);
                      }}
                      className={`w-full bg-transparent text-sm font-semibold outline-none ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      <option value="">All</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  {/* Grand Prix */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700/50 hover:border-red-500/50'
                        : 'bg-gray-50 border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Grand Prix
                    </label>
                    <select
                      value={filters.gpName || ''}
                      onChange={(e) => {
                        setFilters({ ...filters, gpName: e.target.value || undefined });
                        setSelectedSession(null);
                      }}
                      className={`w-full bg-transparent text-sm font-semibold outline-none ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      <option value="">All</option>
                      {gpMeetings.map((meeting) => (
                        <option key={meeting.meeting_key} value={meeting.meeting_key}>
                          {meeting.meeting_official_name}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  {/* Session Type */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700/50 hover:border-red-500/50'
                        : 'bg-gray-50 border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Type
                    </label>
                    <select
                      value={filters.sessionType || ''}
                      onChange={(e) => {
                        setFilters({
                          ...filters,
                          sessionType: (e.target.value as any) || undefined,
                        });
                        setSelectedSession(null);
                      }}
                      className={`w-full bg-transparent text-sm font-semibold outline-none ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      <option value="">All</option>
                      {sessionTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  {/* Session */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700/50 hover:border-red-500/50'
                        : 'bg-gray-50 border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Session
                    </label>
                    <select
                      value={selectedSession?.session_key || ''}
                      onChange={(e) => {
                        const session = filteredSessions.find(
                          (s) => s.session_key.toString() === e.target.value
                        );
                        if (session) handleSessionSelect(session);
                      }}
                      className={`w-full bg-transparent text-sm font-semibold outline-none ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      <option value="">Select</option>
                      {filteredSessions.map((session) => (
                        <option key={session.session_key} value={session.session_key}>
                          {session.session_name} • {new Date(session.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Selected Drivers */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl border backdrop-blur-xl transition-all ${
              isDark
                ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
                : 'bg-white/70 border-gray-200/50 shadow-lg'
            }`}
          >
            <div className="p-8 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-gradient-to-b from-red-600 to-red-500 rounded-full"></div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Drivers
                </h2>
              </div>

              {/* Selected Drivers Chips */}
              <div className="space-y-3 mb-6 flex-1">
                {selectedDrivers.length > 0 ? (
                  selectedDrivers.map((driver, idx) => (
                    <motion.div
                      key={driver.driver_number}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all"
                    >
                      <div>
                        <div className="font-bold text-sm">#{driver.driver_number}</div>
                        <div className="text-xs opacity-90">{driver.broadcast_name}</div>
                      </div>
                      <button
                        onClick={() => toggleDriver(driver.driver_number)}
                        className="ml-2 hover:opacity-75 transition text-lg font-bold"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className={`text-center py-8 text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No drivers selected
                  </div>
                )}
              </div>

              {/* Add Driver Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  console.log('Add Driver button clicked!');
                  setShowDriverModal(true);
                  console.log('showDriverModal state set to true');
                }}
                disabled={selectedDriverNumbers.length >= 5}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${
                  selectedDriverNumbers.length >= 5
                    ? isDark
                      ? 'bg-slate-700/50 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/50'
                }`}
              >
                + Add Driver
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Session Info Banner */}
        <AnimatePresence>
          {selectedSession && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-12 rounded-2xl border backdrop-blur-xl overflow-hidden ${
                isDark
                  ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
                  : 'bg-white/70 border-gray-200/50 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-4 p-8">
                <div className="text-4xl">🏁</div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedSession.session_name}
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(selectedSession.date_start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {selectedDriverNumbers.length > 0 && ` • ${selectedDriverNumbers.length} driver${selectedDriverNumbers.length !== 1 ? 's' : ''} selected`}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${isDark ? 'text-red-500' : 'text-red-600'}`}>
                    {selectedDriverNumbers.length}/5
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Telemetry Display Area */}
        {selectedSession && selectedDriverNumbers.length > 0 && selectedDrivers.length > 0 ? (
          <div className="space-y-8">
            {/* Pre-season testing warning */}
            {(() => {
              const meeting = meetings.find((m) => m.meeting_key === selectedSession.meeting_key);
              const isPreseason = /pre[- ]?season|testing/i.test(
                meeting?.meeting_official_name || ''
              );
              if (!isPreseason) return null;
              return (
                <StatusCard
                  variant="info"
                  icon="🧪"
                  title="Pre-season testing session selected"
                  message="OpenF1 has limited data for pre-season testing — telemetry (speed, throttle, brake) is often unavailable, though laps and stints may load."
                  hint="For full analysis, pick a completed Grand Prix race weekend (Practice, Qualifying or Race)."
                />
              );
            })()}

            {/* Telemetry Tab System */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TelemetryViewer 
                sessionKey={selectedSession.session_key}
                drivers={selectedDrivers}
              />
            </motion.div>

            {/* Lap Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <LapComparison 
                sessionKey={selectedSession.session_key}
                drivers={selectedDrivers}
              />
            </motion.div>

            {/* Tyre Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <TyreAnalysis 
                sessionKey={selectedSession.session_key}
                drivers={selectedDrivers}
              />
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl border backdrop-blur-xl overflow-hidden min-h-96 flex items-center justify-center ${
              isDark
                ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
                : 'bg-white/70 border-gray-200/50 shadow-lg'
            }`}
          >
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-7xl mb-6 inline-block"
              >
                🏎️
              </motion.div>
              <h3 className={`text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Ready to Analyze
              </h3>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a session and drivers to view telemetry data
              </p>
            </div>
          </motion.div>
        )}

        {/* Feature Highlights */}
        {!selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { icon: '📊', title: 'Multi-Driver Comparison', desc: 'Compare telemetry across multiple drivers simultaneously' },
              { icon: '🏁', title: 'Race Analysis', desc: 'Deep dive into overtakes, strategies, and key moments' },
              { icon: '🔮', title: 'Predictions', desc: 'ML-powered race outcome forecasts' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className={`p-8 rounded-2xl border backdrop-blur-xl transition-all ${
                  isDark
                    ? 'bg-slate-900/70 border-slate-700/50 hover:border-red-500/50 shadow-2xl shadow-black/40'
                    : 'bg-white/70 border-gray-200/50 hover:border-red-500/30 shadow-lg'
                }`}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h4 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h4>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Driver Selection Modal */}
      {showDriverModal && (
        (() => {
          console.log('Modal rendering - showDriverModal is TRUE');
          return (
            <div
              onClick={() => setShowDriverModal(false)}
              style={{
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '90%',
                  maxWidth: '700px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderRadius: '16px',
                  border: `2px solid #ef4444`,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                  padding: '32px',
                }}
              >
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  marginBottom: '24px',
                  color: isDark ? 'white' : '#111827',
                }}>
                  Select Drivers ({filteredDrivers.length})
                </h2>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search drivers by name or number..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    borderRadius: '8px',
                    border: `2px solid ${isDark ? '#334155' : '#d1d5db'}`,
                    backgroundColor: isDark ? '#1e293b' : '#f3f4f6',
                    fontSize: '16px',
                    color: isDark ? 'white' : '#111827',
                    boxSizing: 'border-box',
                  }}
                />

                {/* Driver Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '12px',
                  minHeight: '200px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  marginBottom: '24px',
                  padding: '12px',
                  backgroundColor: isDark ? '#1e293b' : '#f9fafb',
                  borderRadius: '8px',
                }}>
                  {filteredDrivers.length > 0 ? (
                    filteredDrivers.map((driver, idx) => {
                      const isSelected = selectedDriverNumbers.includes(driver.driver_number);
                      const isDisabled = !isSelected && selectedDriverNumbers.length >= 5;

                      return (
                        <button
                          key={`driver-${driver.driver_number}-${idx}`}
                          onClick={() => {
                            console.log('Driver clicked:', driver.driver_number);
                            if (!isDisabled) toggleDriver(driver.driver_number);
                          }}
                          style={{
                            padding: '12px 8px',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? '#dc2626' : '#d1d5db'}`,
                            backgroundColor: isSelected ? '#dc2626' : (isDark ? '#334155' : '#ffffff'),
                            color: isSelected ? 'white' : (isDark ? '#e2e8f0' : '#1f2937'),
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div>#{driver.driver_number}</div>
                          <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {driver.broadcast_name}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '24px',
                      color: isDark ? '#9ca3af' : '#6b7280',
                    }}>
                      {drivers.length === 0 ? 'Loading drivers...' : 'No drivers found'}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      console.log('Done button clicked');
                      setShowDriverModal(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};
