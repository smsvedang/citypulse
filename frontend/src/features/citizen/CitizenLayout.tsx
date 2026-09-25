import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useFeedStatus } from '../../lib/hooks';
import { ThemeToggle } from '../../app/ThemeContext';

function requestCitizenPermissions(setLocation: (value: string) => void) {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => undefined);
  if (!('geolocation' in navigator)) { setLocation('Location unavailable'); return undefined; }
  let active = true; const saveLocation = ({ coords }: GeolocationPosition) => { if (!active) return; const value = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`; window.localStorage.setItem('citypulse-exact-location', value); window.dispatchEvent(new Event('citypulse-location-updated')); setLocation(value); }; const handleError = () => { if (active) setLocation('Location not shared'); };
  navigator.geolocation.getCurrentPosition(saveLocation, handleError, { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 });
  return () => { active = false; };
}

export function CitizenLayout() {
  const { overallHealth } = useFeedStatus(); const [exactLocation, setExactLocation] = useState(() => window.localStorage.getItem('citypulse-exact-location') || 'Requesting location');
  useEffect(() => requestCitizenPermissions(setExactLocation), []);
  const navItems = [{ path: '/citizen', label: 'Live city', end: true }, { path: '/citizen/alerts', label: 'Alerts' }, { path: '/citizen/account', label: 'My account' }];
  return <div className="citizen-shell"><header className="citizen-header"><div className="citizen-header-inner"><NavLink to="/citizen" className="citizen-brand"><span className="citizen-mark">CP</span><span>City<span>Pulse</span></span></NavLink><div className="citizen-context"><ThemeToggle /><span className="citizen-live"><i /> Data {overallHealth}</span><span className="citizen-location">⌖ {exactLocation}</span></div></div></header><nav className="citizen-nav"><div className="citizen-nav-inner">{navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => isActive ? 'citizen-link active' : 'citizen-link'}>{item.label}</NavLink>)}</div></nav><main className="citizen-main"><Outlet /></main><footer className="citizen-footer"><span>CityPulse civic intelligence</span><span>Live information for Jaipur Metro</span></footer></div>;
}