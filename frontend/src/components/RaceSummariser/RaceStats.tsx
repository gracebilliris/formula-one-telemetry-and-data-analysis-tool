import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RaceEvent, OvertakeEvent, LeaderChangeEvent } from '../../utils/raceAnalysis';

interface RaceStatsProps {
  events: RaceEvent[];
  drivers: Map<number, string>;
  teamColors: Map<number, string>;
  isLoading?: boolean;
  error?: string | null;
}

export const RaceStats: React.FC<RaceStatsProps> = ({
  events,
  drivers,
  teamColors,
  isLoading = false,
  error = null,
}) => {
  const stats = useMemo(() => {
    const overtakes = events.filter((e): e is OvertakeEvent => e.type === 'overtake');
    const leaderChanges = events.filter((e): e is LeaderChangeEvent => e.type === 'leader_change');
    const drsOvertakes = overtakes.filter((o) => o.isDRS).length;
    const racingOvertakes = overtakes.filter((o) => !o.isDRS).length;

    // Count overtakes per driver
    const overtakesPerDriver = new Map<number, number>();
    overtakes.forEach((o) => {
      overtakesPerDriver.set(o.overtaker, (overtakesPerDriver.get(o.overtaker) || 0) + 1);
    });

    // Get top overtakers
    const topOvertakers = Array.from(overtakesPerDriver.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Track laps led (simple estimation from leader changes)
    const lapsLedMap = new Map<number, number>();
    leaderChanges.forEach((lc) => {
      const currentLaps = lapsLedMap.get(lc.driver) || 0;
      lapsLedMap.set(lc.driver, currentLaps + (lc.lap || 5)); // rough estimate
    });

    const topLeaders = Array.from(lapsLedMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalOvertakes: overtakes.length,
      drsOvertakes,
      racingOvertakes,
      leaderChanges: leaderChanges.length,
      topOvertakers,
      topLeaders,
      overtakesPerDriver,
    };
  }, [events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-700 rounded-full animate-spin mb-3 mx-auto" />
          <p className="text-gray-300">Loading race statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100">
        <p className="font-semibold">Error loading race stats</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Prepare data for charts
  const overtakesChartData = stats.topOvertakers.map(([driverNum, count]) => ({
    driver: drivers.get(driverNum) || `#${driverNum}`,
    overtakes: count,
    driverNumber: driverNum,
  }));

  const drsTypeData = [
    { name: 'DRS Overtakes', value: stats.drsOvertakes, color: '#3B82F6' },
    { name: 'Racing Overtakes', value: stats.racingOvertakes, color: '#10B981' },
  ];

  const lapsLedData = stats.topLeaders.map(([driverNum, laps]) => ({
    driver: drivers.get(driverNum) || `#${driverNum}`,
    lapsLed: laps,
    driverNumber: driverNum,
  }));

  const CustomTooltip = (props: any) => {
    if (!props.active || !props.payload) return null;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs">
        {props.payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Race Statistics</h2>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm font-medium">Total Overtakes</p>
          <p className="text-4xl font-bold text-white mt-2">{stats.totalOvertakes}</p>
          <p className="text-xs text-blue-200 mt-2">Race activity: {stats.totalOvertakes > 30 ? 'High' : 'Moderate'}</p>
        </div>

        <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm font-medium">Racing Overtakes</p>
          <p className="text-4xl font-bold text-white mt-2">{stats.racingOvertakes}</p>
          <p className="text-xs text-green-200 mt-2">
            {stats.totalOvertakes > 0 ? `${((stats.racingOvertakes / stats.totalOvertakes) * 100).toFixed(0)}%` : '0%'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-900 to-cyan-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm font-medium">DRS Overtakes</p>
          <p className="text-4xl font-bold text-white mt-2">{stats.drsOvertakes}</p>
          <p className="text-xs text-cyan-200 mt-2">
            {stats.totalOvertakes > 0 ? `${((stats.drsOvertakes / stats.totalOvertakes) * 100).toFixed(0)}%` : '0%'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-4">
          <p className="text-gray-300 text-sm font-medium">Leader Changes</p>
          <p className="text-4xl font-bold text-white mt-2">{stats.leaderChanges}</p>
          <p className="text-xs text-purple-200 mt-2">Throughout race</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* DRS vs Racing Overtakes Pie Chart */}
        {stats.totalOvertakes > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Overtake Type Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={drsTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {drsTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Overtakers Bar Chart */}
        {overtakesChartData.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Top Overtakers</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={overtakesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="driver" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="overtakes" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {overtakesChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={teamColors.get(entry.driverNumber) || '#3B82F6'}
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Laps Led Board */}
      {lapsLedData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Estimated Laps Led</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={lapsLedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis dataKey="driver" type="category" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="lapsLed" fill="#10B981" radius={[0, 4, 4, 0]}>
                {lapsLedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={teamColors.get(entry.driverNumber) || '#10B981'}
                    opacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Most Aggressive Drivers</h3>
          <div className="space-y-2">
            {stats.topOvertakers.slice(0, 3).map(([driverNum, count], idx) => (
              <div key={driverNum} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-300">#{idx + 1}</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: teamColors.get(driverNum) || '#999' }}
                  />
                  <span className="text-white font-medium">{drivers.get(driverNum) || `#${driverNum}`}</span>
                </div>
                <span className="text-blue-400 font-semibold">{count} overtakes</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Race Control Events</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <span className="text-gray-300">Safety Cars</span>
              <span className="text-yellow-400 font-semibold">
                {events.filter((e) => e.type === 'safety_car').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <span className="text-gray-300">Red Flags</span>
              <span className="text-red-400 font-semibold">
                {events.filter((e) => e.type === 'red_flag').length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <span className="text-gray-300">DNFs</span>
              <span className="text-red-500 font-semibold">
                {events.filter((e) => e.type === 'dnf').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
