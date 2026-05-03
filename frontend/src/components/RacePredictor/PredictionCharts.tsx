import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PredictionResult } from '../../utils/racePredictor';

interface PredictionChartsProps {
  predictions: PredictionResult[];
  actualResults?: Record<number, number>;
}

/**
 * Component for visualizing race predictions with charts
 */
export const PredictionCharts: React.FC<PredictionChartsProps> = ({
  predictions,
  actualResults = {},
}) => {
  const hasActualResults = Object.keys(actualResults).length > 0;

  // Prepare data for scatter plot (Qualifying vs Predicted Position)
  const scatterData = useMemo(() => {
    return predictions
      .map(pred => ({
        name: pred.driverName,
        qualifyingPosition: pred.qualifyingPosition || 1,
        predictedPosition: pred.predictedPosition,
        confidence: pred.confidence,
        driverNumber: pred.driverNumber,
      }))
      .sort((a, b) => a.qualifyingPosition - b.qualifyingPosition);
  }, [predictions]);

  // Prepare data for actual vs predicted comparison
  const comparisonData = useMemo(() => {
    return predictions.map(pred => ({
      name: pred.driverName.substring(0, 3).toUpperCase(),
      predicted: pred.predictedPosition,
      actual: actualResults[pred.driverNumber] || null,
      driverNumber: pred.driverNumber,
    }));
  }, [predictions, actualResults]);

  // Prepare data for confidence distribution histogram
  const confidenceDistribution = useMemo(() => {
    const bins = [
      { range: '0-20%', count: 0 },
      { range: '20-40%', count: 0 },
      { range: '40-60%', count: 0 },
      { range: '60-80%', count: 0 },
      { range: '80-100%', count: 0 },
    ];

    predictions.forEach(pred => {
      const confidence = pred.confidence;
      if (confidence < 20) bins[0].count++;
      else if (confidence < 40) bins[1].count++;
      else if (confidence < 60) bins[2].count++;
      else if (confidence < 80) bins[3].count++;
      else bins[4].count++;
    });

    return bins;
  }, [predictions]);

  // Calculate accuracy metrics
  const accuracy = useMemo(() => {
    if (!hasActualResults || predictions.length === 0) {
      return { correct: 0, total: predictions.length };
    }

    const correct = predictions.filter(
      pred => actualResults[pred.driverNumber] === pred.predictedPosition
    ).length;

    return { correct, total: predictions.length };
  }, [predictions, actualResults, hasActualResults]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Qualifying vs Predicted Position Scatter */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            Qualifying vs Predicted Position
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="qualifyingPosition"
                type="number"
                name="Qualifying Position"
                stroke="#999"
              />
              <YAxis
                dataKey="predictedPosition"
                type="number"
                name="Predicted Position"
                stroke="#999"
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any) => (value ? value.toFixed(1) : 'N/A')}
              />
              <Scatter
                name="Predictions"
                data={scatterData}
                fill="#ef4444"
                opacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Distribution Histogram */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            Confidence Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={confidenceDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="range" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
              />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actual vs Predicted Comparison */}
      {hasActualResults && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              Actual vs Predicted Results
            </h3>
            <div className="text-sm text-gray-300">
              Accuracy: {accuracy.correct}/{accuracy.total} (
              {accuracy.total > 0
                ? Math.round((accuracy.correct / accuracy.total) * 100)
                : 0}
              %)
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
              />
              <Legend />
              <Bar dataKey="predicted" fill="#ef4444" name="Predicted Position" />
              <Bar dataKey="actual" fill="#10b981" name="Actual Position" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Confidence Metrics */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Prediction Confidence Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Average Confidence</div>
            <div className="text-2xl font-bold text-blue-400">
              {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length).toFixed(1)}
              %
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Min Confidence</div>
            <div className="text-2xl font-bold text-yellow-400">
              {Math.min(...predictions.map(p => p.confidence))}%
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Max Confidence</div>
            <div className="text-2xl font-bold text-green-400">
              {Math.max(...predictions.map(p => p.confidence))}%
            </div>
          </div>

          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Total Predictions</div>
            <div className="text-2xl font-bold text-white">
              {predictions.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
