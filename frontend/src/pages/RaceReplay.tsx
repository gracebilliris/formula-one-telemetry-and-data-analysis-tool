import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { openF1Api } from '../utils/openf1Api';
import { useTheme } from '../hooks/useTheme';
import type { Driver, Location, Meeting, Session } from '../types/openf1';
import { StatusCard } from '../components/UI';

interface Frame {
  t: number; // seconds since session start
  positions: Map<number, { x: number; y: number }>;
}

const REPLAY_WINDOW_SECONDS = 600; // first 10 minutes of session
const FRAME_HZ = 4; // resample to 4 fps for smooth playback
const SPEEDS = [0.5, 1, 2, 4, 8] as const;

export const RaceReplay = () => {
  const { isDark } = useTheme();

  // Session selection state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [year, setYear] = useState<number>(2024);
  const [meetingKey, setMeetingKey] = useState<number | ''>('');
  const [sessionKey, setSessionKey] = useState<number | ''>('');

  // Data state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [bounds, setBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);
  const [trackPath, setTrackPath] = useState<Array<{ x: number; y: number }>>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [frameIdx, setFrameIdx] = useState(0);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

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

  // ── Load replay data when session selected
  const loadReplay = async () => {
    if (!selectedSession) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    setFrames([]);
    setBounds(null);
    setTrackPath([]);
    setFrameIdx(0);
    setPlaying(false);

    try {
      const sessionStart = new Date(selectedSession.date_start).getTime();
      const windowEnd = new Date(sessionStart + REPLAY_WINDOW_SECONDS * 1000).toISOString();
      const startISO = new Date(sessionStart).toISOString();

      const driversList = await openF1Api.getDrivers({ session_key: selectedSession.session_key });
      if (!driversList.length) throw new Error('No drivers found for this session.');
      setDrivers(driversList);
      setSelectedDrivers(new Set());
      setProgress(5);

      // Fetch /location for each driver in parallel (with progress)
      const totalDrivers = driversList.length;
      let done = 0;
      const perDriver = await Promise.allSettled(
        driversList.map(async (d) => {
          const locs = await openF1Api.getLocation({
            session_key: selectedSession.session_key,
            driver_number: d.driver_number,
            'date>': startISO,
            'date<': windowEnd,
          });
          done++;
          setProgress(5 + Math.round((done / totalDrivers) * 80));
          return { driverNumber: d.driver_number, locs: locs as Location[] };
        })
      );

      const driverLocs: Array<{ driverNumber: number; locs: Location[] }> = [];
      for (const r of perDriver) {
        if (r.status === 'fulfilled' && r.value.locs.length > 0) driverLocs.push(r.value);
      }
      if (driverLocs.length === 0) throw new Error('No location data for this session window.');

      // Compute world bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const { locs } of driverLocs) {
        for (const p of locs) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      }
      setBounds({ minX, maxX, minY, maxY });

      // Build track polyline from longest driver trace (downsampled)
      const longest = driverLocs.reduce((a, b) => (a.locs.length > b.locs.length ? a : b));
      const path: Array<{ x: number; y: number }> = [];
      const step = Math.max(1, Math.floor(longest.locs.length / 600));
      for (let i = 0; i < longest.locs.length; i += step) {
        path.push({ x: longest.locs[i].x, y: longest.locs[i].y });
      }
      setTrackPath(path);

      // Resample to fixed timeline
      const frameDt = 1000 / FRAME_HZ;
      const totalFrames = REPLAY_WINDOW_SECONDS * FRAME_HZ;

      // Pre-sort each driver's locs and prepare cursor index
      const driverCursors = driverLocs.map(({ driverNumber, locs }) => {
        const sorted = [...locs].sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return { driverNumber, locs: sorted, cursor: 0 };
      });

      const builtFrames: Frame[] = [];
      for (let f = 0; f < totalFrames; f++) {
        const tMs = sessionStart + f * frameDt;
        const positions = new Map<number, { x: number; y: number }>();
        for (const dc of driverCursors) {
          while (
            dc.cursor < dc.locs.length - 1 &&
            new Date(dc.locs[dc.cursor + 1].date).getTime() <= tMs
          ) {
            dc.cursor++;
          }
          const p = dc.locs[dc.cursor];
          if (p) positions.set(dc.driverNumber, { x: p.x, y: p.y });
        }
        builtFrames.push({ t: f / FRAME_HZ, positions });
      }
      setFrames(builtFrames);
      setProgress(100);
    } catch (e: any) {
      console.error('Replay load failed', e);
      setError(e?.message || 'Failed to load replay data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Playback loop
  useEffect(() => {
    if (!playing || frames.length === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setFrameIdx((idx) => {
        const advance = Math.max(1, Math.round(dt * FRAME_HZ * speed));
        const next = idx + advance;
        if (next >= frames.length - 1) {
          setPlaying(false);
          return frames.length - 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, frames.length, speed]);

  // ── Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bounds || frames.length === 0) return;
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
    // Flip Y so track is upright (OpenF1 y grows differently)
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

    // Cars
    const frame = frames[frameIdx];
    if (!frame) return;
    for (const d of drivers) {
      const pos = frame.positions.get(d.driver_number);
      if (!pos) continue;
      const isFocused = selectedDrivers.size === 0 || selectedDrivers.has(d.driver_number);
      const { px, py } = project(pos.x, pos.y);
      const color = '#' + (d.team_colour || '888888');

      ctx.globalAlpha = isFocused ? 1 : 0.25;

      // glow
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = color + '33';
      ctx.fill();

      // dot
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#000';
      ctx.stroke();

      // Acronym label
      if (isFocused) {
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = isDark ? '#f9fafb' : '#111827';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.name_acronym || `#${d.driver_number}`, px + 9, py - 9);
      }
    }
    ctx.globalAlpha = 1;
  }, [frames, frameIdx, bounds, trackPath, drivers, selectedDrivers, isDark]);

  const totalSeconds = frames.length / FRAME_HZ;
  const currentSeconds = frameIdx / FRAME_HZ;

  const fmtTime = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const toggleDriver = (n: number) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const years = [2024, 2025, 2026];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'} px-4 sm:px-6 lg:px-8 py-8`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🏎️ Race Replay
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Animated 2D replay of car GPS positions from OpenF1's <code className="px-1 rounded bg-black/20">/location</code> endpoint.
            Inspired by{' '}
            <a
              href="https://github.com/IAmTomShaw/f1-race-replay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 underline underline-offset-2"
            >
              IAmTomShaw/f1-race-replay
            </a>.
          </p>
        </motion.div>

        {/* Session selector */}
        <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} grid grid-cols-1 md:grid-cols-4 gap-3`}>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Season</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className={`w-full rounded-md px-3 py-2 text-sm ${isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'}`}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Grand Prix</label>
            <select
              value={meetingKey}
              onChange={(e) => setMeetingKey(parseInt(e.target.value, 10) || '')}
              disabled={meetings.length === 0}
              className={`w-full rounded-md px-3 py-2 text-sm ${isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'} disabled:opacity-50`}
            >
              <option value="">Select Grand Prix</option>
              {meetings.map((m) => (
                <option key={m.meeting_key} value={m.meeting_key}>{m.meeting_official_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Session</label>
            <select
              value={sessionKey}
              onChange={(e) => setSessionKey(parseInt(e.target.value, 10) || '')}
              disabled={sessions.length === 0}
              className={`w-full rounded-md px-3 py-2 text-sm ${isDark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-gray-50 border border-gray-300 text-gray-900'} disabled:opacity-50`}
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.session_key} value={s.session_key} disabled={s.is_cancelled}>
                  {s.session_name}{s.is_cancelled ? ' (cancelled)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-3 items-center pt-2">
            <button
              onClick={loadReplay}
              disabled={!selectedSession || loading || selectedSession?.is_cancelled}
              className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wide transition-colors"
            >
              {loading ? `Loading… ${progress}%` : 'Load replay'}
            </button>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              First {REPLAY_WINDOW_SECONDS / 60} minutes of the session • {drivers.length} drivers
            </span>
          </div>
        </div>

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
        {frames.length > 0 && bounds && (
          <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
            <div className="relative w-full aspect-[16/9] bg-black/40">
              <canvas ref={canvasRef} className="w-full h-full block" />
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-md bg-black/60 text-white text-xs font-mono backdrop-blur-sm">
                T+{fmtTime(currentSeconds)} / {fmtTime(totalSeconds)}
              </div>
            </div>

            {/* Controls */}
            <div className={`p-4 space-y-3 ${isDark ? 'bg-gray-900 border-t border-gray-800' : 'bg-gray-50 border-t border-gray-200'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors min-w-[90px]"
                >
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                  onClick={() => { setFrameIdx(0); setPlaying(false); }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  ⏮ Restart
                </button>
                <div className="flex items-center gap-1 ml-2">
                  <span className={`text-xs font-semibold uppercase mr-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Speed</span>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                        speed === s
                          ? 'bg-red-600 text-white'
                          : isDark
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={frameIdx}
                onChange={(e) => { setPlaying(false); setFrameIdx(parseInt(e.target.value, 10)); }}
                className="w-full accent-red-600"
              />

              {/* Driver chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {drivers.map((d) => {
                  const active = selectedDrivers.size === 0 || selectedDrivers.has(d.driver_number);
                  return (
                    <button
                      key={d.driver_number}
                      onClick={() => toggleDriver(d.driver_number)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide transition-all ${active ? 'opacity-100' : 'opacity-40'}`}
                      style={{
                        backgroundColor: '#' + (d.team_colour || '666'),
                        color: '#fff',
                      }}
                      title={d.full_name}
                    >
                      #{d.driver_number} {d.name_acronym}
                    </button>
                  );
                })}
              </div>
              {selectedDrivers.size > 0 && (
                <button
                  onClick={() => setSelectedDrivers(new Set())}
                  className={`text-xs underline ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  Clear focus
                </button>
              )}
            </div>
          </div>
        )}

        {!frames.length && !loading && !error && (
          <StatusCard
            variant="info"
            icon="🏁"
            title="Pick a session to start replay"
            message="Choose a Grand Prix and session above, then hit Load replay. Data is fetched from OpenF1's /location endpoint (4 Hz GPS coordinates per car)."
          />
        )}
      </div>
    </div>
  );
};

export default RaceReplay;
