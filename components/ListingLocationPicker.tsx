import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_MAP_CENTER, isValidCoordinates, MapCoordinates, OSM_ATTRIBUTION, OSM_TILE_URL } from '../services/mapUtils';
import { mapMarkerIcon } from './mapMarkerIcon';
import MapSupport from './MapSupport';

interface Props { position: MapCoordinates | null; onChange: (position: MapCoordinates | null) => void }
function Picker({ position, onChange }: Props) {
  const map = useMap();
  useMapEvents({ click(event) { const point = event.latlng.wrap(); onChange({ lat: point.lat, lng: point.lng }); } });
  useEffect(() => {
    if (isValidCoordinates(position)) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 15));
  }, [position?.lat, position?.lng, map]);
  return isValidCoordinates(position) ? <Marker position={position} icon={mapMarkerIcon} draggable title="Drag to adjust private property location" alt="Private property location" eventHandlers={{ dragend(event) {
    const point = event.target.getLatLng().wrap();
    onChange({ lat: point.lat, lng: point.lng });
  } }} /> : null;
}
export default function ListingLocationPicker({ position, onChange }: Props) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');
  const validPosition = isValidCoordinates(position) ? position : null;
  const hasValidPosition = validPosition !== null;
  useEffect(() => {
    setLat(validPosition ? String(Number(validPosition.lat.toFixed(6))) : '');
    setLng(validPosition ? String(Number(validPosition.lng.toFixed(6))) : '');
    setError('');
  }, [hasValidPosition, position?.lat, position?.lng]);
  return <section className="space-y-3" aria-label="Private property location picker">
    <p className="text-xs text-gray-600">Optional: click the map or enter coordinates, then drag the pin to adjust. Exact coordinates are stored privately, not shown on public marketplace listings.</p>
    <div className="h-64 w-full overflow-hidden rounded-xl border border-gray-200 relative z-0">
      <MapContainer center={validPosition || DEFAULT_MAP_CENTER} zoom={hasValidPosition ? 15 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
        <MapSupport />
        <Picker position={position} onChange={onChange} />
      </MapContainer>
    </div>
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <label className="flex-1 min-w-28">Latitude<input aria-label="Private location latitude" type="number" step="any" min="-90" max="90" value={lat} onChange={e => setLat(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="flex-1 min-w-28">Longitude<input aria-label="Private location longitude" type="number" step="any" min="-180" max="180" value={lng} onChange={e => setLng(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <button type="button" className="rounded border p-2 font-bold" onClick={() => {
        const value = { lat: Number(lat), lng: Number(lng) };
        if (!lat.trim() || !lng.trim() || !isValidCoordinates(value)) { setError('Enter latitude from −90 to 90 and longitude from −180 to 180.'); return; }
        setError(''); onChange(value);
      }}>Set location</button>
      {hasValidPosition && <button type="button" className="rounded border p-2" onClick={() => onChange(null)}>Remove pin</button>}
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <p role="status" className="text-xs text-gray-600">{hasValidPosition ? 'Private location selected.' : 'No private location selected.'}</p>
  </section>;
}
