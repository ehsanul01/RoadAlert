import { useState, type ChangeEvent, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import Field from './Field';
import PasswordInput from './PasswordInput';
import { signup } from '../../lib/auth';
import { passwordStrength, validateEmail, validateName, validatePassword } from '../../lib/validation';
import type { Role, User } from '../../types';

interface Props {
  role: Role;
  onSignedIn: (user: User) => void;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  agency: '',
  officerCode: '',
};

type FormValues = typeof EMPTY_FORM;
type FieldName = keyof FormValues;

const STRENGTH_LABELS = ['', 'Weak', 'Okay', 'Strong'];

/** Returns an error message per field (only fields with problems are present). */
function validate(values: FormValues, role: Role): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};

  const nameError = validateName(values.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;

  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.';

  if (role === 'officer') {
    if (!values.agency.trim()) errors.agency = 'Enter your agency.';
    if (!values.officerCode.trim()) errors.officerCode = 'Officer accounts need an agency access code.';
  }
  return errors;
}

export default function SignUpForm({ role, onSignedIn }: Props) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const isOfficer = role === 'officer';
  const errors = validate(values, role);
  const strength = passwordStrength(values.password);

  // Don't yell at the user before they've finished typing: only show an error
  // once the field has been left, or after they've tried to submit.
  function errorFor(field: FieldName): string | null {
    return (touched[field] || submitted) && errors[field] ? errors[field] : null;
  }

  // Shared props for every input so each one stays a single line below.
  function bind(field: FieldName) {
    return {
      id: `signup-${field}`,
      name: field,
      value: values[field],
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [field]: e.target.value })),
      onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
      'aria-invalid': !!errorFor(field),
      'aria-describedby': errorFor(field) ? `signup-${field}-error` : undefined,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const user = await signup({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role,
        agency: isOfficer ? values.agency.trim() : undefined,
        officerCode: isOfficer ? values.officerCode.trim() : undefined,
      });
      onSignedIn(user);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field id="signup-name" label="Full name" error={errorFor('name')}>
        <input type="text" autoComplete="name" placeholder="Jane Doe" {...bind('name')} />
      </Field>

      <Field id="signup-email" label="Email" error={errorFor('email')}>
        <input
          type="email"
          autoComplete="email"
          placeholder={isOfficer ? 'you@agency.gov' : 'you@example.com'}
          {...bind('email')}
        />
      </Field>

      {isOfficer && (
        <>
          <Field id="signup-agency" label="Agency" error={errorFor('agency')}>
            <input type="text" autoComplete="organization" placeholder="Erie County Highway Patrol" {...bind('agency')} />
          </Field>

          <Field
            id="signup-officerCode"
            label="Agency access code"
            error={errorFor('officerCode')}
            hint="Provided by your agency administrator."
          >
            <input type="text" autoComplete="off" {...bind('officerCode')} />
          </Field>
        </>
      )}

      <Field
        id="signup-password"
        label="Password"
        error={errorFor('password')}
        hint="At least 8 characters, with a letter and a number."
      >
        <PasswordInput autoComplete="new-password" {...bind('password')} />
        {strength > 0 && (
          <div className={`strength strength-${strength}`} aria-live="polite">
            <div className="strength-bar">
              <span />
              <span />
              <span />
            </div>
            <span className="strength-label">{STRENGTH_LABELS[strength]}</span>
          </div>
        )}
      </Field>

      <Field id="signup-confirmPassword" label="Confirm password" error={errorFor('confirmPassword')}>
        <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
      </Field>

      {serverError && (
        <p className="form-error" role="alert">
          {serverError}
        </p>
      )}

      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        <UserPlus size={18} /> {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
