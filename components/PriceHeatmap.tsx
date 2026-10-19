import React, { useEffect, useMemo, useState } from 'react';
import { Property } from '../types';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import { Flame, Filter } from 'lucide-react';
import { DEFAULT_MAP_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL, isValidCoordinates } from '../services/mapUtils';
import MapSupport from './MapSupport';
import { mapMarkerIcon } from './mapMarkerIcon';
import AccessiblePriceMarker from './AccessiblePriceMarker';

interface PriceHeatmapProps {
  properties?: Property[];
  onPropertySelect?: (property: Property) => void;
  initialCity?: string;
}

interface CityCenter {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  zoom: number;
}

const NIGERIAN_CITIES: CityCenter[] = [
  { id: 'lagos', name: 'Lagos', state: 'Lagos State', center: [6.4531, 3.3958], zoom: 12 },
  { id: 'abuja', name: 'Abuja (FCT)', state: 'Federal Capital Territory', center: [9.0579, 7.4951], zoom: 12 },
  { id: 'port_harcourt', name: 'Port Harcourt', state: 'Rivers State', center: [4.8156, 7.0498], zoom: 12 },
  { id: 'ibadan', name: 'Ibadan', state: 'Oyo State', center: [7.3775, 3.947], zoom: 12 },
  { id: 'kano', name: 'Kano', state: 'Kano State', center: [12.0022, 8.592], zoom: 12 }
];

type FilterLevel = 'ALL' | 'ULTRA_HIGH' | 'HIGH' | 'MID' | 'AFFORDABLE';

const CITY_ALIASES: Record<string, string> = {
  abuja: 'abuja',
  'abuja (fct)': 'abuja',
  'fct abuja': 'abuja',
  'abuja fct': 'abuja',
  fct: 'abuja',
  'federal capital territory': 'abuja',
  lagos: 'lagos',
  'port harcourt': 'port_harcourt',
  'port-harcourt': 'port_harcourt',
  ibadan: 'ibadan',
  kano: 'kano'
};

const normalize = (value: string | undefined) => (value || '').trim().toLowerCase();
const cityIdFor = (value: string | undefined) => CITY_ALIASES[normalize(value)] || normalize(value).replace(/\s+/g, '_');
const cityMatches = (propertyCity: string, selectedCity: CityCenter) =>
  cityIdFor(propertyCity) === selectedCity.id;

const tierFor = (price: number): Exclude<FilterLevel, 'ALL'> => {
  if (price >= 500_000_000) return 'ULTRA_HIGH';
  if (price >= 200_000_000) return 'HIGH';
  if (price >= 80_000_000) return 'MID';
  return 'AFFORDABLE';
};

const tierColor: Record<Exclude<FilterLevel, 'ALL'>, string> = {
  ULTRA_HIGH: '#9333ea',
  HIGH: '#ef4444',
  MID: '#eab308',
  AFFORDABLE: '#10b981'
};

const formatPrice = (property: Property) => {
  const period = property.period ? ` ${property.period}` : '';
  return `₦${property.price.toLocaleString()}${period}`;
};

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

