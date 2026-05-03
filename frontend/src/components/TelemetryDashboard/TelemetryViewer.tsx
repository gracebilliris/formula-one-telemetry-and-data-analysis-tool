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
} from 'recharts';
import type { Driver, CarData, Lap } from '../../types/openf1';
import { openF1Api } from '../../utils/openf1Api';
import { StatusCard, ChartSkeleton } from '../UI';

export interface TelemetryViewerProps {
  sessionKey: number;
  drivers: Driver[];
  onLoading?: (loading: boolean) => void;
}

type MetricType = 'speed' | 'throttle' | 'brake' | 'rpm' | 'gear' | 'drs';
type XAxisType = 'lap' | 'time';

interface TelemetryPoint {
  driverNumber: number;
  driverName: string;
  teamColour: string;
  timestamp: number;
  lapNumber: number;
  [key: string]: string | number;
}

const TelemetryViewer: React.FC<TelemetryViewerProps> = ({
  sessionKey,
  drivers,
  onLoading,
}) => {
  const [carData, setCarData] = useState<CarData[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('speed');
  const [selectedXAxis, setSelectedXAxis] = useState<XAxisType>('lap');

  const metrics: MetricType[] = ['speed', 'throttle', 'brake', 'rpm', 'gear', 'drs'];
  const metricLabels: Record<MetricType, string> = {
    speed: 'Speed (km/h)',
    throttle: 'Throttle (%)',
    brake: 'Brake Pressure',
    rpm: 'RPM',
    gear: 'Gear',
    drs: 'DRS',
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
        console.log('✓ Fetching telemetry for session:', sessionKey, 'drivers:', driverNumbers);

        // Fetch in parallel; tolerate per-driver failures (e.g. driver not in this session -> 404)
        const carResults = await Promise.allSettled(
          driverNumbers.map((dn) =>
            openF1Api.getCarData({ session_key: sessionKey, driver_number: dn })
          )
        );
        const lapResults = await Promise.allSettled(
          driverNumbers.map((dn) =>
            openF1Api.getLaps({ session_key: sessionKey, driver_number: dn })
          )
        );

        const carDataResult = carResults.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
        const lapsResult = lapResults.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

        const missingCarDrivers = carResults
          .map((r, i) => (r.status === 'rejected' ? driverNumbers[i] : null))
          .filter((x): x is number => x !== null);

        console.log('✓ Telemetry loaded - car points:', carDataResult.length, 'laps:', lapsResult.length, 'missing drivers:', missingCarDrivers);

        if (carDataResult.length === 0) {
          // All drivers failed: surface a single error
          const firstErr = carResults.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
          const statusCode = (firstErr?.reason as { response?: { status?: number } })?.response?.status;
          throw Object.assign(new Error('No telemetry returned for any selected driver.'), {
            response: { status: statusCode },
          });
        } else {
          setCarData(carDataResult);
          setLaps(lapsResult);
          if (missingCarDrivers.length > 0) {
            setError(
              `Telemetry not available for driver${missingCarDrivers.length > 1 ? 's' : ''} #${missingCarDrivers.join(', #')} in this session. Showing data for the others.`
            );
          } else {
            setError(null);
          }
        }
      } catch (err: any) {
        const statusCode = err?.response?.status;
        let detailMsg = '';

        if (statusCode === 404) {
          detailMsg = 'No telemetry recorded for the selected drivers in this session. The drivers may not have participated, or the data is still syncing (OpenF1 takes 1–4 hours after a session ends).';
        } else if (statusCode === 422) {
          detailMsg = 'This session type may not have telemetry available (e.g. some pre-season tests). Try a Grand Prix race weekend.';
        } else if (statusCode === 429) {
          detailMsg = 'API rate limit exceeded. Please wait a moment and try again.';
        } else if (statusCode && statusCode >= 400 && statusCode < 500) {
          detailMsg = `Request error (HTTP ${statusCode}). Please check your session and driver selections.`;
        } else if (statusCode && statusCode >= 500) {
          detailMsg = `OpenF1 API error (HTTP ${statusCode}). The service may be temporarily unavailable.`;
        } else {
          detailMsg = `${err?.message || String(err)}`;
        }

        console.error('Telemetry fetch failed:', err);
        setError(`Failed to load telemetry data. ${detailMsg}`);
      } finally {
        setLoading(false);
        onLoading?.(false);
      }
    };

    fetchData();
  }, [sessionKey, drivers, onLoading]);

  // Process data for chart
  const chartData = useMemo(() => {
    if (carData.length === 0 || drivers.length === 0) return [];

    // Group data by lap or time
    const groupedData: Record<string, TelemetryPoint> = {};

    carData.forEach((data) => {
      const driver = drivers.find((d) => d.driver_number === data.driver_number);
      if (!driver) return;

      const lap = laps.find(
        (l) =>
          l.driver_number === data.driver_number &&
          new Date(l.date_start) <= new Date(data.date)
      );

      const lapNum = lap?.lap_number || 0;
      const timestamp = new Date(data.date).getTime();

      let key: string;
      if (selectedXAxis === 'lap') {
        key = `lap_${lapNum}_${data.driver_number}`;
      } else {
        key = `time_${timestamp}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          driverNumber: data.driver_number,
          driverName: driver.broadcast_name,
          teamColour: driver.team_colour,
          timestamp,
          lapNumber: lapNum,
          [`${data.driver_number}_speed`]: Math.round(data.speed),
          [`${data.driver_number}_throttle`]: Math.round(data.throttle),
          [`${data.driver_number}_brake`]: Math.round(data.brake * 100) / 100,
          [`${data.driver_number}_rpm`]: Math.round(data.rpm),
          [`${data.driver_number}_gear`]: data.n_gear,
          [`${data.driver_number}_drs`]: data.drs,
        };
      } else {
        groupedData[key][`${data.driver_number}_speed`] = Math.round(
          data.speed
        );
        groupedData[key][`${data.driver_number}_throttle`] = Math.round(
          data.throttle
        );
        groupedData[key][`${data.driver_number}_brake`] =
          Math.round(data.brake * 100) / 100;
        groupedData[key][`${data.driver_number}_rpm`] = Math.round(data.rpm);
        groupedData[key][`${data.driver_number}_gear`] = data.n_gear;
        groupedData[key][`${data.driver_number}_drs`] = data.drs;
      }
    });

    // Convert to array and sort
    const result = Object.values(groupedData).sort((a, b) => {
      if (selectedXAxis === 'lap') {
        return a.lapNumber - b.lapNumber;
      } else {
        return a.timestamp - b.timestamp;
      }
    });

    // Resample data to reasonable amount for performance
    if (result.length > 100) {
      const step = Math.ceil(result.length / 100);
      return result.filter((_, i) => i % step === 0);
    }

    return result;
  }, [carData, drivers, laps, selectedXAxis]);

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

  // Distinguish hard errors (no data at all) from partial-data warnings.
  const isPartial = !!error && carData.length > 0;

  if (loading) {
    return <ChartSkeleton title="Loading telemetry data…" />;
  }

  if (error && !isPartial) {
    return (
      <StatusCard
        variant="warning"
        title="Telemetry data unavailable"
        message={error.replace(/^Failed to load telemetry data\.\s*/, '')}
        hint="Tip: Pre-season testing sessions and very recent races may not have telemetry yet. Try a completed Grand Prix race."
      />
    );
  }

  if (chartData.length === 0) {
    return (
      <StatusCard
        variant="empty"
        icon="📊"
        title="No telemetry data"
        message="No telemetry data points were returned for this session and driver selection."
      />
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
      {isPartial && (
        <StatusCard
          variant="info"
          compact
          title="Partial data"
          message={error!.replace(/^Failed to load telemetry data\.\s*/, '')}
        />
      )}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Telemetry Data</h2>
        <p className="text-sm text-gray-400">
          Overlay telemetry traces for selected drivers
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Metric
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          >
            {metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metricLabels[metric]}
              </option>
            ))}
          </select>
        </div>

        {/* X-Axis Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            X-Axis
          </label>
          <div className="flex gap-2">
            {(['lap', 'time'] as const).map((axis) => (
              <button
                key={axis}
                onClick={() => setSelectedXAxis(axis)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedXAxis === axis
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {axis === 'lap' ? 'Lap Number' : 'Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey={selectedXAxis === 'lap' ? 'lapNumber' : 'timestamp'}
              stroke="#888"
              label={{
                value: selectedXAxis === 'lap' ? 'Lap Number' : 'Time',
                position: 'insideBottomRight',
                offset: -5,
                fill: '#888',
              }}
              tickFormatter={(value) => {
                if (selectedXAxis === 'time') {
                  return new Date(value).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                }
                return String(value);
              }}
            />
            <YAxis
              stroke="#888"
              label={{
                value: metricLabels[selectedMetric],
                angle: -90,
                position: 'insideLeft',
                fill: '#888',
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Render a line for each driver */}
            {drivers.map((driver) => (
              <Line
                key={driver.driver_number}
                type="monotone"
                dataKey={`${driver.driver_number}_${selectedMetric}`}
                name={driver.broadcast_name}
                stroke={driver.team_colour}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Driver Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {drivers.map((driver) => (
          <div key={driver.driver_number} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: driver.team_colour }}
            ></div>
            <span className="text-sm text-gray-300">
              #{driver.driver_number} {driver.broadcast_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TelemetryViewer;
