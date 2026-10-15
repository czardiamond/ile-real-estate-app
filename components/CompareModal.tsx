import React from 'react';
import { Property } from '../types';
import { Bed, Bath, MapPin, Maximize2, X, Zap, Waves, ImageOff } from 'lucide-react';

interface CompareModalProps {
  properties: Property[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onChat: (property: Property) => void;
}

const CompareModal: React.FC<CompareModalProps> = ({ properties, onClose, onRemove, onChat }) => {
  if (properties.length === 0) return null;

  const formatPrice = (price: number) => new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(price);

  const rows: { label: string; icon?: React.ReactNode; value: (property: Property) => string }[] = [
    { label: 'Asking price', value: property => `${formatPrice(property.price)}${property.period && property.period !== 'total' ? ` / ${property.period.replace(/^per\s+/i, '')}` : ''}` },
    { label: 'Property type', value: property => property.type },
    { label: 'Neighbourhood', icon: <MapPin size={15} aria-hidden="true" />, value: property => `${property.location.area}, ${property.location.city}` },
    { label: 'Bedrooms', icon: <Bed size={15} aria-hidden="true" />, value: property => String(property.specs.bedrooms ?? 'Not provided') },
    { label: 'Bathrooms', icon: <Bath size={15} aria-hidden="true" />, value: property => String(property.specs.bathrooms ?? 'Not provided') },
    { label: 'Size / capacity', icon: <Maximize2 size={15} aria-hidden="true" />, value: property => property.specs.sizeSqM ? `${property.specs.sizeSqM} m²` : property.specs.capacity ? `${property.specs.capacity} guests` : 'Not provided' },
    { label: 'Reported power', icon: <Zap size={15} aria-hidden="true" />, value: property => Number.isFinite(property.avgPowerHours) ? `${property.avgPowerHours} hrs/day` : 'Not provided' },
    { label: 'Reported flood risk', icon: <Waves size={15} aria-hidden="true" />, value: property => property.floodRisk || 'Not provided' },
    { label: 'Listed features', value: property => property.features?.length ? property.features.slice(0, 5).join(' · ') : 'No features provided' },
  ];

  const cellClass = 'flex h-12 shrink-0 items-center gap-2 overflow-hidden rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm leading-4 text-on-surface';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-2 md:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="compare-heading" className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant bg-surface px-5 py-4 md:px-6">
          <div>
            <h2 id="compare-heading" className="font-display text-2xl font-semibold text-on-surface">Compare properties</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{properties.length} {properties.length === 1 ? 'property' : 'properties'} selected · details as provided by listing contributors</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close comparison" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-outline bg-white text-on-surface hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-auto bg-surface-container-low p-3 md:p-5" aria-label="Side-by-side property details">
          <p className="mb-3 text-xs text-on-surface-variant md:hidden">Swipe horizontally to compare each property.</p>
          <div className="flex min-w-max items-start gap-3 md:gap-4">
            <div className="sticky left-0 z-20 flex w-32 shrink-0 flex-col gap-3 bg-surface-container-low pt-[190px] md:w-44" aria-hidden="true">
              {rows.map(row => (
                <div key={row.label} className={`${cellClass} font-semibold text-on-surface-variant`}>
                  {row.icon && <span className="shrink-0 text-on-surface-variant">{row.icon}</span>}
                  <span className="line-clamp-2 text-xs leading-4">{row.label}</span>
                </div>
              ))}
            </div>

            {properties.map(property => {
              const image = property.images?.[0];
              return (
                <article key={property.id} className="flex w-64 shrink-0 flex-col gap-3 md:w-72" aria-label={`Comparison for ${property.title}`}>
                  <div className="h-[178px] overflow-hidden rounded-xl border border-outline-variant bg-white">
                    <div className="relative h-[100px] bg-surface-container">
                      {image ? <img src={image} alt={`${property.title} property photo`} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-on-surface-variant"><ImageOff size={24} aria-hidden="true" /><span className="ml-2 text-xs">No photo provided</span></div>}
                      <button type="button" onClick={() => onRemove(property.id)} aria-label={`Remove ${property.title} from comparison`} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline bg-white text-on-surface shadow-sm hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex h-[78px] items-center justify-between gap-2 px-3">
                      <h3 className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 text-on-surface">{property.title}</h3>
                      <button type="button" onClick={() => onChat(property)} className="min-h-9 shrink-0 rounded-lg bg-[#213b31] px-2.5 text-xs font-semibold text-white hover:bg-[#294b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Enquire</button>
                    </div>
                  </div>
                  {rows.map(row => (
                    <div key={row.label} role="group" aria-label={`${row.label}: ${row.value(property)}`} className={`${cellClass} ${row.label === 'Listed features' ? 'h-auto min-h-20 items-start overflow-visible py-3' : ''}`}>
                      {row.icon && <span className="shrink-0 text-on-surface-variant">{row.icon}</span>}
                      <span className={`min-w-0 ${row.label === 'Listed features' ? 'break-words text-xs leading-5' : 'line-clamp-2 break-words'}`}>{row.value(property)}</span>
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        </div>
        <p className="shrink-0 border-t border-outline-variant bg-surface px-5 py-3 text-xs leading-5 text-on-surface-variant md:px-6">Listing details and any reported power or flood information are not independently verified. Confirm availability, documents and terms with the owner.</p>
      </section>
    </div>
  );
};

export default CompareModal;
