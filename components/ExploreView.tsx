
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PROPERTIES } from '../services/mockData';
import PropertyCard from './PropertyCard';
import CompareModal from './CompareModal';
import { Property, PropertyType, FloodRisk } from '../types';
import { Search, Filter, Home, GlassWater, PartyPopper, Briefcase, Map as MapIcon, X, Car, Zap, Check, ChevronDown, Waves, List, Bed, Bath, Armchair, Sparkles, Scale, Locate, ArrowUpDown, Calendar, DollarSign, Calculator, Flame } from 'lucide-react';
import { PriceHeatmap } from './PriceHeatmap';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icons in React
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface ExploreViewProps {
  properties?: Property[];
  onPropertySelect: (property: Property) => void;
  onChat: (property: Property) => void;
  onView3D: (property: Property) => void;
  onViewFloorPlan: (property: Property) => void;
  savedPropertyIds?: Set<string>;
  onToggleSave?: (id: string) => void;
  onOpenMortgageCalculator: () => void;
}

// Component to handle map bounds updates
const MapUpdater: React.FC<{ properties: Property[] }> = ({ properties }) => {
    const map = useMap();

    useEffect(() => {
        if (properties.length > 0) {
            const latLngs = properties
                .filter(p => p.coordinates)
                .map(p => [p.coordinates!.lat, p.coordinates!.lng] as [number, number]);
            
            if (latLngs.length > 0) {
                const bounds = L.latLngBounds(latLngs);
                // Add padding to bounds
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
            }
        }
    }, [properties, map]);

    return null;
};

// Component to handle "Locate Me" functionality
const LocateControl = () => {
    const map = useMap();
    const handleLocate = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.flyTo([latitude, longitude], 15, { duration: 2 });
            },
            (error) => {
                console.error("Location error", error);
                alert("Could not access location. Please enable permissions to find properties near you.");
            }
        );
    };

    return (
        <button 
            onClick={handleLocate}
            className="absolute top-4 right-4 z-[400] bg-white p-3 rounded-full shadow-lg border border-gray-100 text-gray-700 hover:bg-gray-50 hover:text-primary transition-all"
            title="Locate Me"
        >
            <Locate size={20} />
        </button>
    );
};

