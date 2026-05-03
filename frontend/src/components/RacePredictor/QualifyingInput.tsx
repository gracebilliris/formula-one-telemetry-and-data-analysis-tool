import React, { useState, useEffect } from 'react';
import type { Driver, Session, Meeting } from '../../types/openf1';
import { openF1Api } from '../../utils/openf1Api';

interface QualifyingInputProps {
  onPredictionRequested: (qualifyingTimes: Record<number, number>) => void;
  isLoading?: boolean;
}

interface QualifyingResult {
  driverNumber: number;
  driverName: string;
  time: number;
  delta: number;
}

/**
 * Component for inputting or selecting qualifying results
 * Allows selection of past seasons/races or manual input
 */
export const QualifyingInput: React.FC<QualifyingInputProps> = ({
  onPredictionRequested,
  isLoading = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<'select' | 'manual'>('select');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [qualifyingResults, setQualifyingResults] = useState<QualifyingResult[]>([]);
  
  const [manualInput, setManualInput] = useState<Record<number, number>>({});

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load drivers and meetings
        const [driversData, meetingsData] = await Promise.all([
          openF1Api.getDrivers(),
          openF1Api.getMeetings({ year: selectedYear }),
        ]);
        
        setDrivers(driversData);
        setMeetings(meetingsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [selectedYear]);

  // Load qualifying session when meeting is selected
  useEffect(() => {
    const loadQualifyingSession = async () => {
      if (!selectedMeeting) return;

      try {
        const meetingSessions = await openF1Api.getSessions({
          meeting_key: selectedMeeting,
          session_type: 'Qualifying',
        });
        setSessions(meetingSessions);

        if (meetingSessions.length > 0) {
          const qualifyingSession = meetingSessions[0];
          // Load qualifying results
          const results = await openF1Api.getPositions({
            session_key: qualifyingSession.session_key,
          });

          // Get qualifying lap times
          const laps = await openF1Api.getLaps({
            session_key: qualifyingSession.session_key,
          });

          // Build qualifying results from position data and laps
          const qualifyingMap = new Map<number, number>();
          const bestLapPerDriver = new Map<number, number>();

          laps.forEach(lap => {
            if (lap.lap_duration && lap.lap_duration > 0) {
              const current = bestLapPerDriver.get(lap.driver_number);
              if (!current || lap.lap_duration < current) {
                bestLapPerDriver.set(lap.driver_number, lap.lap_duration);
              }
            }
          });

          // Match positions with times
          results.forEach(result => {
            const time = bestLapPerDriver.get(result.driver_number) || 0;
            qualifyingMap.set(result.driver_number, time);
          });

          // Convert to array and calculate deltas
          const minTime = Math.min(...Array.from(qualifyingMap.values()));
          const results_array: QualifyingResult[] = Array.from(qualifyingMap.entries())
            .map(([driverNum, time]) => ({
              driverNumber: driverNum,
              driverName: drivers.find(d => d.driver_number === driverNum)?.broadcast_name || `Driver ${driverNum}`,
              time,
              delta: time - minTime,
            }))
            .sort((a, b) => a.time - b.time);

          setQualifyingResults(results_array);
        }
      } catch (error) {
        console.error('Error loading qualifying session:', error);
      }
    };

    loadQualifyingSession();
  }, [selectedMeeting, drivers]);

  const handleSelectAndPredict = () => {
    if (qualifyingResults.length === 0) {
      alert('Please select a qualifying session first');
      return;
    }

    const timesMap = Object.fromEntries(
      qualifyingResults.map(result => [result.driverNumber, result.time])
    );
    onPredictionRequested(timesMap);
  };

  const handleManualPredict = () => {
    const entries = Object.entries(manualInput);
    if (entries.length === 0) {
      alert('Please enter at least one driver time');
      return;
    }

    const timesMap = Object.fromEntries(
      entries.map(([driverNum, time]) => [Number(driverNum), time])
    );
    onPredictionRequested(timesMap);
  };

  const handleManualTimeChange = (driverNum: number, time: string) => {
    const timeNum = parseFloat(time) || 0;
    setManualInput(prev => ({
      ...prev,
      [driverNum]: timeNum,
    }));
  };

  const availableYears = [2023, 2024, 2025];

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex gap-4">
        <button
          onClick={() => setSelectedMode('select')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            selectedMode === 'select'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          Select from Past Races
        </button>
        <button
          onClick={() => setSelectedMode('manual')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            selectedMode === 'manual'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
        >
          Manual Input
        </button>
      </div>

      {/* Select Mode */}
      {selectedMode === 'select' ? (
        <div className="space-y-4">
          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Season
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Race
            </label>
            <select
              value={selectedMeeting || ''}
              onChange={e => setSelectedMeeting(Number(e.target.value) || null)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="">Select a race...</option>
              {meetings.map(meeting => (
                <option key={meeting.meeting_key} value={meeting.meeting_key}>
                  {meeting.country_name} {meeting.meeting_date.split('-')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Qualifying Results */}
          {qualifyingResults.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Qualifying Results
              </h3>
              <div className="overflow-auto max-h-64">
                <div className="space-y-2">
                  {qualifyingResults.map((result, idx) => (
                    <div
                      key={result.driverNumber}
                      className="flex items-center justify-between bg-gray-700 p-2 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-500 w-6">{idx + 1}</span>
                        <span className="text-white font-medium">
                          {result.driverName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-300 text-sm">
                          {result.time.toFixed(3)}s
                        </span>
                        {result.delta > 0 && (
                          <span className="text-yellow-400 text-sm ml-2">
                            +{result.delta.toFixed(3)}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSelectAndPredict}
                disabled={isLoading}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {isLoading ? 'Predicting...' : 'Predict Race Outcome'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Manual Input Mode */
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Enter qualifying lap times (in seconds) for each driver you want to predict
          </p>

          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-auto">
            {drivers.slice(0, 20).map(driver => (
              <div key={driver.driver_number}>
                <label className="block text-sm text-gray-300 mb-1">
                  {driver.broadcast_name}
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Time in seconds"
                  value={manualInput[driver.driver_number] || ''}
                  onChange={e =>
                    handleManualTimeChange(driver.driver_number, e.target.value)
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleManualPredict}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            {isLoading ? 'Predicting...' : 'Predict Race Outcome'}
          </button>
        </div>
      )}
    </div>
  );
};
