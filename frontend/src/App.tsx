import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Layout/Header';
import { Navigation } from './components/Layout/Navigation';
import { Footer } from './components/Layout/Footer';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const RaceSummariser = lazy(() => import('./pages/RaceSummariser').then(m => ({ default: m.RaceSummariser })));
const RacePredictor = lazy(() => import('./pages/RacePredictor').then(m => ({ default: m.RacePredictor })));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">Loading…</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Header />
          <div className="flex flex-1">
            <Navigation />
            <main className="flex-1">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/summariser" element={<RaceSummariser />} />
                  <Route path="/predictor" element={<RacePredictor />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}


export default App;
