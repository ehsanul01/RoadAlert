export type Role = 'officer' | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  agency?: string | null;
}

export type IncidentType =
  | 'crash'
  | 'debris'
  | 'stalled_vehicle'
  | 'road_work'
  | 'weather'
  | 'closure'
  | 'other';

export type Severity = 'low' | 'moderate' | 'high' | 'critical';
export type Direction = 'NB' | 'SB' | 'EB' | 'WB' | 'Both';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  road: string;
  direction: Direction;
  location: string;
  description: string;
  lanesBlocked: number;
  status: 'active' | 'cleared';
  reportedBy: string;
  agency?: string | null;
  createdAt: string;
  clearedAt?: string | null;
}

export type NewIncident = Pick<
  Incident,
  'type' | 'severity' | 'road' | 'direction' | 'location' | 'description' | 'lanesBlocked'
>;

/** A signed-in session. `demo` sessions never talk to the backend. */
export interface Session {
  user: User;
  demo: boolean;
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  crash: 'Crash',
  debris: 'Debris',
  stalled_vehicle: 'Stalled vehicle',
  road_work: 'Road work',
  weather: 'Weather hazard',
  closure: 'Closure',
  other: 'Other',
};
