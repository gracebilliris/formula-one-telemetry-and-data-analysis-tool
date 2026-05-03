import React, { useState, useMemo } from 'react';
import type { PredictionResult } from '../../utils/racePredictor';

interface PredictionViewerProps {
  predictions: PredictionResult[];
  actualResults?: Record<number, number>; // driver number -> actual position
  sortBy?: 'predicted' | 'qualifying' | 'confidence';
}

type SortOption = 'predicted' | 'qualifying' | 'confidence' | 'name';

/**
 * Component to display predicted race order with actual results comparison
 */
export const PredictionViewer: React.FC<PredictionViewerProps> = ({
  predictions,
  actualResults = {},
  sortBy: initialSort = 'predicted',
}) => {
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);

  // Sort predictions based on selected criterion
  const sortedPredictions = useMemo(() => {
    const sorted = [...predictions];

    switch (sortBy) {
      case 'predicted':
        return sorted.sort((a, b) => a.predictedPosition - b.predictedPosition);
      case 'qualifying':
        return sorted.sort(
          (a, b) => (a.qualifyingPosition || 999) - (b.qualifyingPosition || 999)
        );
      case 'confidence':
        return sorted.sort((a, b) => b.confidence - a.confidence);
      case 'name':
        return sorted.sort((a, b) => a.driverName.localeCompare(b.driverName));
      default:
        return sorted;
    }
  }, [predictions, sortBy]);

  const hasActualResults = Object.keys(actualResults).length > 0;

  const isCorrect = (prediction: PredictionResult): boolean | null => {
    if (!hasActualResults) return null;
    const actualPos = actualResults[prediction.driverNumber];
    return actualPos === prediction.predictedPosition;
  };

  const accurateCount = sortedPredictions.filter(
    p => isCorrect(p) === true
  ).length;
  const accuracyPercentage =
    hasActualResults && sortedPredictions.length > 0
      ? Math.round((accurateCount / sortedPredictions.length) * 100)
      : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {sortedPredictions.length}
          </div>
          <div className="text-gray-400 text-sm">Predictions</div>
        </div>

        <div className="bg-gray-800 rounded p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {(
              sortedPredictions.reduce((sum, p) => sum + p.confidence, 0) /
              sortedPredictions.length
            ).toFixed(1)}
            %
          </div>
          <div className="text-gray-400 text-sm">Avg Confidence</div>
        </div>

        {accuracyPercentage !== null && (
          <div className="bg-gray-800 rounded p-3 text-center">
            <div
              className={`text-2xl font-bold ${
                accuracyPercentage >= 70 ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              {accuracyPercentage}%
            </div>
            <div className="text-gray-400 text-sm">Accuracy</div>
          </div>
        )}
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setSortBy('predicted')}
          className={`px-3 py-1 rounded text-sm ${
            sortBy === 'predicted'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Predicted Position
        </button>
        <button
          onClick={() => setSortBy('qualifying')}
          className={`px-3 py-1 rounded text-sm ${
            sortBy === 'qualifying'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Qualifying
        </button>
        <button
          onClick={() => setSortBy('confidence')}
          className={`px-3 py-1 rounded text-sm ${
            sortBy === 'confidence'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Confidence
        </button>
        <button
          onClick={() => setSortBy('name')}
          className={`px-3 py-1 rounded text-sm ${
            sortBy === 'name'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Name
        </button>
      </div>

      {/* Predictions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900">
              <th className="px-4 py-2 text-left text-gray-300">Pos</th>
              <th className="px-4 py-2 text-left text-gray-300">Driver</th>
              <th className="px-4 py-2 text-center text-gray-300">Qual Pos</th>
              <th className="px-4 py-2 text-center text-gray-300">Predicted Pos</th>
              <th className="px-4 py-2 text-center text-gray-300">Confidence</th>
              {hasActualResults && (
                <th className="px-4 py-2 text-center text-gray-300">Actual Pos</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedPredictions.map((prediction, idx) => {
              const correct = isCorrect(prediction);
              const rowClass =
                correct === true
                  ? 'bg-green-900/20 hover:bg-green-900/30'
                  : correct === false
                    ? 'bg-red-900/20 hover:bg-red-900/30'
                    : 'bg-gray-800/50 hover:bg-gray-800';

              return (
                <tr key={prediction.driverNumber} className={`border-b border-gray-700 ${rowClass} transition-colors`}>
                  <td className="px-4 py-3 font-bold text-red-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-white font-medium">
                    {prediction.driverName}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">
                    {prediction.qualifyingPosition || '-'}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-white">
                    {prediction.predictedPosition}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${prediction.confidence}%` }}
                        />
                      </div>
                      <span className="text-blue-400 font-medium w-8">
                        {prediction.confidence}%
                      </span>
                    </div>
                  </td>
                  {hasActualResults && (
                    <td className="px-4 py-3 text-center text-gray-400">
                      {actualResults[prediction.driverNumber] || '-'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-900/30 border border-green-600 rounded" />
          <span>Correct Prediction</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-900/30 border border-red-600 rounded" />
          <span>Incorrect Prediction</span>
        </div>
      </div>
    </div>
  );
};
