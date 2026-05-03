# Quick Start Guide - F1 Telemetry Analysis Tool

## 5-Minute Setup

### Step 1: Navigate to Frontend
```bash
cd frontend
npm install    # Already done, but included for reference
```

### Step 2: Run Development Server
```bash
npm run dev
```

Output:
```
  ➜  Local:   http://localhost:5173/
```

### Step 3: Open in Browser
Click the Local link or visit `http://localhost:5173`

---

## What You'll See

### Dashboard (Home Page)
- **Session Selector**: Choose any F1 race from 2023-2026
- **Driver Selector**: Pick 2-5 drivers to compare
- **Telemetry Charts**: Speed, throttle, brake, RPM, gear, DRS overlays
- **Lap Comparison**: Sector times with deltas
- **Tire Analysis**: Degradation trends and pit strategy

### Race Summariser (/summariser)
- **Timeline**: All race events in chronological order
- **Overtake Analysis**: Who overtook whom and how many times
- **Strategy Gantt**: Visual pit stop timeline
- **Key Stats**: Fastest lap, most aggressive driver, etc.

### Race Predictor (/predictor)
- **Qualifying Input**: Select past race or enter quali times
- **Predictions**: Predicted finishing order with confidence %
- **Visualization**: Actual vs predicted comparison

---

## Using the App

### Finding a Specific Race
1. Go to **Dashboard**
2. Click **Session Selector**
3. Filter by Year (2024, 2025, etc.)
4. Filter by Grand Prix name (e.g., "Monaco")
5. Select **Race** session
6. Click **Load**

### Comparing Two Drivers
1. Select session (as above)
2. Click **Driver Selector**
3. Check 2 drivers (e.g., Max Verstappen, Lewis Hamilton)
4. View real-time telemetry traces
5. Switch metric with dropdown (Speed → Throttle → Brake, etc.)

### Dark Mode
- Click **☀️ / 🌙** icon in header
- Preference saved automatically

---

## Build for Production

```bash
npm run build        # Creates frontend/dist/ folder
npm run preview      # Test production build locally
```

Deploy `dist/` folder to GitHub Pages, Vercel, Netlify, etc.

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm install` |
| Slow initial load | First API call fetches data from OpenF1 |
| "Rate limit exceeded" | OpenF1 free tier: max 3 req/sec |
| No telemetry data | Ensure session is from 2023+ (older data unavailable) |
| Dark mode not saving | Check browser localStorage enabled |

---

## File Structure Quick Reference

```
frontend/
├── src/
│   ├── pages/           ← Main page components (routes)
│   ├── components/      ← Reusable UI components
│   ├── hooks/           ← React hooks (data fetching, theme, etc.)
│   ├── utils/           ← Helper functions & API wrappers
│   ├── types/           ← TypeScript types
│   ├── context/         ← Theme context provider
│   ├── App.tsx          ← Main app routing
│   └── main.tsx         ← Entry point
├── public/              ← Static assets & model coefficients
├── dist/                ← Production build output
└── node_modules/        ← Dependencies
```

---

## Key Hooks & API Calls

### Fetch Sessions
```typescript
const { sessions } = useSessionMetadata();
```

### Fetch Lap Data
```typescript
const { data: laps } = useOpenF1API('laps', { 
  session_key: 9161 
});
```

### Make Custom API Call
```typescript
import { openF1Api } from '../utils/openf1Api';

const drivers = await openF1Api.getDrivers();
const overtakes = await openF1Api.getOvertakes({ 
  session_key: 9161 
});
```

---

## Next Steps

1. **Explore**: Use the app to browse F1 data
2. **Customize**: Modify components in `src/components/`
3. **Extend**: Add new features (endpoints, visualizations, etc.)
4. **Deploy**: Push to GitHub, GitHub Actions handles the rest
5. **Share**: Live at your GitHub Pages URL

---

## Sample Data Points

### 2024 Monaco Grand Prix (Race)
- **Session Key**: 9243 (example)
- **Drivers**: Max Verstappen (1), Charles Leclerc (16), Lewis Hamilton (44), etc.
- **Data Available**: Laps, telemetry (3.7 Hz), positions, pit stops, weather

### 2023 Hungarian GP (Qualifying)
- **Session Key**: 9161 (example)
- **Metric**: Qualifying lap times
- **Demo**: Compare qualifying deltas

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus session search |
| `?` | Help (future) |
| `Cmd/Ctrl + K` | Command palette (future) |

---

## Need Help?

📖 **OpenF1 API Docs**: https://openf1.org/docs  
🐛 **Report Bugs**: GitHub Issues  
💬 **Questions**: GitHub Discussions  
📊 **F1 Data**: 2023-2026 seasons available

---

**Built with React + TypeScript + Vite + Recharts**  
**Data from OpenF1 (free, no authentication required)**
