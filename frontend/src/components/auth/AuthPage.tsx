import { useState, type ReactNode } from 'react';
import { Car, Eye, ShieldCheck } from 'lucide-react';
import Logo from '../Logo';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { DEMO_DRIVER, DEMO_OFFICER } from '../../data/demo';
import type { Role, User } from '../../types';

type Mode = 'signin' | 'signup';

interface Props {
  onSignedIn: (user: User, demo: boolean) => void;
}

export default function AuthPage({ onSignedIn }: Props) {
  // For sign-in the tab is cosmetic (the server knows the real role).
  // For sign-up it decides which account type is requested.
  const [role, setRole] = useState<Role>('driver');
  const [mode, setMode] = useState<Mode>('signin');

  const isOfficer = role === 'officer';
  const isSignUp = mode === 'signup';
  const title = `${isOfficer ? 'Officer' : 'Driver'} ${isSignUp ? 'sign up' : 'sign in'}`;

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

      <section className="login-card" aria-labelledby="auth-title">
        <div className="tabs" role="tablist" aria-label="Account type">
          <RoleTab active={!isOfficer} onClick={() => setRole('driver')} icon={<Car size={18} />} label="Driver" />
          <RoleTab
            active={isOfficer}
            onClick={() => setRole('officer')}
            icon={<ShieldCheck size={18} />}
            label="Police officer"
          />
        </div>

        <h2 id="auth-title">{title}</h2>

        {/* `key` resets the form state when switching role or mode. */}
        {isSignUp ? (
          <SignUpForm key={`up-${role}`} role={role} onSignedIn={(user) => onSignedIn(user, false)} />
        ) : (
          <SignInForm key={`in-${role}`} role={role} onSignedIn={(user) => onSignedIn(user, false)} />
        )}

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="link-btn" onClick={() => setMode(isSignUp ? 'signin' : 'signup')}>
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>

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

interface RoleTabProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function RoleTab({ active, onClick, icon, label }: RoleTabProps) {
  return (
    <button role="tab" type="button" aria-selected={active} className={active ? 'tab active' : 'tab'} onClick={onClick}>
      {icon} {label}
    </button>
  );
}
