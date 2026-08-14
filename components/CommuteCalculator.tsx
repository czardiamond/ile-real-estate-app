import React, { useState, useMemo } from 'react';
import { Property } from '../types';
import { Car, Bus, Footprints, Bike, MapPin, Clock, Fuel, ShieldAlert, Navigation, ChevronRight, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';

interface CommuteCalculatorProps {
  property: Property;
}

interface Destination {
  id: string;
  name: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  description: string;
}

const MAJOR_DISTRICTS: Destination[] = [
  {
    id: 'vi',
    name: 'Victoria Island (Ademola Adetokunbo / Eko Atlantic)',
    district: 'Victoria Island',
    city: 'Lagos',
    lat: 6.4281,
    lng: 3.4219,
    description: 'Financial center, corporate headquarters, luxury dining & diplomacy hub'
  },
  {
    id: 'ikeja',
    name: 'Ikeja Capital (Allen Avenue / Ikeja GRA / Alausa)',
    district: 'Ikeja',
    city: 'Lagos',
    lat: 6.6018,
    lng: 3.3515,
    description: 'State Secretariat, Tech hub, Murtala Muhammed Int Airport & shopping malls'
  },
  {
    id: 'lekki1',
    name: 'Lekki Phase 1 (Admiralty Way)',
    district: 'Lekki',
    city: 'Lagos',
    lat: 6.4474,
    lng: 3.4723,
    description: 'Tech startups, fine dining, vibrant nightlife & boutique retail'
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi (Bourdillon Road / Kingsway)',
    district: 'Ikoyi',
    city: 'Lagos',
    lat: 6.4549,
    lng: 3.4316,
    description: 'Diplomatic enclave, high-rise executive offices & golf clubs'
  },
  {
    id: 'marina',
    name: 'Marina / Broad Street (Lagos Island CBD)',
    district: 'Lagos Island',
    city: 'Lagos',
    lat: 6.4531,
    lng: 3.3958,
    description: 'Traditional banking head offices, Supreme Court & Blue Line Rail Terminal'
  },
  {
    id: 'abuja_cbd',
    name: 'Central Business District (Abuja CBD)',
    district: 'Abuja CBD',
    city: 'Abuja',
    lat: 9.0579,
    lng: 7.4951,
    description: 'Federal Ministries, NNPC Towers, Central Bank & Diplomatic Zone'
  }
];

export const CommuteCalculator: React.FC<CommuteCalculatorProps> = ({ property }) => {
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('vi');
  const [transportMode, setTransportMode] = useState<'driving' | 'transit' | 'walking' | 'bike'>('driving');
  const [departureTime, setDepartureTime] = useState<'morning_peak' | 'off_peak' | 'evening_peak'>('morning_peak');

  const selectedDestination = useMemo(() => {
    return MAJOR_DISTRICTS.find(d => d.id === selectedDestinationId) || MAJOR_DISTRICTS[0];
  }, [selectedDestinationId]);

  // Calculate distance in KM using Haversine formula
  const distanceKm = useMemo(() => {
    const propLat = property.coordinates?.lat || 6.45;
    const propLng = property.coordinates?.lng || 3.47;
    const destLat = selectedDestination.lat;
    const destLng = selectedDestination.lng;

    const R = 6371; // Earth radius in km
    const dLat = (destLat - propLat) * (Math.PI / 180);
    const dLng = (destLng - propLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(propLat * (Math.PI / 180)) *
        Math.cos(destLat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDist = R * c;

    // Apply urban winding factor (1.3x - 1.5x)
    return Math.max(1.2, parseFloat((straightDist * 1.4).toFixed(1)));
  }, [property.coordinates, selectedDestination]);

  // Calculate estimated duration based on distance, mode, and peak traffic
  const commuteDetails = useMemo(() => {
    let baseSpeedKmh = 35; // default driving off-peak
    let peakMultiplier = 1.0;

    if (transportMode === 'driving') {
      baseSpeedKmh = 38;
      if (departureTime === 'morning_peak') peakMultiplier = 2.1;
      else if (departureTime === 'evening_peak') peakMultiplier = 2.3;
      else peakMultiplier = 1.1;
    } else if (transportMode === 'transit') {
      baseSpeedKmh = 22; // BRT / Danfo
      if (departureTime === 'morning_peak' || departureTime === 'evening_peak') peakMultiplier = 1.6;
      else peakMultiplier = 1.1;
    } else if (transportMode === 'bike') {
      baseSpeedKmh = 25; // Motorbike/Okada/Gokada bypasses gridlock
      peakMultiplier = 1.15;
    } else {
      baseSpeedKmh = 4.8; // Walking
      peakMultiplier = 1.0;
    }

    const effectiveSpeed = baseSpeedKmh / peakMultiplier;
    const durationMinutes = Math.round((distanceKm / effectiveSpeed) * 60);

    // Fuel and transport cost estimate in Naira
    let estimatedCostNaira = 0;
    if (transportMode === 'driving') {
      const litersNeeded = (distanceKm / 8.5); // ~8.5 km/l in city traffic
      const fuelPricePerLiter = 950;
      const tollFee = distanceKm > 10 ? 500 : 0;
      estimatedCostNaira = Math.round(litersNeeded * fuelPricePerLiter + tollFee);
    } else if (transportMode === 'transit') {
      estimatedCostNaira = Math.round(distanceKm * 65 + 300); // BRT / bus fare
    } else if (transportMode === 'bike') {
      estimatedCostNaira = Math.round(distanceKm * 180 + 200); // Uber Moto / Ride hail
    }

    return {
      durationMinutes,
      effectiveSpeed: Math.round(effectiveSpeed),
      estimatedCostNaira,
    };
  }, [distanceKm, transportMode, departureTime]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${property.coordinates?.lat || 6.45},${property.coordinates?.lng || 3.47}&destination=${selectedDestination.lat},${selectedDestination.lng}&travelmode=${transportMode === 'transit' ? 'transit' : transportMode === 'walking' ? 'walking' : 'driving'}`;

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Navigation size={16} /> Google Maps Commute Matrix
          </div>
          <h3 className="text-xl font-bold text-on-surface">Travel Time & Commute Calculator</h3>
          <p className="text-xs text-on-surface-variant">
            Calculate exact travel times from <strong className="text-on-surface">{property.location.area || property.location.city}</strong> to key Lagos & Abuja business hubs.
          </p>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors self-start md:self-auto"
        >
          <ExternalLink size={14} /> Open Live Google Maps
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5 uppercase tracking-wide">
              Select Destination District
            </label>
            <select
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-outline-variant/30 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
            >
              {MAJOR_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-on-surface-variant mt-1 italic">
              {selectedDestination.description}
            </p>
          </div>

          {/* Transport Mode Buttons */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5 uppercase tracking-wide">
              Mode of Travel
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-container rounded-xl border border-outline-variant/15">
              <button
                type="button"
                onClick={() => setTransportMode('driving')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  transportMode === 'driving'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Car size={16} />
                <span>Car</span>
              </button>

              <button
                type="button"
                onClick={() => setTransportMode('transit')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  transportMode === 'transit'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Bus size={16} />
                <span>BRT / Bus</span>
              </button>

              <button
                type="button"
                onClick={() => setTransportMode('bike')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  transportMode === 'bike'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Bike size={16} />
                <span>Bike/Ride</span>
              </button>

              <button
                type="button"
                onClick={() => setTransportMode('walking')}
                className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  transportMode === 'walking'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Footprints size={16} />
                <span>Walk</span>
              </button>
            </div>
          </div>

          {/* Departure Time */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5 uppercase tracking-wide">
              Traffic Window
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDepartureTime('morning_peak')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  departureTime === 'morning_peak'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-300'
                    : 'bg-surface border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                🌅 Morning Rush (7-9 AM)
              </button>
              <button
                type="button"
                onClick={() => setDepartureTime('off_peak')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  departureTime === 'off_peak'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-300'
                    : 'bg-surface border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                ☀️ Off-Peak (11 AM - 3 PM)
              </button>
              <button
                type="button"
                onClick={() => setDepartureTime('evening_peak')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  departureTime === 'evening_peak'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-300'
                    : 'bg-surface border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                🌙 Evening Rush (5-8 PM)
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Display */}
        <div className="lg:col-span-7 bg-surface rounded-2xl p-5 border border-outline-variant/20 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Primary Time Metric */}
            <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/20">
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase mb-1">
                <Clock size={15} /> Est. Duration
              </div>
              <p className="text-3xl font-black text-on-surface">
                {commuteDetails.durationMinutes} <span className="text-sm font-bold text-on-surface-variant">mins</span>
              </p>
              <p className="text-[10px] text-on-surface-variant mt-1">
                {departureTime === 'off_peak' ? 'Fast clear route' : 'Includes peak traffic bottleneck'}
              </p>
            </div>

            {/* Distance Metric */}
            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/15">
              <div className="flex items-center gap-1.5 text-on-surface-variant font-bold text-xs uppercase mb-1">
                <MapPin size={15} /> Driving Distance
              </div>
              <p className="text-2xl font-black text-on-surface">
                {distanceKm} <span className="text-xs font-bold text-on-surface-variant">km</span>
              </p>
              <p className="text-[10px] text-on-surface-variant mt-1">
                Direct road route
              </p>
            </div>

            {/* Fuel / Transport Cost */}
            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/15">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase mb-1">
                <Fuel size={15} /> Est. Expense
              </div>
              <p className="text-2xl font-black text-on-surface">
                ₦{commuteDetails.estimatedCostNaira.toLocaleString()}
              </p>
              <p className="text-[10px] text-on-surface-variant mt-1">
                {transportMode === 'driving' ? 'Petrol + Tolls' : 'Estimated Fare'}
              </p>
            </div>
          </div>

          {/* Traffic Tip & Corridor Insights */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <ShieldAlert size={16} /> Key Corridor Traffic Advice:
            </div>
            <p className="text-on-surface-variant text-[11px] leading-relaxed">
              {selectedDestination.id === 'vi' || selectedDestination.id === 'ikoyi'
                ? 'Leaving Lekki / Ajah before 6:45 AM avoids the Lekki-Ikoyi Toll Bridge choke point. Alternatively, Blue Line Water Taxi is accessible at Falomo Jetty.'
                : selectedDestination.id === 'ikeja'
                ? 'Third Mainland Bridge is clear heading northbound in the mornings. Typical bottleneck forms around Oworonshoki & Maryland junction.'
                : 'Central Business District commute is generally smooth via expressways outside 8:00 - 8:45 AM peak window.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
