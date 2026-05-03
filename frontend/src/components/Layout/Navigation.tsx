import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { motion } from 'framer-motion';

interface NavLink {
  label: string;
  href: string;
  icon: string;
  description: string;
}

export const Navigation = () => {
  const { isDark } = useTheme();
  const location = useLocation();

  const navItems: NavLink[] = [
    {
      label: 'Telemetry Dashboard',
      href: '/',
      icon: '📊',
      description: 'Analyze telemetry data',
    },
    {
      label: 'AI Race Summariser',
      href: '/summariser',
      icon: '🏁',
      description: 'Race analysis & insights',
    },
    {
      label: 'Race Predictor',
      href: '/predictor',
      icon: '🔮',
      description: 'Predict race outcomes',
    },
  ];

  return (
    <nav className={`hidden lg:flex flex-col gap-2 p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
        Features
      </h2>
      
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link key={item.href} to={item.href}>
            <motion.div
              whileHover={{ x: 4 }}
              className={`p-4 rounded-lg transition-all cursor-pointer group ${
                isActive
                  ? isDark
                    ? 'bg-red-600 bg-opacity-20 border border-red-600 border-opacity-30'
                    : 'bg-red-100 border border-red-300'
                  : isDark
                  ? 'hover:bg-gray-800 border border-transparent'
                  : 'hover:bg-gray-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    {item.label}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
};
