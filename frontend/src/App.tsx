import { useEffect, useState } from 'react';
import AuthPage from './components/auth/AuthPage';
import DashboardShell from './components/DashboardShell';
import OfficerDashboard from './pages/OfficerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import { currentUser, logout } from './lib/auth';
import type { Session, User } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  // Restore an existing cookie session on load.
  useEffect(() => {
    currentUser()
      .then((user) => user && setSession({ user, demo: false }))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    if (session && !session.demo) {
      try {
        await logout();
      } catch {
        /* session may already be gone; sign out locally anyway */
      }
    }
    setSession(null);
  }

  function handleSignedIn(user: User, demo: boolean) {
    setSession({ user, demo });
  }

  if (checking) {
    return (
      <div className="center-screen" role="status">
        Loading…
      </div>
    );
  }

  if (!session) return <AuthPage onSignedIn={handleSignedIn} />;

  return (
    <DashboardShell session={session} onLogout={handleLogout}>
      {session.user.role === 'officer' ? (
        <OfficerDashboard session={session} />
      ) : (
        <DriverDashboard session={session} />
      )}
    </DashboardShell>
  );
}
