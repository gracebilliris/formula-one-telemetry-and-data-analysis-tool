import type { Overtake, PitStop, Lap, Stint, RaceControlMessage, Position } from '../types/openf1';
import { openF1Api } from './openf1Api';

// Race Analysis Types
export type EventType = 'overtake' | 'pit_stop' | 'safety_car' | 'red_flag' | 'dnf' | 'position_change' | 'leader_change' | 'fastest_lap';

export interface OvertakeEvent {
  type: 'overtake';
  overtaker: number;
  overtaken: number;
  lap: number;
  isDRS: boolean;
  timestamp: string;
  position: number;
}

export interface PitStopEvent {
  type: 'pit_stop';
  driver: number;
  lap: number;
  duration: number;
  timestamp: string;
  compound: string;
  newCompound?: string;
}

export interface IncidentEvent {
  type: 'safety_car' | 'red_flag' | 'dnf';
  timestamp: string;
  lap: number | null;
  message: string;
  affectedDriver?: number;
}

export interface PositionChangeEvent {
  type: 'position_change';
  driver: number;
  oldPosition: number;
  newPosition: number;
  lap: number;
  timestamp: string;
}

export interface LeaderChangeEvent {
  type: 'leader_change';
  driver: number;
  previousLeader: number | null;
  timestamp: string;
  lap: number;
}

export interface FastestLapEvent {
  type: 'fastest_lap';
  driver: number;
  lap: number;
  lapTime: number;
  timestamp: string;
}

export type RaceEvent = 
  | OvertakeEvent 
  | PitStopEvent 
  | IncidentEvent 
  | PositionChangeEvent 
  | LeaderChangeEvent 
  | FastestLapEvent;

export interface RaceStrategy {
  driver: number;
  stints: StintInfo[];
  totalOvertakes: number;
  drsOvertakes: number;
  racingOvertakes: number;
  undercut?: boolean;
  overcut?: boolean;
}

export interface StintInfo {
  stintNumber: number;
  compound: string;
  lapStart: number;
  lapEnd: number;
  tireAge: number;
  duration: number;
}

// Extract race events from OpenF1 endpoints
export const extractRaceEvents = async (sessionKey: number): Promise<RaceEvent[]> => {
  const events: RaceEvent[] = [];

  try {
    // Fetch all required data in parallel
    const [overtakesData, pitStopsData, lapsData, rcMessagesData, positionsData] = await Promise.all([
      openF1Api.getOvertakes({ session_key: sessionKey }).catch(() => []),
      openF1Api.getPitStops({ session_key: sessionKey }).catch(() => []),
      openF1Api.getLaps({ session_key: sessionKey }).catch(() => []),
      openF1Api.getRaceControl({ session_key: sessionKey }).catch(() => []),
      openF1Api.getPositions({ session_key: sessionKey }).catch(() => []),
    ]);

    // Process overtakes
    if (overtakesData) {
      events.push(
        ...overtakesData.map((o: Overtake) => ({
          type: 'overtake' as const,
          overtaker: o.driver_number,
          overtaken: o.driver_number_overtaken,
          lap: o.lap_number,
          isDRS: o.is_drs_overtake,
          timestamp: o.date,
          position: o.position,
        }))
      );
    }

    // Process pit stops
    if (pitStopsData) {
      // Get stints to find compound information
      const stintsData = await openF1Api.getStints({ session_key: sessionKey }).catch(() => []);
      const stintMap = new Map<number, Map<number, string>>();
      
      if (stintsData) {
        stintsData.forEach((s: Stint) => {
          if (!stintMap.has(s.driver_number)) {
            stintMap.set(s.driver_number, new Map());
          }
          const driverStints = stintMap.get(s.driver_number)!;
          driverStints.set(s.stint_number, s.compound);
        });
      }

      events.push(
        ...pitStopsData.map((p: PitStop) => ({
          type: 'pit_stop' as const,
          driver: p.driver_number,
          lap: p.lap_number,
          duration: p.duration_pit_stop,
          timestamp: p.date_start,
          compound: stintMap.get(p.driver_number)?.get(p.pit_stop_number) || 'unknown',
          newCompound: stintMap.get(p.driver_number)?.get(p.pit_stop_number + 1) || 'unknown',
        }))
      );
    }

    // Process race control messages (incidents)
    if (rcMessagesData) {
      rcMessagesData.forEach((rc: RaceControlMessage) => {
        if (rc.flag === 'YELLOW' && rc.message.includes('Safety car')) {
          events.push({
            type: 'safety_car',
            timestamp: rc.date,
            lap: rc.lap_number,
            message: rc.message,
          });
        } else if (rc.flag === 'RED') {
          events.push({
            type: 'red_flag',
            timestamp: rc.date,
            lap: rc.lap_number,
            message: rc.message,
          });
        }
      });
    }

    // Detect DNFs from race control messages
    if (rcMessagesData) {
      rcMessagesData.forEach((rc: RaceControlMessage) => {
        if (rc.message.includes('DNF') || rc.message.includes('retired') || rc.message.includes('Retired')) {
          events.push({
            type: 'dnf',
            timestamp: rc.date,
            lap: rc.lap_number,
            message: rc.message,
            affectedDriver: extractDriverNumberFromMessage(rc.message),
          });
        }
      });
    }

    // Detect leader changes from positions data
    if (positionsData && positionsData.length > 0) {
      const sortedPositions = positionsData.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let previousLeader: number | null = null;
      let previousLap = 0;

      (sortedPositions as Position[]).forEach((p) => {
        if (p.position === 1 && p.driver_number !== previousLeader) {
          // Estimate lap number from position data
          const lapEstimate = Math.floor(((positionsData as Position[]).indexOf(p)) / 20); // rough estimate

          (events as any[]).push({
            type: 'leader_change',
            driver: p.driver_number,
            previousLeader: previousLeader,
            timestamp: p.date,
            lap: lapEstimate || previousLap,
          });
          previousLeader = p.driver_number;
          previousLap = lapEstimate;
        }
      });
    }

    // Find fastest lap
    if (lapsData && lapsData.length > 0) {
      let fastestLap: Lap | null = null;
      let minDuration = Infinity;

      (lapsData as Lap[]).forEach((lap) => {
        if (lap.lap_duration > 0 && lap.lap_duration < minDuration) {
          minDuration = lap.lap_duration;
          fastestLap = lap;
        }
      });

      if (fastestLap) {
        const fl = fastestLap as Lap;
        (events as any[]).push({
          type: 'fastest_lap',
          driver: fl.driver_number,
          lap: fl.lap_number,
          lapTime: fl.lap_duration,
          timestamp: fl.date_start,
        } as any);
      }
    }

    // Sort events by timestamp
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error('Error extracting race events:', error);
    return [];
  }
};

