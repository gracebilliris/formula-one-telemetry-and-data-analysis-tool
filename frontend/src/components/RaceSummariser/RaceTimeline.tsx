import React, { useState } from 'react';
import type { RaceEvent, OvertakeEvent, PitStopEvent } from '../../utils/raceAnalysis';

interface RaceTimelineProps {
  events: RaceEvent[];
  drivers: Map<number, string>;
  teamColors: Map<number, string>;
  isLoading?: boolean;
  error?: string | null;
}

const EventIcon: React.FC<{ type: string }> = ({ type }) => {
  const baseClass = 'w-5 h-5';
  switch (type) {
    case 'overtake':
      return <div className={`${baseClass} bg-blue-500 rounded-full flex items-center justify-center text-white text-xs`}>↗</div>;
    case 'pit_stop':
      return <div className={`${baseClass} bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs`}>⬇</div>;
    case 'safety_car':
      return <div className={`${baseClass} bg-yellow-300 rounded-full flex items-center justify-center text-black text-xs`}>⚠</div>;
    case 'red_flag':
      return <div className={`${baseClass} bg-red-600 rounded-full flex items-center justify-center text-white text-xs`}>🚩</div>;
    case 'dnf':
      return <div className={`${baseClass} bg-gray-600 rounded-full flex items-center justify-center text-white text-xs`}>X</div>;
    case 'leader_change':
      return <div className={`${baseClass} bg-green-500 rounded-full flex items-center justify-center text-white text-xs`}>👑</div>;
    case 'fastest_lap':
      return <div className={`${baseClass} bg-purple-500 rounded-full flex items-center justify-center text-white text-xs`}>⚡</div>;
    case 'position_change':
      return <div className={`${baseClass} bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs`}>⬆</div>;
    default:
      return <div className={`${baseClass} bg-gray-400 rounded-full`} />;
  }
};

const EventCard: React.FC<{
  event: RaceEvent;
  isExpanded: boolean;
  onToggle: () => void;
  drivers: Map<number, string>;
  teamColors: Map<number, string>;
}> = ({ event, isExpanded, onToggle, drivers, teamColors }) => {
  const getEventDescription = (): string => {
    switch (event.type) {
      case 'overtake': {
        const ot = event as OvertakeEvent;
        const overtakerName = drivers.get(ot.overtaker) || `#${ot.overtaker}`;
        const overtakenName = drivers.get(ot.overtaken) || `#${ot.overtaken}`;
        return `${overtakerName} overtook ${overtakenName} at position ${ot.position}${ot.isDRS ? ' (DRS)' : ''}`;
      }
      case 'pit_stop': {
        const ps = event as PitStopEvent;
        const driverName = drivers.get(ps.driver) || `#${ps.driver}`;
        const newComp = ps.newCompound ? ` → ${ps.newCompound}` : '';
        const durationStr = ps.duration ? ` - ${ps.duration.toFixed(1)}s` : '';
        return `${driverName} pit stop (${ps.compound}${newComp})${durationStr}`;
      }
      case 'safety_car':
        return event.message;
      case 'red_flag':
        return `Red Flag: ${event.message}`;
      case 'dnf':
        return `DNF: ${event.message}`;
      case 'leader_change': {
        const driverName = drivers.get(event.driver) || `#${event.driver}`;
        const prevName = event.previousLeader ? drivers.get(event.previousLeader) || `#${event.previousLeader}` : 'None';
        return `${driverName} takes the lead from ${prevName}`;
      }
      case 'fastest_lap': {
        const driverName = drivers.get(event.driver) || `#${event.driver}`;
        const mins = Math.floor(event.lapTime / 60);
        const secs = (event.lapTime % 60).toFixed(3);
        return `${driverName} sets fastest lap: ${mins}:${secs}`;
      }
      case 'position_change': {
        const driverName = drivers.get(event.driver) || `#${event.driver}`;
        return `${driverName} moved from P${event.oldPosition} to P${event.newPosition}`;
      }
      default:
        return 'Unknown event';
    }
  };

  const getTimeString = (): string => {
    const time = new Date(event.timestamp);
    return time.toLocaleTimeString();
  };

  const lapInfo = 'lap' in event ? `Lap ${event.lap}` : '';

  return (
    <div className="flex gap-3 mb-4">
      <div className="flex flex-col items-center">
        <EventIcon type={event.type} />
        <div className="w-1 h-12 bg-gray-300 my-2" />
      </div>
      <div
        className="flex-1 bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">{getEventDescription()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {lapInfo && `${lapInfo} • `}
              {getTimeString()}
            </p>
          </div>
          <span className="text-gray-400 text-lg">{isExpanded ? '▼' : '▶'}</span>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-300">
            <p className="font-mono">{new Date(event.timestamp).toISOString()}</p>
            <p className="mt-2">{JSON.stringify(event, null, 2)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const RaceTimeline: React.FC<RaceTimelineProps> = ({
  events,
  drivers,
  teamColors,
  isLoading = false,
  error = null,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-700 rounded-full animate-spin mb-3 mx-auto" />
          <p className="text-gray-300">Loading race timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100">
        <p className="font-semibold">Error loading timeline</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <p className="text-gray-400">No events found for this race</p>
      </div>
    );
  }

  // Group events by lap
  const eventsByLap = new Map<number, RaceEvent[]>();
  events.forEach((event) => {
    const lap = ('lap' in event && event.lap !== null && event.lap !== undefined) ? event.lap : 0;
    if (!eventsByLap.has(lap)) {
      eventsByLap.set(lap, []);
    }
    const lapEvents = eventsByLap.get(lap);
    if (lapEvents) {
      lapEvents.push(event);
    }
  });

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Race Timeline</h2>

      <div className="overflow-y-auto max-h-96 pr-4">
        {events.map((event, index) => (
          <EventCard
            key={index}
            event={event}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            drivers={drivers}
            teamColors={teamColors}
          />
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-400 text-center">
        {events.length} events • {eventsByLap.size} laps with events
      </div>
    </div>
  );
};
