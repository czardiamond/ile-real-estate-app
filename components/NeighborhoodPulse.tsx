import React from 'react';
import { Info, MapPin, Waves, Zap } from 'lucide-react';
import type { Property } from '../types';

interface NeighborhoodPulseProps {
  property: Property;
}

export const NeighborhoodPulse: React.FC<NeighborhoodPulseProps> = ({ property }) => (
  <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 md:p-6 space-y-4">
    <header className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-primary"><MapPin size={18} /></div>
      <div>
        <h3 className="font-bold text-on-surface">Area information</h3>
        <p className="text-sm text-on-surface-variant">{property.location.area}{property.location.city ? `, ${property.location.city}` : ''}{property.location.state ? `, ${property.location.state}` : ''}</p>
      </div>
    </header>
    <div className="rounded-xl bg-surface p-4 text-sm text-on-surface-variant flex gap-2">
      <Info size={17} className="shrink-0 mt-0.5" />
      No independent neighborhood safety, amenities, infrastructure or market dataset is connected. Ratings and area claims are not shown.
    </div>
    <div className="grid sm:grid-cols-2 gap-3 text-xs">
      <div className="rounded-xl bg-surface p-3 flex gap-2"><Waves size={15} className="text-blue-600 shrink-0" /><span>Flood information entered on this listing: <strong>{property.floodRisk || 'Not assessed'}</strong>. This has not been independently assessed.</span></div>
      <div className="rounded-xl bg-surface p-3 flex gap-2"><Zap size={15} className="text-amber-600 shrink-0" /><span>Average grid power supplied by lister: <strong>{property.avgPowerHours == null ? 'Not provided' : `${property.avgPowerHours} hours/day`}</strong>.</span></div>
    </div>
  </section>
);
