import React, { useState } from 'react';
import { Property } from '../types';
import { GoogleGenAI } from '@google/genai';
import { X, Sparkles, Layers, Eye, Compass, ShoppingBag, CheckCircle2, Loader2, RefreshCw, Palette, Box, ArrowRight, Tag, Info, Sliders, Layout } from 'lucide-react';

interface VirtualStagingModalProps {
  property: Property;
  onClose: () => void;
}

interface FurnitureHotspot {
  id: string;
  xPercent: number; // % top left
  yPercent: number;
  name: string;
  category: string;
  material: string;
  dimensions: string;
  priceNaira: number;
  description: string;
}

const STAGING_STYLES = [
  {
    id: 'afro_luxury',
    name: 'Afro-Centric Heritage Luxury',
    badge: 'Popular in Ikoyi & Lekki',
    description: 'Rich Teak wood craftsmanship, hand-carved ebony accents, warm bronze fixtures & earthy terracotta hues.',
    stagedImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    rawImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    hotspots: [
      {
        id: 'h1',
        xPercent: 35,
        yPercent: 62,
        name: 'Handcrafted Teak & Velvet Sectional Sofa',
        category: 'Seating',
        material: 'Kiln-dried Nigerian Mahogany frame, Emerald Velvet upholstery',
        dimensions: '290cm x 180cm x 85cm',
        priceNaira: 2450000,
        description: 'Ergonomic plush sectional crafted by master carpenters in Yaba Design Hub.'
      },
      {
        id: 'h2',
        xPercent: 55,
        yPercent: 75,
        name: 'Fluted Calacatta Marble & Brass Coffee Table',
        category: 'Tables',
        material: 'Honable Calacatta Gold Marble slab on brushed brass pedestal',
        dimensions: '120cm x 80cm x 42cm',
        priceNaira: 980000,
        description: 'Statement centerpiece with heat-resistant sealant and subtle grey veining.'
      },
      {
        id: 'h3',
        xPercent: 78,
        yPercent: 42,
        name: 'Brass Arc Floor Lamp & Bronze Sconce',
        category: 'Lighting',
        material: 'Spun brass hood with warm 2700K dimmable LED bulb',
        dimensions: 'Height 210cm | Reach 140cm',
        priceNaira: 320000,
        description: 'Casts an inviting golden ambient wash ideal for evening hosting.'
      }
    ]
  },
  {
    id: 'modern_exec',
    name: 'Modern Executive Monochromatic',
    badge: 'High Rental Yield',
    description: 'Monochromatic Italian leather, acoustic slat wall panels, integrated LED cove lighting & sleek metallic finishes.',
    stagedImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    rawImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    hotspots: [
      {
        id: 'h4',
        xPercent: 42,
        yPercent: 58,
        name: 'Charcoal Italian Aniline Leather Sofa',
        category: 'Seating',
        material: 'Full-grain Italian Aniline leather with memory foam cushions',
        dimensions: '260cm x 95cm x 80cm',
        priceNaira: 3100000,
        description: 'Sleek executive sofa designed for long-lasting comfort and high durability.'
      },
      {
        id: 'h5',
        xPercent: 82,
        yPercent: 35,
        name: 'Acoustic Walnut Slat Media Wall Unit',
        category: 'Wall Units',
        material: 'Acoustic felt backing with natural American Walnut timber slats',
        dimensions: '320cm x 240cm',
        priceNaira: 1650000,
        description: 'Reduces room echo by 60% while housing clean cable channels for 85" displays.'
      }
    ]
  },
  {
    id: 'scandi_zen',
    name: 'Scandinavian Light Oak & Linen',
    badge: 'Cozy & Minimal',
    description: 'Bright white oak timber, textured cream bouclé fabric, minimalist botanical plants & maximum natural daylight.',
    stagedImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    rawImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    hotspots: [
      {
        id: 'h6',
        xPercent: 48,
        yPercent: 65,
        name: 'Cream Bouclé Organic Curved Lounge Chair',
        category: 'Seating',
        material: 'High-density textured bouclé wool on white oak legs',
        dimensions: '110cm x 100cm x 78cm',
        priceNaira: 750000,
        description: 'Ultra-soft sculptural lounge chair that amplifies room airiness.'
      }
    ]
  }
];

