import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { openF1Api } from '../utils/openf1Api';
import { useTheme } from '../hooks/useTheme';
import type { Driver, Location, Meeting, Session } from '../types/openf1';
import { StatusCard } from '../components/UI';

interface DriverTrack {
  driver: Driver;
  // Parallel arrays for cache-friendly binary search
  ts: Float64Array; // ms since session start
  xs: Float32Array;
  ys: Float32Array;
}

const SPEEDS = [0.5, 1, 2, 4, 8, 16] as const;
const MAX_SESSION_HOURS = 4; // sanity cap (longest GP races ~3h with red flags)
const FETCH_CHUNK_MINUTES = 30; // chunk each driver fetch into 30-min slices

export const RaceReplay = () => {
  const { isDark } = useTheme();

  // Session selection state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [year, setYear] = useState<number>(2024);
  const [meetingKey, setMeetingKey] = useState<number | ''>('');
  const [sessionKey, setSessionKey] = useState<number | ''>('');

  // Data state
  const [tracks, setTracks] = useState<DriverTrack[]>([]);
  const [duration, setDuration] = useState(0); // ms
  const [bounds, setBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);
  const [trackPath, setTrackPath] = useState<Array<{ x: number; y: number }>>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentMs, setCurrentMs] = useState(0);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const cancelRef = useRef<boolean>(false);

  // ── Load meetings for year
  useEffect(() => {
    let cancelled = false;
    setMeetings([]);
    setSessions([]);
    setMeetingKey('');
    setSessionKey('');
    openF1Api
      .getMeetings({ year })
      .then((m) => { if (!cancelled) setMeetings(m); })
      .catch(() => { if (!cancelled) setMeetings([]); });
    return () => { cancelled = true; };
  }, [year]);

  // ── Load sessions for meeting
  useEffect(() => {
    if (!meetingKey) { setSessions([]); return; }
    let cancelled = false;
    openF1Api
      .getSessions({ meeting_key: meetingKey })
      .then((s) => { if (!cancelled) setSessions(s as Session[]); })
      .catch(() => { if (!cancelled) setSessions([]); });
    return () => { cancelled = true; };
  }, [meetingKey]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.session_key === sessionKey) || null,
    [sessions, sessionKey]
  );

  // ── Load full-session replay
  const loadReplay = async () => {
    if (!selectedSession) return;
    cancelRef.current = false;
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressLabel('Fetching drivers…');
    setTracks([]);
    setBounds(null);
    setTrackPath([]);
    setCurrentMs(0);
    setPlaying(false);

    try {
      const sessionStart = new Date(selectedSession.date_start).getTime();
      const rawEnd = new Date(selectedSession.date_end).getTime();
      const cap = sessionStart + MAX_SESSION_HOURS * 3600 * 1000;
      const sessionEnd = Math.min(rawEnd, cap);
      const totalMs = sessionEnd - sessionStart;
      setDuration(totalMs);

      const driversList = await openF1Api.getDrivers({ session_key: selectedSession.session_key });
      if (!driversList.length) throw new Error('No drivers found for this session.');
      setSelectedDrivers(new Set());
      setProgress(3);

      // Build chunk windows over the session
      const chunkMs = FETCH_CHUNK_MINUTES * 60 * 1000;
      const chunks: Array<{ start: string; end: string }> = [];
      for (let t = sessionStart; t < sessionEnd; t += chunkMs) {
        chunks.push({
          start: new Date(t).toISOString(),
          end: new Date(Math.min(t + chunkMs, sessionEnd)).toISOString(),
        });
      }

      const totalRequests = driversList.length * chunks.length;
      let done = 0;

      // Fetch each driver's full trace in chunks; up to 4 drivers in parallel
      const fetchOneDriver = async (d: Driver): Promise<DriverTrack | null> => {
        const allLocs: Location[] = [];
        for (const c of chunks) {
          if (cancelRef.current) return null;
          try {
            const part = await openF1Api.getLocation({
              session_key: selectedSession.session_key,
              driver_number: d.driver_number,
              'date>': c.start,
              'date<': c.end,
            });
            allLocs.push(...(part as Location[]));
          } catch {
            // skip this chunk for this driver
          }
          done++;
          setProgress(3 + Math.round((done / totalRequests) * 92));
          setProgressLabel(`Fetching #${d.driver_number} ${d.name_acronym} (${done}/${totalRequests})`);
        }
        if (allLocs.length === 0) return null;

        // Sort by date then build typed arrays relative to sessionStart
        allLocs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const ts = new Float64Array(allLocs.length);
        const xs = new Float32Array(allLocs.length);
        const ys = new Float32Array(allLocs.length);
        for (let i = 0; i < allLocs.length; i++) {
          ts[i] = new Date(allLocs[i].date).getTime() - sessionStart;
          xs[i] = allLocs[i].x;
          ys[i] = allLocs[i].y;
        }
        return { driver: d, ts, xs, ys };
      };

      // Process in batches of 4 to bound concurrency
      const BATCH = 4;
      const built: DriverTrack[] = [];
      for (let i = 0; i < driversList.length; i += BATCH) {
        if (cancelRef.current) throw new Error('Cancelled');
        const slice = driversList.slice(i, i + BATCH);
        const results = await Promise.all(slice.map(fetchOneDriver));
        for (const r of results) if (r) built.push(r);
      }

      if (built.length === 0) throw new Error('No location data for this session.');

      // Compute world bounds across all drivers
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const tr of built) {
        for (let i = 0; i < tr.xs.length; i++) {
          const x = tr.xs[i], y = tr.ys[i];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      setBounds({ minX, maxX, minY, maxY });

      // Build track polyline from longest driver
      const longest = built.reduce((a, b) => (a.xs.length > b.xs.length ? a : b));
      const path: Array<{ x: number; y: number }> = [];
      const step = Math.max(1, Math.floor(longest.xs.length / 1200));
      for (let i = 0; i < longest.xs.length; i += step) {
        path.push({ x: longest.xs[i], y: longest.ys[i] });
      }
      setTrackPath(path);
      setTracks(built);
      setProgress(100);
      setProgressLabel('Done');
    } catch (e: any) {
      console.error('Replay load failed', e);
      if (!cancelRef.current) setError(e?.message || 'Failed to load replay data.');
    } finally {
      setLoading(false);
    }
  };

  const cancelLoad = () => {
    cancelRef.current = true;
    setLoading(false);
    setProgressLabel('Cancelled');
  };

  // ── Playback loop (continuous time, not frame-indexed)
  useEffect(() => {
    if (!playing || tracks.length === 0 || duration === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      setCurrentMs((t) => {
        const next = t + dt * speed;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tracks.length, duration, speed]);

  // Binary search for last index with ts[i] <= target
  const findIndex = (ts: Float64Array, target: number): number => {
    let lo = 0, hi = ts.length - 1;
    if (ts.length === 0 || target < ts[0]) return -1;
    if (target >= ts[hi]) return hi;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ts[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  // ── Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds || tracks.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const padding = 24;
    const worldW = bounds.maxX - bounds.minX || 1;
    const worldH = bounds.maxY - bounds.minY || 1;
    const scale = Math.min((cssW - padding * 2) / worldW, (cssH - padding * 2) / worldH);
    const offX = (cssW - worldW * scale) / 2 - bounds.minX * scale;
    const offY = (cssH - worldH * scale) / 2 - bounds.minY * scale;
    const project = (x: number, y: number) => ({
      px: x * scale + offX,
      py: cssH - (y * scale + offY),
    });

    // Track polyline
    if (trackPath.length > 1) {
      ctx.beginPath();
      const p0 = project(trackPath[0].x, trackPath[0].y);
      ctx.moveTo(p0.px, p0.py);
      for (let i = 1; i < trackPath.length; i++) {
        const p = project(trackPath[i].x, trackPath[i].y);
        ctx.lineTo(p.px, p.py);
      }
      ctx.lineWidth = 18;
      ctx.strokeStyle = isDark ? '#1f2937' : '#e5e7eb';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = isDark ? '#374151' : '#9ca3af';
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Cars (binary-search each driver's track for current time)
    for (const tr of tracks) {
      const idx = findIndex(tr.ts, currentMs);
      if (idx < 0) continue;
      const isFocused = selectedDrivers.size === 0 || selectedDrivers.has(tr.driver.driver_number);
      const x = tr.xs[idx], y = tr.ys[idx];
      const { px, py } = project(x, y);
      const color = '#' + (tr.driver.team_colour || '888888');

      ctx.globalAlpha = isFocused ? 1 : 0.2;

      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#000';
      ctx.stroke();

      if (isFocused) {
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#f9fafb' : '#111827';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tr.driver.name_acronym || `#${tr.driver.driver_number}`, px + 9, py - 9);
      }
    }
    ctx.globalAlpha = 1;
  }, [tracks, currentMs, bounds, trackPath, selectedDrivers, isDark]);

  const fmtTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const ss = (total % 60).toString().padStart(2, '0');
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const toggleDriver = (n: number) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const years = [2024, 2025, 2026];
  const drivers = tracks.map((t) => t.driver);
  const sessionDurationLabel =
    duration > 0 ? fmtTime(duration) : '';

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="f1-accent-bar mb-4" />
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="f1-page-heading">Race Replay</h1>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Live track view</span>
          </div>
          <p className="f1-page-sub">
            Full-session 2D animation of car GPS positions from OpenF1's <code className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-xs">/location</code> endpoint.
            Inspired by{' '}
            <a
              href="https://github.com/IAmTomShaw/f1-race-replay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 underline underline-offset-2 font-semibold"
            >
              IAmTomShaw/f1-race-replay
            </a>.
          </p>
        </motion.div>

        {/* Session selector card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="f1-card-pad"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-red-600 to-red-500" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Session Selection</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <motion.div whileHover={{ y: -2 }} className="f1-field">
              <label className="f1-label">Season</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="f1-select"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="f1-field md:col-span-2">
              <label className="f1-label">Grand Prix</label>
              <select
                value={meetingKey}
                onChange={(e) => setMeetingKey(parseInt(e.target.value, 10) || '')}
                disabled={meetings.length === 0}
                className="f1-select disabled:opacity-50"
              >
                <option value="">Select Grand Prix</option>
                {meetings.map((m) => (
                  <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_official_name}</option>
                ))}
              </select>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="f1-field">
              <label className="f1-label">Session</label>
              <select
                value={sessionKey}
                onChange={(e) => setSessionKey(parseInt(e.target.value, 10) || '')}
                disabled={sessions.length === 0}
                className="f1-select disabled:opacity-50"
              >
                <option value="">Select session</option>
                {sessions.map((s) => (
                  <option key={s.session_key} value={s.session_key} disabled={s.is_cancelled}>
                    {s.session_name}{s.is_cancelled ? ' (cancelled)' : ''}
                  </option>
                ))}
              </select>
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-3 items-center pt-5">
            {!loading ? (
              <button
                onClick={loadReplay}
                disabled={!selectedSession || selectedSession?.is_cancelled}
                className="f1-btn-primary"
              >
                <span>▶</span> Load full session replay
              </button>
            ) : (
              <button onClick={cancelLoad} className="f1-btn-ghost px-5 py-2.5">
                Cancel ({progress}%)
              </button>
            )}
            {selectedSession && !loading && tracks.length === 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Loads the entire session — Practice / Qualifying / Race. Larger sessions may take 30–60&nbsp;s.
              </span>
            )}
            {tracks.length > 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {tracks.length} drivers • {sessionDurationLabel} loaded
              </span>
            )}
          </div>

          {loading && (
            <div className="space-y-2 pt-4">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-mono text-slate-500 dark:text-slate-400">{progressLabel}</span>
                <span className="font-mono font-bold text-red-500">{progress}%</span>
              </div>
              <div className="relative w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 f1-progress-bar transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {error && (
          <StatusCard
            variant="warning"
            title="Replay unavailable"
            message={error}
            hint="Try a completed Grand Prix race weekend (location data isn't available for cancelled or very recent sessions)."
          />
        )}

        {selectedSession?.is_cancelled && (
          <StatusCard
            variant="warning"
            icon="🚫"
            title="This session was cancelled"
            message="OpenF1 has no location data for cancelled sessions."
          />
        )}

        {/* Replay viewport */}
        {tracks.length > 0 && bounds && duration > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="f1-card overflow-hidden"
          >
            {/* Cinematic canvas */}
            <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-950 via-black to-slate-950">
              {/* Subtle grid */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              <canvas ref={canvasRef} className="relative w-full h-full block" />
              {/* Vignette */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)' }}
              />

              {/* HUD: Time + status */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-black/70 text-white font-mono backdrop-blur-md border border-white/10">
                  <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Session Time</div>
                  <div className="text-xl font-black tabular-nums leading-none mt-0.5">
                    T+{fmtTime(currentMs)}
                    <span className="text-slate-400 text-sm ml-1.5">/ {fmtTime(duration)}</span>
                  </div>
                </div>
                {playing && (
                  <div className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-widest" style={{ animation: 'pulseGlow 1.6s ease-in-out infinite' }}>
                    ● Live
                  </div>
                )}
              </div>

              {/* HUD: Driver count + speed */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-black/70 text-white backdrop-blur-md border border-white/10">
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Speed</div>
                  <div className="text-lg font-black leading-none mt-0.5 text-red-400">{speed}×</div>
                </div>
              </div>

              {/* HUD: Session label bottom-left */}
              <div className="absolute bottom-4 left-4 text-[11px] uppercase tracking-widest font-bold text-white/70">
                {selectedSession?.session_name} • {meetings.find(m => m.meeting_key === selectedSession?.meeting_key)?.country_name}
              </div>
            </div>

            {/* Controls */}
            <div className={`p-4 sm:p-5 space-y-4 ${isDark ? 'bg-slate-900/60 border-t border-slate-800' : 'bg-slate-50 border-t border-slate-200'}`}>
              {/* Transport row */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className={`f1-btn-primary min-w-[110px] ${playing ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20 hover:shadow-amber-600/40' : ''}`}
                >
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <button onClick={() => { setCurrentMs(0); setPlaying(false); }} className="f1-btn-ghost" title="Restart">
                  ⏮
                </button>
                <button onClick={() => setCurrentMs((t) => Math.max(0, t - 30000))} className="f1-btn-ghost" title="Back 30 s">
                  ⏪ 30s
                </button>
                <button onClick={() => setCurrentMs((t) => Math.min(duration, t + 30000))} className="f1-btn-ghost" title="Forward 30 s">
                  30s ⏩
                </button>

                <div className="flex items-center gap-1 ml-auto p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/40 dark:border-slate-700/40">
                  <span className="text-[10px] font-bold uppercase tracking-widest mx-2 text-slate-500 dark:text-slate-400">Speed</span>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2.5 py-1 rounded text-xs font-black tabular-nums transition-all ${
                        speed === s
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber row with elapsed/remaining */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={100}
                  value={currentMs}
                  onChange={(e) => { setPlaying(false); setCurrentMs(parseInt(e.target.value, 10)); }}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <span>{fmtTime(currentMs)}</span>
                  <span>-{fmtTime(Math.max(0, duration - currentMs))}</span>
                </div>
              </div>

              {/* Driver chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Drivers ({selectedDrivers.size > 0 ? `${selectedDrivers.size} focused` : 'all visible'})
                  </span>
                  {selectedDrivers.size > 0 && (
                    <button
                      onClick={() => setSelectedDrivers(new Set())}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-400 transition"
                    >
                      Clear focus
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {drivers.map((d) => {
                    const active = selectedDrivers.size === 0 || selectedDrivers.has(d.driver_number);
                    const color = '#' + (d.team_colour || '666');
                    return (
                      <button
                        key={d.driver_number}
                        onClick={() => toggleDriver(d.driver_number)}
                        className={`group relative inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-md text-[11px] font-black tracking-wide transition-all border-l-[3px] ${
                          active
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:scale-105'
                            : 'bg-slate-100/30 dark:bg-slate-800/30 text-slate-500 dark:text-slate-500 opacity-60 hover:opacity-100'
                        }`}
                        style={{ borderLeftColor: color }}
                        title={d.full_name}
                      >
                        <span className="tabular-nums opacity-60">#{d.driver_number}</span>
                        <span>{d.name_acronym}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {!tracks.length && !loading && !error && (
          <StatusCard
            variant="info"
            icon="🏁"
            title="Pick a session to start the replay"
            message="Choose a Grand Prix and session above, then hit Load full session replay. The entire session (Practice, Qualifying or Race) will be loaded — for a 2-hour race that's roughly 50 MB of GPS data fetched in chunks."
          />
        )}
      </div>
    </div>
  );
};

export default RaceReplay;
