import { CheckCircle2, Clock, MapPin } from 'lucide-react';
import { INCIDENT_LABELS, type Incident } from '../types';

interface Props {
  incident: Incident;
  onClear?: (id: string) => void;
  clearing?: boolean;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
}

export default function IncidentCard({ incident, onClear, clearing }: Props) {
  const cleared = incident.status === 'cleared';
  return (
    <article className={`incident sev-${incident.severity}${cleared ? ' is-cleared' : ''}`}>
      <div className="incident-head">
        <span className={`badge sev-badge-${incident.severity}`}>{incident.severity}</span>
        <span className="incident-type">{INCIDENT_LABELS[incident.type]}</span>
        {cleared && <span className="badge badge-cleared">Cleared</span>}
      </div>
      <h3>
        {incident.road} <span className="dir">{incident.direction}</span>
      </h3>
      <p className="incident-loc">
        <MapPin size={15} aria-hidden="true" /> {incident.location}
      </p>
      <p className="incident-desc">{incident.description}</p>
      <div className="incident-foot">
        <span>
          <Clock size={14} aria-hidden="true" /> {timeAgo(incident.createdAt)}
        </span>
        <span>
          {incident.lanesBlocked > 0
            ? `${incident.lanesBlocked} lane${incident.lanesBlocked > 1 ? 's' : ''} blocked`
            : 'No lanes blocked'}
        </span>
      </div>
      {onClear && !cleared && (
        <button
          type="button"
          className="btn btn-success btn-sm"
          onClick={() => onClear(incident.id)}
          disabled={clearing}
        >
          <CheckCircle2 size={16} /> {clearing ? 'Clearing…' : 'Mark cleared'}
        </button>
      )}
    </article>
  );
}
