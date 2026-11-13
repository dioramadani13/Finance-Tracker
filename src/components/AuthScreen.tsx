import { GoogleSignInButton } from './GoogleSignInButton.tsx';

interface AuthScreenProps {
  onSignIn: () => void;
  loading: boolean;
  error: string | null;
}

export function AuthScreen({ onSignIn, loading, error }: AuthScreenProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-8 border-b border-slate-200 px-6 py-4">
        <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Personal Finance Tracker
        </span>
        <div className="shrink-0">
          <GoogleSignInButton
            onClick={onSignIn}
            disabled={loading}
            label={loading ? 'Menghubungkan...' : 'Sign in with Google'}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl [text-wrap:balance]">
          Personal Finance Tracker
        </h1>

        <div className="mt-8">
          <GoogleSignInButton
            onClick={onSignIn}
            disabled={loading}
            label={loading ? 'Memproses Login...' : 'Sign in with Google'}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 w-full max-w-md rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
