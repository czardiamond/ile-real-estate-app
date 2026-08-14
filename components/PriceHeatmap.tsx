import React, { useState, useMemo } from 'react';
import { Property } from '../types';
import { MOCK_PROPERTIES } from '../services/mockData';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Flame, DollarSign, Filter, Layers, Navigation, Sparkles, Locate, Building, TrendingUp, Info, Check } from 'lucide-react';

interface PriceHeatmapProps {
  onPropertySelect?: (property: Property) => void;
  initialCity?: string;
}

interface CityCenter {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  avgPricePerSqm: string;
}

const NIGERIAN_CITIES: CityCenter[] = [
  {
    id: 'lagos',
    name: 'Lagos',
    state: 'Lagos State',
    lat: 6.4531,
    lng: 3.3958,
    zoom: 12,
    avgPricePerSqm: '₦850,000 / sqm'
  },
  {
    id: 'abuja',
    name: 'Abuja (FCT)',
    state: 'Federal Capital Territory',
    lat: 9.0579,
    lng: 7.4951,
    zoom: 12,
    avgPricePerSqm: '₦920,000 / sqm'
  },
  {
    id: 'port_harcourt',
    name: 'Port Harcourt',
    state: 'Rivers State',
    lat: 4.8156,
    lng: 7.0498,
    zoom: 12,
    avgPricePerSqm: '₦550,000 / sqm'
  },
  {
    id: 'ibadan',
    name: 'Ibadan',
    state: 'Oyo State',
    lat: 7.3775,
    lng: 3.9470,
    zoom: 12,
    avgPricePerSqm: '₦280,000 / sqm'
  },
  {
    id: 'kano',
    name: 'Kano',
    state: 'Kano State',
    lat: 12.0022,
    lng: 8.5920,
    zoom: 12,
    avgPricePerSqm: '₦220,000 / sqm'
  }
];

// Synthetic high-value & affordable cluster data points for price density heatmap across Nigeria
interface HeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  zoneName: string;
  city: string;
  priceLevel: 'ULTRA_HIGH' | 'HIGH' | 'MID' | 'AFFORDABLE';
  avgPriceMillions: number;
  pricePerSqm: number;
  color: string;
  radiusMeters: number;
}

