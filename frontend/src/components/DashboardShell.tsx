import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import Logo from './Logo';
import type { Session } from '../types';

interface Props {
  session: Session;
  onLogout: () => void;
  children: ReactNode;
}

export default function DashboardShell({ session, onLogout, children }: Props) {
  const { user, demo } = session;
  return (
    <div className="shell">
      <header className="topbar">
        <Logo />
        <div className="topbar-right">
          <div className="who">
            <span className="who-name">{user.name}</span>
            <span className="who-meta">
              {user.role === 'officer' ? user.agency ?? 'Officer' : 'Driver'}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} type="button">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      {demo && (
        <div className="demo-banner" role="note">
          Demo preview — fictional data only. Nothing here is sent to a server or shown to real drivers.
        </div>
      )}
      <main className="content">{children}</main>
    </div>
  );
}
