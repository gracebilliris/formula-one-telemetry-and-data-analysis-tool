import React, { useState, useEffect } from 'react';
import type { Driver } from '../../types/openf1';
import { openF1Api } from '../../utils/openf1Api';

export interface DriverSelectorProps {
  onDriversSelect: (drivers: Driver[]) => void;
  selectedDriverNumbers?: number[];
  maxDrivers?: number;
}

const DriverSelector: React.FC<DriverSelectorProps> = ({
  onDriversSelect,
  selectedDriverNumbers = [],
  maxDrivers = 5,
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(
    new Set(selectedDriverNumbers)
  );
  const [sortBy, setSortBy] = useState<'name' | 'team' | 'number'>(
    'name'
  );

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const driversData = await openF1Api.getDrivers();
        
        // Sort by name by default
        driversData.sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        );
        
        setDrivers(driversData);
        setError(null);
      } catch (err) {
        setError('Failed to load drivers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // Sort drivers based on selected sort option
  const sortedDrivers = [...drivers].sort((a, b) => {
    if (sortBy === 'name') {
      return a.full_name.localeCompare(b.full_name);
    } else if (sortBy === 'team') {
      return a.team_name.localeCompare(b.team_name);
    } else {
      return a.driver_number - b.driver_number;
    }
  });

  const handleDriverToggle = (driverNumber: number) => {
    const newSelected = new Set(selectedNumbers);

    if (newSelected.has(driverNumber)) {
      newSelected.delete(driverNumber);
    } else {
      if (newSelected.size < maxDrivers) {
        newSelected.add(driverNumber);
      } else {
        // Show feedback that max is reached
        return;
      }
    }

    setSelectedNumbers(newSelected);

    // Call callback with selected drivers
    const selectedDrivers = drivers.filter((d) =>
      newSelected.has(d.driver_number)
    );
    onDriversSelect(selectedDrivers);
  };

  const getSelectedDrivers = () => {
    return drivers.filter((d) => selectedNumbers.has(d.driver_number));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading drivers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  const selectedDriversList = getSelectedDrivers();
  const canSelectMore = selectedNumbers.size < maxDrivers;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Select Drivers</h2>
        <p className="text-sm text-gray-400">
          Choose up to {maxDrivers} drivers to compare
        </p>
      </div>

      {/* Selected Drivers Badges */}
      {selectedDriversList.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">
            Selected ({selectedNumbers.size}/{maxDrivers})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDriversList.map((driver) => (
              <div
                key={driver.driver_number}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm font-medium"
                style={{
                  backgroundColor: `${driver.team_colour}20`,
                  borderColor: driver.team_colour,
                  borderWidth: '1px',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: driver.team_colour }}
                ></span>
                <span>
                  #{driver.driver_number} {driver.broadcast_name}
                </span>
                <button
                  onClick={() => handleDriverToggle(driver.driver_number)}
                  className="ml-1 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canSelectMore && (
        <div className="p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg text-yellow-400 text-sm">
          Maximum {maxDrivers} drivers selected
        </div>
      )}

      {/* Sort Options */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Sort by
        </label>
        <div className="flex gap-2">
          {(['name', 'team', 'number'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                sortBy === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Drivers List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedDrivers.map((driver) => {
          const isSelected = selectedNumbers.has(driver.driver_number);

          return (
            <button
              key={driver.driver_number}
              onClick={() => handleDriverToggle(driver.driver_number)}
              disabled={!isSelected && !canSelectMore}
              className={`w-full text-left p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-gray-800 border-gray-500'
                  : 'bg-gray-800 border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-500'
                  }`}
                >
                  {isSelected && (
                    <span className="text-white font-bold">✓</span>
                  )}
                </div>

                {/* Driver Info */}
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    #{driver.driver_number}{' '}
                    <span className="text-blue-400">{driver.broadcast_name}</span>
                  </p>
                  <p className="text-sm text-gray-400">{driver.team_name}</p>
                </div>

                {/* Team Color Badge */}
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: driver.team_colour }}
                  title={driver.team_name}
                ></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DriverSelector;
