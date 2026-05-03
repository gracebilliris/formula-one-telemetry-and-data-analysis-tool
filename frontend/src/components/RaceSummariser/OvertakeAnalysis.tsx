import React, { useState, useMemo } from 'react';
import type { RaceEvent, OvertakeEvent } from '../../utils/raceAnalysis';

interface OvertakeAnalysisProps {
  events: RaceEvent[];
  drivers: Map<number, string>;
  teamColors: Map<number, string>;
  isLoading?: boolean;
  error?: string | null;
}

type SortField = 'lap' | 'overtaker' | 'type';

export const OvertakeAnalysis: React.FC<OvertakeAnalysisProps> = ({
  events,
  drivers,
  teamColors,
  isLoading = false,
  error = null,
}) => {
  const [sortField, setSortField] = useState<SortField>('lap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterDRS, setFilterDRS] = useState<'all' | 'drs' | 'racing'>('all');

  // Extract overtakes from events
  const overtakes = useMemo(
    () => events.filter((e): e is OvertakeEvent => e.type === 'overtake'),
    [events]
  );

  // Count overtakes by driver
  const overtakesByDriver = useMemo(() => {
    const map = new Map<number, { total: number; drs: number; racing: number }>();
    overtakes.forEach((o) => {
      if (!map.has(o.overtaker)) {
        map.set(o.overtaker, { total: 0, drs: 0, racing: 0 });
      }
      const stats = map.get(o.overtaker)!;
      stats.total++;
      if (o.isDRS) {
        stats.drs++;
      } else {
        stats.racing++;
      }
    });
    return map;
  }, [overtakes]);

  // Filter and sort overtakes
  const filteredAndSorted = useMemo(() => {
    let filtered = [...overtakes];

    // Apply DRS filter
    if (filterDRS === 'drs') {
      filtered = filtered.filter((o) => o.isDRS);
    } else if (filterDRS === 'racing') {
      filtered = filtered.filter((o) => !o.isDRS);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'lap':
          comparison = a.lap - b.lap;
          break;
        case 'overtaker':
          comparison = a.overtaker - b.overtaker;
          break;
        case 'type':
          comparison = (a.isDRS ? 1 : 0) - (b.isDRS ? 1 : 0);
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [overtakes, sortField, sortDir, filterDRS]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getTeamColor = (driverNumber: number): string => {
    return teamColors.get(driverNumber) || '#999999';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-700 rounded-full animate-spin mb-3 mx-auto" />
          <p className="text-gray-300">Loading overtake data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100">
        <p className="font-semibold">Error loading overtakes</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (overtakes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <p className="text-gray-400">No overtakes in this race</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Overtake Analysis</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Overtakes</p>
          <p className="text-3xl font-bold text-white">{overtakes.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">DRS Overtakes</p>
          <p className="text-3xl font-bold text-blue-400">{overtakes.filter((o) => o.isDRS).length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Racing Overtakes</p>
          <p className="text-3xl font-bold text-green-400">{overtakes.filter((o) => !o.isDRS).length}</p>
        </div>
      </div>

      {/* Top Overtakers */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Top Overtakers</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from(overtakesByDriver.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 6)
            .map(([driverNum, stats]) => (
              <div key={driverNum} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getTeamColor(driverNum) }}
                />
                <div className="flex-1">
                  <p className="text-white font-medium">{drivers.get(driverNum) || `#${driverNum}`}</p>
                  <p className="text-xs text-gray-400">
                    {stats.total} total • {stats.drs} DRS • {stats.racing} racing
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterDRS('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterDRS === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All ({overtakes.length})
        </button>
        <button
          onClick={() => setFilterDRS('drs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterDRS === 'drs'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          DRS ({overtakes.filter((o) => o.isDRS).length})
        </button>
        <button
          onClick={() => setFilterDRS('racing')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterDRS === 'racing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Racing ({overtakes.filter((o) => !o.isDRS).length})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-gray-400 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('overtaker')}>
                Overtaker {sortField === 'overtaker' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="text-left p-3 text-gray-400 font-semibold">Overtaken</th>
              <th className="text-left p-3 text-gray-400 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('lap')}>
                Lap {sortField === 'lap' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="text-left p-3 text-gray-400 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('type')}>
                Type {sortField === 'type' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="text-left p-3 text-gray-400 font-semibold">Position</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((overtake, idx) => (
              <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTeamColor(overtake.overtaker) }}
                    />
                    <span className="text-white font-medium">
                      {drivers.get(overtake.overtaker) || `#${overtake.overtaker}`}
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTeamColor(overtake.overtaken) }}
                    />
                    <span className="text-gray-300">
                      {drivers.get(overtake.overtaken) || `#${overtake.overtaken}`}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-gray-300">{overtake.lap}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      overtake.isDRS
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-green-900 text-green-200'
                    }`}
                  >
                    {overtake.isDRS ? 'DRS' : 'Racing'}
                  </span>
                </td>
                <td className="p-3 text-gray-300">P{overtake.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-400 text-center">
        Showing {filteredAndSorted.length} of {overtakes.length} overtakes
      </div>
    </div>
  );
};
