import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

interface NavLink {
  label: string;
  short: string;
  href: string;
  icon: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Telemetry', short: 'Dash', href: '/', icon: '📊' },
  { label: 'Race Replay', short: 'Replay', href: '/replay', icon: '🏎️' },
  { label: 'Summariser', short: 'Sum', href: '/summariser', icon: '🏁' },
  { label: 'Predictor', short: 'Predict', href: '/predictor', icon: '🔮' },
];

export const Header = () => {
  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? isDark
            ? 'bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/30'
            : 'bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-sm'
          : isDark
          ? 'bg-slate-950/40 backdrop-blur-md border-b border-transparent'
          : 'bg-white/40 backdrop-blur-md border-b border-transparent'
      }`}
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-red-700 via-red-500 to-red-700" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="Home">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/30 ring-1 ring-red-400/40 group-hover:shadow-red-600/50 transition-shadow">
                <span className="text-white font-black text-base tracking-tighter">F1</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950 animate-pulse" aria-hidden />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Telemetry
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                Analysis
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            <div className={`flex items-center gap-0.5 p-1 rounded-xl ${isDark ? 'bg-slate-900/60 ring-1 ring-slate-800/60' : 'bg-slate-100/80 ring-1 ring-slate-200/80'}`}>
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`relative px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? 'text-white'
                        : isDark
                        ? 'text-slate-300 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-nav-pill"
                        className="absolute inset-0 rounded-lg bg-gradient-to-b from-red-600 to-red-700 shadow-md shadow-red-600/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span aria-hidden>{link.icon}</span>
                      <span className="hidden lg:inline">{link.label}</span>
                      <span className="lg:hidden">{link.short}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/gracebilliris/formula-one-telemetry-and-data-analysis-tool"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                isDark ? 'bg-slate-800/60 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              aria-label="GitHub repository"
              title="View source on GitHub"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>

            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                isDark
                  ? 'bg-slate-800/60 hover:bg-slate-700 text-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
            </button>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className={`md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                isDark ? 'bg-slate-800/60 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              key="mobile-nav"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="md:hidden overflow-hidden"
              aria-label="Mobile navigation"
            >
              <ul className="py-3 space-y-1">
                {NAV_LINKS.map((link) => {
                  const isActive = location.pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-600/30'
                            : isDark
                            ? 'text-slate-200 hover:bg-slate-800/60'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-lg" aria-hidden>{link.icon}</span>
                        <span>{link.label}</span>
                        {isActive && (
                          <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