const HEATMAP_NODES: HeatmapPoint[] = [
  // LAGOS HIGH-VALUE ZONES
  { id: 'h_ikoyi', lat: 6.4549, lng: 3.4316, zoneName: 'Ikoyi (Bourdillon / Banana Island)', city: 'Lagos', priceLevel: 'ULTRA_HIGH', avgPriceMillions: 850, pricePerSqm: 1400000, color: '#9333ea', radiusMeters: 1800 },
  { id: 'h_vi', lat: 6.4281, lng: 3.4219, zoneName: 'Victoria Island (Eko Atlantic / VI CBD)', city: 'Lagos', priceLevel: 'ULTRA_HIGH', avgPriceMillions: 650, pricePerSqm: 1250000, color: '#a855f7', radiusMeters: 1600 },
  { id: 'h_lekki1', lat: 6.4474, lng: 3.4723, zoneName: 'Lekki Phase 1 (Admiralty Way)', city: 'Lagos', priceLevel: 'HIGH', avgPriceMillions: 320, pricePerSqm: 850000, color: '#ef4444', radiusMeters: 2000 },
  { id: 'h_ikeja_gra', lat: 6.5890, lng: 3.3550, zoneName: 'Ikeja GRA & Alausa Capital', city: 'Lagos', priceLevel: 'HIGH', avgPriceMillions: 280, pricePerSqm: 780000, color: '#f97316', radiusMeters: 1700 },
  { id: 'h_chevrolet', lat: 6.4380, lng: 3.5300, zoneName: 'Chevron / Orchid Road Corridor', city: 'Lagos', priceLevel: 'MID', avgPriceMillions: 140, pricePerSqm: 480000, color: '#eab308', radiusMeters: 2200 },
  { id: 'h_yaba', lat: 6.5095, lng: 3.3711, zoneName: 'Yaba Tech Corridor & Alagomeji', city: 'Lagos', priceLevel: 'MID', avgPriceMillions: 110, pricePerSqm: 420000, color: '#eab308', radiusMeters: 1500 },
  { id: 'h_surulere', lat: 6.4974, lng: 3.3540, zoneName: 'Surulere (Bode Thomas / Stadium)', city: 'Lagos', priceLevel: 'MID', avgPriceMillions: 95, pricePerSqm: 380000, color: '#eab308', radiusMeters: 1800 },
  { id: 'h_sangotedo', lat: 6.4710, lng: 3.6300, zoneName: 'Sangotedo & Monastery Road', city: 'Lagos', priceLevel: 'AFFORDABLE', avgPriceMillions: 65, pricePerSqm: 260000, color: '#10b981', radiusMeters: 2800 },
  { id: 'h_epe', lat: 6.5820, lng: 3.9830, zoneName: 'Epe Express Corridor & Alaro City', city: 'Lagos', priceLevel: 'AFFORDABLE', avgPriceMillions: 25, pricePerSqm: 120000, color: '#06b6d4', radiusMeters: 3500 },
  { id: 'h_ikorodu', lat: 6.6180, lng: 3.5080, zoneName: 'Ikorodu (Agric / Ebute)', city: 'Lagos', priceLevel: 'AFFORDABLE', avgPriceMillions: 28, pricePerSqm: 110000, color: '#06b6d4', radiusMeters: 3200 },

  // ABUJA ZONES
  { id: 'h_maitama', lat: 9.0882, lng: 7.4930, zoneName: 'Maitama Diplomatic Zone', city: 'Abuja', priceLevel: 'ULTRA_HIGH', avgPriceMillions: 950, pricePerSqm: 1600000, color: '#9333ea', radiusMeters: 2000 },
  { id: 'h_asokoro', lat: 9.0431, lng: 7.5251, zoneName: 'Asokoro Executive Enclave', city: 'Abuja', priceLevel: 'ULTRA_HIGH', avgPriceMillions: 880, pricePerSqm: 1500000, color: '#9333ea', radiusMeters: 1900 },
  { id: 'h_guzape', lat: 9.0180, lng: 7.5180, zoneName: 'Guzape Hills', city: 'Abuja', priceLevel: 'HIGH', avgPriceMillions: 450, pricePerSqm: 950000, color: '#ef4444', radiusMeters: 1700 },
  { id: 'h_wuse2', lat: 9.0710, lng: 7.4780, zoneName: 'Wuse 2 Commercial Hub', city: 'Abuja', priceLevel: 'HIGH', avgPriceMillions: 380, pricePerSqm: 880000, color: '#f97316', radiusMeters: 1600 },
  { id: 'h_jabi', lat: 9.0760, lng: 7.4210, zoneName: 'Jabi Lake District', city: 'Abuja', priceLevel: 'MID', avgPriceMillions: 220, pricePerSqm: 620000, color: '#eab308', radiusMeters: 1800 },
  { id: 'h_lugbe', lat: 8.9800, lng: 7.3800, zoneName: 'Lugbe Airport Corridor', city: 'Abuja', priceLevel: 'AFFORDABLE', avgPriceMillions: 45, pricePerSqm: 210000, color: '#10b981', radiusMeters: 3000 },
  { id: 'h_kubwa', lat: 9.1500, lng: 7.3300, zoneName: 'Kubwa Residential District', city: 'Abuja', priceLevel: 'AFFORDABLE', avgPriceMillions: 38, pricePerSqm: 180000, color: '#06b6d4', radiusMeters: 3200 },

  // PORT HARCOURT ZONES
  { id: 'h_ph_gra', lat: 4.8156, lng: 7.0498, zoneName: 'Old GRA & Presidential Hotel Hub', city: 'Port Harcourt', priceLevel: 'HIGH', avgPriceMillions: 340, pricePerSqm: 720000, color: '#ef4444', radiusMeters: 2100 },
  { id: 'h_peter_odili', lat: 4.8010, lng: 7.0320, zoneName: 'Peter Odili Road', city: 'Port Harcourt', priceLevel: 'MID', avgPriceMillions: 160, pricePerSqm: 420000, color: '#eab308', radiusMeters: 2000 }
];

