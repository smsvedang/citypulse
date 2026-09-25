import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Zone = {
  id: string;
  name: string;
  center?: { lat: number; lng: number };
  status?: string;
};

type CivicEvent = {
  id: string;
  type: string;
  source: string;
  severity: number;
  location?: { lat?: number; lng?: number; zone?: string };
};

function FitBounds({ zones, userLocation }: { zones: Zone[]; userLocation: [number, number] | null }) {
  const map = useMap();

  if (!userLocation && zones.length > 0) {
    const points = zones
      .map((zone) => zone.center && [zone.center.lat, zone.center.lng] as [number, number])
      .filter(Boolean) as [number, number][];
    if (points.length > 0) map.fitBounds(points, { padding: [24, 24] });
  }

  return null;
}

function markerColor(eventCount: number, status?: string) {
  if (status === 'Critical' || eventCount >= 4) return '#f43f5e';
  if (status === 'Elevated' || eventCount >= 2) return '#f59e0b';
  return '#10b981';
}

function readSavedLocation(): [number, number] | null {
  const saved = window.localStorage.getItem('citypulse-exact-location');
  if (!saved) return null;
  const [lat, lng] = saved.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

function UserLocation({ location }: { location: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(location, Math.max(map.getZoom(), 13), { animate: true });
  }, [location, map]);

  return (
    <CircleMarker center={location} radius={9} pathOptions={{ color: '#22d3ee', fillColor: '#0891b2', fillOpacity: 1, weight: 4 }}>
      <Popup>Your exact location</Popup>
    </CircleMarker>
  );
}

export function RealMap({ zones, events, selectedZoneId, onSelect }: {
  zones: Zone[];
  events: CivicEvent[];
  selectedZoneId: string;
  onSelect: (id: string) => void;
}) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => readSavedLocation());
  const fallbackCenter: [number, number] = [26.9124, 75.7873];
  const firstCenter = zones.find((zone) => zone.center)?.center;
  const center: [number, number] = userLocation || (firstCenter
    ? [firstCenter.lat, firstCenter.lng]
    : fallbackCenter);

  useEffect(() => {
    const updateLocation = () => setUserLocation(readSavedLocation());
    window.addEventListener('citypulse-location-updated', updateLocation);
    return () => window.removeEventListener('citypulse-location-updated', updateLocation);
  }, []);

  return (
    <MapContainer center={center} zoom={11} className="h-full min-h-[360px] w-full rounded-xl" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds zones={zones} userLocation={userLocation} />
      {userLocation && <UserLocation location={userLocation} />}
      {zones.map((zone) => {
        if (!zone.center) return null;
        const zoneEvents = events.filter((event) => event.location?.zone === zone.id);
        const selected = zone.id === selectedZoneId;
        return (
          <CircleMarker
            key={zone.id}
            center={[zone.center.lat, zone.center.lng]}
            radius={selected ? 14 : 10}
            pathOptions={{ color: markerColor(zoneEvents.length, zone.status), fillOpacity: 0.8, weight: selected ? 4 : 2 }}
            eventHandlers={{ click: () => onSelect(zone.id) }}
          >
            <Popup>
              <strong>{zone.name}</strong><br />
              {zoneEvents.length} verified event{zoneEvents.length === 1 ? '' : 's'}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}