export const VirtualStagingModal: React.FC<VirtualStagingModalProps> = ({ property, onClose }) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('Living Room');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('afro_luxury');
  const [viewMode, setViewMode] = useState<'staged' | 'raw' | 'floorplan'>('staged');
  const [selectedHotspot, setSelectedHotspot] = useState<FurnitureHotspot | null>(null);
  const [customFloorPlan, setCustomFloorPlan] = useState<string | null>(property.floorPlanUrl || null);

  const handleCustomFloorPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomFloorPlan(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gemini AI Analysis State
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiLayoutPlan, setAiLayoutPlan] = useState<{
    trafficFlow: string;
    suggestedFurniture: string[];
    colorPalette: string[];
    lightingStrategy: string;
    projectedYieldBoost: string;
  } | null>(null);

  const currentStyle = STAGING_STYLES.find(s => s.id === selectedStyleId) || STAGING_STYLES[0];

  const handleRunAiSpatialAnalysis = async () => {
    setIsAiProcessing(true);
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an expert luxury interior designer and real estate staging architect in Lagos, Nigeria. Analyze an empty ${selectedRoom} for property '${property.title}' located in ${property.location.area || property.location.city}. Staging style requested: '${currentStyle.name}'.
Provide a JSON formatted analysis with keys:
- "trafficFlow": string describing optimal furniture arrangement & door clearance
- "suggestedFurniture": list of 4 key furniture pieces with dimensions
- "colorPalette": list of 4 hex color codes or color names matching the style
- "lightingStrategy": string describing ambient, task, and accent light placement
- "projectedYieldBoost": string e.g. "+22% Higher Monthly Rental Value"`
        });

        if (response.text) {
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setAiLayoutPlan(parsed);
          } else {
            fallbackAiPlan();
          }
        } else {
          fallbackAiPlan();
        }
      } else {
        fallbackAiPlan();
      }
    } catch (err) {
      console.warn('Gemini AI Staging Analysis fallback:', err);
      fallbackAiPlan();
    } finally {
      setIsAiProcessing(false);
    }
  };

  const fallbackAiPlan = () => {
    setAiLayoutPlan({
      trafficFlow: `Position the sectional sofa along the main eastern wall facing the entry door, maintaining a 1.2m clear walking corridor to the balcony sliding doors.`,
      suggestedFurniture: [
        'L-Shape Sectional Sofa (280cm x 180cm)',
        'Low-Profile Floating Media Console (220cm)',
        'Round Marble Center Table (Ø 90cm)',
        'Floor-to-Ceiling Sheer Linen Curtains'
      ],
      colorPalette: ['#1c2826', '#d4af37', '#e8dfd8', '#3d2817'],
      lightingStrategy: 'Layer 3000K warm LED perimeter strip light behind TV panel with 2 focused brass reading sconces by the lounge chair.',
      projectedYieldBoost: '+21.5% Projected Rental Income Boost'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-6xl bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-surface-container-high border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-on-surface">AI Virtual Staging & Spatial Layout</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  Gemini Vision AI
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Preview furniture layouts & interior decor packages for <strong className="text-on-surface">{property.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Controls Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
            {/* Room Selector */}
            <div className="lg:col-span-4">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Select Space / Room
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['Living Room', 'Master Suite', 'Dining Area', 'Executive Office'].map((rm) => (
                  <button
                    key={rm}
                    onClick={() => setSelectedRoom(rm)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedRoom === rm
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface border border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {rm}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div className="lg:col-span-5">
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Interior Staging Style
              </label>
              <select
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-outline-variant/30 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
              >
                {STAGING_STYLES.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name} ({style.badge})
                  </option>
                ))}
              </select>
            </div>

            {/* View Switcher */}
            <div className="lg:col-span-3 flex justify-end">
              <div className="flex p-1 bg-surface rounded-xl border border-outline-variant/20 overflow-x-auto">
                <button
                  onClick={() => setViewMode('staged')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    viewMode === 'staged' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <Sparkles size={13} /> AI Staged
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    viewMode === 'raw' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <Eye size={13} /> Unfurnished
                </button>
                <button
                  onClick={() => setViewMode('floorplan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    viewMode === 'floorplan' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <Layout size={13} /> Floor Plan
                </button>
              </div>
            </div>
          </div>

          {/* Main Visual Stage Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Image Stage Container */}
            <div className="lg:col-span-8 relative bg-slate-950 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-lg min-h-[380px] flex items-center justify-center p-4">
              
              {viewMode === 'floorplan' ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900 rounded-xl border border-white/10">
                  {customFloorPlan ? (
                    <div className="relative w-full max-h-[420px] flex items-center justify-center">
                      <img
                        src={customFloorPlan}
                        alt="Architectural Floor Plan"
                        className="max-h-[380px] object-contain rounded-xl border border-emerald-500/30"
                      />
                      <label className="absolute bottom-3 right-3 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                        <Layout size={14} /> Replace Floor Plan
                        <input type="file" accept="image/*,.svg" onChange={handleCustomFloorPlanUpload} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <div className="max-w-md space-y-4">
                      <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                        <Layout size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-white">No Architectural Floor Plan Attached</h4>
                      <p className="text-xs text-slate-300">
                        Upload an architectural drawing or 2D SVG/image layout for <strong className="text-emerald-400">{property.title}</strong> to map spatial proportions.
                      </p>
                      <label className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg transition-all">
                        <Layout size={16} /> Upload Floor Plan (SVG/Image)
                        <input type="file" accept="image/*,.svg" onChange={handleCustomFloorPlanUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <img
                    src={viewMode === 'staged' ? currentStyle.stagedImage : currentStyle.rawImage}
                    alt="Room Staging"
                    referrerPolicy="no-referrer"
                    className="w-full h-full max-h-[480px] object-cover transition-all duration-500 rounded-xl"
                  />

                  {/* View Mode Tag */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-2">
                    {viewMode === 'staged' ? (
                      <>
                        <Sparkles size={14} className="text-purple-400 animate-pulse" />
                        <span>{currentStyle.name}</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} className="text-amber-400" />
                        <span>Original Raw Unfurnished Room</span>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Interactive Hotspot Pins (Only in Staged Mode) */}
              {viewMode === 'staged' && currentStyle.hotspots.map((hotspot) => (
                <button
                  key={hotspot.id}
                  onClick={() => setSelectedHotspot(hotspot)}
                  style={{ top: `${hotspot.yPercent}%`, left: `${hotspot.xPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-transform ${
                    selectedHotspot?.id === hotspot.id ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-purple-400 opacity-75"></span>
                    <div className="relative w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                      <Tag size={13} />
                    </div>
                  </div>

                  {/* Hover Tag */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex whitespace-nowrap bg-black/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20 shadow-xl">
                    {hotspot.name}
                  </div>
                </button>
              ))}

              {/* Hotspot Drawer Overlay if selected */}
              {selectedHotspot && (
                <div className="absolute bottom-4 left-4 right-4 bg-surface/95 backdrop-blur-md p-4 rounded-2xl border border-purple-500/30 shadow-2xl animate-in slide-in-from-bottom-3 z-40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                      <Tag size={14} /> {selectedHotspot.category}
                    </div>
                    <h4 className="font-extrabold text-sm text-on-surface">{selectedHotspot.name}</h4>
                    <p className="text-xs text-on-surface-variant line-clamp-1">{selectedHotspot.description}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Specs: <strong>{selectedHotspot.dimensions}</strong> | {selectedHotspot.material}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Est. Price</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₦{selectedHotspot.priceNaira.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedHotspot(null)}
                      className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Gemini AI Spatial Analysis */}
            <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 flex flex-col justify-between space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
                    <Compass size={16} /> Spatial Flow & Layout
                  </div>
                  
                  <button
                    onClick={handleRunAiSpatialAnalysis}
                    disabled={isAiProcessing}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {isAiProcessing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>{aiLayoutPlan ? 'Re-Analyze AI' : 'Run AI Spatial Analysis'}</span>
                  </button>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  {currentStyle.description}
                </p>

                {/* AI Plan Output */}
                {aiLayoutPlan ? (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/20 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Traffic Flow & Door Clearance
                      </span>
                      <p className="text-xs text-on-surface leading-relaxed">
                        {aiLayoutPlan.trafficFlow}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/20 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Recommended Pieces
                      </span>
                      <ul className="text-xs space-y-1 text-on-surface">
                        {aiLayoutPlan.suggestedFurniture.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-bold">
                      <span>Value Optimization:</span>
                      <span>{aiLayoutPlan.projectedYieldBoost}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-outline-variant/30 text-center space-y-2">
                    <Box size={28} className="mx-auto text-purple-500/50" />
                    <p className="text-xs font-bold text-on-surface">Gemini AI Spatial Analysis Ready</p>
                    <p className="text-[11px] text-on-surface-variant">
                      Click 'Run AI Spatial Analysis' to calculate ergonomic clearances, lighting angles, and yield boosts.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-outline-variant/15 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface transition-colors"
                >
                  Close Stage
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
