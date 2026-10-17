import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import IncidentCard from '../components/IncidentCard';
import { fetchIncidents } from '../lib/auth';
import { demoIncidents } from '../data/demo';
import type { Incident, Session, Severity } from '../types';

const POLL_MS = 15_000;
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export default function DriverDashboard({ session }: { session: Session }) {
  const { demo } = session;
  const [incidents, setIncidents] = useState<Incident[]>(() => (demo ? demoIncidents() : []));
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(demo ? new Date() : null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    try {
      setIncidents(await fetchIncidents());
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load alerts');
    } finally {
      setLoading(false);
    }
  }, [demo]);

  // Initial load + auto-refresh so drivers see new alerts without reloading.
  useEffect(() => {
    if (demo) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [demo, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents
      .filter((i) => i.status === 'active')
      .filter((i) => !q || `${i.road} ${i.location} ${i.description}`.toLowerCase().includes(q))
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.createdAt.localeCompare(a.createdAt));
  }, [incidents, query]);

  return (
    <section className="panel" aria-labelledby="alerts-title">
      <div className="panel-head">
        <h2 id="alerts-title">
          Active alerts <span className="count">{visible.length}</span>
        </h2>
        <div className="panel-actions">
          {updatedAt && <span className="muted">Updated {updatedAt.toLocaleTimeString()}</span>}
          {!demo && (
            <button className="btn btn-ghost btn-sm" onClick={load} type="button" disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className="search">
        <Search size={17} aria-hidden="true" />
        <label htmlFor="route-search" className="sr-only">
          Filter by road or location
        </label>
        <input
          id="route-search"
          placeholder="Filter by road or location (e.g. I-90)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="empty">{loading ? 'Loading…' : 'No active alerts. Drive safe!'}</p>
      ) : (
        <div className="incident-list incident-grid">
          {visible.map((i) => (
            <IncidentCard key={i.id} incident={i} />
          ))}
        </div>
      )}
    </section>
  );
}
