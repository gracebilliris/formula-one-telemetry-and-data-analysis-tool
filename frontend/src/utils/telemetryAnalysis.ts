import type { Lap } from '../types/openf1';

// Telemetry analysis utilities
export const telemetryAnalysis = {
  // Calculate sector times from lap data
  getSectorTimes: (lap: Lap) => ({
    sector1: lap.duration_sector_1,
    sector2: lap.duration_sector_2,
    sector3: lap.duration_sector_3,
    total: lap.lap_duration,
  }),

  // Calculate average pace over laps
  calculateAveragePace: (laps: Lap[]): number => {
    if (laps.length === 0) return 0;
    const totalTime = laps.reduce((sum, lap) => sum + lap.lap_duration, 0);
    return totalTime / laps.length;
  },

  // Find fastest lap
  findFastestLap: (laps: Lap[]): Lap | null => {
    if (laps.length === 0) return null;
    return laps.reduce((fastest, lap) => 
      lap.lap_duration < fastest.lap_duration ? lap : fastest
    );
  },

  // Calculate lap time consistency
  calculateConsistency: (laps: Lap[]): number => {
    if (laps.length < 2) return 0;
    const mean = telemetryAnalysis.calculateAveragePace(laps);
    const variance = laps.reduce((sum, lap) => 
      sum + Math.pow(lap.lap_duration - mean, 2), 0
    ) / laps.length;
    return Math.sqrt(variance);
  },

  // Compare two drivers' lap times
  compareLapTimes: (driver1Laps: Lap[], driver2Laps: Lap[]): number => {
    const avg1 = telemetryAnalysis.calculateAveragePace(driver1Laps);
    const avg2 = telemetryAnalysis.calculateAveragePace(driver2Laps);
    return avg1 - avg2;
  },

  // Get lap time delta (difference from best lap)
  calculateDelta: (lap: Lap, fastestLap: Lap): number => {
    return lap.lap_duration - fastestLap.lap_duration;
  },
};
