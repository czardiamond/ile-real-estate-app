import React from 'react';
import { Property, PropertyType } from '../types';
import { Bath, Bed, Box, Heart, ImageOff, MapPin, Maximize2, MessageCircle, Play, Scale, ShieldCheck, Users } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  onChat?: (property: Property) => void;
  onView3D?: (property: Property) => void;
  onViewFloorPlan?: (property: Property) => void;
  onCompare?: (property: Property) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  isCompared?: boolean;
  compact?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onClick,
  onChat,
  onView3D,
  onCompare,
  isSelectable = false,
  isSelected = false,
  isCompared = false,
  compact = false,
  isSaved = false,
  onToggleSave,
}) => {
  const formatCurrency = (price: number) => new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);

  const isEvent = [PropertyType.EVENT_CENTER, PropertyType.WEDDING_HALL, PropertyType.PARTY_VENUE, PropertyType.OPEN_FIELD].includes(property.type);
  const isBusiness = [PropertyType.OFFICE, PropertyType.SHOP, PropertyType.WAREHOUSE, PropertyType.CONTAINER].includes(property.type);
  const imageUrl = Array.isArray(property.images) ? property.images[0] : undefined;

  const openDetails = () => onClick();

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-surface-container-low transition-shadow ${isSelected || isCompared ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant hover:shadow-lg'}`}>
      <div className={`relative w-full overflow-hidden bg-surface-container ${compact ? 'h-36' : 'aspect-[16/10]'}`}>
        <button
          type="button"
          onClick={openDetails}
          aria-pressed={isSelectable ? isSelected : undefined}
          aria-label={isSelectable ? `${isSelected ? 'Remove' : 'Add'} ${property.title} ${isSelected ? 'from' : 'to'} comparison` : `View ${property.title}`}
          className="absolute inset-0 block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${property.title} property photo`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              onError={(event) => {
                const image = event.currentTarget;
                image.onerror = null;
                image.src = '/property-placeholder.svg';
              }}
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-on-surface-variant">
              <ImageOff size={28} aria-hidden="true" />
              <span className="text-xs font-medium">No photo provided</span>
            </span>
          )}
        </button>

        {isSelectable && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); openDetails(); }}
            aria-label={`${isSelected ? 'Remove' : 'Select'} ${property.title} for comparison`}
            aria-pressed={isSelected}
            className={`absolute left-3 top-3 z-20 flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'border-[#213b31] bg-[#213b31] text-white' : 'border-outline bg-white text-on-surface'}`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        )}

        <div className={`pointer-events-none absolute left-3 z-10 flex max-w-[calc(100%-5.5rem)] flex-wrap items-center gap-2 ${isSelectable ? 'top-14' : 'top-3'}`}>
          <span className="rounded-md border border-white/70 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#24352c] shadow-sm">{property.type}</span>
          {property.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#28503F] px-2 py-1 text-[11px] font-semibold text-white" title="Ilé has recorded an internal document review. This is not a government title search.">
              <ShieldCheck size={13} aria-hidden="true" /> Ilé reviewed
            </span>
          )}
        </div>

        {!compact && onToggleSave && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onToggleSave(); }}
            aria-label={isSaved ? `Remove ${property.title} from saved properties` : `Save ${property.title}`}
            aria-pressed={isSaved}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-outline bg-white text-on-surface shadow-sm transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} className={isSaved ? 'text-[#9b3e37]' : 'text-on-surface-variant'} aria-hidden="true" />
          </button>
        )}

        {property.virtualTourUrl && !compact && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onView3D?.(property); }}
            className="absolute bottom-3 left-3 z-20 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#202923] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#314137] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Box size={14} aria-hidden="true" /> 3D tour
          </button>
        )}

        {compact && <span className="absolute bottom-2 right-2 rounded-md bg-[#202923] px-2 py-1 text-xs font-bold text-white">{formatCurrency(property.price)}</span>}
        {property.videoUrl && <span className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#24352c] shadow-sm"><Play size={15} fill="currentColor" aria-label="Video available" /></span>}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'p-3' : 'p-5 md:p-6'}`}>
        {!compact && (
          <p className="text-2xl font-semibold tracking-tight text-on-surface">
            {formatCurrency(property.price)}
            {property.period && property.period !== 'total' && <span className="ml-1.5 text-sm font-medium text-on-surface-variant">/ {property.period.replace(/^per\s+/i, '')}</span>}
          </p>
        )}

        <h3 className={`${compact ? 'text-sm' : 'mt-1 text-lg'} font-semibold leading-snug text-on-surface`}>
          <button type="button" onClick={openDetails} className="rounded-sm text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {property.title}
          </button>
        </h3>

        <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-on-surface-variant">
          <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{property.location.area}, {property.location.city}</span>
        </p>

        <div className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant pt-4 text-xs font-medium text-on-surface-variant ${compact ? 'mt-3 pt-3' : ''}`} aria-label="Property details">
          {!isBusiness && !isEvent && (
            <>
              <span className="inline-flex items-center gap-1.5"><Bed size={15} aria-hidden="true" />{property.specs.bedrooms ?? '—'} beds</span>
              <span className="inline-flex items-center gap-1.5"><Bath size={15} aria-hidden="true" />{property.specs.bathrooms ?? '—'} baths</span>
            </>
          )}
          {(isEvent || isBusiness) && (
            <span className="inline-flex items-center gap-1.5">
              {isEvent ? <Users size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
              {isEvent ? `${property.specs.capacity ?? '—'} guests` : `${property.specs.sizeSqM ?? '—'} m²`}
            </span>
          )}
        </div>

        {!compact && !isSelectable && (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <div className="flex min-w-0 items-center gap-2 text-xs text-on-surface-variant">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container"><Users size={15} aria-hidden="true" /></span>
              <span className="truncate">Listing owner</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onCompare && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onCompare(property); }}
                  aria-label={`${isCompared ? 'Remove' : 'Add'} ${property.title} ${isCompared ? 'from' : 'to'} comparison`}
                  aria-pressed={isCompared}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isCompared ? 'border-primary bg-primary/10 text-primary' : 'border-outline bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
                ><Scale size={17} aria-hidden="true" /></button>
              )}
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onChat?.(property); }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#213b31] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#294b3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              ><MessageCircle size={15} aria-hidden="true" />Enquire</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default PropertyCard;
