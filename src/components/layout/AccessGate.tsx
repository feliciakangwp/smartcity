// Login page shown before the app when the site is built with a password.
// The app's code is only downloaded after the password is accepted.
import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Anchor, Eye, EyeOff, Lock } from 'lucide-react';
import { isUnlocked, unlock } from '@/lib/access';
import { useTheme } from '@/lib/theme';

const App = lazy(() => import('@/App'));

export function AccessGate() {
  const [open, setOpen] = useState(isUnlocked);
  if (open)
    return (
      <Suspense fallback={<div className="grid h-full place-items-center text-sm font-semibold text-ink-500">Loading Port Nexus…</div>}>
        <App />
      </Suspense>
    );
  return <LoginPage onUnlock={() => setOpen(true)} />;
}

function LoginPage({ onUnlock }: { onUnlock: () => void }) {
  useTheme(); // applies the saved light / dark theme
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return setError('Enter the password.');
    setBusy(true);
    setError('');
    const ok = await unlock(password, remember);
    setBusy(false);
    if (ok) onUnlock();
    else {
      setError('That password is not correct. Try again.');
      setPassword('');
    }
  };

  return (
    <main className="grid min-h-full place-items-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[14px] border border-ink-200 bg-surface p-6 shadow-panel" aria-labelledby="login-title">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-harbor-500 to-nexus-400">
            <Anchor className="h-5 w-5 text-navy-950" aria-hidden />
          </span>
          <div>
            <div className="font-display text-base font-bold tracking-[0.14em] text-heading">PORT NEXUS</div>
            <div className="text-xs text-ink-500">Connecting Systems. Moving Information.</div>
          </div>
        </div>
        <h1 id="login-title" className="mt-6 flex items-center gap-2 text-xl font-bold text-heading">
          <Lock className="h-4 w-4" aria-hidden /> Enter the password
        </h1>
        <p className="mt-1 text-sm text-ink-700">This site is restricted. Ask the site owner for the password.</p>
        <label className="mt-5 flex flex-col gap-1">
          <span className="label">Password</span>
          <span className="relative">
            <input
              id="login-password"
              type={show ? 'text' : 'password'}
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-500 hover:text-ink-900"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {error && (
          <p id="login-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-700">
          <input id="login-remember" type="checkbox" className="h-4 w-4 accent-navy-800" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in on this device
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md border border-navy-800 bg-navy-800 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Enter Port Nexus'}
        </button>
      </form>
    </main>
  );
}
