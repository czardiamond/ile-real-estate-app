
import React from 'react';
import { Property, FloodRisk } from '../types';
import { X, CheckCircle, Zap, Waves, Car, Bed, Bath, Maximize2, Trash2, MapPin, Ruler } from 'lucide-react';

interface CompareModalProps {
  properties: Property[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onChat: (property: Property) => void;
}

const CompareModal: React.FC<CompareModalProps> = ({ properties, onClose, onRemove, onChat }) => {
  
  if (properties.length === 0) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumSignificantDigits: 3 }).format(price);
  };

  const getBestValueClass = (prop: Property, attribute: 'price' | 'power' | 'flood') => {
      // Simple logic to highlight "best" specs
      if (attribute === 'price') {
          const minPrice = Math.min(...properties.map(p => p.price));
          return prop.price === minPrice ? 'bg-green-50 text-green-700 font-bold' : '';
      }
      if (attribute === 'power') {
          const maxPower = Math.max(...properties.map(p => p.avgPowerHours));
          return prop.avgPowerHours === maxPower ? 'bg-green-50 text-green-700 font-bold' : '';
      }
      if (attribute === 'flood') {
          return prop.floodRisk === FloodRisk.LOW ? 'bg-green-50 text-green-700 font-bold' : (prop.floodRisk === FloodRisk.HIGH ? 'bg-red-50 text-red-700' : '');
      }
      return '';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-2 md:p-6">
      <div className="bg-surface w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Compare Properties</h2>
                <p className="text-sm text-gray-500">{properties.length} items selected</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-8">
            <div className="flex gap-4 min-w-max">
                {/* Labels Column (Sticky) */}
                <div className="w-32 md:w-48 shrink-0 flex flex-col gap-4 pt-[200px] sticky left-0 z-10">
                    {/* Spacer matches image height */}
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Price</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Type</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Location</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Bedrooms</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Bathrooms</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Size / Capacity</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Avg. Power</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-12 flex items-center font-bold text-sm text-gray-600">Flood Risk</div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-3 shadow-sm border border-gray-200 h-auto min-h-[100px] font-bold text-sm text-gray-600 pt-3">Key Features</div>
                </div>

                {/* Property Columns */}
                {properties.map(property => (
                    <div key={property.id} className="w-64 md:w-80 shrink-0 flex flex-col gap-4">
                        {/* Property Card Header */}
                        <div className="h-[200px] relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white group">
                             <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                             <button 
                                onClick={() => onRemove(property.id)}
                                className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full hover:bg-red-600 transition-colors z-20"
                             >
                                 <X size={16} />
                             </button>
                             <div className="absolute bottom-0 left-0 p-4 w-full">
                                 <h3 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-2">{property.title}</h3>
                                 <button 
                                    onClick={() => onChat(property)}
                                    className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-lg font-bold mt-2 hover:bg-gray-100"
                                 >
                                    Enquire
                                 </button>
                             </div>
                        </div>

                        {/* Data Rows */}
                        <div className={`h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm ${getBestValueClass(property, 'price')}`}>
                            {formatPrice(property.price)} <span className="text-[10px] text-gray-500 ml-1">/{property.period}</span>
                        </div>
                        <div className="h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm text-gray-700">
                            {property.type}
                        </div>
                        <div className="h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm text-gray-700">
                            <MapPin size={14} className="mr-1 text-gray-400" /> {property.location.area}
                        </div>
                        <div className="h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm text-gray-700">
                            <Bed size={14} className="mr-2 text-gray-400" /> {property.specs.bedrooms || '-'}
                        </div>
                        <div className="h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm text-gray-700">
                            <Bath size={14} className="mr-2 text-gray-400" /> {property.specs.bathrooms || '-'}
                        </div>
                        <div className="h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm text-gray-700">
                            {(property.specs.sizeSqM || property.specs.capacity) ? (
                                <>
                                    <Maximize2 size={14} className="mr-2 text-gray-400" />
                                    {property.specs.sizeSqM ? `${property.specs.sizeSqM} m²` : `${property.specs.capacity} Guests`}
                                </>
                            ) : '-'}
                        </div>
                        <div className={`h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm ${getBestValueClass(property, 'power')}`}>
                            <Zap size={14} className="mr-2 opacity-50" /> {property.avgPowerHours} hrs/day
                        </div>
                        <div className={`h-12 flex items-center px-4 bg-white rounded-xl border border-gray-100 text-sm ${getBestValueClass(property, 'flood')}`}>
                            <Waves size={14} className="mr-2 opacity-50" /> {property.floodRisk}
                        </div>
                        <div className="h-auto min-h-[100px] p-4 bg-white rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed">
                            <ul className="list-disc pl-4 space-y-1">
                                {property.features.slice(0, 4).map((feat, i) => (
                                    <li key={i}>{feat}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