// Helper to update map view
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

export const PriceHeatmap: React.FC<PriceHeatmapProps> = ({ onPropertySelect, initialCity = 'Lagos' }) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('lagos');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'ULTRA_HIGH' | 'HIGH' | 'MID' | 'AFFORDABLE'>('ALL');
  const [showPropertyMarkers, setShowPropertyMarkers] = useState<boolean>(true);
  const [selectedPoint, setSelectedPoint] = useState<HeatmapPoint | null>(null);

  const selectedCity = useMemo(() => {
    return NIGERIAN_CITIES.find(c => c.id === selectedCityId) || NIGERIAN_CITIES[0];
  }, [selectedCityId]);

  // Filter Heatmap Density Points
  const filteredHeatmapNodes = useMemo(() => {
    return HEATMAP_NODES.filter(node => {
      const matchCity = node.city.toLowerCase() === selectedCity.name.toLowerCase();
      const matchLevel = filterLevel === 'ALL' || node.priceLevel === filterLevel;
      return matchCity && matchLevel;
    });
  }, [selectedCity, filterLevel]);

  // Filter actual properties matching city
  const cityProperties = useMemo(() => {
    return MOCK_PROPERTIES.filter(p => p.location.city.toLowerCase() === selectedCity.name.toLowerCase());
  }, [selectedCity]);

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Flame size={16} className="text-amber-500 animate-pulse" /> Google Maps Property Price Heatmap Layer
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-on-surface">Nigerian City Price Valuation Heatmap</h3>
          <p className="text-xs text-on-surface-variant">
            Visualize prime high-value luxury zones (₦800M+) vs affordable emerging growth corridors across Nigeria.
          </p>
        </div>

        {/* City Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface p-1.5 rounded-2xl border border-outline-variant/20">
          {NIGERIAN_CITIES.map((city) => (
            <button
              key={city.id}
              onClick={() => setSelectedCityId(city.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCityId === city.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Legend Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-surface rounded-2xl border border-outline-variant/20 items-center">
        {/* Tier Filter */}
        <div className="md:col-span-8 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter size={13} /> Zone Tier:
          </span>

          <button
            onClick={() => setFilterLevel('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterLevel === 'ALL'
                ? 'bg-on-surface text-surface'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            All Zones
          </button>

          <button
            onClick={() => setFilterLevel('ULTRA_HIGH')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              filterLevel === 'ULTRA_HIGH'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
            }`}
          >
            🔥 Ultra High (₦500M+)
          </button>

          <button
            onClick={() => setFilterLevel('HIGH')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              filterLevel === 'HIGH'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
            }`}
          >
            🔴 Prime High (₦200M - ₦500M)
          </button>

          <button
            onClick={() => setFilterLevel('MID')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              filterLevel === 'MID'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
            }`}
          >
            🟡 Mid-Tier (₦80M - ₦200M)
          </button>

          <button
            onClick={() => setFilterLevel('AFFORDABLE')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              filterLevel === 'AFFORDABLE'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
            }`}
          >
            🟢 Affordable Growth (&lt; ₦80M)
          </button>
        </div>

        {/* Toggle Property Marker Overlay */}
        <div className="md:col-span-4 flex justify-end">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface">
            <input
              type="checkbox"
              checked={showPropertyMarkers}
              onChange={(e) => setShowPropertyMarkers(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <span>Show Property Pins</span>
          </label>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-outline-variant/30 shadow-md">
        <MapContainer
          center={[selectedCity.lat, selectedCity.lng]}
          zoom={selectedCity.zoom}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapController center={[selectedCity.lat, selectedCity.lng]} zoom={selectedCity.zoom} />

          {/* CartoDB Dark or Voyager Tiles for High-Contrast Heatmap Overlay */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Render Heatmap Radius Density Circles */}
          {filteredHeatmapNodes.map((node) => (
            <React.Fragment key={node.id}>
              {/* Outer Glow Halo Circle */}
              <CircleMarker
                center={[node.lat, node.lng]}
                radius={32}
                pathOptions={{
                  color: node.color,
                  fillColor: node.color,
                  fillOpacity: 0.35,
                  stroke: false
                }}
              />
              {/* Core Heat Center */}
              <CircleMarker
                center={[node.lat, node.lng]}
                radius={16}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: node.color,
                  fillOpacity: 0.85,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => setSelectedPoint(node)
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white" style={{ backgroundColor: node.color }}>
                      {node.priceLevel.replace('_', ' ')}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">{node.zoneName}</h4>
                    <p className="text-slate-600">Avg Valuation: <strong>₦{node.avgPriceMillions}M</strong></p>
                    <p className="text-slate-600">Rate: <strong>₦{node.pricePerSqm.toLocaleString()} / sqm</strong></p>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}

          {/* Optional Individual Property Markers */}
          {showPropertyMarkers && cityProperties.map((prop) => {
            if (!prop.coordinates) return null;
            return (
              <Marker
                key={prop.id}
                position={[prop.coordinates.lat, prop.coordinates.lng]}
                eventHandlers={{
                  click: () => onPropertySelect && onPropertySelect(prop)
                }}
              >
                <Popup>
                  <div className="p-1 max-w-[200px] space-y-1">
                    <img src={prop.images[0]} alt="" className="w-full h-20 object-cover rounded-lg mb-1" />
                    <h5 className="font-bold text-xs text-slate-900 line-clamp-1">{prop.title}</h5>
                    <p className="font-black text-xs text-emerald-700">₦{prop.price.toLocaleString()}</p>
                    <button
                      onClick={() => onPropertySelect && onPropertySelect(prop)}
                      className="mt-1 w-full py-1 bg-primary text-white text-[10px] font-bold rounded"
                    >
                      Inspect Space
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Heatmap Legend Floating Overlay */}
        <div className="absolute bottom-4 left-4 z-[400] bg-surface/90 backdrop-blur-md p-3.5 rounded-2xl border border-outline-variant/30 shadow-xl space-y-2 max-w-xs">
          <div className="flex items-center justify-between text-xs font-bold text-on-surface">
            <span className="flex items-center gap-1">
              <Flame size={14} className="text-amber-500" /> Price Gradient
            </span>
            <span className="text-[10px] text-on-surface-variant">{selectedCity.avgPricePerSqm}</span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-400 via-rose-500 to-purple-600 shadow-inner" />

          <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant">
            <span>Affordable (&lt;₦50M)</span>
            <span>Mid</span>
            <span>Luxury (&gt;₦500M)</span>
          </div>
        </div>

        {/* Selected Zone Intelligence Drawer */}
        {selectedPoint && (
          <div className="absolute top-4 right-4 z-[400] bg-surface/95 backdrop-blur-md p-4 rounded-2xl border border-outline-variant/30 shadow-2xl space-y-2 max-w-sm animate-in slide-in-from-right-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white" style={{ backgroundColor: selectedPoint.color }}>
                {selectedPoint.priceLevel.replace('_', ' ')}
              </span>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-on-surface-variant hover:text-on-surface font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <h4 className="font-extrabold text-sm text-on-surface">{selectedPoint.zoneName}</h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 rounded-xl bg-surface-container">
                <span className="text-[10px] text-on-surface-variant block font-medium">Avg Zone Valuation</span>
                <span className="font-black text-on-surface text-sm">₦{selectedPoint.avgPriceMillions}M</span>
              </div>

              <div className="p-2 rounded-xl bg-surface-container">
                <span className="text-[10px] text-on-surface-variant block font-medium">Land Rate / sqm</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  ₦{selectedPoint.pricePerSqm.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
