import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import Field from './Field';
import PasswordInput from './PasswordInput';
import { login } from '../../lib/auth';
import { validateEmail } from '../../lib/validation';
import type { Role, User } from '../../types';

interface Props {
  role: Role;
  onSignedIn: (user: User) => void;
}

export default function SignInForm({ role, onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError('');

    const emailProblem = validateEmail(email);
    setEmailError(emailProblem);
    if (emailProblem || !password) return;

    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      onSignedIn(user);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign-in failed');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field id="signin-email" label="Email" error={emailError}>
        <input
          id="signin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setEmailError(validateEmail(email))}
          placeholder={role === 'officer' ? 'officer@agency.gov' : 'you@example.com'}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'signin-email-error' : undefined}
        />
      </Field>

      <Field id="signin-password" label="Password">
        <PasswordInput
          id="signin-password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}

      <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email || !password}>
        <LogIn size={18} /> {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
