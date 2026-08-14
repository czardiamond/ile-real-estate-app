
import React from 'react';
import { Property, PropertyType } from '../types';
import { MapPin, Bed, Bath, Users, CheckCircle, Maximize2, ShieldCheck, Crown, MessageCircle, Box, LayoutTemplate, Check, Scale, Play, ImageOff, Heart } from 'lucide-react';

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
  onViewFloorPlan, 
  onCompare,
  isSelectable = false,
  isSelected = false,
  isCompared = false,
  compact = false,
  isSaved = false,
  onToggleSave
}) => {
  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumSignificantDigits: 3 }).format(price);
  };

  const isOwambe = [
    PropertyType.EVENT_CENTER, 
    PropertyType.WEDDING_HALL, 
    PropertyType.PARTY_VENUE, 
    PropertyType.OPEN_FIELD
  ].includes(property.type);

  const isBusiness = [
    PropertyType.OFFICE, 
    PropertyType.SHOP, 
    PropertyType.WAREHOUSE, 
    PropertyType.CONTAINER
  ].includes(property.type);

  const isHighlighted = isSelected || isCompared;

  // Mock Agent Data based on ID (Consistent visualization)
  const getAgentInfo = (id: string) => {
      // Deterministic pseudo-random based on char code sum
      const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const avatars = [
          'https://ui-avatars.com/api/?name=Kunle+Adebayo&background=random',
          'https://ui-avatars.com/api/?name=Chioma+Nwosu&background=random',
          'https://ui-avatars.com/api/?name=Emeka+Okonkwo&background=random'
      ];
      const names = ['Kunle Adebayo', 'Chioma Nwosu', 'Emeka Okonkwo'];
      const index = sum % avatars.length;
      
      return {
          name: names[index],
          avatar: avatars[index],
          verified: true
      };
  };

  const agent = getAgentInfo(property.agentId);

  // Handles fetching and displaying property media (Images & Video)
  const renderPropertyMedia = () => {
    const hasImages = Array.isArray(property.images) && property.images.length > 0;
    const imageUrl = hasImages ? property.images[0] : null;
    const hasVideo = !!property.videoUrl;

    return (
      <>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={property.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null; 
              target.src = "https://placehold.co/600x400/f3f4f6/9ca3af?text=No+Image";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
             <ImageOff size={32} className="opacity-50 mb-2" />
             <span className="text-xs font-medium opacity-70">No Image Available</span>
          </div>
        )}

        {/* Gradient Overlay for Text Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Video Play Button Overlay */}
        {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div 
                    className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-lg group-hover:scale-110 transition-transform duration-300"
                >
                    <Play size={16} className="text-white fill-white ml-1" />
                </div>
            </div>
        )}
      </>
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden border ${
        compact 
          ? 'rounded-2xl p-2 shadow-sm border-gray-100' 
          : 'rounded-3xl shadow-sm hover:shadow-xl border-gray-100'
      } ${
        isHighlighted 
        ? 'ring-2 ring-primary' 
        : ''
      }`}
    >
      {/* Selection Overlay */}
      {(isSelectable || isHighlighted) && (
          <div className="absolute top-4 left-4 z-20 animate-in fade-in duration-200">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shadow-sm ${
                  isHighlighted 
                  ? 'bg-primary border-primary' 
                  : 'bg-white/90 border-gray-400'
              }`}>
                  {isHighlighted && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
          </div>
      )}

      {/* Image Container */}
      <div className={`relative w-full bg-surface-container overflow-hidden ${compact ? 'h-36 rounded-2xl mb-3' : 'h-72'}`}>
        
        {renderPropertyMedia()}
        
        {/* Floating Tag */}
        <div className={`absolute top-4 left-4 bg-white/80 backdrop-blur-md rounded-full font-bold text-on-surface shadow-sm transition-all z-10 ${compact ? 'px-3 py-1 text-[10px]' : 'px-4 py-2 text-xs uppercase tracking-widest'}`}>
            {property.type}
        </div>

        {/* Favorite Button */}
        {!compact && onToggleSave && (
            <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
                className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-md hover:bg-white rounded-full transition-all z-20 group/heart"
            >
                <Heart size={18} className={`transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-white group-hover/heart:text-red-500'}`} />
            </button>
        )}
        
        {/* 3D Tour Button Overlay */}
        {property.virtualTourUrl && !compact && (
            <button
                onClick={(e) => { e.stopPropagation(); onView3D && onView3D(property); }}
                className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm text-white hover:bg-black transition-colors z-20 border border-white/10"
            >
                <Box size={14} className="text-white" />
                3D Tour
            </button>
        )}

        {/* Price Overlay (Mobile or Compact) */}
        {compact && (
             <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1">
                <p className="text-white font-bold text-xs">{formatCurrency(property.price)}</p>
             </div>
        )}
      </div>
      
      {/* Content */}
      <div className={`flex-1 flex flex-col ${compact ? 'px-2 pb-2' : 'p-8 pt-6'}`}>
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0">
                {!compact && (
                    <h2 className="text-3xl font-light text-primary mb-2 tracking-tight">
                        {formatCurrency(property.price)}
                        <span className="text-sm text-on-surface-variant/60 font-normal ml-2">
                             {property.period !== 'total' ? `/ ${property.period.replace('per ', '')}` : ''}
                        </span>
                    </h2>
                )}
                <h3 className={`font-medium text-on-surface leading-tight ${compact ? 'text-sm mb-1' : 'text-xl mb-2'}`}>
                    {property.title}
                </h3>
            </div>
        </div>
        
        {/* Location */}
        <div className={`flex items-center text-on-surface-variant/70 mb-6 ${compact ? 'text-[10px]' : 'text-sm font-light'}`}>
            <MapPin size={compact ? 10 : 14} className="mr-1.5 opacity-50 shrink-0" />
            <span className="truncate">{property.location.area}, {property.location.city}</span>
        </div>

        {/* Specs Grid - Subtle Icons */}
        <div className={`flex items-center gap-6 text-on-surface-variant/60 ${compact ? 'text-[10px] mb-3' : 'text-xs mb-8'}`}>
            {!isBusiness && !isOwambe && (
                <>
                    <div className="flex items-center gap-2">
                        <Bed size={compact ? 12 : 16} strokeWidth={1.5} /> 
                        <span>{property.specs.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Bath size={compact ? 12 : 16} strokeWidth={1.5} /> 
                        <span>{property.specs.bathrooms}</span>
                    </div>
                </>
            )}
            {(isOwambe || isBusiness) && (
                    <div className="flex items-center gap-2">
                    {isOwambe ? <Users size={compact ? 12 : 16} strokeWidth={1.5} /> : <Maximize2 size={compact ? 12 : 16} strokeWidth={1.5} />} 
                    <span>{isOwambe ? property.specs.capacity : property.specs.sizeSqM} {isOwambe ? 'Guests' : 'm²'}</span>
                </div>
            )}
        </div>

        {/* Footer: Agent & Actions */}
        {!compact && (
            <div className="mt-auto flex items-center justify-between pt-6 border-t border-outline-variant/10">
                 {/* Agent Info */}
                 <div className="flex items-center gap-3">
                     <div className="relative">
                        <img src={agent.avatar} alt={agent.name} className="w-10 h-10 rounded-full bg-surface-container object-cover grayscale hover:grayscale-0 transition-all" />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle size={12} className="text-primary" />
                        </div>
                     </div>
                     <div className="flex flex-col">
                         <span className="text-xs font-medium text-on-surface">{agent.name}</span>
                         <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest">Verified Agent</span>
                     </div>
                 </div>

                 {/* Actions */}
                 {!isSelectable && (
                     <div className="flex items-center gap-2">
                         <button
                            onClick={(e) => { e.stopPropagation(); onCompare && onCompare(property); }}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                                isCompared 
                                ? 'bg-primary-container text-primary border-primary' 
                                : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300'
                            }`}
                            title="Compare"
                         >
                             <Scale size={14} />
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); onChat && onChat(property); }}
                            className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-black transition-colors flex items-center gap-1"
                        >
                            <MessageCircle size={14} /> Chat
                        </button>
                     </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
