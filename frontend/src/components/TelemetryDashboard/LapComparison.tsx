import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Driver, Lap } from '../../types/openf1';
import { openF1Api } from '../../utils/openf1Api';
import { StatusCard, ChartSkeleton } from '../UI';

export interface LapComparisonProps {
  sessionKey: number;
  drivers: Driver[];
  onLoading?: (loading: boolean) => void;
}

interface LapComparisonData {
  driverNumber: number;
  driverName: string;
  teamColour: string;
  lapNumber: number;
  s1: number;
  s2: number;
  s3: number;
  total: number;
  s1Delta: number;
  s2Delta: number;
  s3Delta: number;
  totalDelta: number;
}

interface ChartDataPoint {
  lap: string;
  [key: string]: string | number;
}

const LapComparison: React.FC<LapComparisonProps> = ({
  sessionKey,
  drivers,
  onLoading,
}) => {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sectors' | 'total'>('sectors');
  const [selectedSector, setSelectedSector] = useState<'s1' | 's2' | 's3'>('s1');

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
        console.log('✓ Fetching lap data for session:', sessionKey, 'drivers:', driverNumbers);

        // Fetch laps for all drivers
        const lapsPromises = driverNumbers.map((driverNum) =>
          openF1Api.getLaps({
            session_key: sessionKey,
            driver_number: driverNum,
          })
        );

        const lapsResults = await Promise.all(lapsPromises);
        const allLaps = lapsResults.flat();

        console.log('✓ Laps loaded:', allLaps.length);
        if (allLaps.length === 0) {
          setError('No lap data available for this session.');
        } else {
          setLaps(allLaps);
          setError(null);
        }
      } catch (err: any) {
        const statusCode = err?.response?.status;
        let detailMsg = '';
        
        if (statusCode === 404) {
          detailMsg = 'Lap data not yet available. Try selecting an earlier session (>4 hours old).';
        } else if (statusCode) {
          detailMsg = `Server error (HTTP ${statusCode}). Please check console for details.`;
        } else {
          detailMsg = `${err?.message || String(err)}`;
        }
        
        console.error('Lap data fetch failed:', err);
        setError(`Failed to load lap data. ${detailMsg}`);
      } finally {
        setLoading(false);
        onLoading?.(false);
      }
    };

    fetchData();
  }, [sessionKey, drivers, onLoading]);

  // Process data for comparison
  const comparisonData = useMemo(() => {
    if (laps.length === 0) return [];

    const data: LapComparisonData[] = [];

    laps.forEach((lap) => {
      const driver = drivers.find((d) => d.driver_number === lap.driver_number);
      if (!driver) return;

      const s1 = Math.round(lap.duration_sector_1 * 1000) / 1000;
      const s2 = Math.round(lap.duration_sector_2 * 1000) / 1000;
      const s3 = Math.round(lap.duration_sector_3 * 1000) / 1000;
      const total = s1 + s2 + s3;

      data.push({
        driverNumber: driver.driver_number,
        driverName: driver.broadcast_name,
        teamColour: driver.team_colour,
        lapNumber: lap.lap_number,
        s1,
        s2,
        s3,
        total,
        s1Delta: 0,
        s2Delta: 0,
        s3Delta: 0,
        totalDelta: 0,
      });
    });

    // Calculate deltas from fastest sector/lap
    const s1Times = data.map((d) => d.s1);
    const s2Times = data.map((d) => d.s2);
    const s3Times = data.map((d) => d.s3);
    const totalTimes = data.map((d) => d.total);

    const fastestS1 = Math.min(...s1Times);
    const fastestS2 = Math.min(...s2Times);
    const fastestS3 = Math.min(...s3Times);
    const fastestTotal = Math.min(...totalTimes);

    data.forEach((d) => {
      d.s1Delta = d.s1 - fastestS1;
      d.s2Delta = d.s2 - fastestS2;
      d.s3Delta = d.s3 - fastestS3;
      d.totalDelta = d.total - fastestTotal;
    });

    return data.sort((a, b) => a.lapNumber - b.lapNumber);
  }, [laps, drivers]);

  // Format data for chart
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (viewMode === 'sectors') {
      return comparisonData.map((d) => ({
        lap: `Lap ${d.lapNumber}`,
        [`${d.driverNumber}_s1`]: parseFloat(d.s1.toFixed(3)),
        [`${d.driverNumber}_s2`]: parseFloat(d.s2.toFixed(3)),
        [`${d.driverNumber}_s3`]: parseFloat(d.s3.toFixed(3)),
      }));
    } else {
      return comparisonData.map((d) => ({
        lap: `Lap ${d.lapNumber}`,
        [`${d.driverNumber}`]: parseFloat(d.total.toFixed(3)),
      }));
    }
  }, [comparisonData, viewMode]);

  interface CustomTooltipPayload {
    name?: string;
    value?: number;
    color?: string;
    payload?: { lap: string };
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
          <p className="text-sm font-medium text-gray-300 mb-2">
            {payload[0].payload?.lap}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {(entry.value as number)?.toFixed(3)}s
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <ChartSkeleton title="Loading lap data…" />;
  }

  if (error) {
    return (
      <StatusCard
        variant="warning"
        title="Lap data unavailable"
        message={error.replace(/^Failed to load lap data\.\s*/, '')}
        hint="Tip: Try selecting a completed Grand Prix race for full lap-by-lap analysis."
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <StatusCard
        variant="empty"
        icon="🏁"
        title="No lap data"
        message="No laps were returned for the selected session."
      />
    );
  }

  // Get sample for chart (last 10 laps for readability)
  const chartDataSample = chartData.slice(-10);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Lap Comparison</h2>
        <p className="text-sm text-gray-400">
          Sector times and delta analysis for selected drivers
        </p>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        {(['sectors', 'total'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {mode === 'sectors' ? 'By Sector' : 'Total Time'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartDataSample}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="lap" stroke="#888" />
            <YAxis
              stroke="#888"
              label={{
                value: 'Time (seconds)',
                angle: -90,
                position: 'insideLeft',
                fill: '#888',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Render bars for each driver */}
            {drivers.map((driver) => (
              <Bar
                key={driver.driver_number}
                dataKey={
                  viewMode === 'sectors'
                    ? `${driver.driver_number}_${selectedSector}`
                    : `${driver.driver_number}`
                }
                fill={driver.team_colour}
                name={driver.broadcast_name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sector Selector (for sectors mode) */}
      {viewMode === 'sectors' && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">Sector</p>
          <div className="flex gap-2">
            {(['s1', 's2', 's3'] as const).map((sector) => (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedSector === sector
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {sector.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delta Table */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">Delta from Best Time</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300 border-collapse">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="px-3 py-2 text-left text-white">Driver</th>
                <th className="px-3 py-2 text-right">S1 Δ</th>
                <th className="px-3 py-2 text-right">S2 Δ</th>
                <th className="px-3 py-2 text-right">S3 Δ</th>
                <th className="px-3 py-2 text-right">Total Δ</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData
                .slice(-10)
                .map((data) => (
                  <tr
                    key={`${data.driverNumber}-${data.lapNumber}`}
                    className="border-b border-gray-700 hover:bg-gray-800"
                  >
                    <td className="px-3 py-2 font-medium text-white">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: data.teamColour }}
                      ></span>
                      #{data.driverNumber} {data.driverName}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        data.s1Delta === 0
                          ? 'text-green-400 font-bold'
                          : 'text-gray-300'
                      }`}
                    >
                      {data.s1Delta === 0 ? '—' : `+${data.s1Delta.toFixed(3)}`}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        data.s2Delta === 0
                          ? 'text-green-400 font-bold'
                          : 'text-gray-300'
                      }`}
                    >
                      {data.s2Delta === 0 ? '—' : `+${data.s2Delta.toFixed(3)}`}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        data.s3Delta === 0
                          ? 'text-green-400 font-bold'
                          : 'text-gray-300'
                      }`}
                    >
                      {data.s3Delta === 0 ? '—' : `+${data.s3Delta.toFixed(3)}`}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        data.totalDelta === 0
                          ? 'text-green-400 font-bold'
                          : 'text-gray-300'
                      }`}
                    >
                      {data.totalDelta === 0
                        ? '—'
                        : `+${data.totalDelta.toFixed(3)}`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LapComparison;
