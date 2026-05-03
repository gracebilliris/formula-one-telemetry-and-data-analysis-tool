import { useTheme } from '../../hooks/useTheme';

export const Footer = () => {
  const { isDark } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${isDark ? 'bg-gradient-to-t from-gray-950 to-gray-900 border-gray-800' : 'bg-gradient-to-t from-gray-100 to-white border-gray-200'} border-t`}>
      {/* Red accent line */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-600 to-red-700" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              About
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Real-time F1 telemetry analysis and race prediction powered by OpenF1 API. Visualize data like never before.
            </p>
          </div>

          {/* Features */}
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              Features
            </h3>
            <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li>📊 Multi-driver telemetry comparison</li>
              <li>🤖 AI race summarization</li>
              <li>🔮 Race outcome prediction</li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              Stack
            </h3>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li>React 18 + TypeScript</li>
              <li>OpenF1 API</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className={`${isDark ? 'border-gray-800' : 'border-gray-200'} border-t mb-6`} />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            © {currentYear} F1 Telemetry Analysis. Data from{' '}
            <a
              href="https://openf1.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-500 font-medium"
            >
              OpenF1 API
            </a>
          </div>
          <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
            Built with ❤️ for F1 fans • Not affiliated with Formula 1
          </div>
        </div>
      </div>
    </footer>
  );
};
