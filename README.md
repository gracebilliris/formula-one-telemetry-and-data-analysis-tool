# F1 Telemetry Analysis Tool

A comprehensive web-based Formula 1 analysis platform featuring real-time telemetry visualization, AI-powered race analysis, and machine learning-based race outcome predictions.

🚀 **Live Demo**: [Deploy to GitHub Pages](#deployment)  
📊 **Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts  
📡 **Data Source**: [OpenF1 API](https://github.com/br-g/openf1) (free, no auth required)

---

## Features

### 🏁 **Telemetry Analysis Dashboard**
Analyze F1 telemetry data with comparison tools for drivers and laps:
- **Multi-driver telemetry overlay**: Speed, throttle, brake, RPM, gear, DRS
- **Lap-by-lap comparison**: Sector times, mini-sectors, delta visualization  
- **Tire analysis**: Degradation trends, pit stop timing, compound comparison
- **Corner analysis**: Turning point comparison, braking, acceleration patterns
- **Track map**: Circuit layout with real-time car positions

### 🤖 **AI Race Summariser**
Automatic race analysis and key moment detection:
- **Race timeline**: Chronological events (overtakes, pit stops, incidents, fastest lap)
- **Overtake analysis**: DRS vs racing overtakes, driver statistics
- **Pit strategy breakdown**: Undercut/overcut detection, stint visualization
- **Key statistics**: Laps led, lead changes, most aggressive drivers

### 🔮 **Race Result Predictor**
Machine learning model for race outcome prediction:
- **Qualifying → Race prediction**: Unified feature extraction
- **Confidence intervals**: Prediction certainty visualization
- **Historical accuracy**: Actual vs predicted finishing order comparison
- **Interactive predictions**: Select seasons/races and get live predictions

---

## Project Structure

```
formula-one-telemetry-and-data-analysis-tool/
├── frontend/                      # React + TypeScript web application
│   ├── src/
│   │   ├── components/
│   │   │   ├── TelemetryDashboard/
│   │   │   │   ├── SessionSelector.tsx
│   │   │   │   ├── DriverSelector.tsx
│   │   │   │   ├── TelemetryViewer.tsx
│   │   │   │   ├── LapComparison.tsx
│   │   │   │   └── TyreAnalysis.tsx
│   │   │   ├── RaceSummariser/
│   │   │   │   ├── RaceTimeline.tsx
│   │   │   │   ├── OvertakeAnalysis.tsx
│   │   │   │   ├── StrategyGantt.tsx
│   │   │   │   └── RaceStats.tsx
│   │   │   ├── RacePredictor/
│   │   │   │   ├── QualifyingInput.tsx
│   │   │   │   ├── PredictionViewer.tsx
│   │   │   │   └── PredictionCharts.tsx
│   │   │   └── Layout/
│   │   ├── hooks/
│   │   │   ├── useOpenF1API.ts
│   │   │   ├── useSessionMetadata.ts
│   │   │   ├── useTelemetryCache.ts
│   │   │   └── useTheme.ts
│   │   ├── utils/
│   │   │   ├── openf1Api.ts
│   │   │   ├── telemetryAnalysis.ts
│   │   │   ├── raceAnalysis.ts
│   │   │   ├── racePredictor.ts
│   │   │   └── cache.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── RaceSummariser.tsx
│   │   │   └── RacePredictor.tsx
│   │   ├── types/
│   │   │   └── openf1.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── model_coefficients.json   (pre-trained ML model)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── ml/                            # Python ML pipeline (offline)
│   ├── train_model.py
│   ├── requirements.txt
│   └── README.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Pages auto-deployment
│
└── README.md                       # This file
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- macOS, Linux, or Windows with WSL2

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gracebilliris/formula-one-telemetry-and-data-analysis-tool.git
   cd formula-one-telemetry-and-data-analysis-tool
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   - Local: `http://localhost:5173`
   - The app will automatically fetch data from OpenF1 API

### Building for Production

```bash
npm run build      # Builds to frontend/dist/
npm run preview    # Preview production build locally
```

---

## OpenF1 API Usage

The app calls the **free OpenF1 API** directly from the browser (no backend required):

### Rate Limits
- **Free Tier**: 3 requests/second, 30 requests/minute
- **Historical Data**: 2023-2026 seasons (always available)
- **Live Data**: ±30 min around races (requires paid subscription)

### Supported Endpoints
| Endpoint | Usage |
|----------|-------|
| `/sessions` | Browse F1 sessions (practice, qualifying, race) |
| `/drivers` | Driver info (name, number, team, colors) |
| `/laps` | Lap times, sector times, mini-sectors |
| `/car_data` | Telemetry: speed, throttle, brake, RPM, gear, DRS |
| `/location` | 3D car positions during sessions |
| `/stints` | Tire compounds, stint duration, tire age |
| `/pit` | Pit stop timing and duration |
| `/overtakes` | Overtaking events (DRS flag included) |
| `/weather` | Track/air temperature, rainfall, wind |
| `/race_control` | Safety cars, red flags, incidents, penalties |
| `/position` | Driver positions throughout session |

### Example API Call
```typescript
import { openF1Api } from './utils/openf1Api';

// Fetch all drivers
const drivers = await openF1Api.getDrivers();

// Fetch laps for a specific session
const laps = await openF1Api.getLaps({ session_key: 9161 });

// Fetch telemetry for a driver
const carData = await openF1Api.getCarData({
  session_key: 9161,
  driver_number: 1
});
```

---

## Features in Detail

###Telemetry Dashboard

**Tech**: Recharts (multi-driver overlay charts)

**Workflows**:
1. Select F1 session (season → GP → practice/qualifying/race)
2. Select 2-5 drivers to compare
3. Choose telemetry metric (Speed, Throttle, Brake, RPM, Gear, DRS)
4. View synchronized multi-driver traces with lap overlay
5. Click corners for detailed analysis

**Data Caching**: localStorage + IndexedDB (24-hour TTL)

---

### Race Summariser

**Tech**: Custom SVG + Recharts visualizations

**Analysis**:
- **Overtakes**: Extracts overtake events, classifies as DRS or racing
- **Pit Strategy**: Detects undercut/overcut strategies from pit stop timing
- **Timeline**: Chronological race events with lap numbers and timestamps
- **Key Moments**: Fastest lap, leader changes, DNFs, incidents

**Data Sources**: OpenF1 endpoints (overtakes, pit, race_control, positions)

---

### Race Predictor

**Tech**: Linear regression + Gradient Boosting (scikit-learn)

**Model Architecture**:
- **Input**: Qualifying lap times (delta from fastest)
- **Features**: Driver quali delta, constructor pace, circuit type, historical performance
- **Output**: Predicted finishing position + confidence interval (20-100%)
- **Accuracy**: ~72% (within 2 positions)

**Training**:
```bash
cd ml
pip install -r requirements.txt
python train_model.py --season 2024
```

Model coefficients exported to `frontend/public/model_coefficients.json` (~1KB JSON)

---

## Development Guide

### Adding a New Component

1. Create component in appropriate folder: `src/components/Feature/MyComponent.tsx`
2. Use TypeScript interface for props (no `any` types)
3. Import required hooks/utils
4. Style with Tailwind CSS (dark mode compatible)
5. Export from `index.ts` barrel file
6. Import in page and integrate

### Adding a New API Endpoint

1. Add type definition to `src/types/openf1.ts`
2. Add API method to `src/utils/openf1Api.ts`
3. Create React hook in `src/hooks/` if needed
4. Use hook in components with error handling

### Testing

```bash
npm run build    # TypeScript compile check
npm run lint     # Check ESLint (if configured)
npm run preview  # Test production build locally
```

---

## Performance Optimizations

- **Request Deduplication**: In-flight requests cached by endpoint + params
- **Rate Limit Handling**: 350ms delay between requests (respects 3 req/sec limit)
- **Exponential Backoff Retry**: Failed requests retry with 1s, 2s, 4s delays
- **Data Caching**: localStorage for metadata, IndexedDB for large datasets
- **Code Splitting**: Lazy-loaded routes with React Router
- **Image Optimization**: Driver headshots loaded on-demand

---

## Dark Mode

- Default: Follows system preference
- Toggle: Header icon (☀️ / 🌙)
- Persistence: Saved to localStorage
- Colors: Tailwind CSS dark: variants throughout

---

## Deployment

### GitHub Pages (Automatic)
1. Push to `main` branch
2. GitHub Actions workflow triggers
3. Builds React app and deploys to GitHub Pages
4. Live at: `https://gracebilliris.github.io/formula-one-telemetry-and-data-analysis-tool/`

### Manual Deployment

```bash
npm run build                  # Build React app
cd dist                        # Navigate to build output
# Deploy contents to any static hosting (Vercel, Netlify, etc.)
```

**Note**: App requires public internet access to call OpenF1 API. Cannot be deployed offline.

---

## Roadmap

### Phase 1 (Current ✅)
- [x] Telemetry Analysis Dashboard
- [x] AI Race Summariser
- [x] Race Outcome Predictor
- [x] GitHub Pages deployment

### Phase 2 (Future)
- [ ] AI Race Engineer (real-time sim racing coaching)
- [ ] Live race data support (OpenF1 paid tier)
- [ ] LLM integration for natural language summaries
- [ ] Historical race comparison tool
- [ ] Driver vs Driver head-to-head analysis
- [ ] Qualifying simulation (FP3 → Quali predictor)
- [ ] Setup optimization tool

---

## Troubleshooting

### "Module not found" errors
```bash
npm install     # Reinstall dependencies
rm -rf node_modules
npm ci           # Clean install
```

### Build fails with CSS errors
```bash
npm install -D @tailwindcss/postcss  # Ensure latest Tailwind
npm run build
```

### API returns 429 (Rate Limit)
- OpenF1 free tier has 3 req/sec limit
- App implements 350ms delay between requests
- Disable some features if still hitting limits
- Consider OpenF1 paid tier (€9.90/month) for 6 req/sec

### App slow with large datasets
- Clear browser cache: DevTools → Storage → Clear Site Data
- Disable telemetry overlay for races > 50 laps
- Use browser DevTools Profiler to identify bottlenecks

---

## Contributing

This is a personal project, but contributions are welcome! 

Feel free to:
- Report bugs via GitHub Issues
- Suggest features via Discussions
- Submit PRs for bug fixes or improvements
- Improve documentation

---

## License

See [LICENSE](./LICENSE) file

---

## Data Attribution

Data provided by:
- **OpenF1 API**: [github.com/br-g/openf1](https://github.com/br-g/openf1)
- **Formula 1**: Official F1 sources (unofficial, fan-driven project)

*Disclaimer: This is an unofficial, fan-driven project. Not affiliated with Formula 1 or FIA.*

---

## Questions?

- 📊 **Technical Help**: Check [OpenF1 Docs](https://openf1.org/docs)
- 🐛 **Report Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Contact**: Open a GitHub Discussion

--
- 
Made with ❤️ for F1 fans
