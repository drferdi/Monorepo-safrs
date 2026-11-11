import React, { useRef, useState } from 'react';
import { ArrowRight, CircleAlert, LoaderCircle } from 'lucide-react';
import TextField from './TextField.jsx';
import PasswordField from './PasswordField.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = 'Enter a complete email address, such as name@hospital.org.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0">
      <rect x="0" y="0" width="7.4" height="7.4" fill="#f25022" />
      <rect x="8.6" y="0" width="7.4" height="7.4" fill="#7fba00" />
      <rect x="0" y="8.6" width="7.4" height="7.4" fill="#00a4ef" />
      <rect x="8.6" y="8.6" width="7.4" height="7.4" fill="#ffb900" />
    </svg>
  );
}

/**
 * Sign-in form. Owns field state, validation and submission state only.
 * Authentication itself is injected:
 *   onSubmit({ email, password, remember }) => Promise  (reject with Error.message to show it)
 *   onMicrosoftSignIn() => Promise                      (omit to hide the button)
 */
export default function LoginForm({ onSubmit, onMicrosoftSignIn, onForgotPassword }) {
  const [values, setValues] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(null); // null | 'password' | 'microsoft'
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const busy = pending !== null;

  const setField = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  async function run(kind, action) {
    setFormError('');
    setPending(kind);
    try {
      await action();
    } catch (error) {
      setFormError(error?.message || 'Sign-in failed. Try again.');
    } finally {
      setPending(null);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();
    run('password', () =>
      onSubmit?.({
        email: values.email.trim(),
        password: values.password,
        remember: values.remember,
      }),
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={busy} className="flex flex-col gap-5">
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[13.5px] leading-5 text-danger"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <span>{formError}</span>
        </div>
      )}

      <TextField
        ref={emailRef}
        id="email"
        name="email"
        type="email"
        label="Email address"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        disabled={busy}
        value={values.email}
        onChange={setField('email')}
        error={errors.email}
      />

      <PasswordField
        ref={passwordRef}
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
        disabled={busy}
        value={values.password}
        onChange={setField('password')}
        error={errors.password}
        labelAction={
          <a
            href="#forgot-password"
            onClick={(event) => {
              if (onForgotPassword) {
                event.preventDefault();
                onForgotPassword();
              }
            }}
            className="rounded-sm text-[13px] font-medium text-accent underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Forgot password?
          </a>
        }
      />

      <label
        htmlFor="remember"
        className="flex w-fit cursor-pointer items-center gap-2.5 text-[13.5px] text-ink select-none"
      >
        <input
          id="remember"
          name="remember"
          type="checkbox"
          disabled={busy}
          checked={values.remember}
          onChange={setField('remember')}
          className="size-4 cursor-pointer rounded accent-accent outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
        Remember me on this workstation
      </label>

      <button
        type="submit"
        disabled={busy}
        className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-medium text-white outline-none transition-[background-color,box-shadow] duration-300 ease-calm hover:bg-ink-800 hover:shadow-[0_8px_24px_-12px_rgb(13_18_26/0.55)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/70 disabled:shadow-none"
      >
        {pending === 'password' ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={2} />
            Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 ease-calm group-hover:translate-x-1 group-disabled:translate-x-0"
              strokeWidth={2}
            />
          </>
        )}
      </button>

      {onMicrosoftSignIn && (
        <>
          <div aria-hidden="true" className="flex items-center gap-4">
            <span className="h-px flex-1 bg-rule" />
            <span className="font-mono text-[10.5px] tracking-[0.18em] text-muted uppercase">or</span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => run('microsoft', onMicrosoftSignIn)}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-field bg-white text-[15px] font-medium text-ink outline-none transition-[border-color,background-color] duration-200 ease-calm hover:border-ink/70 hover:bg-paper focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-muted"
          >
            {pending === 'microsoft' ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <MicrosoftLogo />
            )}
            Continue with Microsoft
          </button>
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {busy ? 'Signing in. Please wait.' : ''}
      </p>
    </form>
  );
}
