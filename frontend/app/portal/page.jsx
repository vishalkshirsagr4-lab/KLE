'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Portal3DBackdrop = dynamic(() => import('@/components/Portal3DBackdrop'), { ssr: false });

export default function Portal() {
  const [mode, setMode] = useState('login');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const readResponse = async (response) => {
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  };

  const startSignup = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password')
        })
      });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok && !data.needsVerification) {
        throw new Error(data.error || 'Could not create your account.');
      }

      const email = data.email || String(form.get('email')).trim().toLowerCase();
      setVerificationEmail(email);
      setMode('verify');
      setResendSeconds(60);
      if (response.ok) {
        setMessage(`We sent a 6-digit verification code to ${email}.`);
      } else {
        setError(data.error || 'Your account was created, but the email was not sent. Try resending the code.');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);

    try {
      const result = await readResponse(await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: form.get('code') })
      }));
      localStorage.setItem('token', result.token);
      setMessage(`Email verified. You are now signed in${result.name ? ` as ${result.name}` : ''}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await readResponse(await fetch('/api/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail })
      }));
      setResendSeconds(60);
      setMessage(`A new verification code was sent to ${verificationEmail}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);

    try {
      const result = await readResponse(await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
      }));
      localStorage.setItem('token', result.token);
      setMessage(`You are signed in${result.name ? ` as ${result.name}` : ''}.`);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.message.startsWith('Verify your email first')) {
        setVerificationEmail(String(form.get('email')).trim().toLowerCase());
        setMode('verify');
      }
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
    setVerificationEmail('');
  };

  return (
    <div className="portal-page">
      <Portal3DBackdrop />
      <div className="portal-content">
        <Link href="/" className="back-link">← Back to site</Link>
        <div className="portal-box">
          <h1>Inter College <span className="gradient-text">Hackathon 2K26</span></h1>

          {mode !== 'verify' && (
            <div className="tabs">
              <button type="button" className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => changeMode('login')}>Log in</button>
              <button type="button" className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => changeMode('signup')}>Sign up</button>
            </div>
          )}

          <div className="form-card">
            {mode === 'verify' ? (
              <>
                <h2>Verify your email</h2>
                <p>Enter the 6-digit code sent to {verificationEmail}. The code expires in 10 minutes.</p>
                <form onSubmit={verifyEmail}>
                  <div className="form-group">
                    <label htmlFor="verification-code">VERIFICATION CODE</label>
                    <input id="verification-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="123456" required />
                  </div>
                  <button type="submit" className="btn-full" disabled={busy}>{busy ? 'Verifying…' : 'Verify email'}</button>
                </form>
                <p className="signup-link">
                  Didn&apos;t receive it?{' '}
                  <button type="button" className="text-button" onClick={resendCode} disabled={busy || resendSeconds > 0}>
                    {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                  </button>
                </p>
                <p className="signup-link"><button type="button" className="text-button" onClick={() => changeMode('login')}>Back to log in</button></p>
              </>
            ) : (
              <>
                <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
                <p>{mode === 'signup' ? 'Sign up to receive an email verification code before logging in.' : 'Log in to manage your team registration.'}</p>
                <form onSubmit={mode === 'signup' ? startSignup : login}>
                  {mode === 'signup' && (
                    <div className="form-group">
                      <label htmlFor="signup-name">NAME</label>
                      <input id="signup-name" name="name" type="text" autoComplete="name" maxLength={80} placeholder="Your name" required />
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="account-email">EMAIL</label>
                    <input id="account-email" name="email" type="email" autoComplete="email" maxLength={120} placeholder="you@college.edu" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="account-password">PASSWORD</label>
                    <input id="account-password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required />
                  </div>
                  <button type="submit" className="btn-full" disabled={busy}>
                    {busy ? 'Please wait…' : mode === 'signup' ? 'Sign up and send code' : 'Log in'}
                  </button>
                </form>
                <p className="signup-link">
                  {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
                  <button type="button" className="text-button" onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>
                    {mode === 'signup' ? 'Log in' : 'Create an account'}
                  </button>
                </p>
              </>
            )}
            {error && <p className="form-message error" role="alert">{error}</p>}
            {message && <p className="form-message success" role="status">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
