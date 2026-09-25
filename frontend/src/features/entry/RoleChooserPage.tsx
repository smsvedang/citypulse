import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../../app/ThemeContext';

export function RoleChooserPage() {
  const navigate = useNavigate();
  const demoMode = window.sessionStorage.getItem('citypulse-demo-mode') === 'true';

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 md:px-10">
      <div className="mx-auto flex max-w-5xl justify-end"><ThemeToggle /></div>
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400">CityPulse live civic intelligence</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">Choose your CityPulse workspace</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">Use the citizen panel for local conditions and alerts. Authorized operators can sign in to the administrative dashboard.</p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <button onClick={() => navigate('/citizen')} className="group rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-7 text-left transition hover:-translate-y-1 hover:border-cyan-400 hover:bg-cyan-500/15">
            <span className="text-4xl" aria-hidden="true">◉</span>
            <h2 className="mt-6 text-2xl font-bold text-white">Citizen panel</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">See live city conditions, zone alerts, and manage your notification preferences.</p>
            <span className="mt-7 inline-flex rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">Enter citizen panel</span>
          </button>

          <button onClick={() => navigate('/volunteer')} className="group rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-7 text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:bg-emerald-500/15">
            <span className="text-4xl" aria-hidden="true">✦</span>
            <h2 className="mt-6 text-2xl font-bold text-white">Volunteer dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Receive city alerts and coordinate response in real time. Publishing rights stay with the admin.</p>
            <span className="mt-7 inline-flex rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950">Open volunteer board</span>
          </button>

          <button onClick={() => navigate('/admin')} className="group rounded-2xl border border-amber-500/30 bg-amber-500/10 p-7 text-left transition hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-500/15">
            <span className="text-4xl" aria-hidden="true">▣</span>
            <h2 className="mt-6 text-2xl font-bold text-white">Admin dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Monitor feeds and review registered users, notification choices, and location availability.</p>
            <span className="mt-7 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">Admin sign in</span>
          </button>
        </div>
      </div>
    </main>
  );
}
