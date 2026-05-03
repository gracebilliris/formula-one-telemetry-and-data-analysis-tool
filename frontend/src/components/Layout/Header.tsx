import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { motion } from 'framer-motion';

export const Header = () => {
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', href: '/' },
    { label: 'Race Summariser', href: '/summariser' },
    { label: 'Race Predictor', href: '/predictor' },
  ];

  return (
    <header className={`sticky top-0 z-40 ${isDark ? 'bg-gradient-to-b from-gray-950 to-gray-900 border-gray-800' : 'bg-gradient-to-b from-gray-100 to-white border-gray-200'} border-b`}>
      {/* Red accent line */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-600 to-red-700" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center">
              <div className="text-3xl font-black text-red-600 tracking-tighter">F1</div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Telemetry
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Analysis
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`relative px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  isDark
                    ? 'text-gray-400 hover:text-red-500'
                    : 'text-gray-600 hover:text-red-600'
                }`}
              >
                <span className="relative z-10">{link.label}</span>
                <span className={`absolute bottom-0 left-4 right-4 h-0.5 bg-red-600 scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100`} />
              </Link>
            ))}
          </nav>

          {/* Theme Toggle & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg backdrop-blur-sm transition-all duration-200 ${
                isDark
                  ? 'bg-gray-800/50 hover:bg-red-600/30 text-yellow-400'
                  : 'bg-gray-200/50 hover:bg-red-600/20 text-gray-700'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                isDark ? 'bg-gray-800/50 hover:bg-gray-700 text-gray-300' : 'bg-gray-200/50 hover:bg-gray-300 text-gray-700'
              }`}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`md:hidden pb-4 space-y-2`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isDark
                    ? 'text-gray-300 hover:bg-red-600/20 hover:text-red-400'
                    : 'text-gray-700 hover:bg-red-600/10 hover:text-red-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </div>
    </header>
  );
};
