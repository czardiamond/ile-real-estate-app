
import React, { useState, useMemo, useEffect } from 'react';
import Navigation from './components/Navigation';
import ExploreView from './components/ExploreView';
import AgentDashboard from './components/AgentDashboard';
import AIChat from './components/AIChat';
import AuthScreen from './components/AuthScreen';
import AddListingWizard from './components/AddListingWizard';
import VerificationModal from './components/VerificationModal';
import LegalGenerator from './components/LegalGenerator';
import ProfileSettingsView from './components/ProfileSettingsView';
import ChatModal from './components/ChatModal';
import LiveWalkthroughModal from './components/LiveWalkthroughModal';
import NetworkMarketingView from './components/NetworkMarketingView';
import BrokerageView from './components/BrokerageView';
import AcademyView from './components/AcademyView';
import SmartMeterWidget from './components/SmartMeterWidget';
import RentPaymentModal from './components/RentPaymentModal';
import PropertyCard from './components/PropertyCard';
import { UserRole, Property, User, SmartListingResponse, VerificationData, FloodRisk, TitleDocument, VerificationStatus } from './types';
import { X, Calendar, MessageSquare, ShieldCheck, Share2, Crown, CheckCircle, Zap, Droplets, Waves, Lock, Video, FileText, MapPin, Sparkles, TrendingUp, ChevronLeft, Box, LayoutTemplate, Loader2, Play, CreditCard, Check, AlertTriangle, ExternalLink, Heart, Ghost } from 'lucide-react';
import { generatePropertyDescription } from './services/geminiService';
import { verifyLandTitle } from './services/landRegistryService';
import { MOCK_PROPERTIES } from './services/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icons (safeguard)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('explore');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  
  // Saved Properties State
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  // Preview Property for independent modals (3D tour, Floor plan)
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);

  const [generatedDesc, setGeneratedDesc] = useState<string | null>(null);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // Chat State
  const [chatProperty, setChatProperty] = useState<Property | null>(null);

  // Listing Wizard State - Set to TRUE by default for development/testing
  const [isListingWizardOpen, setIsListingWizardOpen] = useState(true);
  const [wizardInitialText, setWizardInitialText] = useState('');
  
  // Verification State
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Legal Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Live Walkthrough Modal State
  const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState(false);

  // 3D Tour & Floor Plan State
  const [viewing3DTour, setViewing3DTour] = useState(false);
  const [viewingFloorPlan, setViewingFloorPlan] = useState(false);

  // Academy State
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);

  // Land Registry State
  const [verifyingTitle, setVerifyingTitle] = useState(false);
  // We'll store the live verification result locally in state for the session
  const [liveVerificationResult, setLiveVerificationResult] = useState<TitleDocument | null>(null);

  // Load saved properties on mount
  useEffect(() => {
    const saved = localStorage.getItem('ile_saved_properties');
    if (saved) {
      try {
        setSavedPropertyIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse saved properties", e);
      }
    }
  }, []);

  // Login Handler
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Route based on role
    if (user.role === UserRole.BROKERAGE) {
        setActiveTab('brokerage-dashboard');
    } else if (user.role === UserRole.AGENT) {
        setActiveTab('dashboard'); // Veranda
    } else {
        setActiveTab('explore');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('explore');
    setSelectedProperty(null);
  };

  const handleVerificationSuccess = (data: VerificationData) => {
      if (currentUser) {
          const updatedUser: User = {
              ...currentUser,
              verified: true,
              verification: data
          };
          setCurrentUser(updatedUser);
      }
  };

  const handleToggleSave = (propertyId: string) => {
      setSavedPropertyIds(prev => {
          const next = new Set(prev);
          if (next.has(propertyId)) {
              next.delete(propertyId);
          } else {
              next.add(propertyId);
          }
          localStorage.setItem('ile_saved_properties', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const handleChat = (property: Property) => {
      setChatProperty(property);
  };

  const handleView3D = (property: Property) => {
      setPreviewProperty(property);
      setViewing3DTour(true);
  };

  const handleViewFloorPlan = (property: Property) => {
      setPreviewProperty(property);
      setViewingFloorPlan(true);
  };

  const handlePropertySelect = (property: Property) => {
      setSelectedProperty(property);
      setShowVideo(false); 
      setLiveVerificationResult(null); // Reset title check on new property selection
  }

  // Agent AI Description Handler (Legacy/Manual mode)
  const handleAIGenerateDesc = async (prop: Property) => {
      setIsGeneratingDesc(true);
      const desc = await generatePropertyDescription(prop);
      setGeneratedDesc(desc);
      setIsGeneratingDesc(false);
  };

  // Land Registry Check
  const handleVerifyTitle = async () => {
      if (!selectedProperty?.titleDocument) return;
      setVerifyingTitle(true);
      
      const result = await verifyLandTitle(selectedProperty.titleDocument);
      setVerifyingTitle(false);
      setLiveVerificationResult(result);
  };

  // Tab Change Handler
  const handleTabChange = (tab: string) => {
      if (tab === 'add-listing') {
          setWizardInitialText(''); // Reset for standard add
          setIsListingWizardOpen(true);
      } else {
          setActiveTab(tab);
          setSelectedProperty(null);
          setGeneratedDesc(null); // Reset generated desc when switching views or properties might change context
          window.scrollTo(0, 0);
      }
  };

  const handleQuickAddListing = (text: string) => {
      setWizardInitialText(text);
      setIsListingWizardOpen(true);
  };

  const handleListingComplete = (data: SmartListingResponse) => {
      console.log("Listing Created:", data);
      setIsListingWizardOpen(false);
      setActiveTab('dashboard');
      alert("Success! Your listing has been drafted and saved to The Veranda.");
  };

  // Compute Similar Properties
  const similarProperties = useMemo(() => {
    if (!selectedProperty) return [];
    return MOCK_PROPERTIES.filter(p => 
        p.id !== selectedProperty.id && 
        (p.type === selectedProperty.type || p.location.area === selectedProperty.location.area)
    ).slice(0, 5);
  }, [selectedProperty]);

  // Compute Price History Mock Data
  const priceHistory = useMemo(() => {
    if (!selectedProperty) return [];
    
    const data = [];
    const basePrice = selectedProperty.price;
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Mock logic: Price varies slightly to create a chart
        const variance = 1 + (Math.random() * 0.1 - 0.05);
        const dailyPrice = i === 0 ? basePrice : Math.round(basePrice * (i === 0 ? 1 : variance));

        data.push({
            name: date.toLocaleDateString('en-GB', { weekday: 'short' }),
            price: dailyPrice
        });
    }
    return data;
  }, [selectedProperty]);

  // Saved Properties List
  const savedPropertiesList = useMemo(() => {
      return MOCK_PROPERTIES.filter(p => savedPropertyIds.has(p.id));
  }, [savedPropertyIds]);


  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // --- RENDER PROPERTY DETAILS OVERLAY ---
  if (selectedProperty) {
      // Use live result if available, else use the property's cached doc
      const displayTitleDoc = liveVerificationResult || selectedProperty.titleDocument;

      return (
          <div className="bg-surface min-h-screen pb-20">
              {/* Image / Video Hero */}
              <div className="relative h-[40vh] md:h-[50vh] w-full bg-black">
                  {showVideo && selectedProperty.videoUrl ? (
                      <div className="w-full h-full">
                          <video 
                             src={selectedProperty.videoUrl} 
                             controls 
                             autoPlay 
                             className="w-full h-full object-contain"
                          />
                          <button 
                            onClick={() => setShowVideo(false)}
                            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-20 hover:bg-black/70"
                          >
                              <X size={20} />
                          </button>
                      </div>
                  ) : (
                    <>
                        <img src={selectedProperty.images[0]} alt={selectedProperty.title} className="w-full h-full object-cover opacity-90" />
                        
                        {selectedProperty.videoUrl && (
                            <button 
                                onClick={() => setShowVideo(true)}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform z-20 group"
                            >
                                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg group-hover:bg-primary/90">
                                    <Play size={32} fill="currentColor" className="ml-1" />
                                </div>
                            </button>
                        )}
                    </>
                  )}

                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    <button 
                        onClick={() => setSelectedProperty(null)}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleSave(selectedProperty.id)}
                    className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                  >
                      <Heart size={20} fill={savedPropertyIds.has(selectedProperty.id) ? "currentColor" : "none"} className={savedPropertyIds.has(selectedProperty.id) ? "text-red-500" : "text-white"} />
                  </button>

                  <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
              </div>

              <div className="max-w-4xl mx-auto -mt-10 relative px-4 z-10">
                  <div className="bg-surface rounded-t-[32px] shadow-lg border-t border-white/50 p-6 md:p-8 min-h-screen">
                      
                      {/* Title Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <div>
                              <div className="flex items-center gap-2 mb-2">
                                  <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-xs font-bold uppercase tracking-wide">
                                      {selectedProperty.type}
                                  </span>
                                  {selectedProperty.isVerified && (
                                      <span className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                                          <ShieldCheck size={14} /> Verified
                                      </span>
                                  )}
                              </div>
                              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">{selectedProperty.title}</h1>
                              <p className="text-on-surface-variant flex items-center gap-1">
                                  <MapPin size={16} /> {selectedProperty.location.address}, {selectedProperty.location.area}
                              </p>
                          </div>
                          <div className="text-left md:text-right">
                              <p className="text-3xl font-bold text-primary">
                                  ₦{(selectedProperty.price).toLocaleString()}
                              </p>
                              <p className="text-sm text-on-surface-variant">
                                  {selectedProperty.period === 'total' ? 'Total Price' : selectedProperty.period}
                              </p>
                          </div>
                      </div>

                      {/* LAND REGISTRY VERIFICATION CARD */}
                      <div className="mb-8 p-5 bg-surface-container-low rounded-[24px] border border-outline-variant/10">
                          <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-2">
                                  <div className="p-2 bg-white rounded-lg shadow-sm">
                                      <FileText className="text-gray-700" size={20} />
                                  </div>
                                  <h3 className="font-bold text-on-surface">Land Registry Verification</h3>
                              </div>
                              {/* Status Badge */}
                              {displayTitleDoc ? (
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                                      displayTitleDoc.status === VerificationStatus.VERIFIED ? 'bg-green-100 text-green-800 border border-green-200' :
                                      displayTitleDoc.status === VerificationStatus.REJECTED ? 'bg-red-100 text-red-800 border border-red-200' :
                                      'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  }`}>
                                      {displayTitleDoc.status === VerificationStatus.VERIFIED && <CheckCircle size={14} />}
                                      {displayTitleDoc.status === VerificationStatus.REJECTED && <AlertTriangle size={14} />}
                                      {displayTitleDoc.status === VerificationStatus.PENDING && <Loader2 size={14} className="animate-spin" />}
                                      {displayTitleDoc.status === VerificationStatus.UNVERIFIED && <ShieldCheck size={14} />}
                                      {displayTitleDoc.status === VerificationStatus.UNVERIFIED ? 'Unverified' : displayTitleDoc.status}
                                  </span>
                              ) : (
                                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">No Title Doc</span>
                              )}
                          </div>

                          {displayTitleDoc ? (
                              <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                          <p className="text-xs text-on-surface-variant font-medium uppercase mb-1">Document Type</p>
                                          <p className="font-bold text-on-surface">{displayTitleDoc.type.replace(/_/g, ' ')}</p>
                                      </div>
                                      <div>
                                          <p className="text-xs text-on-surface-variant font-medium uppercase mb-1">Document Number</p>
                                          <p className="font-mono text-on-surface bg-white/50 px-2 py-1 rounded w-fit border border-gray-200">
                                              {displayTitleDoc.number}
                                          </p>
                                      </div>
                                  </div>

                                  {/* Verification Result Section */}
                                  {displayTitleDoc.status === VerificationStatus.VERIFIED && (
                                      <div className="bg-green-50 p-4 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                                          <div className="flex justify-between items-start mb-2">
                                              <p className="text-xs text-green-800 font-bold uppercase tracking-wider">Lagos State Registry Result</p>
                                              <span className="text-[10px] text-green-600">Verified: {new Date(displayTitleDoc.verifiedAt || '').toLocaleDateString()}</span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                              <p className="text-sm text-green-900">
                                                  <span className="font-normal opacity-70">Registered Owner: </span>
                                                  <span className="font-bold">{displayTitleDoc.registeredOwner}</span>
                                              </p>
                                              <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                  <CheckCircle size={10} /> Title is clean and free of encumbrances.
                                              </p>
                                          </div>
                                          {displayTitleDoc.registryUrl && (
                                              <a href="#" className="mt-3 text-xs font-bold text-green-700 flex items-center gap-1 hover:underline">
                                                  View Official Record <ExternalLink size={12} />
                                              </a>
                                          )}
                                      </div>
                                  )}

                                  {displayTitleDoc.status === VerificationStatus.REJECTED && (
                                      <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                                          <div className="flex justify-between items-start mb-2">
                                              <p className="text-xs text-red-800 font-bold uppercase tracking-wider flex items-center gap-1">
                                                  <AlertTriangle size={12} /> Verification Alert
                                              </p>
                                              <span className="text-[10px] text-red-600">Checked: Today</span>
                                          </div>
                                          <p className="text-sm font-bold text-red-900 mb-1">{displayTitleDoc.rejectionReason}</p>
                                          <p className="text-xs text-red-700">
                                              This document number raised a flag in the registry system. 
                                              <br/><strong>Advice:</strong> Do not proceed with payment until clarified.
                                          </p>
                                      </div>
                                  )}

                                  {/* Action Button for Unverified */}
                                  {(displayTitleDoc.status === VerificationStatus.UNVERIFIED || !displayTitleDoc.status) && (
                                      <div>
                                          <div className="bg-gray-50 p-3 rounded-xl mb-3 text-xs text-gray-600 border border-gray-200">
                                              This property has a provided document number but hasn't been verified against the government database yet.
                                          </div>
                                          <button 
                                            onClick={handleVerifyTitle}
                                            disabled={verifyingTitle}
                                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                                          >
                                              {verifyingTitle ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                              {verifyingTitle ? 'Contacting Alausa Registry...' : 'Run Title Search (Instant)'}
                                          </button>
                                      </div>
                                  )}
                              </div>
                          ) : (
                              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3 items-start">
                                  <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                                  <div>
                                      <h4 className="font-bold text-yellow-900 text-sm">Missing Documentation</h4>
                                      <p className="text-xs text-yellow-800 mt-1">
                                          The agent has not provided a C of O or Governor's Consent number for this listing. Proceed with extreme caution.
                                      </p>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Location Map */}
                      <div className="mb-8 p-5 bg-surface-container-low rounded-[24px] border border-outline-variant/10 overflow-hidden">
                          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                              <MapPin size={20} className="text-primary" /> Location
                          </h3>
                          <div className="h-64 w-full rounded-2xl overflow-hidden relative z-0">
                              <MapContainer 
                                center={[selectedProperty.coordinates?.lat || 6.5244, selectedProperty.coordinates?.lng || 3.3792]} 
                                zoom={15} 
                                style={{ height: '100%', width: '100%' }}
                                dragging={true}
                                scrollWheelZoom={false}
                              >
                                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                  {selectedProperty.coordinates && <Marker position={[selectedProperty.coordinates.lat, selectedProperty.coordinates.lng]} />}
                              </MapContainer>
                          </div>
                      </div>

                      {/* IoT Smart Meter Section */}
                      {selectedProperty.smartMeterId && (
                          <div className="mb-8">
                              <SmartMeterWidget meterId={selectedProperty.smartMeterId} />
                          </div>
                      )}

                      {/* AI Description */}
                      <div className="mb-8 p-6 bg-surface-container-low rounded-[24px] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
                               <Sparkles className="text-secondary" size={40} />
                           </div>
                           <div className="flex justify-between items-center mb-4 relative z-10">
                               <h3 className="font-bold text-lg flex items-center gap-2">
                                   <Sparkles className="text-primary" size={20} />
                                   Ilé AI Description
                               </h3>
                               {currentUser.role === UserRole.AGENT && currentUser.id === selectedProperty.agentId && (
                                   <button 
                                    onClick={() => handleAIGenerateDesc(selectedProperty)}
                                    disabled={isGeneratingDesc}
                                    className="text-xs font-bold bg-white px-3 py-1.5 rounded-full shadow-sm text-primary flex items-center gap-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                   >
                                       {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                       {generatedDesc ? 'Rewrite' : 'Generate'}
                                   </button>
                               )}
                           </div>
                           <div className="relative z-10 min-h-[60px]">
                               {isGeneratingDesc ? (
                                   <div className="flex items-center gap-2 text-on-surface-variant/50 animate-pulse">
                                       <Sparkles size={16} /> Writing magic...
                                   </div>
                               ) : (
                                   <p className="text-on-surface-variant leading-relaxed whitespace-pre-line">
                                       {generatedDesc || selectedProperty.description}
                                   </p>
                               )}
                           </div>
                      </div>

                      {/* Similar Properties Section */}
                      {similarProperties.length > 0 && (
                        <div className="mb-8">
                            <h3 className="font-bold text-lg mb-4 text-on-surface">Similar Spaces Nearby</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                                {similarProperties.map(sim => (
                                    <div 
                                        key={sim.id} 
                                        onClick={() => handlePropertySelect(sim)}
                                        className="min-w-[220px] w-[220px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                                    >
                                        <div className="h-32 relative overflow-hidden">
                                            <img src={sim.images[0]} alt={sim.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                                {sim.type}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-gray-900 text-sm truncate mb-1">{sim.title}</h4>
                                            <p className="text-primary font-bold text-sm">₦{sim.price.toLocaleString()}</p>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                <MapPin size={12} /> {sim.location.area}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}

                      <div className="grid md:grid-cols-3 gap-8">
                          {/* Main Specs */}
                          <div className="md:col-span-2 space-y-8">
                              
                              {/* Features Grid */}
                              <div>
                                  <h3 className="font-bold text-lg mb-4 text-on-surface">Features</h3>
                                  <div className="flex flex-wrap gap-3">
                                      {selectedProperty.features.map((feat, i) => (
                                          <span key={i} className="px-4 py-2 bg-surface-container rounded-xl text-sm font-medium text-on-surface-variant">
                                              {feat}
                                          </span>
                                      ))}
                                      {selectedProperty.isSolarPowered && (
                                          <span className="px-4 py-2 bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-xl text-sm font-bold flex items-center gap-2">
                                              <Zap size={14} /> Solar Powered
                                          </span>
                                      )}
                                  </div>
                              </div>

                              {/* Nigerian Context Stats */}
                              <div className="grid grid-cols-2 gap-4">
                                  <div className={`p-4 rounded-2xl border ${
                                      selectedProperty.floodRisk === FloodRisk.LOW ? 'bg-green-50 border-green-100' :
                                      selectedProperty.floodRisk === FloodRisk.MEDIUM ? 'bg-yellow-50 border-yellow-100' :
                                      'bg-red-50 border-red-100'
                                  }`}>
                                      <p className="text-xs font-bold uppercase tracking-wide mb-1 opacity-70">Flood Risk</p>
                                      <div className="flex items-center gap-2 font-bold text-lg">
                                          <Waves size={20} />
                                          {selectedProperty.floodRisk}
                                      </div>
                                  </div>
                                  
                                  <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
                                      <p className="text-xs font-bold uppercase tracking-wide mb-1 opacity-70 text-on-surface-variant">Avg Power</p>
                                      <div className="flex items-center gap-2 font-bold text-lg text-on-surface">
                                          <Zap size={20} className={selectedProperty.avgPowerHours > 18 ? 'text-yellow-500' : 'text-gray-400'} />
                                          {selectedProperty.avgPowerHours} hrs/day
                                      </div>
                                  </div>
                              </div>

                              {/* Price History Chart */}
                              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4">
                                      <TrendingUp size={18} className="text-green-600" />
                                      <h3 className="font-bold text-sm">Price Trends (7 Days)</h3>
                                  </div>
                                  <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceHistory}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                            <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                                formatter={(val: number) => [`₦${val.toLocaleString()}`, 'Price']}
                                            />
                                            <Line type="monotone" dataKey="price" stroke="#166534" strokeWidth={2} dot={{r: 3}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                              </div>
                          </div>

                          {/* Sidebar / Action Area */}
                          <div className="space-y-4">
                              <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10 sticky top-24">
                                  <div className="flex items-center gap-3 mb-4">
                                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                          <Crown size={20} />
                                      </div>
                                      <div>
                                          <p className="text-xs text-on-surface-variant">Listed by</p>
                                          <p className="font-bold text-on-surface">Lekki Gardens</p>
                                          <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                                              <CheckCircle size={10} /> Identity Verified
                                          </div>
                                      </div>
                                  </div>

                                  {/* Rent Payment Action */}
                                  <button 
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="w-full py-4 bg-primary text-white rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                  >
                                      <CreditCard size={18} /> Rent Now
                                  </button>

                                  <button 
                                    onClick={() => handleChat(selectedProperty)}
                                    className="w-full py-3 bg-surface text-on-surface border border-gray-200 rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
                                  >
                                      <MessageSquare size={18} /> Chat with Agent
                                  </button>

                                  <button 
                                    onClick={() => setIsWalkthroughModalOpen(true)}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                  >
                                      <Video size={18} /> Live Walkthrough
                                  </button>
                                  
                                  {/* Virtual Exploration Buttons */}
                                  {selectedProperty.virtualTourUrl && (
                                    <button 
                                        onClick={() => handleView3D(selectedProperty)}
                                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-black transition-colors"
                                    >
                                        <Box size={18} /> 3D Virtual Tour
                                    </button>
                                  )}

                                  {selectedProperty.floorPlanImages && selectedProperty.floorPlanImages.length > 0 && (
                                    <button 
                                        onClick={() => handleViewFloorPlan(selectedProperty)}
                                        className="w-full py-3 bg-surface text-gray-900 border border-gray-200 rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <LayoutTemplate size={18} /> View Floor Plan
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => setIsLegalModalOpen(true)}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                  >
                                      <FileText size={18} /> Draft Agreement
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="bg-surface min-h-screen pb-20 md:pb-0 font-sans">
      <Navigation 
        currentRole={currentUser.role} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      <main className="pt-20 md:pt-24 h-full min-h-screen">
          {activeTab === 'explore' && (
              <ExploreView 
                onPropertySelect={handlePropertySelect} 
                onChat={handleChat}
                onView3D={handleView3D}
                onViewFloorPlan={handleViewFloorPlan}
                savedPropertyIds={savedPropertyIds}
                onToggleSave={handleToggleSave}
              />
          )}

          {activeTab === 'saved' && (
              <div className="max-w-7xl mx-auto px-4 md:px-8 pb-10">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Heart size={24} className="text-red-500 fill-red-500" /> Saved Properties
                  </h2>
                  
                  {savedPropertiesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {savedPropertiesList.map(property => (
                            <PropertyCard 
                                key={property.id}
                                property={property} 
                                onClick={() => handlePropertySelect(property)} 
                                onChat={() => handleChat(property)}
                                onView3D={() => handleView3D(property)}
                                onViewFloorPlan={() => handleViewFloorPlan(property)}
                                isSaved={savedPropertyIds.has(property.id)}
                                onToggleSave={() => handleToggleSave(property.id)}
                            />
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Ghost size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">No saved properties</h3>
                        <p className="text-gray-500 mt-2">Tap the heart icon to bookmark spaces you like.</p>
                        <button 
                            onClick={() => setActiveTab('explore')}
                            className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold"
                        >
                            Start Exploring
                        </button>
                    </div>
                  )}
              </div>
          )}

          {activeTab === 'dashboard' && currentUser.role === UserRole.AGENT && (
              <AgentDashboard 
                user={currentUser} 
                onVerifyClick={() => setIsVerificationModalOpen(true)} 
                onTabChange={handleTabChange}
                onOpenAcademy={() => setIsAcademyOpen(true)}
                onQuickAdd={handleQuickAddListing}
              />
          )}

          {activeTab === 'brokerage-dashboard' && currentUser.role === UserRole.BROKERAGE && (
              <BrokerageView user={currentUser} />
          )}

          {activeTab === 'network' && (
              <NetworkMarketingView user={currentUser} />
          )}

          {activeTab === 'chat' && (
              <AIChat />
          )}

          {activeTab === 'menu' && (
              <ProfileSettingsView 
                user={currentUser} 
                onLogout={handleLogout} 
                onVerifyClick={() => setIsVerificationModalOpen(true)}
                onTabChange={handleTabChange}
              />
          )}
      </main>

      {/* Global Modals */}
      {chatProperty && !selectedProperty && (
        <ChatModal property={chatProperty} onClose={() => setChatProperty(null)} />
      )}
      
      {/* 3D Tour Modal */}
      {viewing3DTour && previewProperty && previewProperty.virtualTourUrl && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
              <div className="bg-black text-white p-4 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2"><Box size={20} className="text-primary"/> 3D Virtual Tour</h3>
                  <button onClick={() => setViewing3DTour(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"><X size={20} /></button>
              </div>
              <div className="flex-1 w-full h-full bg-gray-900">
                  <iframe 
                    src={previewProperty.virtualTourUrl} 
                    className="w-full h-full border-0" 
                    allowFullScreen
                    allow="xr-spatial-tracking"
                  ></iframe>
              </div>
          </div>
      )}

      {/* Floor Plan Modal */}
      {viewingFloorPlan && previewProperty && previewProperty.floorPlanImages && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <button onClick={() => setViewingFloorPlan(false)} className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 z-10"><X size={24} /></button>
              <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg p-2">
                  {previewProperty.floorPlanImages.map((img, i) => (
                      <img key={i} src={img} alt="Floor Plan" className="w-full h-auto mb-4 last:mb-0" />
                  ))}
              </div>
          </div>
      )}

      {isListingWizardOpen && (
        <div className="fixed inset-0 z-[60] bg-surface overflow-y-auto animate-in slide-in-from-bottom duration-300">
             <AddListingWizard 
                onCancel={() => setIsListingWizardOpen(false)} 
                onComplete={handleListingComplete}
                initialInput={wizardInitialText}
             />
        </div>
      )}

      {isVerificationModalOpen && (
          <VerificationModal 
            user={currentUser} 
            onClose={() => setIsVerificationModalOpen(false)} 
            onSuccess={handleVerificationSuccess} 
          />
      )}

      {isAcademyOpen && (
          <AcademyView user={currentUser} onBack={() => setIsAcademyOpen(false)} />
      )}
      
       {/* Details View Specific Modals */}
       {isLegalModalOpen && selectedProperty && (
            <LegalGenerator property={selectedProperty} user={currentUser} onClose={() => setIsLegalModalOpen(false)} />
       )}
       {isWalkthroughModalOpen && selectedProperty && (
            <LiveWalkthroughModal property={selectedProperty} user={currentUser} onClose={() => setIsWalkthroughModalOpen(false)} />
       )}
       {isPaymentModalOpen && selectedProperty && (
            <RentPaymentModal property={selectedProperty} onClose={() => setIsPaymentModalOpen(false)} />
       )}
       {chatProperty && selectedProperty && (
            <ChatModal property={chatProperty} onClose={() => setChatProperty(null)} />
       )}
    </div>
  );
};

export default App;
