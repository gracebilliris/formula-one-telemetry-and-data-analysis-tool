import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RaceStrategy, StintInfo } from '../../utils/raceAnalysis';

interface StrategyGanttProps {
  strategies: RaceStrategy[];
  drivers: Map<number, string>;
  teamColors: Map<number, string>;
  isLoading?: boolean;
  error?: string | null; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface GanttData {
  driver: string;
  driverNumber: number;
  stints: (StintInfo & { color: string; xStart: number; width: number })[];
}

const TIRE_COLORS = {
  soft: '#DC2626', // red
  medium: '#FCD34D', // yellow
  hard: '#F3F4F6', // white/light gray
  intermediate: '#60A5FA', // blue
  wet: '#3B82F6', // darker blue
};

const getTireColor = (compound: string): string => {
  const lower = compound.toLowerCase();
  if (lower.includes('soft')) return TIRE_COLORS.soft;
  if (lower.includes('medium')) return TIRE_COLORS.medium;
  if (lower.includes('hard')) return TIRE_COLORS.hard;
  if (lower.includes('inter')) return TIRE_COLORS.intermediate;
  if (lower.includes('wet')) return TIRE_COLORS.wet;
  return TIRE_COLORS.hard;
};

export const StrategyGantt: React.FC<StrategyGanttProps> = ({
  strategies,
  drivers,
  teamColors,
  isLoading = false,
  error = null,
}) => {
  const [hoveredStint, setHoveredStint] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-700 rounded-full animate-spin mb-3 mx-auto" />
          <p className="text-gray-300">Loading strategy data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100">
        <p className="font-semibold">Error loading strategies</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <p className="text-gray-400">No strategy data available</p>
      </div>
    );
  }

  // Get top 10 drivers by number of overtakes
  const top10Drivers = strategies
    .sort((a, b) => b.totalOvertakes - a.totalOvertakes)
    .slice(0, 10);

  // Find max lap for scaling
  const maxLap = Math.max(...top10Drivers.flatMap((s) => s.stints.map((st) => st.lapEnd)));

  // Prepare Gantt data
  const ganttData = top10Drivers.map((strategy) => {
    const stintsWithPosition = strategy.stints.map((stint) => ({
      ...stint,
      color: getTireColor(stint.compound),
      xStart: stint.lapStart,
      width: stint.duration,
    }));

    return {
      driver: drivers.get(strategy.driver) || `#${strategy.driver}`,
      driverNumber: strategy.driver,
      stints: stintsWithPosition,
    } as GanttData;
  });

  // Custom Gantt chart using SVG
  const GanttChart = () => {
    const chartHeight = 400;
    const rowHeight = chartHeight / ganttData.length;
    const chartWidth = 800;
    const lapWidth = (chartWidth - 100) / maxLap;

    return (
      <div className="overflow-x-auto bg-gray-800 rounded-lg p-4">
        <svg width={chartWidth + 100} height={chartHeight + 40} className="bg-gray-900 rounded">
          {/* Y-axis labels */}
          {ganttData.map((data, idx) => (
            <text
              key={`label-${idx}`}
              x={10}
              y={idx * rowHeight + rowHeight / 2 + 15}
              fontSize="12"
              fill="#D1D5DB"
              textAnchor="start"
            >
              {data.driver}
            </text>
          ))}

          {/* Grid and stints */}
          {ganttData.map((data, idx) => (
            <g key={`row-${idx}`}>
              {/* Background alternating */}
              <rect
                x={100}
                y={idx * rowHeight}
                width={chartWidth - 100}
                height={rowHeight}
                fill={idx % 2 === 0 ? '#1F2937' : '#111827'}
              />

              {/* Stint bars */}
              {data.stints.map((stint, stintIdx) => {
                const x = 100 + stint.xStart * lapWidth;
                const width = stint.width * lapWidth;
                const key = `${data.driverNumber}-${stintIdx}`;
                const isHovered = hoveredStint === key;

                return (
                  <g
                    key={key}
                    onMouseEnter={() => setHoveredStint(key)}
                    onMouseLeave={() => setHoveredStint(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={idx * rowHeight + 5}
                      width={width}
                      height={rowHeight - 10}
                      fill={stint.color}
                      opacity={isHovered ? 1 : 0.8}
                      rx={2}
                    />
                    {width > 40 && (
                      <text
                        x={x + width / 2}
                        y={idx * rowHeight + rowHeight / 2 + 5}
                        fontSize="11"
                        fill={stint.compound.includes('soft') || stint.compound.includes('medium') ? '#000' : '#fff'}
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {stint.compound.charAt(0).toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {/* X-axis */}
          <line x1="100" y1={chartHeight} x2={chartWidth + 100} y2={chartHeight} stroke="#4B5563" strokeWidth="1" />

          {/* Lap markers */}
          {Array.from({ length: Math.min(10, maxLap + 1) }).map((_, i) => {
            const lap = Math.floor((i / 10) * maxLap);
            const x = 100 + lap * lapWidth;
            return (
              <g key={`lap-${i}`}>
                <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="#6B7280" strokeWidth="1" />
                <text x={x} y={chartHeight + 20} fontSize="11" fill="#9CA3AF" textAnchor="middle">
                  L{lap}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Strategy Gantt Chart</h2>
      <p className="text-gray-400 text-sm mb-6">Top 10 drivers - pit strategies and tire compounds</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(TIRE_COLORS).map(([compound, color]) => (
          <div key={compound} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-300 capitalize">{compound}</span>
          </div>
        ))}
      </div>

      {/* Gantt Chart */}
      <GanttChart />

      {/* Hover tooltip info */}
      {hoveredStint && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-300">
            Hover over stints to see details. Lap numbers on X-axis show estimated pit lap window.
          </p>
        </div>
      )}

      {/* Summary table */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-3">Strategy Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2 text-gray-400 font-semibold">Driver</th>
                <th className="text-left p-2 text-gray-400 font-semibold">Stints</th>
                <th className="text-left p-2 text-gray-400 font-semibold">Undercut</th>
                <th className="text-left p-2 text-gray-400 font-semibold">Overcut</th>
              </tr>
            </thead>
            <tbody>
              {ganttData.map((data, idx) => {
                const strategy = top10Drivers[idx];
                return (
                  <tr key={data.driverNumber} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: teamColors.get(data.driverNumber) || '#999' }}
                        />
                        <span className="text-white font-medium">{data.driver}</span>
                      </div>
                    </td>
                    <td className="p-2 text-gray-300">
                      {strategy.stints
                        .map((s) => s.compound.charAt(0).toUpperCase())
                        .join('→')}
                    </td>
                    <td className="p-2">
                      <span className={strategy.undercut ? 'text-green-400' : 'text-gray-500'}>
                        {strategy.undercut ? '✓' : '–'}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={strategy.overcut ? 'text-green-400' : 'text-gray-500'}>
                        {strategy.overcut ? '✓' : '–'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
