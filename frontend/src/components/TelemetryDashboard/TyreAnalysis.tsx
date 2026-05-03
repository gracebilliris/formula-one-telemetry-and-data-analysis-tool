import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import type { Driver, Stint, PitStop, Lap } from '../../types/openf1';
import { openF1Api } from '../../utils/openf1Api';
import { StatusCard, ChartSkeleton } from '../UI';

export interface TyreAnalysisProps {
  sessionKey: number;
  drivers: Driver[];
  onLoading?: (loading: boolean) => void;
}

interface StintData {
  driverNumber: number;
  driverName: string;
  teamColour: string;
  stintNumber: number;
  compound: string;
  lapStart: number;
  lapEnd: number;
  tyreAge: number;
  duration: number;
}

interface PitStopData {
  driverNumber: number;
  driverName: string;
  teamColour: string;
  pitStopNumber: number;
  lapNumber: number;
  duration: number;
}

interface DegradationPoint {
  driverNumber: number;
  driverName: string;
  teamColour: string;
  lapAge: number;
  lapTime: number;
}

const TyreAnalysis: React.FC<TyreAnalysisProps> = ({
  sessionKey,
  drivers,
  onLoading,
}) => {
  const [stints, setStints] = useState<Stint[]>([]);
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'degradation'>(
    'timeline'
  );

  const compoundColors: Record<string, string> = {
    SOFT: '#ff1801',
    MEDIUM: '#ffeb3b',
    HARD: '#ffffff',
    INTERMEDIATE: '#00ff00',
    WET: '#0082ff',
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!drivers || drivers.length === 0 || !sessionKey) {
        setError('No session or drivers selected');
        setLoading(false);
        return;
      }

      if (sessionKey === 0 || isNaN(sessionKey)) {
        setError('Invalid session key. Please select another session.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        onLoading?.(true);

        const driverNumbers = drivers.map((d) => d.driver_number);

        // Fetch stints, pit stops, and laps for all drivers
        const [stintsResult, pitStopsResult, lapsResult] = await Promise.all([
          openF1Api.getStints({
            session_key: sessionKey,
            driver_number: driverNumbers[0],
          }).then(async (result) => {
            if (driverNumbers.length > 1) {
              const additionalStints = await Promise.all(
                driverNumbers.slice(1).map((driverNum) =>
                  openF1Api.getStints({
                    session_key: sessionKey,
                    driver_number: driverNum,
                  })
                )
              );
              return result.concat(...additionalStints.flat());
            }
            return result;
          }),
          openF1Api.getPitStops({
            session_key: sessionKey,
            driver_number: driverNumbers[0],
          }).then(async (result) => {
            if (driverNumbers.length > 1) {
              const additionalPitStops = await Promise.all(
                driverNumbers.slice(1).map((driverNum) =>
                  openF1Api.getPitStops({
                    session_key: sessionKey,
                    driver_number: driverNum,
                  })
                )
              );
              return result.concat(...additionalPitStops.flat());
            }
            return result;
          }),
          openF1Api.getLaps({
            session_key: sessionKey,
            driver_number: driverNumbers[0],
          }).then(async (result) => {
            if (driverNumbers.length > 1) {
              const additionalLaps = await Promise.all(
                driverNumbers.slice(1).map((driverNum) =>
                  openF1Api.getLaps({
                    session_key: sessionKey,
                    driver_number: driverNum,
                  })
                )
              );
              return result.concat(...additionalLaps.flat());
            }
            return result;
          }),
        ]);

        console.log('✓ Tyre data loaded - Stints:', stintsResult.length, 'Pit Stops:', pitStopsResult.length, 'Laps:', lapsResult.length);
        if (stintsResult.length === 0 && pitStopsResult.length === 0) {
          setError('No tyre/pit data available for this session.');
        } else {
          setStints(stintsResult);
          setPitStops(pitStopsResult);
          setLaps(lapsResult);
          setError(null);
        }
      } catch (err: any) {
        const statusCode = err?.response?.status;
        let detailMsg = '';
        
        if (statusCode === 404) {
          detailMsg = 'Tyre data not yet available. Try selecting an earlier session (>4 hours old).';
        } else if (statusCode) {
          detailMsg = `Server error (HTTP ${statusCode}). Please check console for details.`;
        } else {
          detailMsg = `${err?.message || String(err)}`;
        }
        
        console.error('Tyre data fetch failed:', err);
        setError(`Failed to load tyre data. ${detailMsg}`);
      } finally {
        setLoading(false);
        onLoading?.(false);
      }
    };

    fetchData();
  }, [sessionKey, drivers, onLoading]);

  // Process stint data
  const stintData = useMemo(() => {
    const data: StintData[] = [];

    stints.forEach((stint) => {
      const driver = drivers.find((d) => d.driver_number === stint.driver_number);
      if (!driver) return;

      data.push({
        driverNumber: driver.driver_number,
        driverName: driver.broadcast_name,
        teamColour: driver.team_colour,
        stintNumber: stint.stint_number,
        compound: stint.compound,
        lapStart: stint.lap_start,
        lapEnd: stint.lap_end,
        tyreAge: stint.tyre_age_at_start,
        duration: stint.lap_end - stint.lap_start + 1,
      });
    });

    return data.sort(
      (a, b) =>
        a.driverNumber - b.driverNumber || a.stintNumber - b.stintNumber
    );
  }, [stints, drivers]);

  // Process pit stop data
  const pitStopData = useMemo(() => {
    const data: PitStopData[] = [];

    pitStops.forEach((pitStop) => {
      const driver = drivers.find((d) => d.driver_number === pitStop.driver_number);
      if (!driver) return;

      data.push({
        driverNumber: driver.driver_number,
        driverName: driver.broadcast_name,
        teamColour: driver.team_colour,
        pitStopNumber: pitStop.pit_stop_number,
        lapNumber: pitStop.lap_number,
        duration: Math.round(pitStop.duration_pit_stop * 1000) / 1000,
      });
    });

    return data.sort(
      (a, b) =>
        a.driverNumber - b.driverNumber || a.lapNumber - b.lapNumber
    );
  }, [pitStops, drivers]);

  // Process tire degradation data
  const degradationData = useMemo(() => {
    const data: DegradationPoint[] = [];

    laps.forEach((lap) => {
      const driver = drivers.find((d) => d.driver_number === lap.driver_number);
      const stint = stints.find(
        (s) =>
          s.driver_number === lap.driver_number &&
          lap.lap_number >= s.lap_start &&
          lap.lap_number <= s.lap_end
      );

      if (!driver || !stint) return;

      const lapAge = lap.lap_number - stint.lap_start;
      const lapTime = lap.lap_duration;

      data.push({
        driverNumber: driver.driver_number,
        driverName: driver.broadcast_name,
        teamColour: driver.team_colour,
        lapAge,
        lapTime,
      });
    });

    return data;
  }, [laps, stints, drivers]);

  interface CustomTooltipPayload {
    name?: string;
    value?: string | number;
    color?: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: CustomTooltipPayload[];
  }

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <ChartSkeleton title="Loading tyre data…" />;
  }

  if (error) {
    return (
      <StatusCard
        variant="warning"
        title="Tyre data unavailable"
        message={error.replace(/^Failed to load tyre data\.\s*/, '')}
        hint="Tip: Stint and pit-stop data are only available for completed races and qualifying sessions."
      />
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Tyre Analysis</h2>
        <p className="text-sm text-gray-400">
          Stint strategy, degradation, and pit stop analysis
        </p>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        {(['timeline', 'degradation'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {mode === 'timeline' ? 'Pit Stop Timeline' : 'Degradation'}
          </button>
        ))}
      </div>

      {/* Chart based on view mode */}
      {viewMode === 'timeline' ? (
        <div className="space-y-6">
          {/* Pit Stop Timeline Gantt-style Chart */}
          <div className="w-full h-64">
            {pitStopData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={pitStopData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="lapNumber"
                    stroke="#888"
                    label={{
                      value: 'Lap Number',
                      position: 'insideBottomRight',
                      offset: -5,
                      fill: '#888',
                    }}
                  />
                  <YAxis
                    stroke="#888"
                    label={{
                      value: 'Stop Duration (s)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#888',
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {drivers.map((driver) => (
                    <Line
                      key={driver.driver_number}
                      type="stepAfter"
                      dataKey="duration"
                      name={driver.broadcast_name}
                      stroke={driver.team_colour}
                      dot={{ r: 4 }}
                      isAnimationActive={false}
                      data={pitStopData.filter(
                        (p) => p.driverNumber === driver.driver_number
                      )}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No pit stop data available
              </div>
            )}
          </div>

          {/* Stint Table */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">Stint Details</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-gray-300 border-collapse">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="px-3 py-2 text-left text-white">Driver</th>
                    <th className="px-3 py-2 text-center">Stint</th>
                    <th className="px-3 py-2 text-center">Compound</th>
                    <th className="px-3 py-2 text-right">Laps</th>
                    <th className="px-3 py-2 text-right">Tyre Age</th>
                  </tr>
                </thead>
                <tbody>
                  {stintData.map((stint) => (
                    <tr
                      key={`${stint.driverNumber}-${stint.stintNumber}`}
                      className="border-b border-gray-700 hover:bg-gray-800"
                    >
                      <td className="px-3 py-2 font-medium text-white">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: stint.teamColour }}
                        ></span>
                        #{stint.driverNumber} {stint.driverName}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {stint.stintNumber}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-black"
                          style={{
                            backgroundColor:
                              compoundColors[stint.compound] || '#999999',
                          }}
                        >
                          {stint.compound}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {stint.duration}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {stint.tyreAge}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // Degradation scatter chart
        <div className="w-full h-96">
          {degradationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="lapAge"
                  type="number"
                  stroke="#888"
                  label={{
                    value: 'Tyre Age (laps)',
                    position: 'insideBottomRight',
                    offset: -5,
                    fill: '#888',
                  }}
                />
                <YAxis
                  dataKey="lapTime"
                  type="number"
                  stroke="#888"
                  label={{
                    value: 'Lap Time (s)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#888',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {drivers.map((driver) => (
                  <Scatter
                    key={driver.driver_number}
                    name={driver.broadcast_name}
                    data={degradationData.filter(
                      (d) => d.driverNumber === driver.driver_number
                    )}
                    fill={driver.team_colour}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No degradation data available
            </div>
          )}
        </div>
      )}

      {/* Pit Stop Table */}
      {pitStopData.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Pit Stops</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="px-3 py-2 text-left text-white">Driver</th>
                  <th className="px-3 py-2 text-center">Stop #</th>
                  <th className="px-3 py-2 text-center">Lap</th>
                  <th className="px-3 py-2 text-right">Duration (s)</th>
                </tr>
              </thead>
              <tbody>
                {pitStopData.map((stop) => (
                  <tr
                    key={`${stop.driverNumber}-${stop.pitStopNumber}`}
                    className="border-b border-gray-700 hover:bg-gray-800"
                  >
                    <td className="px-3 py-2 font-medium text-white">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: stop.teamColour }}
                      ></span>
                      #{stop.driverNumber} {stop.driverName}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {stop.pitStopNumber}
                    </td>
                    <td className="px-3 py-2 text-center">{stop.lapNumber}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {stop.duration.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TyreAnalysis;
