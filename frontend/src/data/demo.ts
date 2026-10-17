import type { Incident, User } from '../types';

// Fictional demo data only. Never shown in real (backend) sessions.

export const DEMO_OFFICER: User = {
  id: 'demo-officer',
  name: 'Demo Officer',
  email: 'demo.officer@example.test',
  role: 'officer',
  agency: 'Demo Highway Patrol',
};

export const DEMO_DRIVER: User = {
  id: 'demo-driver',
  name: 'Demo Driver',
  email: 'demo.driver@example.test',
  role: 'driver',
  agency: null,
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export function demoIncidents(): Incident[] {
  return [
    {
      id: 'demo-1',
      type: 'crash',
      severity: 'high',
      road: 'I-90',
      direction: 'EB',
      location: 'Near Exit 50 (demo)',
      description: 'Two-vehicle collision. Right lane blocked; expect delays.',
      lanesBlocked: 1,
      status: 'active',
      reportedBy: 'Demo Officer',
      agency: 'Demo Highway Patrol',
      createdAt: minutesAgo(12),
    },
    {
      id: 'demo-2',
      type: 'debris',
      severity: 'moderate',
      road: 'I-190',
      direction: 'NB',
      location: 'Mile marker 7 (demo)',
      description: 'Tire debris in left lane. Crews en route.',
      lanesBlocked: 0,
      status: 'active',
      reportedBy: 'Demo Officer',
      agency: 'Demo Highway Patrol',
      createdAt: minutesAgo(34),
    },
    {
      id: 'demo-3',
      type: 'weather',
      severity: 'critical',
      road: 'Route 33',
      direction: 'Both',
      location: 'Kensington Expressway corridor (demo)',
      description: 'Lake-effect whiteout conditions. Reduce speed.',
      lanesBlocked: 0,
      status: 'active',
      reportedBy: 'Demo Officer',
      agency: 'Demo Highway Patrol',
      createdAt: minutesAgo(55),
    },
  ];
}
