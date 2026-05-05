import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

export const Footer = () => {
  const { isDark } = useTheme();
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { label: 'Telemetry', href: '/' },
    { label: 'Race Replay', href: '/replay' },
    { label: 'Race Summariser', href: '/summariser' },
    { label: 'Race Predictor', href: '/predictor' },
  ];

  return (
    <footer
      className={`relative mt-16 ${
        isDark
          ? 'bg-gradient-to-b from-slate-950 to-black border-t border-slate-800/80'
          : 'bg-gradient-to-b from-white to-slate-50 border-t border-slate-200/80'
      }`}
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-red-700 via-red-500 to-red-700" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30 ring-1 ring-red-400/40">
                <span className="text-white font-black text-base tracking-tighter">F1</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Telemetry
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  Analysis
                </span>
              </div>
            </Link>
            <p className={`text-sm leading-relaxed max-w-md ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Real-time F1 telemetry analysis, race replay, and ML-powered predictions. Powered by the OpenF1 API.
            </p>
          </div>

          <div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Pages
            </h3>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className={`text-sm transition-colors ${
                      isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-600 hover:text-red-600'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Stack
            </h3>
            <ul className={`text-sm space-y-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <li>React 18 + TypeScript</li>
              <li>Vite + Tailwind CSS</li>
              <li>
                <a
                  href="https://openf1.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors ${isDark ? 'hover:text-red-400' : 'hover:text-red-600'}`}
                >
                  OpenF1 API ↗
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/gracebilliris/formula-one-telemetry-and-data-analysis-tool"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors ${isDark ? 'hover:text-red-400' : 'hover:text-red-600'}`}
                >
                  GitHub ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={`pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-3 ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            © {currentYear} F1 Telemetry Analysis · Built for F1 fans · Not affiliated with Formula 1
          </p>
          <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Data from{' '}
            <a
              href="https://openf1.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 font-semibold"
            >
              OpenF1
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