export const PriceHeatmap: React.FC<PriceHeatmapProps> = ({
  properties = [],
  onPropertySelect,
  initialCity = 'Lagos'
}) => {
  const initialCityId = cityIdFor(initialCity);
  const [selectedCityId, setSelectedCityId] = useState(
    NIGERIAN_CITIES.some(city => city.id === initialCityId) ? initialCityId : 'lagos'
  );
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('ALL');
  const [showPropertyMarkers, setShowPropertyMarkers] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    const nextCityId = cityIdFor(initialCity);
    if (NIGERIAN_CITIES.some(city => city.id === nextCityId)) setSelectedCityId(nextCityId);
  }, [initialCity]);

  const selectedCity = useMemo(
    () => NIGERIAN_CITIES.find(city => city.id === selectedCityId) || NIGERIAN_CITIES[0],
    [selectedCityId]
  );

  const cityProperties = useMemo(
    () => properties.filter(property => cityMatches(property.location.city, selectedCity)),
    [properties, selectedCity]
  );

  const mappedProperties = useMemo(
    () => cityProperties.filter(property => isValidCoordinates(property.coordinates)),
    [cityProperties]
  );

  const filteredProperties = useMemo(
    () => mappedProperties.filter(property => filterLevel === 'ALL' || tierFor(property.price) === filterLevel),
    [mappedProperties, filterLevel]
  );
  useEffect(() => {
    setSelectedProperty(current => current ? filteredProperties.find(property => property.id === current.id) || null : null);
  }, [filteredProperties]);

  const mapCenter = selectedCity.center || DEFAULT_MAP_CENTER;

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Flame size={16} className="text-amber-500" /> Listing price map
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-on-surface">{selectedCity.name} listing activity</h3>
          <p className="text-xs text-on-surface-variant">
            Circles and pins reflect only supplied listings. Prices are asking prices, not valuations or market averages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-surface p-1.5 rounded-2xl border border-outline-variant/20">
          {NIGERIAN_CITIES.map(city => (
            <button
              key={city.id}
              onClick={() => { setSelectedCityId(city.id); setSelectedProperty(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedCityId === city.id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-surface rounded-2xl border border-outline-variant/20 items-center">
        <div className="md:col-span-8 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 flex items-center gap-1"><Filter size={13} /> Listing tier:</span>
          {([
            ['ALL', 'All listings', 'bg-on-surface text-surface'],
            ['ULTRA_HIGH', '₦500M+', 'bg-purple-600 text-white border-purple-600'],
            ['HIGH', '₦200M–₦500M', 'bg-rose-600 text-white border-rose-600'],
            ['MID', '₦80M–₦200M', 'bg-amber-600 text-white border-amber-600'],
            ['AFFORDABLE', '< ₦80M', 'bg-emerald-600 text-white border-emerald-600']
          ] as const).map(([level, label, activeClass]) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${filterLevel === level ? activeClass : 'bg-surface-container text-on-surface-variant border-transparent'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="md:col-span-4 flex justify-end">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface">
            <input type="checkbox" checked={showPropertyMarkers} onChange={event => setShowPropertyMarkers(event.target.checked)} className="w-4 h-4 accent-primary rounded" />
            <span>Show marker pins (price circles stay visible)</span>
          </label>
        </div>
      </div>

      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md">
        <MapContainer center={mapCenter} zoom={selectedCity.zoom} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
          <MapSupport />
          <MapController center={mapCenter} zoom={selectedCity.zoom} />
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} maxZoom={19} />

          {filteredProperties.map(property => {
            const coordinates = property.coordinates!;
            const color = tierColor[tierFor(property.price)];
            return (
              <CircleMarker
                key={`density-${property.id}`}
                center={[coordinates.lat, coordinates.lng]}
                radius={20}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.34, weight: 1 }}
                eventHandlers={{ click: () => setSelectedProperty(property) }}
              />
            );
          })}

          {showPropertyMarkers && filteredProperties.map(property => {
            const coordinates = property.coordinates!;
            return (
              <AccessiblePriceMarker
                key={property.id}
                position={[coordinates.lat, coordinates.lng]}
                icon={mapMarkerIcon}
                title={property.title}
                selected={selectedProperty?.id === property.id}
                onActivate={() => setSelectedProperty(property)}
              >
                <Popup>
                  <div className="p-1 max-w-[210px] space-y-1">
                    {property.images?.[0] && <img src={property.images[0]} alt="" className="w-full h-20 object-cover rounded-lg mb-1" />}
                    <h5 className="font-bold text-xs text-slate-900 line-clamp-2">{property.title}</h5>
                    <p className="font-black text-xs text-emerald-700">{formatPrice(property)}</p>
                    <button onClick={() => onPropertySelect?.(property)} className="mt-1 w-full py-1 bg-primary text-white text-[10px] font-bold rounded">Inspect space</button>
                  </div>
                </Popup>
              </AccessiblePriceMarker>
            );
          })}
        </MapContainer>

        {mappedProperties.length === 0 && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
            <div className="bg-surface/95 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-xl p-5 text-center max-w-sm">
              <p className="font-bold text-on-surface">No mapped listings for {selectedCity.name}</p>
              <p className="text-xs text-on-surface-variant mt-1">Listings appear here when supplied with valid latitude and longitude coordinates.</p>
            </div>
          </div>
        )}
        {mappedProperties.length > 0 && filteredProperties.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-surface/95 backdrop-blur-md rounded-xl border border-outline-variant/30 shadow-lg px-4 py-3 text-center">
            <p className="text-xs font-bold text-on-surface">No listings match this tier</p>
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-[400] bg-surface/90 backdrop-blur-md p-3.5 rounded-2xl border border-outline-variant/30 shadow-xl space-y-2 max-w-xs">
          <div className="flex items-center justify-between text-xs font-bold text-on-surface"><span>Listing price tiers</span><span className="text-[10px] text-on-surface-variant">{filteredProperties.length} shown</span></div>
          <div className="h-3.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 via-rose-500 to-purple-600 shadow-inner" />
          <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant"><span>&lt;₦80M</span><span>₦80M–₦500M</span><span>₦500M+</span></div>
          <p className="text-[10px] text-on-surface-variant">Source: supplied listings · OpenStreetMap contributors</p>
        </div>

        {selectedProperty && (
          <div className="absolute top-4 right-4 z-[400] bg-surface/95 backdrop-blur-md p-4 rounded-2xl border border-outline-variant/30 shadow-2xl space-y-2 max-w-sm">
            <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-on-surface-variant">Supplied listing</span><button onClick={() => setSelectedProperty(null)} className="text-on-surface-variant hover:text-on-surface font-bold text-xs">✕ Close</button></div>
            <h4 className="font-extrabold text-sm text-on-surface">{selectedProperty.title}</h4>
            <p className="text-xs text-on-surface-variant">{selectedProperty.location.area}, {selectedProperty.location.city}</p>
            <div className="p-2 rounded-xl bg-surface-container"><span className="text-[10px] text-on-surface-variant block font-medium">Listed price{selectedProperty.period ? ` (${selectedProperty.period})` : ''}</span><span className="font-black text-on-surface text-sm">{formatPrice(selectedProperty)}</span></div>
            <button onClick={() => onPropertySelect?.(selectedProperty)} className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg">Inspect space</button>
          </div>
        )}
      </div>
      <p className="text-[10px] text-on-surface-variant">Map data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>. No market valuation or price-per-square-metre estimate is inferred.</p>
    </div>
  );
};