// Analyze pit stop strategies
export const analyzeStrategy = async (
  sessionKey: number,
  lapsData: Lap[],
  pitStopsData: PitStop[]
): Promise<RaceStrategy[]> => {
  const strategies: RaceStrategy[] = [];
  const driverOvertakes = new Map<number, OvertakeEvent[]>();

  try {
    // Get overtakes for this session
    const overtakesData = await openF1Api.getOvertakes({ session_key: sessionKey }).catch(() => []);

    if (overtakesData) {
      overtakesData.forEach((o: Overtake) => {
        if (!driverOvertakes.has(o.driver_number)) {
          driverOvertakes.set(o.driver_number, []);
        }
        driverOvertakes.get(o.driver_number)!.push({
          type: 'overtake',
          overtaker: o.driver_number,
          overtaken: o.driver_number_overtaken,
          lap: o.lap_number,
          isDRS: o.is_drs_overtake,
          timestamp: o.date,
          position: o.position,
        });
      });
    }

    // Get stints for strategy analysis
    const stintsData = await openF1Api.getStints({ session_key: sessionKey }).catch(() => []);

    if (stintsData) {
      const driverStints = new Map<number, Stint[]>();

      stintsData.forEach((s: Stint) => {
        if (!driverStints.has(s.driver_number)) {
          driverStints.set(s.driver_number, []);
        }
        driverStints.get(s.driver_number)!.push(s);
      });

      driverStints.forEach((stints, driverNumber) => {
        const stintInfos: StintInfo[] = stints.map((s) => ({
          stintNumber: s.stint_number,
          compound: s.compound,
          lapStart: s.lap_start,
          lapEnd: s.lap_end,
          tireAge: s.tyre_age_at_start,
          duration: s.lap_end - s.lap_start + 1,
        }));

        const overtakes = driverOvertakes.get(driverNumber) || [];
        const drsOvertakes = overtakes.filter((o) => o.isDRS).length;
        const racingOvertakes = overtakes.length - drsOvertakes;

        // Detect undercut/overcut strategies
        const driverPitStops = pitStopsData.filter((p) => p.driver_number === driverNumber);
        let undercut = false;
        let overcut = false;

        if (driverPitStops.length > 0) {
          // Simple undercut detection: pit stops came before competitor at same lap
          undercut = driverPitStops.some((pit) =>
            driverPitStops.some((other) => 
              Math.abs(other.lap_number - pit.lap_number) <= 2
            )
          );
          overcut = driverPitStops.some((pit) => pit.lap_number > 40); // rough estimate
        }

        strategies.push({
          driver: driverNumber,
          stints: stintInfos,
          totalOvertakes: overtakes.length,
          drsOvertakes,
          racingOvertakes,
          undercut,
          overcut,
        });
      });
    }

    return strategies.sort((a, b) => b.totalOvertakes - a.totalOvertakes);
  } catch (error) {
    console.error('Error analyzing strategy:', error);
    return [];
  }
};

