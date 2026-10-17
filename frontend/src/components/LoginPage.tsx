import { useState, type FormEvent } from 'react';
import { Car, Eye, LogIn, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { login } from '../lib/auth';
import { DEMO_DRIVER, DEMO_OFFICER } from '../data/demo';
import type { Role, User } from '../types';

interface Props {
  onSignedIn: (user: User, demo: boolean) => void;
}

export default function LoginPage({ onSignedIn }: Props) {
  // The tab only changes display + which demo is offered. The backend decides real roles.
  const [tab, setTab] = useState<Role>('officer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      onSignedIn(user, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const isOfficer = tab === 'officer';

  return (
    <main className="login-page">
      <section className="login-hero">
        <Logo size="lg" />
        <h1>Real-time roadway incident alerts.</h1>
        <p>
          Officers report crashes, debris and closures from the field. Drivers see active hazards on their
          route as soon as they're posted.
        </p>
      </section>

      <section className="login-card" aria-labelledby="login-title">
        <div className="tabs" role="tablist" aria-label="Portal">
          <button
            role="tab"
            aria-selected={isOfficer}
            className={isOfficer ? 'tab active' : 'tab'}
            onClick={() => setTab('officer')}
            type="button"
          >
            <ShieldCheck size={18} /> Police officer
          </button>
          <button
            role="tab"
            aria-selected={!isOfficer}
            className={!isOfficer ? 'tab active' : 'tab'}
            onClick={() => setTab('driver')}
            type="button"
          >
            <Car size={18} /> Driver
          </button>
        </div>

        <h2 id="login-title">{isOfficer ? 'Officer sign in' : 'Driver sign in'}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isOfficer ? 'officer@agency.gov' : 'you@example.com'}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email || !password}>
            <LogIn size={18} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => onSignedIn(isOfficer ? DEMO_OFFICER : DEMO_DRIVER, true)}
        >
          <Eye size={18} /> {isOfficer ? 'Preview police dashboard' : 'Preview driver dashboard'}
        </button>
        <p className="hint">Preview uses fictional data and needs no backend.</p>
      </section>
    </main>
  );
}
