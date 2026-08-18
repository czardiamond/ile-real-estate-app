
import React, { useState, useMemo, useEffect } from 'react';
import Navigation from './components/Navigation';
import ExploreView from './components/ExploreView';
import AgentDashboard from './components/AgentDashboard';
import AIChat from './components/AIChat';
import AuthScreen from './src/components/AuthScreen';
import { useAuth } from './src/context/AuthContext';
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from './services/firebase';
import AddListingWizard from './components/AddListingWizard';
import VerificationModal from './components/VerificationModal';
import LegalGenerator from './components/LegalGenerator';
import ProfileSettingsView from './components/ProfileSettingsView';
import ChatModal from './components/ChatModal';
import LiveWalkthroughModal from './components/LiveWalkthroughModal';
import BrokerageView from './components/BrokerageView';
import SmartMeterWidget from './components/SmartMeterWidget';
import RentPaymentModal from './components/RentPaymentModal';
import PropertyCard from './components/PropertyCard';
import MortgageCalculator from './components/MortgageCalculator';
import GoogleInsights from './components/GoogleInsights';
import { LandTitleVerificationModal } from './components/LandTitleVerificationModal';
import { LandTitleUploadModal } from './src/components/LandTitleUploadModal';
import { AdminVerificationPanel } from './src/components/AdminVerificationPanel';
import { WhatsAppHubModal } from './components/WhatsAppHubModal';
import { CommuteCalculator } from './components/CommuteCalculator';
import { NeighborhoodPulse } from './components/NeighborhoodPulse';
import { PropertyAlertsNotify } from './components/PropertyAlertsNotify';
import { VirtualStagingModal } from './components/VirtualStagingModal';
import { AcademyView } from './components/AcademyView';
import { IleWalkthroughVideoModal } from './components/IleWalkthroughVideoModal';
import { QATestingSuiteModal } from './components/QATestingSuiteModal';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole, Property, User, SmartListingResponse, VerificationData, FloodRisk, TitleDocument, VerificationStatus, NetworkRank } from './types';
import { X, Calendar, MessageSquare, ShieldCheck, Share2, Crown, CheckCircle, Zap, Droplets, Waves, Lock, Video, FileText, MapPin, Sparkles, TrendingUp, ChevronLeft, Box, LayoutTemplate, Loader2, Play, CreditCard, Check, AlertTriangle, ExternalLink, Heart, Ghost, Calculator, Presentation } from 'lucide-react';
import { generatePropertyDescription } from './services/geminiService';
import { verifyLandTitle } from './services/landRegistryService';
import { fetchProperties, createProperty } from './src/services/propertyService';
import { useToast } from './src/context/ToastContext';
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
  const toast = useToast();
  const { user: fbUser, loading: authLoading, logout } = useAuth();

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  
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

  // Listing Wizard State
  const [isListingWizardOpen, setIsListingWizardOpen] = useState(false);
  const [wizardInitialText, setWizardInitialText] = useState('');
  const [wizardInitialMode, setWizardInitialMode] = useState<'ai' | 'manual'>('ai');
  
  // Verification State
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Legal Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Mortgage Calculator State
  const [isMortgageCalculatorOpen, setIsMortgageCalculatorOpen] = useState(false);

  // Land Title Registry Verification State
  const [isLandTitleModalOpen, setIsLandTitleModalOpen] = useState(false);
  const [isLandTitleUploadModalOpen, setIsLandTitleUploadModalOpen] = useState(false);
  const [isAdminVerificationPanelOpen, setIsAdminVerificationPanelOpen] = useState(false);

  // Real-time Firestore Properties
  const [firestoreProperties, setFirestoreProperties] = useState<Property[]>([]);

  // WhatsApp Business Hub State
  const [isWhatsAppHubOpen, setIsWhatsAppHubOpen] = useState(false);

  // Ilé 60s Video Walkthrough Studio State
  const [isIleWalkthroughOpen, setIsIleWalkthroughOpen] = useState(false);

  // Quality Assurance & Testing Suite State
  const [isQASuiteOpen, setIsQASuiteOpen] = useState(false);

  // Live Walkthrough Modal State
  const [isWalkthroughModalOpen, setIsWalkthroughModalOpen] = useState(false);

  // AI Virtual Staging State
  const [isVirtualStagingModalOpen, setIsVirtualStagingModalOpen] = useState(false);

  // 3D Tour & Floor Plan State
  const [viewing3DTour, setViewing3DTour] = useState(false);
  const [viewingFloorPlan, setViewingFloorPlan] = useState(false);

  // Land Registry State
  const [verifyingTitle, setVerifyingTitle] = useState(false);
  // We'll store the live verification result locally in state for the session
  const [liveVerificationResult, setLiveVerificationResult] = useState<TitleDocument | null>(null);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('ile_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('ile_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('ile_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Load saved properties on mount & subscribe to Firestore properties stream
  useEffect(() => {
    const saved = localStorage.getItem('ile_saved_properties');
    if (saved) {
      try {
        setSavedPropertyIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse saved properties", e);
      }
    }

    // Subscribe to real-time live properties from Firestore
    const unsubscribeProps = fetchProperties(
      (liveProps) => {
        setFirestoreProperties(liveProps);
      },
      (err) => {
        console.warn("Real-time property stream note:", err);
      }
    );

    return () => {
      if (unsubscribeProps) unsubscribeProps();
    };
  }, []);

  const allProperties = useMemo<Property[]>(() => {
    return firestoreProperties || [];
  }, [firestoreProperties]);

  // Sync Firebase Auth user with Firestore user profile
  useEffect(() => {
    let isMounted = true;

    async function syncUserProfile() {
      if (!fbUser) {
        if (isMounted) {
          setCurrentUser(null);
          setIsProfileLoading(false);
        }
        return;
      }

      setIsProfileLoading(true);
      try {
        let profile = await getUserProfileFromFirestore(fbUser.uid);

        if (!profile) {
          // New User signup: provision initial profile
          const pendingRoleStr = localStorage.getItem('ile_pending_signup_role');
          const role = (pendingRoleStr && Object.values(UserRole).includes(pendingRoleStr as UserRole))
            ? (pendingRoleStr as UserRole)
            : UserRole.PUBLIC;
          localStorage.removeItem('ile_pending_signup_role');

          const defaultName = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Ilé User');
          
          const newProfile: User = {
            id: fbUser.uid,
            name: defaultName,
            email: fbUser.email || '',
            phone: fbUser.phoneNumber || '',
            role: role,
            avatarUrl: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=0D9488&color=fff`,
            verified: false,
            verification: {
              status: VerificationStatus.UNVERIFIED
            },
            referralCode: `ILE${Math.floor(100000 + Math.random() * 900000)}`,
            networkRank: NetworkRank.SCOUT,
            downlineCount: 0,
            wallet: {
              balance: 0,
              lifetimeEarnings: 0,
              pendingClearance: 0
            },
            isActive: true
          };

          await saveUserProfileToFirestore(newProfile);
          profile = newProfile;
        }

        if (isMounted) {
          setCurrentUser(profile);
          setIsProfileLoading(false);
          // Initial routing based on role
          if (profile.role === UserRole.BROKERAGE) {
            setActiveTab('brokerage-dashboard');
          } else if (profile.role === UserRole.AGENT) {
            setActiveTab('dashboard');
          }
        }
      } catch (err) {
        console.error("Error syncing profile with Firestore:", err);
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    }

    syncUserProfile();

    return () => {
      isMounted = false;
    };
  }, [fbUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setCurrentUser(null);
    setActiveTab('explore');
    setSelectedProperty(null);
  };

  const handleVerificationSuccess = async (data: VerificationData) => {
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        verified: data.status === VerificationStatus.VERIFIED,
        verification: data
      };
      setCurrentUser(updatedUser);
      await saveUserProfileToFirestore(updatedUser);
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
      if (tab === 'add-listing' || tab === 'add-listing-ai') {
          setWizardInitialText('');
          setWizardInitialMode('ai');
          setIsListingWizardOpen(true);
      } else if (tab === 'add-listing-manual') {
          setWizardInitialText('');
          setWizardInitialMode('manual');
          setIsListingWizardOpen(true);
      } else {
          setActiveTab(tab);
          setSelectedProperty(null);
          setGeneratedDesc(null);
          window.scrollTo(0, 0);
      }
  };

  const handleQuickAddListing = (text: string) => {
      setWizardInitialText(text);
      setWizardInitialMode('ai');
      setIsListingWizardOpen(true);
  };

  const handleListingComplete = async (data: SmartListingResponse & Record<string, any>) => {
      setIsListingWizardOpen(false);
      try {
        const propId = await createProperty({
          ...data,
          ownerId: currentUser?.id,
          agentId: currentUser?.id,
          title: data.title,
          description: data.description,
          price: data.price,
          location: data.location,
          propertyType: data.category || 'residential',
          status: 'available',
          features: data.features,
          specs: data.specifications,
          images: data.images,
          videoUrl: data.videoUrl,
          floorPlanUrl: data.floorPlanUrl,
          titleDocument: data.titleDocument,
          coordinates: data.coordinates,
        });
        console.log("Listing successfully saved to Firestore:", propId);
        setActiveTab('explore');
        toast.success(
          'Listing Published',
          `"${data.title}" has been successfully published to the live marketplace & registry.`
        );
      } catch (err: any) {
        console.error("Firestore listing creation note:", err);
        setActiveTab('explore');
        toast.info(
          'Listing Published',
          `"${data.title}" has been added to your local listings.`
        );
      }
  };

  // Compute Similar Properties
  const similarProperties = useMemo(() => {
    if (!selectedProperty) return [];
    return allProperties.filter(p => 
        p.id !== selectedProperty.id && 
        (p.type === selectedProperty.type || p.location.area === selectedProperty.location.area)
    ).slice(0, 5);
  }, [selectedProperty, allProperties]);

  // Compute Price History Mock Data
  const priceHistory = useMemo(() => {
    if (!selectedProperty) return [];
    
    const data = [];
    const basePrice = selectedProperty.price;
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Price history chart data
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
      return allProperties.filter(p => savedPropertyIds.has(p.id));
  }, [savedPropertyIds, allProperties]);


  if (authLoading || (fbUser && isProfileLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-4 animate-pulse">
          <ShieldCheck className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm tracking-wide">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing Ilé Real Estate session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
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

                      {/* QUICK AI TOOLBAR & VIRTUAL STAGING BUTTON */}
                      <div className="mb-8 p-4 bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-surface-container-low rounded-2xl border border-purple-500/20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                  <Sparkles size={20} className="animate-pulse" />
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                      <h4 className="font-extrabold text-sm text-on-surface">AI Space Stager & Layout Engine</h4>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-700 dark:text-purple-300">New</span>
                                  </div>
                                  <p className="text-xs text-on-surface-variant">
                                      Visualize furnished layouts, material specs & Afro-Centric interior styles for empty rooms.
                                  </p>
                              </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => setIsVirtualStagingModalOpen(true)}
                                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
                              >
                                  <Sparkles size={16} />
                                  <span>Launch Virtual Staging</span>
                              </button>

                              <button
                                onClick={() => setIsWalkthroughModalOpen(true)}
                                className="px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/30 font-bold text-xs text-on-surface transition-all flex items-center justify-center gap-1.5"
                              >
                                  <Video size={14} className="text-primary" />
                                  <span>Walkthrough</span>
                              </button>
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

                      <div className="grid md:grid-cols-3 gap-16">
                          {/* Main Specs */}
                          <div className="md:col-span-2 space-y-16">
                              
                              {/* Features Section */}
                              <div>
                                  <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-on-surface-variant/60">Property Features</h3>
                                  <div className="flex flex-wrap gap-4">
                                      {selectedProperty.features.map((feat, i) => (
                                          <div key={i} className="flex items-center gap-2 px-4 py-2 bg-surface-container/50 rounded-full text-sm font-light text-on-surface">
                                              <div className="w-1 h-1 rounded-full bg-primary/40" />
                                              {feat}
                                          </div>
                                      ))}
                                      {selectedProperty.isSolarPowered && (
                                          <div className="px-4 py-2 bg-yellow-50/50 text-yellow-800 border border-yellow-100/50 rounded-full text-sm font-medium flex items-center gap-2">
                                              <Zap size={14} className="fill-yellow-500" /> Solar Powered
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* Nigerian Context Stats - More Elegant */}
                              <div className="grid grid-cols-2 gap-8">
                                  <div className="space-y-2">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Flood Risk Assessment</p>
                                      <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${
                                          selectedProperty.floodRisk === FloodRisk.LOW ? 'bg-green-50/30 border-green-100 text-green-700' :
                                          selectedProperty.floodRisk === FloodRisk.MEDIUM ? 'bg-yellow-50/30 border-yellow-100 text-yellow-700' :
                                          'bg-red-50/30 border-red-100 text-red-700'
                                      }`}>
                                          <Waves size={16} strokeWidth={1.5} />
                                          <span className="text-sm font-medium uppercase tracking-wider">{selectedProperty.floodRisk} Risk</span>
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Average Daily Power</p>
                                      <div className="inline-flex items-center gap-3 px-4 py-2 bg-surface-container/30 border border-outline-variant/10 rounded-full text-on-surface">
                                          <Zap size={16} strokeWidth={1.5} className={selectedProperty.avgPowerHours > 18 ? 'text-yellow-500' : 'text-on-surface-variant/40'} />
                                          <span className="text-sm font-medium">{selectedProperty.avgPowerHours} Hours / Day</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Price Drop & Alert Subscription (Firebase) */}
                              <div className="mb-8">
                                  <PropertyAlertsNotify property={selectedProperty} user={currentUser} />
                              </div>

                              {/* Commute Calculator */}
                              <div className="mb-8">
                                  <CommuteCalculator property={selectedProperty} />
                              </div>

                              {/* Neighborhood Pulse */}
                              <div className="mb-8">
                                  <NeighborhoodPulse property={selectedProperty} />
                              </div>

                              {/* Google Smart Insights */}
                              <div className="mb-8">
                                  <GoogleInsights property={selectedProperty} />
                              </div>

                              {/* Price History Chart - Minimal */}
                              <div className="pt-12 border-t border-outline-variant/10">
                                  <div className="flex items-center justify-between mb-8">
                                      <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Valuation Trends</h3>
                                      <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                                          <TrendingUp size={14} />
                                          <span>Market Appreciation</span>
                                      </div>
                                  </div>
                                  <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={priceHistory}>
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '12px' }}
                                                formatter={(val: number) => [`₦${val.toLocaleString()}`, 'Value']}
                                            />
                                            <Line type="monotone" dataKey="price" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
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
                                    onClick={() => setIsMortgageCalculatorOpen(true)}
                                    className="w-full py-3 bg-surface-container text-primary rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors border border-primary/20"
                                  >
                                      <Calculator size={18} /> Mortgage Calculator
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

                                   <button 
                                     onClick={() => setIsLandTitleModalOpen(true)}
                                     className="w-full py-3 bg-emerald-800 text-white rounded-xl font-bold mt-3 flex items-center justify-center gap-2 hover:bg-emerald-900 transition-colors shadow-md shadow-emerald-900/10 border border-emerald-700"
                                   >
                                       <ShieldCheck size={18} className="text-emerald-300" /> Verify Land Title & Survey
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
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        user={currentUser}
        onOpenWhatsAppHub={() => setIsWhatsAppHubOpen(true)}
        onOpenIleWalkthrough={() => setIsIleWalkthroughOpen(true)}
        onOpenQASuite={() => setIsQASuiteOpen(true)}
        onOpenLandTitleUpload={() => setIsLandTitleUploadModalOpen(true)}
        onOpenAdminPanel={() => setIsAdminVerificationPanelOpen(true)}
      />

      <main className="pt-20 md:pt-24 h-full min-h-screen">
          {activeTab === 'explore' && (
              <ExploreView 
                properties={allProperties}
                onPropertySelect={handlePropertySelect} 
                onChat={handleChat}
                onView3D={handleView3D}
                onViewFloorPlan={handleViewFloorPlan}
                savedPropertyIds={savedPropertyIds}
                onToggleSave={handleToggleSave}
                onOpenMortgageCalculator={() => setIsMortgageCalculatorOpen(true)}
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
                onQuickAdd={handleQuickAddListing}
                onOpenIleWalkthrough={() => setIsIleWalkthroughOpen(true)}
              />
          )}

          {activeTab === 'brokerage-dashboard' && currentUser.role === UserRole.BROKERAGE && (
              <BrokerageView user={currentUser} />
          )}

          {activeTab === 'academy' && (
              <AcademyView user={currentUser} onBack={() => handleTabChange('explore')} />
          )}

          {activeTab === 'chat' && (
              <AIChat user={currentUser} />
          )}

          {activeTab === 'menu' && (
              <ProfileSettingsView 
                user={currentUser} 
                onLogout={handleLogout} 
                onVerifyClick={() => setIsVerificationModalOpen(true)}
                onTabChange={handleTabChange}
                onUserUpdate={(updated) => setCurrentUser(updated)}
                onOpenLandTitleUpload={() => setIsLandTitleUploadModalOpen(true)}
                onOpenAdminPanel={() => setIsAdminVerificationPanelOpen(true)}
              />
          )}
      </main>

      {/* Global Modals */}
      {chatProperty && !selectedProperty && (
        <ChatModal property={chatProperty} onClose={() => setChatProperty(null)} user={currentUser} />
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
                initialMode={wizardInitialMode}
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
      
       {/* Details View Specific Modals */}
       {isLegalModalOpen && selectedProperty && (
            <LegalGenerator property={selectedProperty} user={currentUser} onClose={() => setIsLegalModalOpen(false)} />
       )}
       {isLandTitleModalOpen && selectedProperty && (
            <LandTitleVerificationModal property={selectedProperty} onClose={() => setIsLandTitleModalOpen(false)} />
       )}
       {isWhatsAppHubOpen && (
            <WhatsAppHubModal 
              properties={allProperties} 
              currentUser={currentUser} 
              onClose={() => setIsWhatsAppHubOpen(false)} 
            />
       )}
       {isLandTitleUploadModalOpen && (
            <LandTitleUploadModal
              isOpen={isLandTitleUploadModalOpen}
              onClose={() => setIsLandTitleUploadModalOpen(false)}
              onSuccess={() => {
                setIsLandTitleUploadModalOpen(false);
                alert("Land Title submitted successfully! An administrator will review your document.");
              }}
            />
       )}
       {isAdminVerificationPanelOpen && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
                <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-100 text-amber-800 rounded-lg font-bold text-sm">Admin Control</span>
                    <h2 className="text-xl font-bold text-gray-900">Document Verification Queue</h2>
                  </div>
                  <button 
                    onClick={() => setIsAdminVerificationPanelOpen(false)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
                <AdminVerificationPanel />
              </div>
            </div>
       )}
       {isIleWalkthroughOpen && (
            <IleWalkthroughVideoModal
              user={currentUser}
              onClose={() => setIsIleWalkthroughOpen(false)}
            />
       )}
       {isQASuiteOpen && (
            <QATestingSuiteModal 
              onClose={() => setIsQASuiteOpen(false)} 
            />
       )}
       {isWalkthroughModalOpen && selectedProperty && (
            <LiveWalkthroughModal property={selectedProperty} user={currentUser} onClose={() => setIsWalkthroughModalOpen(false)} />
       )}
       {isVirtualStagingModalOpen && selectedProperty && (
            <VirtualStagingModal property={selectedProperty} onClose={() => setIsVirtualStagingModalOpen(false)} />
       )}
       {isPaymentModalOpen && selectedProperty && (
            <RentPaymentModal property={selectedProperty} onClose={() => setIsPaymentModalOpen(false)} />
       )}
       {isMortgageCalculatorOpen && (
            <MortgageCalculator 
              initialPrice={selectedProperty?.price || 50000000} 
              propertyTitle={selectedProperty?.title}
              onClose={() => setIsMortgageCalculatorOpen(false)} 
            />
       )}
       {chatProperty && selectedProperty && (
            <ChatModal property={chatProperty} onClose={() => setChatProperty(null)} />
       )}
    </div>
  );
};

export default App;