const ExploreView: React.FC<ExploreViewProps> = ({ 
    properties,
    onPropertySelect, 
    onChat, 
    onView3D, 
    onViewFloorPlan,
    savedPropertyIds,
    onToggleSave,
    onOpenMortgageCalculator
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'heatmap'>('list');
  const [selectedMapPin, setSelectedMapPin] = useState<Property | null>(null);
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000000]); // Max 1B
  const [minCapacity, setMinCapacity] = useState(0);
  const [minParking, setMinParking] = useState(0);
  const [reqGenerator, setReqGenerator] = useState(false);
  const [filterFloodRisk, setFilterFloodRisk] = useState<string>('');
  const [filterPropertyTypes, setFilterPropertyTypes] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>('newest'); // 'newest', 'price_asc', 'price_desc'
  
  // Residential Filters
  const [minBedrooms, setMinBedrooms] = useState(0);
  const [minBathrooms, setMinBathrooms] = useState(0);
  const [reqFurnished, setReqFurnished] = useState(false);
  const [reqServiced, setReqServiced] = useState(false);

  // Compare State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<Property[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Categories adapted for the Nigerian Space Market
  const categories = [
    { id: 'All', label: 'All', icon: null },
    { id: 'Living', label: 'Living', icon: Home }, // Residential
    { id: 'Business', label: 'Business', icon: Briefcase }, // Commercial
    { id: 'Owambe', label: 'Owambe', icon: PartyPopper }, // Events
    { id: 'ShortLet', label: 'Short Stay', icon: GlassWater }, // Hospitality
  ];

  // Available Property Types for Multi-Select
  const availableTypes = useMemo(() => {
      if (activeCategory === 'Living') return [PropertyType.APARTMENT, PropertyType.HOUSE, PropertyType.DUPLEX, PropertyType.BUNGALOW, PropertyType.LAND];
      if (activeCategory === 'Business') return [PropertyType.OFFICE, PropertyType.SHOP, PropertyType.WAREHOUSE, PropertyType.CONTAINER];
      if (activeCategory === 'Owambe') return [PropertyType.EVENT_CENTER, PropertyType.WEDDING_HALL, PropertyType.PARTY_VENUE, PropertyType.OPEN_FIELD];
      if (activeCategory === 'ShortLet') return [PropertyType.SHORT_LET, PropertyType.GUEST_HOUSE];
      return Object.values(PropertyType);
  }, [activeCategory]);

  const sourceProperties = useMemo(() => {
    return properties && properties.length > 0 ? properties : MOCK_PROPERTIES;
  }, [properties]);

  const filteredProperties = useMemo(() => {
    let result = sourceProperties.filter(p => {
      // 1. Search Term
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.location.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.location.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Category
      let matchesCategory = true;
      if (activeCategory === 'Living') {
        matchesCategory = [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.DUPLEX, PropertyType.BUNGALOW, PropertyType.LAND].includes(p.type);
      } else if (activeCategory === 'Owambe') {
        matchesCategory = [PropertyType.EVENT_CENTER, PropertyType.WEDDING_HALL, PropertyType.PARTY_VENUE, PropertyType.OPEN_FIELD].includes(p.type);
      } else if (activeCategory === 'Business') {
        matchesCategory = [PropertyType.OFFICE, PropertyType.SHOP, PropertyType.WAREHOUSE, PropertyType.CONTAINER].includes(p.type);
      } else if (activeCategory === 'ShortLet') {
        matchesCategory = [PropertyType.SHORT_LET, PropertyType.GUEST_HOUSE].includes(p.type);
      }

      // 3. Price Filter
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];

      // 4. Capacity Filter (Event Centers)
      let matchesCapacity = true;
      if (minCapacity > 0) {
        matchesCapacity = (p.specs.capacity || 0) >= minCapacity;
      }

      // 5. Parking Filter
      let matchesParking = true;
      if (minParking > 0) {
        matchesParking = (p.specs.parkingSpaces || 0) >= minParking;
      }

      // 6. Generator / Power Filter
      let matchesGen = true;
      if (reqGenerator) {
         // Check for keywords in features or if power hours are high (>18h/day)
         const hasGenFeature = p.features.some(f => 
             f.toLowerCase().includes('generator') || 
             f.toLowerCase().includes('inverter') || 
             f.toLowerCase().includes('solar') ||
             f.toLowerCase().includes('power')
         );
         const hasGoodPower = p.avgPowerHours >= 18;
         matchesGen = hasGenFeature || hasGoodPower;
      }

      // 7. Flood Risk Filter
      let matchesFlood = true;
      if (filterFloodRisk) {
          matchesFlood = p.floodRisk === filterFloodRisk;
      }

      // 8. Bedrooms Filter
      let matchesBedrooms = true;
      if (minBedrooms > 0) {
        matchesBedrooms = (p.specs.bedrooms || 0) >= minBedrooms;
      }

      // 9. Bathrooms Filter
      let matchesBathrooms = true;
      if (minBathrooms > 0) {
        matchesBathrooms = (p.specs.bathrooms || 0) >= minBathrooms;
      }

      // 10. Furnished Filter
      let matchesFurnished = true;
      if (reqFurnished) {
          matchesFurnished = p.features.some(f => f.toLowerCase().includes('furnished'));
      }

      // 11. Serviced Filter
      let matchesServiced = true;
      if (reqServiced) {
          matchesServiced = p.features.some(f => f.toLowerCase().includes('serviced'));
      }

      // 12. Type Filter (Multi-Select)
      let matchesType = true;
      if (filterPropertyTypes.length > 0) {
          matchesType = filterPropertyTypes.includes(p.type);
      }

      return matchesSearch && matchesCategory && matchesPrice && matchesCapacity && matchesParking && matchesGen && matchesFlood && matchesBedrooms && matchesBathrooms && matchesFurnished && matchesServiced && matchesType;
    });

    // 13. Sorting
    return result.sort((a, b) => {
        if (sortOption === 'price_asc') return a.price - b.price;
        if (sortOption === 'price_desc') return b.price - a.price;
        // Default to newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  }, [searchTerm, activeCategory, priceRange, minCapacity, minParking, reqGenerator, filterFloodRisk, minBedrooms, minBathrooms, reqFurnished, reqServiced, filterPropertyTypes, sortOption]);

  const resetFilters = () => {
      setPriceRange([0, 1000000000]);
      setMinCapacity(0);
      setMinParking(0);
      setReqGenerator(false);
      setFilterFloodRisk('');
      setMinBedrooms(0);
      setMinBathrooms(0);
      setReqFurnished(false);
      setReqServiced(false);
      setFilterPropertyTypes([]);
      setSortOption('newest');
      setIsFilterOpen(false);
  };

  const handlePropertyClick = (property: Property) => {
    if (isCompareMode) {
        toggleCompare(property);
    } else {
        onPropertySelect(property);
    }
  };

  const toggleCompare = (property: Property) => {
    if (compareList.find(p => p.id === property.id)) {
        setCompareList(prev => prev.filter(p => p.id !== property.id));
    } else {
        if (compareList.length < 3) {
            setCompareList(prev => [...prev, property]);
        } else {
            alert("You can compare a maximum of 3 properties.");
        }
    }
  };

  const removeFromCompare = (id: string) => {
      setCompareList(prev => prev.filter(p => p.id !== id));
      if (compareList.length <= 1 && showCompareModal) {
          setShowCompareModal(false);
      }
  };

  const togglePropertyType = (type: string) => {
      setFilterPropertyTypes(prev => 
          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
  };

  const formatCurrency = (val: number) => {
      if (val >= 1000000) return `₦${val/1000000}M`;
      if (val >= 1000) return `₦${val/1000}k`;
      return `₦${val}`;
  };

  const isFilterActive = minCapacity > 0 || minParking > 0 || reqGenerator || filterFloodRisk || minBedrooms > 0 || minBathrooms > 0 || reqFurnished || reqServiced || filterPropertyTypes.length > 0;

  // Helper to create custom DivIcons for price pins
  const createPriceIcon = (property: Property, isSelected: boolean) => {
    const isCompared = compareList.some(cp => cp.id === property.id);
    const bgColor = isSelected ? '#166534' : isCompared ? '#111827' : '#ffffff';
    const textColor = isSelected || isCompared ? '#ffffff' : '#166534';
    const priceText = formatCurrency(property.price);

    const html = `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 11px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        white-space: nowrap;
        border: 1px solid ${isSelected ? '#ffffff' : '#166534'};
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
      ">
        ${priceText}
      </div>
    `;

    return L.divIcon({
      className: 'custom-marker-pin',
      html: html,
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });
  };

  return (
    <div className="pb-28 pt-2 md:pt-4 bg-surface min-h-screen relative">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      
      {/* Search & Categories Header */}
      <div className="px-4 md:px-8 mb-6 bg-surface py-3 transition-all border-b border-outline-variant/30">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Main Search Bar Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input Box with Sparkles & Filter */}
            <div className="relative flex-1 w-full bg-surface-container-low dark:bg-slate-900 rounded-full border border-outline-variant/60 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-primary transition-all flex items-center px-4 py-1.5">
              <Search className="text-on-surface-variant/60 shrink-0 mr-2" size={20} />
              <input 
                type="text"
                placeholder="Search Lekki, Wuse, Duplex, Short-let..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50 text-sm font-medium py-2"
              />
              <div className="flex items-center gap-1 shrink-0 ml-2 pl-2 border-l border-outline-variant/40">
                <button 
                  onClick={() => setIsFilterOpen(true)}
                  className={`p-2 rounded-full transition-colors flex items-center gap-1.5 ${
                    isFilterActive 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                  title="Filter Properties"
                >
                  <Filter size={18} />
                  {isFilterActive && <span className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              </div>
            </div>

            {/* View Mode & Tools Toolbar Row */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
              {/* View Switchers */}
              <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40 shadow-inner shrink-0">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'list' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <List size={15} />
                  <span>List</span>
                </button>

                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'map' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <MapIcon size={15} />
                  <span>Map</span>
                </button>

                <button 
                  onClick={() => setViewMode('heatmap')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    viewMode === 'heatmap' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  }`}
                  title="Google Maps Price Valuation Heatmap"
                >
                  <Flame size={15} className="animate-pulse" />
                  <span>Heatmap</span>
                </button>
              </div>

              {/* Compare Mode Toggle */}
              <button
                onClick={() => setIsCompareMode(!isCompareMode)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 shrink-0 ${
                  isCompareMode 
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                  : 'bg-surface-container-low border-outline-variant/60 text-on-surface hover:bg-surface-container'
                }`}
              >
                <Scale size={15} />
                <span>Compare</span>
                {compareList.length > 0 && (
                  <span className="bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                    {compareList.length}
                  </span>
                )}
              </button>

              {/* Mortgage Calculator Button */}
              <button 
                onClick={onOpenMortgageCalculator}
                className="p-2 rounded-full bg-surface-container-low text-primary border border-outline-variant/60 shadow-sm hover:bg-primary/10 transition-all shrink-0"
                title="Mortgage Calculator"
              >
                <Calculator size={18} />
              </button>
            </div>
          </div>

          {/* Categories Pill Row */}
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-2 border-t border-outline-variant/20 pt-3">
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setFilterPropertyTypes([]); }}
                  className={`flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-all relative py-1 px-3 rounded-full ${
                    isActive
                    ? 'bg-primary text-white shadow-xs' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* COMPARISON DOCK */}
      {compareList.length > 0 && (
          <div className="fixed bottom-20 md:bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
              <div className="bg-gray-900 text-white p-2 pr-4 rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300 border border-gray-800">
                
                {/* Thumbnails */}
                <div className="flex -space-x-3 pl-1">
                    {compareList.map(p => (
                        <div key={p.id} className="w-10 h-10 rounded-full border-2 border-gray-900 relative overflow-hidden bg-gray-800">
                            <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                        </div>
                    ))}
                    {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-gray-600 border-dashed">
                            <Scale size={14} />
                        </div>
                    ))}
                </div>

                <div className="h-8 w-px bg-gray-700 mx-1"></div>

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Compare</span>
                    <span className="text-sm font-bold">{compareList.length} of 3</span>
                </div>

                <button 
                    onClick={() => setShowCompareModal(true)}
                    disabled={compareList.length < 2}
                    className={`ml-2 px-5 py-2 rounded-full font-bold text-sm transition-all ${
                        compareList.length >= 2 
                        ? 'bg-white text-gray-900 hover:bg-gray-200' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    View
                </button>
                
                <button 
                    onClick={() => setCompareList([])}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400 transition-colors"
                >
                    <X size={16} />
                </button>
              </div>
          </div>
      )}

      {/* View Content */}
      <div className="px-4 md:px-8 h-full max-w-[1600px] mx-auto">
        {viewMode === 'heatmap' ? (
             <PriceHeatmap onPropertySelect={handlePropertyClick} />
        ) : viewMode === 'list' ? (
             /* LIST VIEW */
            filteredProperties.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-100 rounded-[2rem] flex items-center justify-center mb-6">
                        <MapIcon className="text-gray-400" size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No spaces found here</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your search area or filters to find what you're looking for.</p>
                    <button 
                    onClick={resetFilters}
                    className="mt-6 px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                    >
                    Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pb-24">
                    {filteredProperties.map(property => (
                        <div key={property.id} className="h-full">
                            <PropertyCard 
                                property={property} 
                                onClick={() => handlePropertyClick(property)} 
                                onChat={() => onChat(property)}
                                onView3D={() => onView3D(property)}
                                onViewFloorPlan={() => onViewFloorPlan(property)}
                                onCompare={toggleCompare}
                                isSelectable={isCompareMode}
                                isSelected={compareList.some(p => p.id === property.id)}
                                isCompared={compareList.some(p => p.id === property.id)}
                                isSaved={savedPropertyIds?.has(property.id)}
                                onToggleSave={() => onToggleSave && onToggleSave(property.id)}
                            />
                        </div>
                    ))}
                </div>
            )
        ) : (
            /* REAL MAP VIEW */
            <div className="relative w-full h-[60vh] md:h-[calc(100vh-240px)] rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-xl">
                <MapContainer 
                    center={[6.5244, 3.3792]} // Default Lagos
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    
                    {/* Auto-Zoom to Pins */}
                    <MapUpdater properties={filteredProperties} />
                    
                    {/* Locate Me Control */}
                    {/* Map Overlay Controls - Elegant Chips */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400] w-full max-w-2xl px-4">
                        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center gap-3 overflow-x-auto no-scrollbar">
                            {['Restaurants', 'Schools', 'Hospitals', 'Parks', 'Banks'].map((place) => (
                                <button 
                                    key={place}
                                    className="px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 hover:bg-primary hover:text-white transition-all whitespace-nowrap flex items-center gap-2"
                                >
                                    {place === 'Restaurants' && <GlassWater size={14} strokeWidth={1.5} />}
                                    {place === 'Schools' && <Briefcase size={14} strokeWidth={1.5} />}
                                    {place === 'Hospitals' && <Check size={14} strokeWidth={1.5} />}
                                    {place === 'Parks' && <Waves size={14} strokeWidth={1.5} />}
                                    {place === 'Banks' && <DollarSign size={14} strokeWidth={1.5} />}
                                    {place}
                                </button>
                            ))}
                        </div>
                    </div>
            
            <LocateControl />

                    {/* Property Pins */}
                    {filteredProperties.filter(p => p.coordinates).map(p => {
                         if (!p.coordinates) return null;
                         const isSelected = selectedMapPin?.id === p.id;
                         
                         return (
                            <Marker 
                                key={p.id} 
                                position={[p.coordinates.lat, p.coordinates.lng]}
                                icon={createPriceIcon(p, isSelected)}
                                eventHandlers={{
                                    click: () => {
                                        if (isCompareMode) {
                                            toggleCompare(p);
                                        } else {
                                            setSelectedMapPin(p);
                                        }
                                    },
                                }}
                            />
                         )
                    })}
                </MapContainer>

                {/* Selected Property Overlay Card */}
                {selectedMapPin && (
                    <div 
                        className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1000] pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div 
                            className="relative animate-in slide-in-from-bottom fade-in duration-300"
                        >
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    setSelectedMapPin(null);
                                }} 
                                className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-2 shadow-lg z-10 hover:bg-gray-100 transition-colors border border-gray-100"
                            >
                                <X size={16} />
                            </button>
                            <div className="shadow-2xl rounded-[24px] border-4 border-white/50 bg-white">
                                <PropertyCard 
                                    property={selectedMapPin}
                                    onClick={() => handlePropertyClick(selectedMapPin)}
                                    onChat={() => onChat(selectedMapPin)}
                                    onView3D={() => onView3D(selectedMapPin)}
                                    onViewFloorPlan={() => onViewFloorPlan(selectedMapPin)}
                                    onCompare={toggleCompare}
                                    isSelectable={isCompareMode}
                                    isSelected={compareList.some(p => p.id === selectedMapPin.id)}
                                    isCompared={compareList.some(p => p.id === selectedMapPin.id)}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* FILTER MODAL */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-container-low w-full md:max-w-md rounded-t-[32px] md:rounded-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Filters</h3>
                    <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-white hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-900" />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Sort Options */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block flex items-center gap-2">
                            <ArrowUpDown size={16} /> Sort Results
                        </label>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {[
                                { id: 'newest', label: 'Newest First', icon: Calendar },
                                { id: 'price_asc', label: 'Price: Low to High', icon: DollarSign },
                                { id: 'price_desc', label: 'Price: High to Low', icon: DollarSign },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSortOption(opt.id)}
                                    className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-sm font-bold whitespace-nowrap transition-all ${
                                        sortOption === opt.id 
                                        ? 'bg-primary/10 border-primary text-primary' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Property Type Grid (Multi-Select) */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                             Property Types
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableTypes.map(type => {
                                const isSelected = filterPropertyTypes.includes(type);
                                return (
                                    <button
                                        key={type}
                                        onClick={() => togglePropertyType(type)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                            isSelected
                                            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Price Range</label>
                             <span className="text-xs text-primary font-bold">{formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}</span>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 focus-within:border-primary transition-colors shadow-sm">
                                <label className="block text-[10px] text-gray-400 uppercase font-bold">Min Price</label>
                                <input 
                                    type="number" 
                                    value={priceRange[0]} 
                                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} 
                                    className="w-full bg-transparent outline-none font-bold text-gray-900"
                                />
                            </div>
                            <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 focus-within:border-primary transition-colors shadow-sm">
                                <label className="block text-[10px] text-gray-400 uppercase font-bold">Max Price</label>
                                <input 
                                    type="number" 
                                    value={priceRange[1]} 
                                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} 
                                    className="w-full bg-transparent outline-none font-bold text-gray-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Residential Specifics */}
                    {(activeCategory === 'Living' || activeCategory === 'All') && (
                        <div className="bg-primary-container/30 p-5 rounded-3xl border border-primary-container/50">
                            <div className="flex items-center gap-2 mb-4">
                                <Home size={20} className="text-primary" />
                                <span className="font-bold text-gray-900">House Specs</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {/* Bedrooms */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                                        <Bed size={14} /> Bedrooms
                                    </label>
                                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-full justify-between shadow-sm">
                                        <button 
                                            onClick={() => setMinBedrooms(Math.max(0, minBedrooms - 1))} 
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-900 transition-colors font-bold"
                                        >-</button>
                                        <span className="text-sm font-bold">{minBedrooms > 0 ? minBedrooms + '+' : 'Any'}</span>
                                        <button 
                                            onClick={() => setMinBedrooms(minBedrooms + 1)} 
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-900 transition-colors font-bold"
                                        >+</button>
                                    </div>
                                </div>
                                {/* Bathrooms */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                                        <Bath size={14} /> Bathrooms
                                    </label>
                                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-full justify-between shadow-sm">
                                        <button 
                                            onClick={() => setMinBathrooms(Math.max(0, minBathrooms - 1))} 
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-900 transition-colors font-bold"
                                        >-</button>
                                        <span className="text-sm font-bold">{minBathrooms > 0 ? minBathrooms + '+' : 'Any'}</span>
                                        <button 
                                            onClick={() => setMinBathrooms(minBathrooms + 1)} 
                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-900 transition-colors font-bold"
                                        >+</button>
                                    </div>
                                </div>
                            </div>

                             {/* Furnished & Serviced Toggles */}
                             <div className="space-y-2">
                                <div 
                                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                                        reqFurnished 
                                        ? 'bg-primary border-primary text-white shadow-md' 
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'
                                    }`}
                                    onClick={() => setReqFurnished(!reqFurnished)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Armchair size={18} />
                                        <span className="text-sm font-bold">Furnished</span>
                                    </div>
                                    {reqFurnished && <Check size={16} />}
                                </div>

                                <div 
                                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                                        reqServiced 
                                        ? 'bg-primary border-primary text-white shadow-md' 
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'
                                    }`}
                                    onClick={() => setReqServiced(!reqServiced)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={18} />
                                        <span className="text-sm font-bold">Serviced</span>
                                    </div>
                                    {reqServiced && <Check size={16} />}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Flood Risk Filter (Dropdown) */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block flex items-center gap-2">
                             <Waves size={16} className="text-blue-500" />
                             Flood Risk Level
                        </label>
                        <div className="relative">
                            <select
                                value={filterFloodRisk}
                                onChange={(e) => setFilterFloodRisk(e.target.value)}
                                className="w-full appearance-none bg-white border border-gray-200 hover:border-primary p-4 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer pr-10 font-bold shadow-sm"
                            >
                                <option value="">Any Risk Level</option>
                                <option value={FloodRisk.LOW}>Low Risk (Dry Land)</option>
                                <option value={FloodRisk.MEDIUM}>Moderate Risk</option>
                                <option value={FloodRisk.HIGH}>High Risk (Flood Prone)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <ChevronDown size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Event Center Specifics */}
                    {(activeCategory === 'Owambe' || activeCategory === 'All') && (
                        <div className="bg-secondary-container/20 p-5 rounded-3xl border border-secondary-container/50">
                            <div className="flex items-center gap-2 mb-4">
                                <PartyPopper size={20} className="text-secondary" />
                                <span className="font-bold text-gray-900">Event Center Specs</span>
                            </div>
                            
                            {/* Capacity Slider */}
                            <div className="mb-2">
                                <div className="flex justify-between text-sm mb-3">
                                    <span className="text-gray-500 font-medium">Guest Capacity</span>
                                    <span className="font-bold text-secondary-text bg-secondary-container px-2 py-0.5 rounded-md text-xs border border-secondary/20">
                                        {minCapacity > 0 ? `${minCapacity}+ Guests` : 'Any Size'}
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="5000" 
                                    step="100" 
                                    value={minCapacity} 
                                    onChange={(e) => setMinCapacity(Number(e.target.value))}
                                    className="w-full accent-secondary h-4 bg-white rounded-lg appearance-none cursor-pointer border border-gray-200"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                                    <span>Any</span>
                                    <span>5000+</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* General Facilities */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 block">Facilities & Amenities</label>
                        
                        {/* Parking Stepper */}
                        <div className="flex items-center justify-between mb-6 p-1">
                            <div className="flex items-center gap-3 text-gray-900">
                                <div className="bg-gray-100 p-2 rounded-full">
                                    <Car size={20} className="text-gray-600" />
                                </div>
                                <span className="font-bold text-sm">Parking Spaces</span>
                            </div>
                            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1.5 rounded-full shadow-sm">
                                <button 
                                    onClick={() => setMinParking(Math.max(0, minParking - 10))} 
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-900 transition-colors font-bold"
                                >-</button>
                                <span className="w-12 text-center font-bold text-sm">{minParking}+</span>
                                <button 
                                    onClick={() => setMinParking(minParking + 10)} 
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-900 transition-colors font-bold"
                                >+</button>
                            </div>
                        </div>

                        {/* Generator Toggle */}
                        <div 
                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                                reqGenerator 
                                ? 'bg-primary-container border-primary-container shadow-md' 
                                : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'
                            }`}
                            onClick={() => setReqGenerator(!reqGenerator)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${reqGenerator ? 'bg-white text-primary' : 'bg-gray-100 text-gray-500'}`}>
                                    <Zap size={20} fill={reqGenerator ? "currentColor" : "none"} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${reqGenerator ? 'text-on-primary-container' : 'text-gray-900'}`}>Generator Available</span>
                                    <span className={`text-xs ${reqGenerator ? 'text-on-primary-container/70' : 'text-gray-500'}`}>Backup power or 24/7 light</span>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                reqGenerator ? 'bg-primary border-primary' : 'border-gray-300'
                            }`}>
                                {reqGenerator && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-gray-100">
                    <button 
                        onClick={resetFilters} 
                        className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-100 rounded-2xl transition-colors"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={() => setIsFilterOpen(false)} 
                        className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                    >
                        Show {filteredProperties.length} Results
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
          <CompareModal 
              properties={compareList} 
              onClose={() => setShowCompareModal(false)}
              onRemove={removeFromCompare}
              onChat={onChat}
          />
      )}
    </div>
  );
};

export default ExploreView;
