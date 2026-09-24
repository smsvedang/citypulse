export function computePulse({ zones = [], recentEvents = [], feedStatus = [], now = Date.now() }) {
  const feedStats = Array.isArray(feedStatus) ? feedStatus : [];
  const overall = feedStats.length ? (feedStats.every((item) => item.health === 'healthy') ? 'healthy' : feedStats.every((item) => item.health === 'down') ? 'down' : 'degraded') : 'healthy';

  const zoneSummaries = (zones || []).map((zone) => {
    const zoneEvents = recentEvents.filter((event) => event.location?.zone === zone.id);
    const eventsInWindow = zoneEvents.filter((event) => {
      const time = new Date(event.timestamp).getTime();
      return now - time <= 60 * 60 * 1000;
    });
    const maxSeverity = eventsInWindow.reduce((max, event) => Math.max(max, Number(event.severity || 0)), 0);
    const latestEventAt = eventsInWindow.length ? new Date(Math.max(...eventsInWindow.map((event) => new Date(event.timestamp).getTime()))).toISOString() : null;
    const typeMap = {};
    for (const event of eventsInWindow) {
      typeMap[event.type] = (typeMap[event.type] || 0) + 1;
    }
    let status = 'normal';
    if (maxSeverity >= 0.75 && Object.keys(typeMap).length >= 2) status = 'critical';
    else if (maxSeverity >= 0.5) status = 'watch';

    return {
      zone_id: zone.id,
      name: zone.name,
      status,
      event_count_60m: eventsInWindow.length,
      max_severity_60m: Number(maxSeverity.toFixed(2)),
      latest_event_at: latestEventAt,
      types_60m: typeMap,
    };
  });

  return {
    last_updated: new Date(now).toISOString(),
    feed_health: { overall, delayed: feedStats.filter((item) => item.health === 'delayed').map((item) => item.source) },
    zones: zoneSummaries,
  };
}
