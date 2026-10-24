import type { ReactNode } from 'react';

interface Props {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}

/** Label + input + inline error/hint. The input inside should use the same `id`. */
export default function Field({ id, label, error, hint, children }: Props) {
  return (
    <div className={error ? 'auth-field has-error' : 'auth-field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}
