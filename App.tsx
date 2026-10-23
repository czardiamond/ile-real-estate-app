
import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import Navigation from './components/Navigation';
import AuthScreen from './src/components/AuthScreen';
import { useAuth } from './src/context/AuthContext';
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from './services/firebase';
import { NeighborhoodPulse } from './components/NeighborhoodPulse';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole, Property, User, SmartListingResponse, FloodRisk, NetworkRank, VerificationStatus } from './types';
import { X, Calendar, MessageSquare, ShieldCheck, Share2, Crown, CheckCircle, Zap, Droplets, Waves, Lock, Video, FileText, MapPin, Sparkles, TrendingUp, ChevronLeft, Box, LayoutTemplate, Loader2, Play, CreditCard, Check, AlertTriangle, ExternalLink, Heart, Ghost, Calculator, Presentation } from 'lucide-react';
import { generatePropertyDescription } from './services/geminiService';
import { fetchProperties, createProperty, updatePropertyDescription } from './src/services/propertyService';
import { storage } from './src/lib/firebase';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useToast } from './src/context/ToastContext';
import { AboutView, GuideView } from './components/InfoPages';
import SiteFooter from './components/SiteFooter';
import { ListingSaveUnconfirmedError, publishListingWithMedia, RegisterCleanup } from './services/listingPublish';
import { sanitizePropertyPhoto } from './services/photoSanitizer';

const ExploreView = lazy(() => import('./components/ExploreView'));
const AgentDashboard = lazy(() => import('./components/AgentDashboard'));
const AIChat = lazy(() => import('./components/AIChat'));
const AddListingWizard = lazy(() => import('./components/AddListingWizard'));
const VerificationModal = lazy(() => import('./components/VerificationModal'));
const LegalGenerator = lazy(() => import('./components/LegalGenerator'));
const ProfileSettingsView = lazy(() => import('./components/ProfileSettingsView'));
const ChatModal = lazy(() => import('./components/ChatModal'));
const BrokerageView = lazy(() => import('./components/BrokerageView'));
const PropertyCard = lazy(() => import('./components/PropertyCard'));
const GoogleInsights = lazy(() => import('./components/GoogleInsights'));
const MortgageCalculator = lazy(() => import('./components/MortgageCalculator'));
const LandTitleUploadModal = lazy(() => import('./src/components/LandTitleUploadModal').then(module => ({ default: module.LandTitleUploadModal })));
const AdminVerificationPanel = lazy(() => import('./src/components/AdminVerificationPanel').then(module => ({ default: module.AdminVerificationPanel })));
const PropertyDetailMap = lazy(() => import('./components/PropertyDetailMap'));

