import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import IncidentCard from '../components/IncidentCard';
import { clearIncident, createIncident, fetchIncidents } from '../lib/auth';
import { demoIncidents } from '../data/demo';
import {
  INCIDENT_LABELS,
  type Direction,
  type Incident,
  type IncidentType,
  type NewIncident,
  type Session,
  type Severity,
} from '../types';

const EMPTY: NewIncident = {
  type: 'crash',
  severity: 'moderate',
  road: '',
  direction: 'NB',
  location: '',
  description: '',
  lanesBlocked: 0,
};

export default function OfficerDashboard({ session }: { session: Session }) {
  const { demo } = session;
  const [incidents, setIncidents] = useState<Incident[]>(() => (demo ? demoIncidents() : []));
  const [form, setForm] = useState<NewIncident>(EMPTY);
  const [showCleared, setShowCleared] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demo);

  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    try {
      setIncidents(await fetchIncidents(true));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load incidents');
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof NewIncident>(key: K, value: NewIncident[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!form.road.trim() || !form.location.trim() || !form.description.trim()) {
      setError('Road, location and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      let created: Incident;
      if (demo) {
        created = {
          ...form,
          id: `demo-${Date.now()}`,
          status: 'active',
          reportedBy: session.user.name,
          agency: session.user.agency,
          createdAt: new Date().toISOString(),
        };
      } else {
        created = await createIncident(form);
      }
      setIncidents((list) => [created, ...list]);
      setForm(EMPTY);
      setNotice(demo ? 'Demo incident added (not sent anywhere).' : 'Incident published to drivers.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit incident');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear(id: string) {
    setClearingId(id);
    setError('');
    try {
      const updated: Incident = demo
        ? { ...incidents.find((i) => i.id === id)!, status: 'cleared', clearedAt: new Date().toISOString() }
        : await clearIncident(id);
      setIncidents((list) => list.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear incident');
    } finally {
      setClearingId(null);
    }
  }

  const active = incidents.filter((i) => i.status === 'active');
  const visible = showCleared ? incidents : active;

  return (
    <div className="grid-two">
      <section className="panel" aria-labelledby="report-title">
        <h2 id="report-title">Report an incident</h2>
        <form onSubmit={handleSubmit} className="report-form">
          <div className="row">
            <div className="field">
              <label htmlFor="type">Type</label>
              <select id="type" value={form.type} onChange={(e) => update('type', e.target.value as IncidentType)}>
                {Object.entries(INCIDENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="severity">Severity</label>
              <select
                id="severity"
                value={form.severity}
                onChange={(e) => update('severity', e.target.value as Severity)}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="road">Road</label>
              <input
                id="road"
                value={form.road}
                maxLength={80}
                placeholder="e.g. I-90"
                onChange={(e) => update('road', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="direction">Direction</label>
              <select
                id="direction"
                value={form.direction}
                onChange={(e) => update('direction', e.target.value as Direction)}
              >
                {(['NB', 'SB', 'EB', 'WB', 'Both'] as Direction[]).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              value={form.location}
              maxLength={160}
              placeholder="e.g. Near Exit 50"
              onChange={(e) => update('location', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lanes">Lanes blocked</label>
            <input
              id="lanes"
              type="number"
              min={0}
              max={12}
              value={form.lanesBlocked}
              onChange={(e) => update('lanesBlocked', Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              maxLength={600}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-ok" role="status">
              {notice}
            </p>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            <Send size={18} /> {submitting ? 'Publishing…' : 'Publish incident'}
          </button>
        </form>
      </section>

      <section className="panel" aria-labelledby="incidents-title">
        <div className="panel-head">
          <h2 id="incidents-title">
            Incidents <span className="count">{active.length} active</span>
          </h2>
          <div className="panel-actions">
            <label className="check">
              <input type="checkbox" checked={showCleared} onChange={(e) => setShowCleared(e.target.checked)} />
              Show cleared
            </label>
            {!demo && (
              <button className="btn btn-ghost btn-sm" onClick={load} type="button" disabled={loading}>
                <RefreshCw size={15} /> Refresh
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="empty">No incidents to show.</p>
        ) : (
          <div className="incident-list">
            {visible.map((i) => (
              <IncidentCard key={i.id} incident={i} onClear={handleClear} clearing={clearingId === i.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
