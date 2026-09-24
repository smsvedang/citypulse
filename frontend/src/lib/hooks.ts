import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { fixtures } from '@citypulse/shared';

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === 'true';

export function useZones() {
  const [zones, setZones] = useState<any[]>(fixtures.zones);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    if (USE_FIXTURES) {
      setZones(fixtures.zones);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any[]>('/api/zones');
      if (Array.isArray(data) && data.length > 0) {
        setZones(data);
      } else {
        setZones(fixtures.zones);
      }
      setError(null);
    } catch (err: any) {
      console.warn('Using fixture zones fallback:', err.message);
      setZones(fixtures.zones);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
    const interval = setInterval(fetchZones, 15000);
    return () => clearInterval(interval);
  }, [fetchZones]);

  return { zones, loading, error, refresh: fetchZones };
}

export function useEvents(limit = 200) {
  const [events, setEvents] = useState<any[]>(fixtures.events);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (USE_FIXTURES) {
      setEvents(fixtures.events);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any[]>(`/api/events?limit=${limit}`);
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
      } else {
        setEvents(fixtures.events);
      }
      setError(null);
    } catch (err: any) {
      console.warn('Using fixture events fallback:', err.message);
      setEvents(fixtures.events);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return { events, loading, error, refresh: fetchEvents };
}

export function useAnomalies() {
  const [anomalies, setAnomalies] = useState<any[]>(fixtures.anomalies);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    if (USE_FIXTURES) {
      setAnomalies(fixtures.anomalies);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any[]>('/api/anomalies');
      if (Array.isArray(data) && data.length > 0) {
        setAnomalies(data);
      } else {
        setAnomalies(fixtures.anomalies);
      }
      setError(null);
    } catch (err: any) {
      setAnomalies(fixtures.anomalies);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 4000);
    return () => clearInterval(interval);
  }, [fetchAnomalies]);

  return { anomalies, loading, error, refresh: fetchAnomalies };
}

export function useCorrelations() {
  const [correlations, setCorrelations] = useState<any[]>(fixtures.correlations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCorrelations = useCallback(async () => {
    if (USE_FIXTURES) {
      setCorrelations(fixtures.correlations);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any[]>('/api/correlations');
      if (Array.isArray(data) && data.length > 0) {
        setCorrelations(data);
      } else {
        setCorrelations(fixtures.correlations);
      }
      setError(null);
    } catch (err: any) {
      setCorrelations(fixtures.correlations);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCorrelations();
    const interval = setInterval(fetchCorrelations, 4000);
    return () => clearInterval(interval);
  }, [fetchCorrelations]);

  return { correlations, loading, error, refresh: fetchCorrelations };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<any[]>(fixtures.alerts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (USE_FIXTURES) {
      setAlerts(fixtures.alerts);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any[]>('/api/alerts');
      if (Array.isArray(data)) {
        setAlerts(data);
      } else {
        setAlerts(fixtures.alerts);
      }
      setError(null);
    } catch (err: any) {
      setAlerts(fixtures.alerts);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a))
    );
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return { alerts, loading, error, refresh: fetchAlerts, acknowledgeAlert };
}

export function useFeedStatus() {
  const [feedStatus, setFeedStatus] = useState<any[]>(fixtures.feed_status);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedStatus = useCallback(async () => {
    if (USE_FIXTURES) {
      setFeedStatus(fixtures.feed_status);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any[]>('/api/feed-status');
      if (Array.isArray(data) && data.length > 0) {
        setFeedStatus(data);
      } else {
        setFeedStatus(fixtures.feed_status);
      }
      setError(null);
    } catch (err: any) {
      setFeedStatus(fixtures.feed_status);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedStatus();
    const interval = setInterval(fetchFeedStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchFeedStatus]);

  const hasDown = feedStatus.some((f) => f.health === 'down');
  const hasDelayed = feedStatus.some((f) => f.health === 'delayed');
  const hasDegraded = feedStatus.some((f) => f.health === 'degraded');
  const overallHealth = hasDown ? 'down' : hasDelayed ? 'delayed' : hasDegraded ? 'degraded' : 'healthy';

  return { feedStatus, overallHealth, loading, error, refresh: fetchFeedStatus };
}

export function usePulse() {
  const [pulse, setPulse] = useState<any>(fixtures.pulse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPulse = useCallback(async () => {
    if (USE_FIXTURES) {
      setPulse(fixtures.pulse);
      setLoading(false);
      return;
    }
    try {
      const data = await api<any>('/api/pulse');
      if (data && typeof data === 'object') {
        setPulse(data);
      } else {
        setPulse(fixtures.pulse);
      }
      setError(null);
    } catch (err: any) {
      setPulse(fixtures.pulse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, 5000);
    return () => clearInterval(interval);
  }, [fetchPulse]);

  return { pulse, loading, error, refresh: fetchPulse };
}