const App: React.FC = () => {
  const toast = useToast();
  const { user: fbUser, loading: authLoading, logout } = useAuth();

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [isGuestAuthScreenOpen, setIsGuestAuthScreenOpen] = useState(false);
  
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
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');

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

  // Mortgage Calculator State
  const [isMortgageCalculatorOpen, setIsMortgageCalculatorOpen] = useState(false);

  const [isLandTitleUploadModalOpen, setIsLandTitleUploadModalOpen] = useState(false);
  const [isAdminVerificationPanelOpen, setIsAdminVerificationPanelOpen] = useState(false);

  // Real-time Firestore Properties
  const [firestoreProperties, setFirestoreProperties] = useState<Property[]>([]);

  // 3D Tour & Floor Plan State
  const [viewing3DTour, setViewing3DTour] = useState(false);
  const [viewingFloorPlan, setViewingFloorPlan] = useState(false);

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
        const tokenResult = await fbUser.getIdTokenResult();
        const hasAdminClaim = tokenResult.claims.admin === true;
        let profile = await getUserProfileFromFirestore(fbUser.uid);

        if (!profile) {
          // New User signup: provision initial profile
          const pendingRoleStr = localStorage.getItem('ile_pending_signup_role');
          const selfSelectableRoles = [UserRole.PUBLIC, UserRole.AGENT, UserRole.BROKERAGE];
          const role = (pendingRoleStr && selfSelectableRoles.includes(pendingRoleStr as UserRole))
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
            avatarUrl: fbUser.photoURL || '',
            verified: false,
            verification: {
              status: VerificationStatus.UNVERIFIED
            },
            referralCode: '',
            networkRank: NetworkRank.SCOUT,
            downlineCount: 0,
            wallet: {
              balance: 0,
              lifetimeEarnings: 0,
              pendingClearance: 0
            },
            isActive: true
          };

          const saved = await saveUserProfileToFirestore(newProfile);
          if (!saved) throw new Error('Your account was created, but its Ilé profile could not be saved. Please sign in again after checking your connection.');
          profile = newProfile;
        }

        if (isMounted) {
          const safeProfile = {
            ...profile,
            role: hasAdminClaim ? UserRole.ADMIN : (profile.role === UserRole.ADMIN ? UserRole.PUBLIC : profile.role),
          };
          setCurrentUser(safeProfile);
          setIsProfileLoading(false);
          // Initial routing based on role
          if (safeProfile.role === UserRole.BROKERAGE) {
            setActiveTab('brokerage-dashboard');
          } else if (safeProfile.role === UserRole.AGENT) {
            setActiveTab('dashboard');
          }
        }
      } catch (err) {
        console.error("Error syncing profile with Firestore:", err);
        if (isMounted) {
          setCurrentUser(null);
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
      if (!currentUser) {
          setIsGuestAuthScreenOpen(true);
          return;
      }
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
      setGeneratedDesc(null);
      setDescriptionError('');
      setShowVideo(false);
  }

  const handleAIGenerateDesc = async (prop: Property) => {
      setIsGeneratingDesc(true);
      setDescriptionError('');
      try {
          const desc = await generatePropertyDescription(prop);
          if (!desc.trim() || desc.startsWith('Could not generate') || desc.startsWith('Error generating')) {
              throw new Error('The AI service could not generate a description. Try again after server AI is configured.');
          }
          setGeneratedDesc(desc.trim());
      } catch (error: any) {
          setDescriptionError(error?.message || 'Could not generate a description. Please try again.');
      } finally {
          setIsGeneratingDesc(false);
      }
  };

  const handleSaveGeneratedDescription = async () => {
      if (!selectedProperty || !generatedDesc) return;
      setIsSavingDesc(true);
      setDescriptionError('');
      try {
          const description = await updatePropertyDescription(selectedProperty.id, generatedDesc);
          const updatedProperty = { ...selectedProperty, description, updatedAt: new Date().toISOString() };
          setSelectedProperty(updatedProperty);
          setFirestoreProperties(current => current.map(property => property.id === updatedProperty.id ? updatedProperty : property));
          setGeneratedDesc(null);
          toast.success('Description saved', 'The listing description has been updated in the marketplace.');
      } catch (error: any) {
          setDescriptionError(error?.message || 'The description could not be saved. Please try again.');
          toast.error('Description not saved', error?.message || 'Check your connection and try again.');
      } finally {
          setIsSavingDesc(false);
      }
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

  const handleListingComplete = async (data: SmartListingResponse & { mediaFiles: { images: File[]; video?: File; floorPlan?: File } }) => {
      if (!currentUser || !fbUser) {
        toast.error('Sign in required', 'Sign in before publishing a listing.');
        throw new Error('Sign in before publishing a listing. Your form has not been cleared.');
      }
      const deleteR2Photo = async (key: string): Promise<void> => {
        const token = await fbUser.getIdToken();
        const response = await fetch('/api/listing-photos', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        if (!response.ok) throw new Error('Could not clean up an uploaded R2 photo.');
      };
      try {
        const uploadPhoto = async (file: File, registerCleanup: RegisterCleanup): Promise<string> => {
          const sanitizedFile = await sanitizePropertyPhoto(file);
          const token = await fbUser.getIdToken();
          const data = await sanitizedFile.arrayBuffer();
          let base64 = '';
          try {
            const bytes = new Uint8Array(data);
            let binary = '';
            const chunkSize = 0x8000;
            for (let offset = 0; offset < bytes.length; offset += chunkSize) {
              binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
            }
            base64 = btoa(binary);
          } catch {
            throw new Error('The processed photo could not be prepared for secure upload.');
          }
          const response = await fetch('/api/listing-photos', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: base64 }),
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(typeof result?.error === 'string' ? result.error : 'Cloudflare R2 could not store this photo.');
          }
          if (typeof result?.publicUrl !== 'string' || typeof result?.key !== 'string' || typeof result?.uploadUrl === 'string') {
            throw new Error('Cloudflare R2 returned an invalid photo-upload response.');
          }
          registerCleanup(() => deleteR2Photo(result.key));
          return result.publicUrl;
        };

        const uploadFirebaseAsset = async (file: File, kind: string, registerCleanup: RegisterCleanup): Promise<string> => {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const fileRef = storageRef(storage, `listing-assets/${currentUser.id}/${kind}/${fileId}-${safeName}`);
          registerCleanup(() => deleteObject(fileRef));
          const snapshot = await uploadBytes(fileRef, file, { contentType: file.type });
          return getDownloadURL(snapshot.ref);
        };

        // Property photos always use R2. There is intentionally no Firebase Storage fallback.
        const { mediaFiles: _mediaFiles, confidence_score: _confidenceScore, suggestedDocType: _suggestedDocType, ...listingData } = data;
        const listingType = listingData.type || 'Other';

        await publishListingWithMedia(data.mediaFiles, {
          uploadPhoto,
          uploadAsset: (file, kind, registerCleanup) => kind === 'floor-plans'
            ? uploadPhoto(file, registerCleanup)
            : uploadFirebaseAsset(file, kind, registerCleanup),
          save: ({ images, videoUrl, floorPlanUrl }) => createProperty({
          ...listingData,
          ownerId: currentUser.id,
          agentId: currentUser.id,
          title: listingData.title,
          description: listingData.description,
          price: listingData.price,
          location: listingData.location,
          type: listingType,
          period: listingData.period,
          status: 'Available',
          features: listingData.features || [],
          specs: listingData.specifications,
          images,
          videoUrl,
          floorPlanUrl,
          coordinates: listingData.coordinates,
          }),
        });
      } catch (err: any) {
        console.error('Listing publish failed:', err);
        const failureMessage = err?.message || 'The upload or save failed. Check Cloudflare R2 photo configuration and Firestore access, then try again.';
        toast.error(err instanceof ListingSaveUnconfirmedError ? 'Publication not confirmed' : 'Listing not published', failureMessage);
        throw err;
      }
      // UI feedback must not trigger media rollback after Firestore has committed.
      setIsListingWizardOpen(false);
      setActiveTab('explore');
      toast.success('Listing published', `“${data.title}” is now available in the marketplace.`);
  };

  // Compute Similar Properties
  const similarProperties = useMemo(() => {
    if (!selectedProperty) return [];
    return allProperties.filter(p => 
        p.id !== selectedProperty.id && 
        (p.type === selectedProperty.type || p.location.area === selectedProperty.location.area)
    ).slice(0, 5);
  }, [selectedProperty, allProperties]);

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
    if (isGuestAuthScreenOpen) {
      return (
        <AuthScreen
          onSuccess={() => setIsGuestAuthScreenOpen(false)}
          onClose={() => setIsGuestAuthScreenOpen(false)}
        />
      );
    }

    if (activeTab === 'guide' || activeTab === 'about') {
      const onBack = () => handleTabChange('explore');
      return (
        <div className="min-h-screen bg-surface">
          <header className="flex min-h-[68px] items-center justify-between border-b border-outline-variant bg-surface px-4 md:px-8">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-3 rounded-lg text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Back to Ilé listings">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#213b31] text-white"><span className="font-display text-xl font-semibold">I</span></span>
              <span className="font-display text-2xl font-semibold">Ilé</span>
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsGuestAuthScreenOpen(true)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container">Sign in</button>
              <button type="button" onClick={() => setIsGuestAuthScreenOpen(true)} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">Create account</button>
            </div>
          </header>
          {activeTab === 'guide'
            ? <GuideView onBack={onBack} onExplore={onBack} />
            : <AboutView onBack={onBack} onExplore={onBack} />}
          <SiteFooter onNavigate={handleTabChange} />
        </div>
      );
    }

    if (selectedProperty) {
      return (
        <div className="min-h-screen bg-surface pb-12">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-outline-variant/20 bg-surface/95 px-4 py-3 backdrop-blur md:px-8">
            <button type="button" onClick={() => setSelectedProperty(null)} className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface">
              <ChevronLeft size={20} /> Back to listings
            </button>
            <button type="button" onClick={() => setIsGuestAuthScreenOpen(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
              Sign in
            </button>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="relative h-[35vh] min-h-64 bg-surface-container">
                <img src={selectedProperty.images[0]} alt={selectedProperty.title} className="h-full w-full object-cover" />
                {selectedProperty.isVerified && <span className="absolute bottom-4 left-4 rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white">Ilé document review recorded</span>}
              </div>
              <div className="p-5 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">{selectedProperty.type}</p>
                    <h1 className="mt-2 text-2xl font-bold text-on-surface md:text-3xl">{selectedProperty.title}</h1>
                    <p className="mt-2 flex items-center gap-2 text-on-surface-variant"><MapPin size={16} />{[selectedProperty.location.area, selectedProperty.location.city, selectedProperty.location.state].filter(Boolean).join(', ')}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">₦{selectedProperty.price.toLocaleString()}<span className="ml-1 text-sm font-medium text-on-surface-variant">{selectedProperty.period === 'total' ? '' : selectedProperty.period || ''}</span></p>
                </div>
                <p className="mt-6 whitespace-pre-line leading-7 text-on-surface-variant">{selectedProperty.description || 'No description has been provided for this listing.'}</p>
                {selectedProperty.features.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{selectedProperty.features.map(feature => <span key={feature} className="rounded-full bg-surface-container px-3 py-2 text-sm text-on-surface">{feature}</span>)}</div>}
                {selectedProperty.isVerified && <p className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">Ilé recorded an internal document review. This is not a government registry search, ownership confirmation, identity check, or legal opinion.</p>}
                <div className="mt-8 rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">Public listings show neighbourhood-level location only. Verify all documents and property details independently before paying.</div>
                <button type="button" onClick={() => setIsGuestAuthScreenOpen(true)} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-bold text-white md:w-auto">Sign in to send an enquiry</button>
              </div>
            </div>
          </main>
          <SiteFooter onNavigate={handleTabChange} />
          {viewing3DTour && previewProperty?.virtualTourUrl && (
            <div className="fixed inset-0 z-[100] flex flex-col bg-black">
              <div className="flex items-center justify-between p-4 text-white"><h2 className="font-bold">3D Virtual Tour</h2><button onClick={() => setViewing3DTour(false)} aria-label="Close virtual tour"><X size={22} /></button></div>
              <iframe src={previewProperty.virtualTourUrl} title="Property virtual tour" className="h-full w-full border-0" allowFullScreen allow="xr-spatial-tracking" />
            </div>
          )}
          {viewingFloorPlan && previewProperty && ((previewProperty.floorPlanImages?.length || 0) > 0 || previewProperty.floorPlanUrl) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-black/90 p-4">
              <button onClick={() => setViewingFloorPlan(false)} aria-label="Close floor plan" className="absolute right-4 top-4 text-white"><X size={24} /></button>
              <div className="max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white p-2">{(previewProperty.floorPlanImages?.length ? previewProperty.floorPlanImages : previewProperty.floorPlanUrl ? [previewProperty.floorPlanUrl] : []).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Floor plan ${index + 1}`} className="mb-4 h-auto w-full last:mb-0" />)}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-surface">
        <header className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-outline-variant bg-surface px-4 md:px-8">
          <a href="/" className="font-display text-2xl font-semibold tracking-tight text-on-surface">Ilé</a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setIsGuestAuthScreenOpen(true); }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-on-surface-variant">Sign in</button>
            <button type="button" onClick={() => { setIsGuestAuthScreenOpen(true); }} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white">Create account</button>
          </div>
        </header>
        <main className="pt-[68px]">
          <Suspense fallback={<div role="status" className="min-h-[40vh] flex items-center justify-center text-sm text-on-surface-variant">Loading marketplace…</div>}>
            <ExploreView
              properties={allProperties}
              onPropertySelect={handlePropertySelect}
              onChat={handleChat}
              onView3D={handleView3D}
              onViewFloorPlan={handleViewFloorPlan}
              savedPropertyIds={savedPropertyIds}
              onToggleSave={handleToggleSave}
            />
          </Suspense>
          <div className="mx-auto max-w-7xl px-4 pb-7 pt-2 text-center text-sm text-on-surface-variant">Browse public Ilé listings without an account. Sign in to contact owners or manage listings.</div>
        </main>
        <SiteFooter onNavigate={handleTabChange} />
        {viewing3DTour && previewProperty?.virtualTourUrl && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            <div className="flex items-center justify-between p-4 text-white"><h2 className="font-bold">3D Virtual Tour</h2><button onClick={() => setViewing3DTour(false)} aria-label="Close virtual tour"><X size={22} /></button></div>
            <iframe src={previewProperty.virtualTourUrl} title="Property virtual tour" className="h-full w-full border-0" allowFullScreen allow="xr-spatial-tracking" />
          </div>
        )}
        {viewingFloorPlan && previewProperty && ((previewProperty.floorPlanImages?.length || 0) > 0 || previewProperty.floorPlanUrl) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-black/90 p-4">
            <button onClick={() => setViewingFloorPlan(false)} aria-label="Close floor plan" className="absolute right-4 top-4 text-white"><X size={24} /></button>
            <div className="max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-white p-2">{(previewProperty.floorPlanImages?.length ? previewProperty.floorPlanImages : previewProperty.floorPlanUrl ? [previewProperty.floorPlanUrl] : []).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Floor plan ${index + 1}`} className="mb-4 h-auto w-full last:mb-0" />)}</div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER PROPERTY DETAILS OVERLAY ---
  if (selectedProperty) {
      const displayedFloodRisk = selectedProperty.floodRisk || FloodRisk.UNASSESSED;
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
                                          <ShieldCheck size={14} /> Ilé reviewed
                                      </span>
                                  )}
                              </div>
                              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">{selectedProperty.title}</h1>
                              <p className="text-on-surface-variant flex items-center gap-1">
                                  <MapPin size={16} /> {[selectedProperty.location.area, selectedProperty.location.city, selectedProperty.location.state].filter(Boolean).join(', ')}
                              </p>
                          </div>
                          <div className="text-left md:text-right">
                              <p className="text-3xl font-bold text-primary">
                                  ₦{(selectedProperty.price).toLocaleString()}
                              </p>
                              <p className="text-sm text-on-surface-variant">
                                  {selectedProperty.period === 'total' ? 'One-time price' : (selectedProperty.period || 'Price period not specified')}
                              </p>
                          </div>
                      </div>

                      {/* Ilé document review */}
                      <div className="mb-8 p-5 bg-surface-container-low rounded-[24px] border border-outline-variant/10">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                              <h3 className="font-bold text-on-surface">Ilé document review</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedProperty.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                  {selectedProperty.isVerified ? 'Reviewed by Ilé' : 'Not reviewed'}
                              </span>
                          </div>
                          <p className="text-sm text-on-surface-variant">
                              {selectedProperty.isVerified ? 'An Ilé administrator recorded an internal document review for this listing.' : 'No Ilé document review is recorded for this listing.'}
                              {' '}This is not a government registry search, ownership confirmation, encumbrance check, identity check, or legal opinion. Verify documents independently before paying.
                          </p>
                          {selectedProperty.agentId === currentUser.id && !selectedProperty.isVerified && (
                              <button onClick={() => setIsLandTitleUploadModalOpen(true)} className="mt-4 px-4 py-2 rounded-xl bg-emerald-800 text-white text-sm font-bold hover:bg-emerald-900">
                                  Submit title document for Ilé review
                              </button>
                          )}
                      </div>

                      {/* Location Map */}
                      <div className="mb-8 p-5 bg-surface-container-low rounded-[24px] border border-outline-variant/10 overflow-hidden">
                          <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                              <MapPin size={20} className="text-primary" /> Location
                          </h3>
                          <div className="h-64 w-full rounded-2xl overflow-hidden relative z-0">
                              {selectedProperty.coordinates ? (
                                  <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-on-surface-variant">Loading map…</div>}>
                                      <PropertyDetailMap latitude={selectedProperty.coordinates.lat} longitude={selectedProperty.coordinates.lng} />
                                  </Suspense>
                              ) : (
                                      <div className="h-full flex items-center justify-center bg-surface-container text-center p-6 text-sm text-on-surface-variant">
                                          Only neighbourhood-level location is shared on marketplace listings. Exact street addresses and map coordinates are kept out of public listing records.
                                  </div>
                              )}
                          </div>
                      </div>

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
                                    disabled={isGeneratingDesc || isSavingDesc}
                                    className="text-xs font-bold bg-white px-3 py-1.5 rounded-full shadow-sm text-primary flex items-center gap-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                   >
                                       {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                       {generatedDesc ? 'Regenerate draft' : 'Generate draft'}
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
                                       {generatedDesc || selectedProperty.description || 'No description has been provided for this listing.'}
                                   </p>
                               )}
                               {generatedDesc && (
                                   <div className="mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
                                       <p className="text-xs text-on-surface-variant mb-3">AI draft preview — this text has not been saved to the live listing.</p>
                                       <div className="flex flex-wrap gap-2">
                                           <button onClick={() => setGeneratedDesc(null)} disabled={isSavingDesc} className="px-3 py-2 rounded-lg border border-outline-variant text-xs font-bold text-on-surface">Discard draft</button>
                                           <button onClick={handleSaveGeneratedDescription} disabled={isSavingDesc} className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60">{isSavingDesc ? 'Saving…' : 'Save to live listing'}</button>
                                       </div>
                                   </div>
                               )}
                               {descriptionError && <p role="alert" className="mt-3 text-xs text-red-700">{descriptionError}</p>}
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
                                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Seller-reported flood risk (not independently assessed)</p>
                                      <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${
                                          displayedFloodRisk === FloodRisk.LOW ? 'bg-green-50/30 border-green-100 text-green-700' :
                                          displayedFloodRisk === FloodRisk.MEDIUM ? 'bg-yellow-50/30 border-yellow-100 text-yellow-700' :
                                          displayedFloodRisk === FloodRisk.HIGH ? 'bg-red-50/30 border-red-100 text-red-700' :
                                          'bg-surface-container border-outline-variant text-on-surface-variant'
                                      }`}>
                                          <Waves size={16} strokeWidth={1.5} />
                                          <span className="text-sm font-medium uppercase tracking-wider">{displayedFloodRisk}</span>
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Power (lister-reported)</p>
                                      <div className="inline-flex items-center gap-3 px-4 py-2 bg-surface-container/30 border border-outline-variant/10 rounded-full text-on-surface">
                                          <Zap size={16} strokeWidth={1.5} className={selectedProperty.avgPowerHours > 18 ? 'text-yellow-500' : 'text-on-surface-variant/40'} />
                                          <span className="text-sm font-medium">{typeof selectedProperty.avgPowerHours === 'number' ? `${selectedProperty.avgPowerHours} hours / day` : 'Not provided'}</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Price Drop & Alert Subscription (Firebase) */}
                              <div className="mb-8">
                                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-sm text-on-surface-variant">
                                      Price and new-listing email alerts are not active because no notification delivery service is connected.
                                  </div>
                              </div>

                              {/* Neighborhood Pulse */}
                              <div className="mb-8">
                                  <NeighborhoodPulse property={selectedProperty} />
                              </div>

                              {/* Google Smart Insights */}
                              <div className="mb-8">
                                  <Suspense fallback={<div className="p-4 text-sm text-on-surface-variant">Loading AI insights…</div>}>
                                      <GoogleInsights property={selectedProperty} />
                                  </Suspense>
                              </div>

                              <div className="pt-8 border-t border-outline-variant/10">
                                  <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Historical prices</h3>
                                  <p className="mt-3 text-sm text-on-surface-variant">Price history and independent market valuations are not connected. No historical or appreciation data is available for this listing.</p>
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
                                          <p className="font-bold text-on-surface">{selectedProperty.agentId === currentUser.id ? currentUser.name : 'Listing owner'}</p>
                                          <div className="text-[10px] text-on-surface-variant">No identity verification provider is connected</div>
                                      </div>
                                  </div>

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
                                      <MessageSquare size={18} /> Send enquiry
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

                                  {((selectedProperty.floorPlanImages?.length || 0) > 0 || !!selectedProperty.floorPlanUrl) && (
                                    <button 
                                        onClick={() => handleViewFloorPlan(selectedProperty)}
                                        className="w-full py-3 bg-surface text-gray-900 border border-gray-200 rounded-xl font-bold mb-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <LayoutTemplate size={18} /> View Floor Plan
                                    </button>
                                  )}

                                  {['per year', 'per month'].includes(selectedProperty.period || '') && (
                                    <button
                                      onClick={() => setIsLegalModalOpen(true)}
                                      className="w-full py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                    >
                                      <FileText size={18} /> Draft rental agreement
                                    </button>
                                  )}


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
    <div className="min-h-screen bg-surface pb-20 font-sans md:pb-0">
      <Navigation 
        currentRole={currentUser.role} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        user={currentUser}
      />

      <Suspense fallback={<div role="status" className="min-h-[40vh] flex items-center justify-center text-sm text-on-surface-variant">Loading Ilé…</div>}>
      <main className="h-full min-h-screen">
          {activeTab === 'explore' && (
              <ExploreView 
                properties={allProperties}
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
                onQuickAdd={handleQuickAddListing}
              />
          )}

          {activeTab === 'brokerage-dashboard' && currentUser.role === UserRole.BROKERAGE && (
              <BrokerageView user={currentUser} />
          )}

          {activeTab === 'chat' && (
              <AIChat user={currentUser} />
          )}

          {activeTab === 'guide' && (
              <GuideView onBack={() => handleTabChange('explore')} onExplore={() => handleTabChange('explore')} />
          )}

          {activeTab === 'about' && (
              <AboutView onBack={() => handleTabChange('explore')} onExplore={() => handleTabChange('explore')} />
          )}

          {activeTab === 'menu' && (
              <ProfileSettingsView 
                user={currentUser} 
                onLogout={handleLogout} 
                onVerifyClick={() => setIsVerificationModalOpen(true)}
                onTabChange={handleTabChange}
                onUserUpdate={(updated) => setCurrentUser(updated)}
                onOpenLandTitleUpload={() => setIsLandTitleUploadModalOpen(true)}
                onOpenAdminPanel={currentUser.role === UserRole.ADMIN ? () => setIsAdminVerificationPanelOpen(true) : undefined}
              />
          )}
      </main>
      <SiteFooter onNavigate={handleTabChange} />

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
      {viewingFloorPlan && previewProperty && ((previewProperty.floorPlanImages?.length || 0) > 0 || previewProperty.floorPlanUrl) && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <button onClick={() => setViewingFloorPlan(false)} aria-label="Close floor plan" className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 z-10"><X size={24} /></button>
              <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg p-2">
                  {(previewProperty.floorPlanImages?.length ? previewProperty.floorPlanImages : previewProperty.floorPlanUrl ? [previewProperty.floorPlanUrl] : []).map((img, i) => (
                      <img key={i} src={img} alt={`Floor plan ${i + 1} for ${previewProperty.title}`} className="w-full h-auto mb-4 last:mb-0" />
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
          />
      )}
      
       {/* Details View Specific Modals */}
       {isLegalModalOpen && selectedProperty && (
            <LegalGenerator property={selectedProperty} onClose={() => setIsLegalModalOpen(false)} />
       )}
       {isMortgageCalculatorOpen && selectedProperty && (
            <MortgageCalculator
              initialPrice={selectedProperty.price}
              propertyTitle={selectedProperty.title}
              onClose={() => setIsMortgageCalculatorOpen(false)}
            />
       )}
       {chatProperty && selectedProperty && (
            <ChatModal property={chatProperty} onClose={() => setChatProperty(null)} />
       )}
      </Suspense>
    </div>
  );
};

export default App;