// Helper function to extract driver number from message
function extractDriverNumberFromMessage(message: string): number | undefined {
  const match = message.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

// Analyze overtakes by driver
export const analyzeOvertakes = (overtakes: OvertakeEvent[]): Map<number, { total: number; drs: number; racing: number }> => {
  const analysis = new Map<number, { total: number; drs: number; racing: number }>();

  overtakes.forEach((overtake) => {
    if (!analysis.has(overtake.overtaker)) {
      analysis.set(overtake.overtaker, { total: 0, drs: 0, racing: 0 });
    }

    const stats = analysis.get(overtake.overtaker)!;
    stats.total++;
    if (overtake.isDRS) {
      stats.drs++;
    } else {
      stats.racing++;
    }
  });

  return analysis;
};

// Get leader changes timeline
export const getLeaderChangesTimeline = (events: RaceEvent[]): LeaderChangeEvent[] => {
  return events.filter((e): e is LeaderChangeEvent => e.type === 'leader_change');
};

// Count position changes per driver
export const countPositionChanges = (events: RaceEvent[]): Map<number, number> => {
  const changes = new Map<number, number>();

  events.forEach((event) => {
    if (event.type === 'position_change') {
      const current = changes.get(event.driver) || 0;
      changes.set(event.driver, current + 1);
    }
  });

  return changes;
};

// ============================================================================
// NEW UTILITY FUNCTIONS FOR RACE SUMMARISER INTEGRATION
// ============================================================================

import type { Driver } from '../types/openf1';

/**
 * Build a map of driver number to full name
 */
export const buildDriversMap = (drivers: Driver[]): Map<number, string> => {
  const map = new Map<number, string>();
  drivers.forEach((driver) => {
    map.set(driver.driver_number, driver.broadcast_name || driver.full_name);
  });
  return map;
};

/**
 * Build a map of driver number to team color (hex code)
 */
export const buildTeamColorsMap = (drivers: Driver[]): Map<number, string> => {
  const map = new Map<number, string>();
  drivers.forEach((driver) => {
    map.set(driver.driver_number, driver.team_colour || '#FFFFFF');
  });
  return map;
};

/**
 * Summary metrics for the race
 */
export interface RaceSummaryMetrics {
  totalOvertakes: number;
  drsOvertakes: number;
  racingOvertakes: number;
  leaderChanges: number;
  incidents: number;
  dnfCount: number;
}

/**
 * Get summary metrics from race events
 */
export const getSummaryMetrics = (events: RaceEvent[]): RaceSummaryMetrics => {
  const overtakes = events.filter((e): e is OvertakeEvent => e.type === 'overtake');
  const leaderChanges = events.filter((e): e is LeaderChangeEvent => e.type === 'leader_change');
  const incidents = events.filter((e) => e.type === 'safety_car' || e.type === 'red_flag');
  const dnfs = events.filter((e): e is IncidentEvent => e.type === 'dnf');

  const drsOvertakes = overtakes.filter((o) => o.isDRS).length;
  const racingOvertakes = overtakes.length - drsOvertakes;

  return {
    totalOvertakes: overtakes.length,
    drsOvertakes,
    racingOvertakes,
    leaderChanges: leaderChanges.length,
    incidents: incidents.length,
    dnfCount: dnfs.length,
  };
};

/**
 * Generate a race narrative summary
 */
export const generateRaceNarrative = (
  events: RaceEvent[],
  strategy: RaceStrategy[],
  driversMap: Map<number, string>
): string => {
  const metrics = getSummaryMetrics(events);
  const overtakes = events.filter((e): e is OvertakeEvent => e.type === 'overtake');
  const leaderChanges = events.filter((e): e is LeaderChangeEvent => e.type === 'leader_change');
  const dnfs = events.filter((e): e is IncidentEvent => e.type === 'dnf');

  let narrative = '# Race Summary\n\n';

  // Opening
  if (leaderChanges.length > 0) {
    narrative += `**Key Highlight**: The race saw ${leaderChanges.length} leader change${leaderChanges.length !== 1 ? 's' : ''}, showcasing competitive racing.\n\n`;
  }

  // Overtakes
  if (overtakes.length > 0) {
    const topOvertaker = [...new Map(overtakes.map((o) => [o.overtaker, o])).entries()].reduce((prev, curr) =>
      prev[1].overtaker === curr[1].overtaker ? prev : curr
    );
    narrative += `**Overtaking Action**: ${metrics.totalOvertakes} overtakes occurred (${metrics.drsOvertakes} DRS, ${metrics.racingOvertakes} racing).\n`;
  }

  // Incidents
  if (dnfs.length > 0) {
    narrative += `**Incidents**: ${dnfs.length} driver${dnfs.length !== 1 ? 's' : ''} did not finish the race.\n`;
  }

  // Strategy highlights
  const undercutStrategies = strategy.filter((s) => s.undercut);
  if (undercutStrategies.length > 0) {
    narrative += `**Strategic Moves**: Undercut strategies helped ${undercutStrategies.length} driver${undercutStrategies.length !== 1 ? 's' : ''}.\n`;
  }

  narrative += '\nRace Analysis Complete.';
  return narrative;
};
