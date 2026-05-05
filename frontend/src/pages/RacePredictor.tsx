import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSessionMetadata } from '../hooks/useSessionMetadata';
import { motion } from 'framer-motion';
import type { Driver, Session } from '../types/openf1';
import { openF1Api } from '../utils/openf1Api';
import { racePredictor } from '../utils/racePredictor';
import {
  QualifyingInput,
  PredictionViewer,
  PredictionCharts,
  AccuracyTracker,
  ConfidenceChart,
} from '../components/RacePredictor';
import type { PredictionRecord } from '../components/RacePredictor/AccuracyTracker';
import { StatusCard } from '../components/UI';

export const RacePredictor = () => {
  const { isDark } = useTheme();
  const { sessions, filters, setFilters } = useSessionMetadata();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [predictionsHistory, setPredictionsHistory] = useState<PredictionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Load model and fetch data on mount
  useEffect(() => {
    const initializeModel = async () => {
      try {
        const driversData = await openF1Api.getDrivers();
        if (Array.isArray(driversData)) {
          const seenNumbers = new Set<number>();
          const uniqueDrivers = driversData.filter((d) => {
            if (seenNumbers.has(d.driver_number)) return false;
            seenNumbers.add(d.driver_number);
            return true;
          });
          await racePredictor.initialize(uniqueDrivers);
          setModelLoaded(true);
        }
      } catch (err) {
        console.error('Error initializing model:', err);
        setError('Failed to load ML model');
      }
    };

    const fetchData = async () => {
      try {
        const [driversData, meetingsData] = await Promise.all([
          openF1Api.getDrivers(),
          openF1Api.getMeetings(),
        ]);

        if (Array.isArray(driversData)) {
          const seenNumbers = new Set<number>();
          const uniqueDrivers = driversData.filter((d) => {
            if (seenNumbers.has(d.driver_number)) return false;
            seenNumbers.add(d.driver_number);
            return true;
          });
          setDrivers(uniqueDrivers);
        }

        setMeetings(meetingsData || []);

        // Load predictions history from localStorage
        const saved = localStorage.getItem('racePredictorHistory');
        if (saved) {
          setPredictionsHistory(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      }
    };

    initializeModel();
    fetchData();
  }, []);

  // Helper: check if session is future
  const isSessionInFuture = (dateStart: string): boolean => {
    if (!dateStart) return false;
    return new Date(dateStart) > new Date();
  };

  // Filter qualifying sessions
  const qualifyingSessions = sessions.filter((s) => {
    if (s.session_type !== 'Qualifying') return false;
    if (!isSessionInFuture(s.date_start)) return false; // Only future races
    if (filters.year && s.date_start) {
      const year = new Date(s.date_start).getFullYear();
      if (year !== filters.year) return false;
    }
    if (filters.gpName && s.meeting_key?.toString() !== filters.gpName) return false;
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

  // Get GPs for selected year
  const gpMeetings = meetings.filter((m) => {
    if (!filters.year) return false;
    if (m.year !== filters.year) return false;
    // Check if meeting has future qualifying session
    const hasFutureQualifying = sessions.some(
      (s) => s.meeting_key === m.meeting_key && s.session_type === 'Qualifying' && isSessionInFuture(s.date_start)
    );
    return hasFutureQualifying;
  });

  // Handle session selection and fetch qualifying data
  const handleSessionSelect = async (session: Session) => {
    setSelectedSession(session);
    setIsLoading(false);
    setError(null);
    setPredictions([]);
  };

  // Handle prediction generation
  const handleGeneratePrediction = async (qualifyingTimes: Record<number, number>) => {
    if (!modelLoaded || !selectedSession) {
      setError('Model not ready');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = racePredictor.predictRaceOutcome(qualifyingTimes);

      if (results) {
        setPredictions(results);

        // Save to history
        const newRecord: PredictionRecord = {
          raceKey: selectedSession.session_key,
          raceName: selectedSession.session_name,
          predictions: results.map((r: any, idx: number) => ({
            position: idx + 1,
            driverNumber: r.driverNumber,
            driverName: r.driverName,
            predicted: idx + 1,
            actual: 0, // Will be filled when race completes
            confidence: r.confidence,
          })),
          timestamp: Date.now(),
        };

        const updated = [...predictionsHistory, newRecord];
        setPredictionsHistory(updated);
        localStorage.setItem('racePredictorHistory', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error generating prediction:', err);
      setError('Failed to generate prediction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="f1-eyebrow mb-3" style={{ color: '#9333EA' }}>ML model · forecast</div>
          <h1 className="f1-page-heading">Race Predictor</h1>
          <p className="f1-page-sub">
            Forecast race outcomes from qualifying performance using a neural network trained on historical sessions.
          </p>
        </motion.div>

        {/* Model Status */}
        {!modelLoaded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-4 rounded-xl border ${
              isDark
                ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}
          >
            🔄 Loading ML model...
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8">
            <StatusCard
              variant="warning"
              title="Predictor error"
              message={error}
              hint="Make sure you've selected a valid Grand Prix race weekend."
            />
          </div>
        )}

        {/* Session Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="f1-card-pad mb-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-purple-600 to-purple-500" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Qualifying Source</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Year */}
              <motion.div whileHover={{ y: -2 }} className="f1-field">
                <label className="f1-label">Season</label>
                <select
                  value={filters.year?.toString() || ''}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="f1-select"
                >
                  <option value="">All</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </motion.div>

              {/* GP */}
              <motion.div whileHover={{ y: -2 }} className="f1-field">
                <label className="f1-label">Grand Prix</label>
                <select
                  value={filters.gpName || ''}
                  onChange={(e) => setFilters({ ...filters, gpName: e.target.value || undefined })}
                  className="f1-select"
                >
                  <option value="">All</option>
                  {gpMeetings.map((meeting) => (
                    <option key={meeting.meeting_key} value={meeting.meeting_key}>
                      {meeting.meeting_official_name}
                    </option>
                  ))}
                </select>
              </motion.div>

              {/* Qualifying Session */}
              <motion.div whileHover={{ y: -2 }} className="f1-field">
                <label className="f1-label">Qualifying Session</label>
                <select
                  value={selectedSession?.session_key || ''}
                  onChange={(e) => {
                    const session = qualifyingSessions.find((s) => s.session_key.toString() === e.target.value);
                    if (session) handleSessionSelect(session);
                  }}
                  className="f1-select"
                >
                  <option value="">Select</option>
                  {qualifyingSessions.map((session) => (
                    <option key={session.session_key} value={session.session_key} disabled={session.is_cancelled}>
                      {session.session_name} • {new Date(session.date_start).toLocaleDateString()}{session.is_cancelled ? ' (cancelled)' : ''}
                    </option>
                  ))}
                </select>
              </motion.div>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
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
                🔮
              </motion.div>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Generating predictions...
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        {selectedSession && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="space-y-8"
          >
            {/* Input & Prediction Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* QualifyingInput */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <QualifyingInput
                  onPredictionRequested={handleGeneratePrediction}
                  isLoading={isLoading}
                />
              </motion.div>

              {/* Predictions Display */}
              {predictions.length > 0 && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2"
                  >
                    <PredictionViewer predictions={predictions} />
                  </motion.div>

                  {/* Confidence Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-3"
                  >
                    <ConfidenceChart predictions={predictions} />
                  </motion.div>

                  {/* Prediction Charts */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-3"
                  >
                    <PredictionCharts predictions={predictions} />
                  </motion.div>
                </>
              )}
            </div>

            {/* Accuracy Tracker */}
            {predictionsHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <AccuracyTracker records={predictionsHistory} />
              </motion.div>
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
                Select a Qualifying Session
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Choose a season, GP, and qualifying session to generate race predictions
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
