// Local-only visual regression fixture: no Auth, Firestore, uploads or production writes.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ExploreView from '../../components/ExploreView';
import PropertyDetailMap from '../../components/PropertyDetailMap';
import ListingLocationPicker from '../../components/ListingLocationPicker';
import { PriceHeatmap } from '../../components/PriceHeatmap';
import { MOCK_PROPERTIES } from '../../services/mockData';
import type { Property } from '../../types';
import '../../index.css';
import { MapContainer, TileLayer } from 'react-leaflet';
import MapSupport from '../../components/MapSupport';
import { OSM_ATTRIBUTION, OSM_TILE_URL } from '../../services/mapUtils';

const samples: Property[] = [
  { ...MOCK_PROPERTIES[0], id: 'map-lagos', title: 'LOCAL TEST Lagos apartment', price: 45000000, coordinates: { lat: 6.45, lng: 3.46 } },
  { ...MOCK_PROPERTIES[2], id: 'map-abuja', title: 'LOCAL TEST Abuja apartment', price: 350000000, coordinates: { lat: 9.0765, lng: 7.476 } },
  { ...MOCK_PROPERTIES[0], id: 'map-invalid', title: 'LOCAL TEST invalid coordinate', coordinates: { lat: NaN, lng: 200 } },
  { ...MOCK_PROPERTIES[0], id: 'map-private', title: 'LOCAL TEST private location', coordinates: undefined },
];
function Harness() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [position, setPosition] = useState<{lat: number; lng: number} | null>(null);
  const [action, setAction] = useState('None');
  const [detail, setDetail] = useState({ lat: 6.45, lng: 3.46 });
  const [city, setCity] = useState('Lagos');
  const [badTiles, setBadTiles] = useState(false);
  return <>
    <aside className="p-4 bg-amber-50 border" aria-label="Local map controls">
      <h1>Local-only map QA — no backend writes</h1>
      <button className="p-2 border" onClick={() => setProperties(samples)}>Load local listings</button>
      <button className="p-2 border" onClick={() => setProperties([])}>Clear local listings</button>
      <button className="p-2 border" onClick={() => setDetail({ lat: 9.0765, lng: 7.476 })}>Change detail to Abuja</button>
      <button className="p-2 border" onClick={() => setDetail({ lat: NaN, lng: 999 })}>Invalid detail coordinates</button>
      <button className="p-2 border" onClick={() => setCity('FCT Abuja')}>Set heatmap initial city to Abuja</button>
      <button className="p-2 border" onClick={() => { Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: unknown, fail: (error: {code:number}) => void) => fail({code:1}) } }); }}>Simulate denied geolocation</button>
      <button className="p-2 border" onClick={() => setBadTiles(true)}>Simulate broken tiles</button>
      <button className="p-2 border" onClick={() => setBadTiles(false)}>Restore test tiles</button>
      <p data-testid="last-action">Last action: {action}</p>
    </aside>
    <ExploreView properties={properties} onPropertySelect={p => setAction(`Selected ${p.id}`)} onChat={p => setAction(`Chat ${p.id}`)} onView3D={() => {}} onViewFloorPlan={() => {}} />
    <h2>Detail map</h2><div style={{height: 300}}><PropertyDetailMap latitude={detail.lat} longitude={detail.lng} /></div>
    <h2>Private location picker</h2><ListingLocationPicker position={position} onChange={setPosition} />
    <output data-testid="selected-location">{position ? JSON.stringify(position) : 'No coordinates'}</output>
    <PriceHeatmap properties={properties} initialCity={city} onPropertySelect={p => setAction(`Heatmap ${p.id}`)} />
    <h2>Tile failure recovery test</h2><div style={{height:200}}>
      <MapContainer center={[9,8]} zoom={6} style={{height:'100%'}}>
        <TileLayer url={badTiles ? '/local-missing-map-tile/{z}/{x}/{y}.png' : OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <MapSupport />
      </MapContainer>
    </div>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Harness /></React.StrictMode>);
