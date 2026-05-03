// OpenF1 API Types

export interface Driver {
  driver_number: number;
  first_name: string;
  last_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
  broadcast_name: string;
}

export interface Session {
  session_key: number;
  session_name: string;
  session_type: 'Practice' | 'Qualifying' | 'Race' | 'Sprint';
  date_start: string;
  date_end: string;
  meeting_key: number;
  gmt_offset: string;
  is_bookmarked: boolean;
}

export interface Meeting {
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_key: number;
  country_code: string;
  country_name: string;
  meeting_official_name: string;
  meeting_location: string;
  meeting_date: string;
  year: number;
}

export interface CarData {
  brake: number;
  date: string;
  driver_number: number;
  drs: number;
  meeting_key: number;
  n_gear: number;
  rpm: number;
  session_key: number;
  speed: number;
  throttle: number;
}

export interface Location {
  date: string;
  driver_number: number;
  meeting_key: number;
  session_key: number;
  x: number;
  y: number;
  z: number;
}

export interface Lap {
  date_start: string;
  driver_number: number;
  duration_sector_1: number;
  duration_sector_2: number;
  duration_sector_3: number;
  i1_speed: number;
  i2_speed: number;
  is_pit_out_lap: boolean;
  lap_duration: number;
  lap_number: number;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
  st_speed: number;
}

export interface Stint {
  compound: string;
  driver_number: number;
  lap_end: number;
  lap_start: number;
  meeting_key: number;
  session_key: number;
  stint_number: number;
  tyre_age_at_start: number;
}

export interface PitStop {
  date_start: string;
  driver_number: number;
  duration_pit_inlap: number;
  duration_pit_lane: number;
  duration_pit_stop: number;
  lap_number: number;
  meeting_key: number;
  pit_stop_number: number;
  session_key: number;
}

export interface Overtake {
  date: string;
  driver_number: number;
  driver_number_overtaken: number;
  is_drs_overtake: boolean;
  lap_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface Weather {
  air_temperature: number;
  date: string;
  humidity: number;
  meeting_key: number;
  pressure: number;
  rainfall: number;
  session_key: number;
  track_temperature: number;
  wind_direction: number;
  wind_speed: number;
}

export interface RaceControlMessage {
  date: string;
  flag: string | null;
  lap_number: number | null;
  message: string;
  meeting_key: number;
  scope: string;
  sector: number | null;
  session_key: number;
}

export interface Position {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface Interval {
  date: string;
  driver_number: number;
  gap_to_leader: number | null;
  gap_to_next: number | null;
  interval_to_leader: string | null;
  interval_to_next: string | null;
  meeting_key: number;
  position: number;
  session_key: number;
}
