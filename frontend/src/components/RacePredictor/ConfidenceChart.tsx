import { useTheme } from '../../hooks/useTheme';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Prediction {
  driverNumber: number;
  driverName: string;
  predictedPosition: number;
  confidence: number;
  qualifyingPosition?: number;
}

interface ConfidenceChartProps {
  predictions: Prediction[];
}

export const ConfidenceChart = ({ predictions }: ConfidenceChartProps) => {
  const { isDark } = useTheme();

  // Prepare data for chart - confidence intervals
  const chartData = predictions.map((pred) => ({
    position: pred.predictedPosition,
    driverName: pred.driverName.substring(0, 3),
    confidence: pred.confidence,
    min: Math.max(0, pred.confidence - 15),
    max: Math.min(100, pred.confidence + 15),
  }));

  return (
    <div className={`rounded-2xl border backdrop-blur-xl transition-all ${
      isDark
        ? 'bg-slate-900/70 border-slate-700/50 shadow-2xl shadow-black/40'
        : 'bg-white/70 border-gray-200/50 shadow-lg'
    }`}>
      <div className="p-8">
        <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          📈 Confidence Intervals
        </h2>

        {/* Chart */}
        <div className={`p-6 rounded-xl border ${
          isDark
            ? 'bg-slate-800/30 border-slate-700/50'
            : 'bg-gray-100/30 border-gray-300/50'
        }`}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(209, 213, 219, 0.3)'}
              />
              <XAxis
                dataKey="driverName"
                stroke={isDark ? '#94a3b8' : '#6b7280'}
              />
              <YAxis
                stroke={isDark ? '#94a3b8' : '#6b7280'}
                domain={[0, 100]}
                label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#f9fafb',
                  border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
                  borderRadius: '8px',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${(value as number).toFixed(1)}%`, 'Confidence']}
              />
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="#dc2626"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConfidence)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-6">
          <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Legend
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-gradient-to-b from-red-500 to-red-600"></div>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Prediction Confidence
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-red-500 rounded"></div>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Upper Bound (95%)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-dashed border-red-500 rounded"></div>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Lower Bound (5%)
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {predictions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-slate-800/50 border-slate-700/50'
                : 'bg-gray-100/50 border-gray-300/50'
            }`}>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Avg Confidence
              </p>
              <p className={`text-2xl font-black mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length).toFixed(1)}%
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-slate-800/50 border-slate-700/50'
                : 'bg-gray-100/50 border-gray-300/50'
            }`}>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Highest Confidence
              </p>
              <p className={`text-2xl font-black mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {Math.max(...predictions.map(p => p.confidence)).toFixed(1)}%
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-slate-800/50 border-slate-700/50'
                : 'bg-gray-100/50 border-gray-300/50'
            }`}>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Lowest Confidence
              </p>
              <p className={`text-2xl font-black mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {Math.min(...predictions.map(p => p.confidence)).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
