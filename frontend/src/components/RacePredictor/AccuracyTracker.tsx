import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface PredictionRecord {
  raceKey: number;
  raceName: string;
  predictions: Array<{
    position: number;
    driverNumber: number;
    driverName: string;
    predicted: number;
    actual: number;
  }>;
  timestamp: number;
}

interface AccuracyTrackerProps {
  records: PredictionRecord[];
}

export const AccuracyTracker = ({ records }: AccuracyTrackerProps) => {
  const { isDark } = useTheme();
  const [accuracyMetrics, setAccuracyMetrics] = useState({
    totalPredictions: 0,
    accurateTopThree: 0,
    meanAbsoluteError: 0,
    topThreeAccuracy: 0,
  });

  useEffect(() => {
    if (!records || records.length === 0) {
      setAccuracyMetrics({
        totalPredictions: 0,
        accurateTopThree: 0,
        meanAbsoluteError: 0,
        topThreeAccuracy: 0,
      });
      return;
    }

    let totalPredictions = 0;
    let accurateTopThree = 0;
    let totalError = 0;

    records.forEach((record) => {
      record.predictions.forEach((pred) => {
        totalPredictions++;
        totalError += Math.abs(pred.predicted - pred.actual);

        // Check if top 3 predictions match top 3 actual
        if (pred.predicted <= 3 && pred.actual <= 3) {
          accurateTopThree++;
        }
      });
    });

    const meanAbsoluteError = totalPredictions > 0 ? totalError / totalPredictions : 0;
    const topThreeAccuracy = totalPredictions > 0 ? (accurateTopThree / totalPredictions) * 100 : 0;

    setAccuracyMetrics({
      totalPredictions,
      accurateTopThree,
      meanAbsoluteError: Math.round(meanAbsoluteError * 100) / 100,
      topThreeAccuracy: Math.round(topThreeAccuracy),
    });
  }, [records]);

  // Prepare data for chart
  const chartData = records
    .slice(-5) // Last 5 races
    .map((record) => {
      const accurate = record.predictions.filter(
        (p) => p.predicted <= 3 && p.actual <= 3
      ).length;
      return {
        name: record.raceName.substring(0, 3),
        accuracy: Math.round((accurate / record.predictions.length) * 100),
        predictions: record.predictions.length,
      };
    });

  return (
    <div className={`rounded-2xl border backdrop-blur-xl transition-all ${
      isDark
        ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
        : 'bg-white/70 border-gray-200/50 shadow-lg'
    }`}>
      <div className="p-8">
        <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          📊 Prediction Accuracy Tracker
        </h2>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Predictions */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-slate-800/50 border-slate-700/50'
              : 'bg-gray-100/50 border-gray-300/50'
          }`}>
            <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Total Predictions
            </p>
            <p className={`text-3xl font-black ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {accuracyMetrics.totalPredictions}
            </p>
          </div>

          {/* Accurate Top 3 */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-green-100/50 border-green-300/50'
          }`}>
            <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}>
              Top 3 Accurate
            </p>
            <p className={`text-3xl font-black ${
              isDark ? 'text-green-300' : 'text-green-600'
            }`}>
              {accuracyMetrics.accurateTopThree}
            </p>
          </div>

          {/* Mean Absolute Error */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-yellow-900/20 border-yellow-700/50'
              : 'bg-yellow-100/50 border-yellow-300/50'
          }`}>
            <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
              isDark ? 'text-yellow-400' : 'text-yellow-600'
            }`}>
              Mean Error
            </p>
            <p className={`text-3xl font-black ${
              isDark ? 'text-yellow-300' : 'text-yellow-600'
            }`}>
              ±{accuracyMetrics.meanAbsoluteError}
            </p>
          </div>

          {/* Top 3 Accuracy % */}
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-red-900/20 border-red-700/50'
              : 'bg-red-100/50 border-red-300/50'
          }`}>
            <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
              isDark ? 'text-red-400' : 'text-red-600'
            }`}>
              Accuracy
            </p>
            <p className={`text-3xl font-black ${
              isDark ? 'text-red-300' : 'text-red-600'
            }`}>
              {accuracyMetrics.topThreeAccuracy}%
            </p>
          </div>
        </div>

        {/* Recent Accuracy Chart */}
        {chartData.length > 0 && (
          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-slate-800/30 border-slate-700/50'
              : 'bg-gray-100/30 border-gray-300/50'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Recent Races
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(209, 213, 219, 0.3)'} 
                />
                <XAxis 
                  dataKey="name"
                  stroke={isDark ? '#94a3b8' : '#6b7280'}
                />
                <YAxis 
                  stroke={isDark ? '#94a3b8' : '#6b7280'}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#f9fafb',
                    border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, 'Accuracy']}
                />
                <Bar
                  dataKey="accuracy"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Empty State */}
        {records.length === 0 && (
          <div className="text-center py-12">
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No prediction records yet. Make some predictions to track accuracy!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
