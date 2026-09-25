import React, { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirebaseAuth } from '../../lib/firebase';
import { api } from '../../api/client';

const PENDING_OTP_KEY = 'citypulse-pending-otp-email';

export function CitizenAuth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  useEffect(() => {
    const pendingEmail = window.localStorage.getItem(PENDING_OTP_KEY);
    if (pendingEmail) {
      setOtpEmail(pendingEmail);
      setOtpStage(true);
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Account access is not configured for this environment.');

      if (mode === 'register') {
        const normalizedEmail = email.trim();
        const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        if (name.trim()) await updateProfile(result.user, { displayName: name.trim() });
        const otpResponse = await api<{ data?: { code?: string } }>('/api/auth/email-otp', { method: 'POST', body: JSON.stringify({ email: normalizedEmail }) });
        if (otpResponse?.data?.code) {
          window.localStorage.setItem('citypulse-debug-otp-code', otpResponse.data.code);
        }
        window.localStorage.setItem(PENDING_OTP_KEY, normalizedEmail.toLowerCase());
        setOtpEmail(normalizedEmail);
        setOtpStage(true);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onAuthenticated();
      }
    } catch (authError) {
      const code = (authError as { code?: string }).code;
      setError(code === 'auth/invalid-credential' ? 'Email or password is incorrect.' : code === 'auth/email-already-in-use' ? 'An account already exists for this email.' : String(authError instanceof Error ? authError.message : authError));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const normalizedEmail = otpEmail.trim();
      const normalizedCode = otp.trim();
      await api('/api/auth/email-otp/verify', { method: 'POST', body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }) });
      window.localStorage.setItem(`citypulse-email-otp-verified:${normalizedEmail.toLowerCase()}`, 'true');
      window.localStorage.removeItem(PENDING_OTP_KEY);
      onAuthenticated();
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : 'That code could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setBusy(true);
    try {
      window.localStorage.setItem(PENDING_OTP_KEY, otpEmail.toLowerCase());
      await api('/api/auth/email-otp', { method: 'POST', body: JSON.stringify({ email: otpEmail }) });
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : 'The code could not be resent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="citizen-auth-card mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Citizen access</p>
      <h1 className="auth-title mt-2 text-2xl font-bold text-white">{otpStage ? 'Check your email' : mode === 'login' ? 'Welcome back' : 'Create your citizen account'}</h1>
      <p className="auth-subtitle mt-2 text-sm text-slate-400">{otpStage ? `We sent a six-digit OTP to ${otpEmail}. It expires in 10 minutes.` : 'Use your CityPulse account to manage alerts for the places that matter to you.'}</p>

      {otpStage ? <form onSubmit={verifyOtp} className="mt-6 space-y-4"><Field label="Email OTP" type="text" value={otp} onChange={setOtp} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /><button disabled={busy || otp.length !== 6} className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60">{busy ? 'Verifying...' : 'Verify email OTP'}</button><button type="button" onClick={resendOtp} disabled={busy} className="w-full text-sm font-semibold text-cyan-400 hover:text-cyan-300">Resend code</button></form> : <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && <Field label="Full name" type="text" value={name} onChange={setName} required />}
        <Field label="Email address" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} minLength={6} required />
        {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60">
          {busy ? 'Connecting...' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
      </form>}

      {error && otpStage && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

      {!otpStage && <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-5 text-sm font-semibold text-cyan-400 hover:text-cyan-300">
        {mode === 'login' ? 'New citizen? Create an account' : 'Already registered? Sign in'}
      </button>}
    </div>
  );
}

function Field({ label, type, value, onChange, ...props }: { label: string; type: string; value: string; onChange: (value: string) => void; [key: string]: unknown }) {
  return (
    <label className="auth-field-label block text-sm font-semibold text-slate-200">
      {label}
      <input {...props} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="auth-field-input mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400" />
    </label>
  );
}