
import React, { useState, useRef, useEffect } from 'react';
import { SmartListingResponse } from '../types';
import { generateListingFromRawText, processVoiceNoteToListing, transcribeAudioToDescription } from '../services/geminiService';
import { Sparkles, ArrowRight, Mic, MicOff, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Trash2, Plus, X, Video, FileText, MapPin, AlertTriangle, Check, LayoutGrid, Coffee, Shield, Radio, Volume2, FileEdit, Building2, DollarSign, Sliders, CheckSquare, LayoutTemplate } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface AddListingWizardProps {
  onCancel: () => void;
  onComplete: (data: SmartListingResponse & { mediaFiles: { images: File[]; video?: File; floorPlan?: File } }) => void;
  initialInput?: string;
  initialMode?: 'ai' | 'manual';
}

const LocationPicker = ({ position, setPosition }: { position?: {lat: number, lng: number} | null, setPosition: (pos: {lat: number, lng: number}) => void }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        }
    });
    return position ? <Marker position={position} /> : null
}

// Amenities List (General)
const AMENITIES_LIST = [
    'Furnished', 'Serviced', 'Prepaid Meter', 'Water Heater', 'Gym', 
    'Swimming Pool', 'Backup Generator', 'Solar Panel', 'Elevator', 'Parking'
];

// Features List (Specific to Type)
const FEATURES_BY_TYPE = {
    RESIDENTIAL: ['Fitted Kitchen', 'BQ', 'Inverter', '24hrs Power', 'POP Ceilings', 'CCTV', 'Walk-in Closet', 'Jacuzzi'],
    COMMERCIAL: ['Glass Display', 'CCTV', 'Loading Bay', 'Conference Room', 'Reception', 'Fire Alarm', 'Restroom'],
    EVENT: ['Changing Room', 'Stage', 'Lighting System', 'Sound System', 'Projector', 'Vendor Area', 'Cooling System'],
    LAND: ['Fenced', 'Gated', 'Dry Land', 'Survey Plan', 'Corner Piece', 'Access Road']
};

const PROPERTY_TYPES_BY_CATEGORY = {
    RESIDENTIAL: ['Apartment', 'House', 'Duplex', 'Bungalow', 'Short-let', 'Guest House', 'Other'],
    COMMERCIAL: ['Office Space', 'Shop / Plaza', 'Warehouse', 'Other'],
    EVENT: ['Event Center', 'Wedding Hall', 'Open Field', 'Party Venue', 'Other'],
    LAND: ['Land', 'Other'],
};

const AddListingWizard: React.FC<AddListingWizardProps> = ({ onCancel, onComplete, initialInput = '', initialMode = 'ai' }) => {
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');
  const [listingMode, setListingMode] = useState<'ai' | 'manual'>(initialMode);

  const [rawInput, setRawInput] = useState(initialInput);
  const [generatedData, setGeneratedData] = useState<SmartListingResponse | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedImageFiles, setUploadedImageFiles] = useState<File[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedFloorPlan, setUploadedFloorPlan] = useState<string | null>(null);
  const [uploadedFloorPlanFile, setUploadedFloorPlanFile] = useState<File | null>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const handleFloorPlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(file.type.startsWith('image/') || file.type === 'image/svg+xml') || file.size > 15 * 1024 * 1024) {
      alert('Choose an image floor plan under 15MB.');
      return;
    }
    const preview = URL.createObjectURL(file);
    previewUrlsRef.current.push(preview);
    setUploadedFloorPlan(preview);
    setUploadedFloorPlanFile(file);
  };
  
  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState<'RESIDENTIAL' | 'COMMERCIAL' | 'EVENT' | 'LAND' | ''>('');
  const [manualType, setManualType] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualPeriod, setManualPeriod] = useState<'per year' | 'per day' | 'per month' | 'total' | ''>('');
  const [manualArea, setManualArea] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualBedrooms, setManualBedrooms] = useState('');
  const [manualBathrooms, setManualBathrooms] = useState('');
  const [manualSqM, setManualSqM] = useState('');
  const [manualCapacity, setManualCapacity] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualAvgPowerHours, setManualAvgPowerHours] = useState<number | ''>('');
  const [manualIsSolar, setManualIsSolar] = useState<boolean>(false);
  const [manualFloodRisk, setManualFloodRisk] = useState<string>('Not assessed');

  // Features State
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Location State
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Voice Recording State (Wizard Specs)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceStatusNote, setVoiceStatusNote] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Auto-Transcribe Description Voice Recording State
  const [isRecordingDescription, setIsRecordingDescription] = useState(false);
  const [descriptionRecordingSeconds, setDescriptionRecordingSeconds] = useState(0);
  const [isTranscribingDescription, setIsTranscribingDescription] = useState(false);
  const [transcribeStatusMessage, setTranscribeStatusMessage] = useState<string>('');
  const [reviewDescription, setReviewDescription] = useState<string>('');
  const descriptionMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const descriptionAudioChunksRef = useRef<Blob[]>([]);
  const descriptionTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (descriptionTimerRef.current) clearInterval(descriptionTimerRef.current);
      previewUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await processVoiceWithGemini({ type: 'audio', data: base64Data, mimeType: 'audio/webm' });
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      setVoiceStatusNote('Recording on-site audio note... Speak clearly.');

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 30) {
            stopVoiceRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.warn("Microphone permission denied or unavailable", err);
      setVoiceStatusNote('Microphone unavailable. Type your property details instead.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Dedicated Handler for Auto-Transcribing Audio Note into Listing Description Field
  const startDescriptionVoiceRecording = async (targetMode: 'manual' | 'review' = 'manual') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      descriptionAudioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      descriptionMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          descriptionAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(descriptionAudioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await processDescriptionTranscription({ type: 'audio', data: base64Data, mimeType: 'audio/webm' }, targetMode);
        };
      };

      mediaRecorder.start();
      setIsRecordingDescription(true);
      setDescriptionRecordingSeconds(0);
      setTranscribeStatusMessage('Listening... Speak your property description clearly.');

      descriptionTimerRef.current = setInterval(() => {
        setDescriptionRecordingSeconds(prev => {
          if (prev >= 30) {
            stopDescriptionVoiceRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.warn("Microphone permission denied or unavailable", err);
      setTranscribeStatusMessage('Microphone unavailable. Type the description instead.');
    }
  };

  const stopDescriptionVoiceRecording = () => {
    if (descriptionMediaRecorderRef.current && isRecordingDescription) {
      descriptionMediaRecorderRef.current.stop();
      descriptionMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecordingDescription(false);
    if (descriptionTimerRef.current) clearInterval(descriptionTimerRef.current);
  };

  const processDescriptionTranscription = async (
    inputPayload: { type: 'audio' | 'text'; data: string; mimeType?: string },
    targetMode: 'manual' | 'review'
  ) => {
    setIsTranscribingDescription(true);
    setTranscribeStatusMessage('Auto-transcribing audio note via Ilé AI speech transcription...');

    const transcribedText = await transcribeAudioToDescription(inputPayload);
    setIsTranscribingDescription(false);

    if (transcribedText) {
      if (targetMode === 'manual') {
        setManualDescription(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText);
      } else {
        setReviewDescription(transcribedText);
        if (generatedData) {
          setGeneratedData({ ...generatedData, description: transcribedText });
        }
      }
      setTranscribeStatusMessage('Transcribed directly into property description field!');
      setTimeout(() => setTranscribeStatusMessage(''), 4000);
    } else {
      setTranscribeStatusMessage('Could not transcribe audio note. Please try speaking again.');
      setTimeout(() => setTranscribeStatusMessage(''), 4000);
    }
  };

  const processVoiceWithGemini = async (inputPayload: { type: 'audio' | 'text'; data: string; mimeType?: string }) => {
    setIsProcessingVoice(true);
    setStep('processing');
    setVoiceStatusNote('Ilé AI is preparing a draft from your note...');

    const result = await processVoiceNoteToListing(inputPayload);
    setIsProcessingVoice(false);

    if (result) {
      setGeneratedData(result);
      setReviewDescription(result.description || '');
      setSelectedFeatures(result.features || []);
      setStep('review');
    } else {
      setStep('input');
      alert('Could not extract details from voice note. Please try speaking again or type your notes.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArray = Array.from(e.target.files || []);
    if (filesArray.length === 0) return;
    const remaining = Math.max(0, 5 - uploadedImageFiles.length);
    const accepted = filesArray.filter(file => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024).slice(0, remaining);
    if (accepted.length !== filesArray.length) alert('Select up to 5 image files, each under 10MB.');
    const previews = accepted.map(file => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return url;
    });
    setUploadedImageFiles(prev => [...prev, ...accepted]);
    setUploadedImages(prev => [...prev, ...previews]);
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validate size (e.g., max 50MB)
          if (!file.type.startsWith('video/') || file.size > 50 * 1024 * 1024) {
              alert("Video file too large. Please keep under 50MB.");
              return;
          }
          // Create blob URL
          const videoUrl = URL.createObjectURL(file);
          previewUrlsRef.current.push(videoUrl);
          setUploadedVideo(videoUrl);
          setUploadedVideoFile(file);
      }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
      setUploadedVideo(null);
      setUploadedVideoFile(null);
  };

  const toggleFeature = (feature: string) => {
      setSelectedFeatures(prev => 
        prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
      );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      alert("Please enter a Property Title.");
      return;
    }
    if (!manualPrice || Number(manualPrice) <= 0) {
      alert("Please enter a valid Price in Naira.");
      return;
    }
    if (!manualArea.trim()) {
      alert("Please specify the Area / Neighborhood (e.g. Lekki Phase 1, Ikeja).");
      return;
    }
    if (!manualCategory || !manualType || !manualPeriod || !manualState) {
      alert("Choose the property category, subtype, price period, and state before publishing.");
      return;
    }

    const manualListing: SmartListingResponse = {
      category: manualCategory as SmartListingResponse['category'],
      type: manualType,
      period: manualPeriod as SmartListingResponse['period'],
      title: manualTitle,
      description: manualDescription,
      price: Number(manualPrice) || 0,
      currency: 'NGN',
      location: {
        address: manualAddress || undefined,
        area: manualArea,
        state: manualState,
      },
      features: selectedFeatures,
      specifications: {
        bedrooms: manualBedrooms ? Number(manualBedrooms) : undefined,
        bathrooms: manualBathrooms ? Number(manualBathrooms) : undefined,
        square_meters: manualSqM ? Number(manualSqM) : undefined,
        capacity: manualCapacity ? Number(manualCapacity) : undefined,
      },
      confidence_score: 0
    };

    const finalData = {
      ...manualListing,
      images: [],
      videoUrl: undefined,
      floorPlanUrl: undefined,
      coordinates: coordinates || undefined,
      avgPowerHours: manualAvgPowerHours === '' ? undefined : manualAvgPowerHours,
      isSolarPowered: manualIsSolar,
      floodRisk: manualFloodRisk,
      mediaFiles: { images: uploadedImageFiles, video: uploadedVideoFile || undefined, floorPlan: uploadedFloorPlanFile || undefined },
    };

    onComplete(finalData);
  };

  const updateGeneratedLocation = (field: 'area' | 'state', value: string) => {
    setGeneratedData(current => current ? { ...current, location: { ...current.location, [field]: value } } : current);
  };

  const updateGeneratedSpec = (field: 'bedrooms' | 'bathrooms' | 'capacity' | 'square_meters', value: string) => {
    setGeneratedData(current => current ? {
      ...current,
      specifications: { ...current.specifications, [field]: value === '' ? undefined : Number(value) },
    } : current);
  };

  const handleFinalSubmit = () => {
    if (generatedData && (!generatedData.title.trim() || !generatedData.price || generatedData.price <= 0 || !generatedData.type || !PROPERTY_TYPES_BY_CATEGORY[generatedData.category]?.includes(generatedData.type) || !generatedData.period || !generatedData.location.area.trim() || !generatedData.location.state.trim())) {
      alert('Review and provide the listing title, price, subtype, price period, area, and state before publishing.');
      return;
    }
    if (generatedData) {
        const finalData = {
            ...generatedData,
            features: selectedFeatures, // Use manual selection
            images: [],
            videoUrl: undefined,
            floorPlanUrl: undefined,
            coordinates: coordinates || undefined,
            mediaFiles: { images: uploadedImageFiles, video: uploadedVideoFile || undefined, floorPlan: uploadedFloorPlanFile || undefined },
        };
        onComplete(finalData);
    }
  };

  // Step 1: Input Screen
  if (step === 'input') {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
            <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-900 mb-4">← Back to Veranda</button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {listingMode === 'ai' ? <Sparkles className="text-emerald-600" /> : <FileEdit className="text-emerald-600" />} 
                    {listingMode === 'ai' ? 'Smart Listing Wizard' : 'Create Manual Listing'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                    {listingMode === 'ai' 
                      ? 'Speak an on-site audio note or type raw property notes. Ilé AI suggests fields from your note. Review every suggestion; title documents and property claims are not verified.'
                      : 'Fill in the standard listing form below to publish your property directly.'
                    }
                </p>
              </div>
              {listingMode === 'ai' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                  <Radio size={12} className="animate-pulse text-amber-600" /> Field Agent Voice Mode
                </span>
              )}
            </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl max-w-md border border-gray-200">
            <button
                type="button"
                onClick={() => setListingMode('ai')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    listingMode === 'ai'
                        ? 'bg-emerald-800 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <Sparkles size={16} />
                <span>AI Listing Wizard</span>
            </button>
            <button
                type="button"
                onClick={() => setListingMode('manual')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    listingMode === 'manual'
                        ? 'bg-emerald-800 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <FileEdit size={16} />
                <span>Create Manual Listing</span>
            </button>
        </div>

        {listingMode === 'manual' ? (
          /* Standard Manual Listing Form */
          <form onSubmit={handleManualSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
              <div className="border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Building2 className="text-emerald-700" size={20} /> Property Overview & Pricing
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                      Fill in property details manually to list directly on Ilé.
                  </p>
              </div>

              {/* Title */}
              <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Property Title *
                  </label>
                  <input
                      type="text"
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. Luxury 4 Bedroom Terrace Duplex with BQ & Pool"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Property Category
                      </label>
                      <select
                          value={manualCategory}
                          required
                          onChange={(e) => {
                              const cat = e.target.value as 'RESIDENTIAL' | 'COMMERCIAL' | 'EVENT' | 'LAND' | '';
                              setManualCategory(cat);
                              if (cat === 'RESIDENTIAL') setManualType('Apartment');
                              else if (cat === 'COMMERCIAL') setManualType('Office Space');
                              else if (cat === 'EVENT') setManualType('Event Center');
                              else if (cat === 'LAND') setManualType('Land');
                              else setManualType('');
                          }}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                          <option value="">Select category</option>
                          <option value="RESIDENTIAL">Residential Property</option>
                          <option value="COMMERCIAL">Commercial / Business</option>
                          <option value="EVENT">Event Venue / Hospitality</option>
                          <option value="LAND">Land / Plot</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Sub-Type
                      </label>
                      <select
                          value={manualType}
                          required
                          onChange={(e) => setManualType(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                          {!manualCategory && <option value="">Select category first</option>}
                          {manualCategory === 'RESIDENTIAL' && (
                              <>
                                  <option value="Apartment">Apartment / Flat</option>
                                  <option value="House">Detached House</option>
                                  <option value="Duplex">Terrace / Semi-Detached Duplex</option>
                                  <option value="Bungalow">Bungalow</option>
                                  <option value="Short-let">Short-Let Apartment</option>
                              </>
                          )}
                          {manualCategory === 'COMMERCIAL' && (
                              <>
                                  <option value="Office Space">Office Space</option>
                                  <option value="Shop / Plaza">Shop / Retail Plaza</option>
                                  <option value="Warehouse">Warehouse / Industrial</option>
                              </>
                          )}
                          {manualCategory === 'EVENT' && (
                              <>
                                  <option value="Event Center">Event Center</option>
                                  <option value="Wedding Hall">Wedding Hall</option>
                                  <option value="Party Venue">Party Venue / Open Field</option>
                              </>
                          )}
                          {manualCategory === 'LAND' && (
                              <>
                                  <option value="Land">Residential Land Plot</option>
                                  <option value="Commercial Land">Commercial Land Plot</option>
                              </>
                          )}
                      </select>
                  </div>
              </div>

              {/* Price & Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Asking Price (₦) *
                      </label>
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">₦</span>
                          <input
                              type="number"
                              required
                              value={manualPrice}
                              onChange={(e) => setManualPrice(e.target.value)}
                              placeholder="180000000"
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 pl-8 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Payment Period / Type
                      </label>
                      <select
                          required
                          value={manualPeriod}
                          onChange={(e) => setManualPeriod(e.target.value as any)}
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                          <option value="">Select price period</option>
                          <option value="total">Outright Sale (Total Price)</option>
                          <option value="per year">Rent per Year (₦/yr)</option>
                          <option value="per month">Rent per Month (₦/mo)</option>
                          <option value="per day">Shortlet per Day (₦/day)</option>
                      </select>
                  </div>
              </div>

              {/* Location details */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="text-emerald-700" size={18} /> Location & Address
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                              Area / Neighborhood *
                          </label>
                          <input
                              type="text"
                              required
                              value={manualArea}
                              onChange={(e) => setManualArea(e.target.value)}
                              placeholder="e.g. Lekki Phase 1, Ikate, Ikeja GRA, Yaba, Maitama"
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                              State
                          </label>
                          <select
                              required
                              value={manualState}
                              onChange={(e) => setManualState(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                              <option value="">Select state</option>
                              <option value="Lagos State">Lagos State</option>
                              <option value="FCT Abuja">FCT Abuja</option>
                              <option value="Rivers State">Rivers State (Port Harcourt)</option>
                              <option value="Ogun State">Ogun State</option>
                              <option value="Oyo State">Oyo State (Ibadan)</option>
                              <option value="Enugu State">Enugu State</option>
                              <option value="Anambra State">Anambra State</option>
                          </select>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          Full Street Address
                      </label>
                      <input
                          type="text"
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          placeholder="e.g. 14 Freedom Way, Ikate Elegushi, Lekki"
                          className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-sm text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                  </div>
              </div>

              {/* Specifications */}
              {manualCategory !== 'LAND' && (
                  <div className="border-t border-gray-100 pt-5 space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Sliders className="text-emerald-700" size={18} /> Specifications
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                  Bedrooms
                              </label>
                              <input
                                  type="number"
                                  value={manualBedrooms}
                                  onChange={(e) => setManualBedrooms(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none"
                              />
                          </div>

                          <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                  Bathrooms
                              </label>
                              <input
                                  type="number"
                                  value={manualBathrooms}
                                  onChange={(e) => setManualBathrooms(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none"
                              />
                          </div>

                          <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                  Floor Area (m²)
                              </label>
                              <input
                                  type="number"
                                  value={manualSqM}
                                  onChange={(e) => setManualSqM(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none"
                              />
                          </div>

                          <div>
                              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                  Guest Capacity
                              </label>
                              <input
                                  type="number"
                                  value={manualCapacity}
                                  onChange={(e) => setManualCapacity(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none"
                              />
                          </div>
                      </div>
                  </div>
              )}

              <div className="border-t border-gray-100 pt-5 text-sm text-gray-600">
                Title documents can be submitted separately after the listing is saved. Submissions are private and receive internal Ilé review only; they are not checked against a government registry.
              </div>

              {/* Amenities & Features */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Features & Amenities
                  </label>
                  <div className="flex flex-wrap gap-2">
                      {['POP Ceilings', 'Backup Generator', 'Swimming Pool', '24/7 Security', 'Water Heater', 'Fitted Kitchen', 'Serviced', 'Prepaid Meter', 'CCTV', 'Inverter', 'Solar Powered', 'Ample Parking'].map(feat => {
                          const isSelected = selectedFeatures.includes(feat);
                          return (
                              <button
                                  key={feat}
                                  type="button"
                                  onClick={() => toggleFeature(feat)}
                                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      isSelected
                                          ? 'bg-emerald-800 text-white shadow-sm'
                                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                  }`}
                              >
                                  {isSelected ? <Check size={12} /> : <Plus size={12} />}
                                  {feat}
                              </button>
                          );
                      })}
                  </div>
              </div>

              {/* Infrastructure & Environment */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">Infrastructure & Environment Metrics</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                              Average Grid Power (hrs/day)
                          </label>
                          <input
                              type="number"
                              min="0"
                              max="24"
                              placeholder="Not provided"
                              value={manualAvgPowerHours}
                              onChange={(e) => setManualAvgPowerHours(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                              Flood Risk Level
                          </label>
                          <select
                              value={manualFloodRisk}
                              onChange={(e) => setManualFloodRisk(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none"
                          >
                              <option value="Not assessed">Not assessed</option>
                              <option value="Dry Land (Low Risk)">Dry Land (Low Risk)</option>
                              <option value="Moderate Risk">Moderate Risk</option>
                              <option value="Flood Prone (High Risk)">Flood Prone (High Risk)</option>
                          </select>
                      </div>

                      <div className="flex items-center pt-5">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                              <input
                                  type="checkbox"
                                  checked={manualIsSolar}
                                  onChange={(e) => setManualIsSolar(e.target.checked)}
                                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                              <span>Solar Hybrid Backup Included</span>
                          </label>
                      </div>
                  </div>
              </div>

              {/* Property Description */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Property Description & Agent Remarks
                          </label>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                              Type manually or tap the voice button to auto-transcribe directly into the description using Ilé AI speech transcription.
                          </p>
                      </div>

                      <div className="flex items-center gap-2">
                          {!isRecordingDescription ? (
                              <button
                                  type="button"
                                  onClick={() => startDescriptionVoiceRecording('manual')}
                                  disabled={isTranscribingDescription}
                                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
                                  title="Auto-transcribe voice note directly into description using Ilé AI speech transcription"
                              >
                                  <Mic size={16} className="text-emerald-300 animate-pulse" />
                                  <span>Auto-Transcribe Voice Note</span>
                              </button>
                          ) : (
                              <button
                                  type="button"
                                  onClick={stopDescriptionVoiceRecording}
                                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm animate-pulse cursor-pointer"
                              >
                                  <MicOff size={16} />
                                  <span>Stop Recording (0:{descriptionRecordingSeconds < 10 ? '0' : ''}{descriptionRecordingSeconds}s)</span>
                              </button>
                          )}
                      </div>
                  </div>

                  {isTranscribingDescription && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                          <Loader2 size={16} className="animate-spin text-emerald-600 shrink-0" />
                          <span>Ilé AI is transcribing your note...</span>
                      </div>
                  )}

                  {transcribeStatusMessage && !isTranscribingDescription && (
                      <div className="p-2.5 bg-emerald-100/80 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-700 shrink-0" />
                          <span>{transcribeStatusMessage}</span>
                      </div>
                  )}

                  <div className="relative">
                      <textarea
                          rows={4}
                          value={manualDescription}
                          onChange={(e) => setManualDescription(e.target.value)}
                          placeholder="Write a clear overview highlighting key features, payment terms, or neighborhood highlights... or tap 'Auto-Transcribe Voice Note' above!"
                          className="w-full bg-gray-50 border border-gray-300 rounded-2xl p-4 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 font-normal"
                      />
                      {manualDescription && (
                          <div className="absolute bottom-3 right-3 flex items-center gap-2">
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shadow-xs">
                                  <Sparkles size={10} /> {manualDescription.length} chars
                              </span>
                          </div>
                      )}
                  </div>
              </div>

              {/* Media Upload */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Property Photos & Walkthrough Video
                  </label>
                  <div className="flex flex-wrap gap-3">
                      <label className="p-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl cursor-pointer flex flex-col items-center justify-center text-center transition-all bg-gray-50">
                          <ImageIcon size={24} className="text-gray-400 mb-1" />
                          <span className="text-xs font-bold text-gray-700">Add Photos</span>
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>

                      {uploadedImages.map((img, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200">
                              <img src={img} alt="Property" className="w-full h-full object-cover" />
                              <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors"
                              >
                                  <X size={12} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Architectural Floor Plan Upload */}
              <div className="border-t border-gray-100 pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Architectural Floor Plan (SVG / Image)
                      </label>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          3D Staging Ready
                      </span>
                  </div>
                  <p className="text-xs text-gray-500">
                      Upload an architectural floor plan drawing or 2D layout (SVG, PNG, JPG). Buyers and 3D Virtual Staging engines use this to map room proportions.
                  </p>

                  <div className="flex items-center gap-4">
                      {uploadedFloorPlan ? (
                          <div className="relative w-48 h-32 rounded-2xl overflow-hidden border-2 border-emerald-500 bg-gray-900 flex items-center justify-center p-2">
                              <img src={uploadedFloorPlan} alt="Floor Plan" className="w-full h-full object-contain" />
                              <button
                                  type="button"
                                  onClick={() => setUploadedFloorPlan(null)}
                                  className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors"
                                  title="Remove floor plan"
                              >
                                  <X size={14} />
                              </button>
                          </div>
                      ) : (
                          <label className="w-full sm:w-auto px-6 py-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl cursor-pointer flex items-center gap-3 transition-all bg-gray-50">
                              <LayoutTemplate size={24} className="text-emerald-700" />
                              <div className="text-left">
                                  <span className="text-xs font-bold text-gray-800 block">Upload Architectural Floor Plan</span>
                                  <span className="text-[10px] text-gray-500">Supports SVG, PNG, JPG, or CAD export</span>
                              </div>
                              <input type="file" accept="image/*,.svg" onChange={handleFloorPlanUpload} className="hidden" />
                          </label>
                      )}
                  </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                      type="submit"
                      className="flex-1 py-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                      <CheckSquare size={18} /> Save & Publish Manual Listing
                  </button>
                  <button
                      type="button"
                      onClick={onCancel}
                      className="py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-sm transition-colors"
                  >
                      Cancel
                  </button>
              </div>
          </form>
        ) : (
          <>

        {/* Multimodal Voice-to-Listing Agent Memo Card */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-emerald-800/40">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-md">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <Mic size={16} /> On-Site Audio Note Processing
                    </div>
                    <h3 className="text-xl font-bold leading-snug">Recording in traffic or on a construction site?</h3>
                    <p className="text-emerald-100/80 text-xs leading-relaxed">
                        AI can suggest listing fields from your note. Review every suggestion before publishing; it does not verify title documents or property claims.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-3 shrink-0">
                    {!isRecording ? (
                        <button
                            onClick={startVoiceRecording}
                            className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 group"
                        >
                            <Mic size={28} className="group-hover:scale-110 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={stopVoiceRecording}
                            className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/40 animate-pulse transition-all"
                        >
                            <MicOff size={28} />
                        </button>
                    )}

                    <div className="text-center">
                        <span className="text-xs font-bold block">
                            {isRecording ? `Recording: 0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds} / 0:30s` : 'Tap to Record Voice Note'}
                        </span>
                        {isRecording && (
                            <div className="flex items-center justify-center gap-1 mt-1.5">
                                <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-6 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce" />
                                <span className="w-1.5 h-5 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.2s]" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>

        {/* Text Input Option */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-2">
            <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Or type here: e.g. I have a 3 bedroom flat in Yaba, newly built. Price is 2.5m per year. It has POP ceiling, water heater, and ample parking..."
                className="w-full h-40 p-4 rounded-2xl outline-none resize-none text-base text-gray-800 placeholder:text-gray-400"
            />
            <div className="flex justify-between items-center p-3 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
                <span className="text-xs text-gray-500 font-medium px-2">
                    {rawInput.length > 0 ? `${rawInput.length} characters` : 'Type or record above'}
                </span>
                <button 
                    onClick={async () => {
                      setStep('processing');
                      const result = await generateListingFromRawText(rawInput);
                      if (result) {
                        setGeneratedData(result);
                        setReviewDescription(result.description || '');
                        setSelectedFeatures(result.features || []);
                        setStep('review');
                      } else {
                        setStep('input');
                        alert('Failed to generate listing. Please try again.');
                      }
                    }}
                    disabled={!rawInput.trim()}
                    className="bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                    Generate Listing <ArrowRight size={18} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <strong className="block text-blue-950 font-bold">Try Commercial:</strong>
                <p>"Double shop space at Trade Fair Complex, ground floor, ₦2M/yr with solar light."</p>
            </div>
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1">
                <strong className="block text-purple-950 font-bold">Try Short-let / Events:</strong>
                <p>"Luxury 2-bedroom shortlet in Victoria Island with waterfront balcony, ₦120k per day."</p>
            </div>
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <strong className="block text-emerald-950 font-bold">Try Land Sale:</strong>
                <p>"2 plots of dry land in Epe, fast developing, Gazette title, ₦12M per plot."</p>
            </div>
        </div>
        </>
        )}
      </div>
    );
  }

  // Step 2: Processing
  if (step === 'processing') {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 relative">
                <Sparkles className="text-primary animate-pulse" size={40} />
                <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing your description...</h3>
            <p className="text-gray-500">Detecting location, price, and categorizing specs.</p>
        </div>
    );
  }

  // Step 3: Review
  if (step === 'review' && generatedData) {
    const category = generatedData.category;
    const isCommercial = category === 'COMMERCIAL';
    const isEvent = category === 'EVENT';
    const isResidential = category === 'RESIDENTIAL';

    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Review & Publish</h2>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <CheckCircle size={14} /> AI Confidence: {generatedData.confidence_score}%
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                
                {/* Media Section (Images & Video) */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Property Media</h3>
                    </div>
                    
                    {/* Image Uploads */}
                    <div className="flex gap-4 overflow-x-auto pb-2 mb-4">
                        {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 group">
                                <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        
                        {uploadedImages.length < 5 && (
                            <label className="w-24 h-24 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-green-50 cursor-pointer transition-all">
                                <Plus size={24} />
                                <span className="text-[10px] font-bold mt-1">Add Photo</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleImageUpload} 
                                />
                            </label>
                        )}
                    </div>

                    {/* Video Upload */}
                    <div className="pt-4 border-t border-gray-100">
                         <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Video Clip (Max 30s)</h4>
                         {uploadedVideo ? (
                             <div className="relative w-full h-32 bg-black rounded-xl overflow-hidden group">
                                 <video src={uploadedVideo} className="w-full h-full object-cover" controls />
                                 <button 
                                    onClick={removeVideo}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors z-10"
                                >
                                    <Trash2 size={14} />
                                </button>
                             </div>
                         ) : (
                             <label className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer transition-all">
                                 <Video size={24} />
                                 <span className="text-xs font-bold mt-2">Upload Video Tour</span>
                                 <span className="text-[10px] opacity-70">MP4, MOV up to 50MB</span>
                                 <input 
                                    type="file" 
                                    accept="video/*" 
                                    className="hidden" 
                                    onChange={handleVideoUpload}
                                 />
                             </label>
                         )}
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Review listing details</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                            <input type="text" value={generatedData.title || ''} onChange={(e) => setGeneratedData({ ...generatedData, title: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Price ({generatedData.currency || 'NGN'})</label>
                                <input type="number" min="1" value={generatedData.price || ''} onChange={(e) => setGeneratedData({ ...generatedData, price: e.target.value === '' ? 0 : Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Price period</label>
                                <select value={generatedData.period || ''} onChange={(e) => setGeneratedData({ ...generatedData, period: (e.target.value || undefined) as SmartListingResponse['period'] })} className="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Choose period</option>
                                    <option value="total">Outright sale (total)</option>
                                    <option value="per year">Rent per year</option>
                                    <option value="per month">Rent per month</option>
                                    <option value="per day">Short-let per day</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                                <select value={generatedData.category} onChange={(e) => setGeneratedData({ ...generatedData, category: e.target.value as SmartListingResponse['category'], type: '' })} className="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="RESIDENTIAL">Residential</option>
                                    <option value="COMMERCIAL">Commercial</option>
                                    <option value="EVENT">Event venue</option>
                                    <option value="LAND">Land</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Property subtype</label>
                                <select required value={generatedData.type || ''} onChange={(e) => setGeneratedData({ ...generatedData, type: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="">Choose subtype</option>
                                    {PROPERTY_TYPES_BY_CATEGORY[generatedData.category]?.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Area</label>
                                <input type="text" value={generatedData.location?.area || ''} onChange={(e) => updateGeneratedLocation('area', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                                <input type="text" value={generatedData.location?.state || ''} onChange={(e) => updateGeneratedLocation('state', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Specifics based on Category */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                        {isEvent ? 'Owambe Specs' : isCommercial ? 'Business Specs' : 'House Specs'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {isResidential && (
                            <>
                                <div><label className="text-xs text-gray-500">Bedrooms</label><input type="number" min="0" value={generatedData.specifications?.bedrooms ?? ''} onChange={(e) => updateGeneratedSpec('bedrooms', e.target.value)} className="w-full p-2 border rounded-lg"/></div>
                                <div><label className="text-xs text-gray-500">Bathrooms</label><input type="number" min="0" value={generatedData.specifications?.bathrooms ?? ''} onChange={(e) => updateGeneratedSpec('bathrooms', e.target.value)} className="w-full p-2 border rounded-lg"/></div>
                            </>
                        )}
                        {isEvent && (
                            <div><label className="text-xs text-gray-500">Guest Capacity</label><input type="number" min="0" value={generatedData.specifications?.capacity ?? ''} onChange={(e) => updateGeneratedSpec('capacity', e.target.value)} className="w-full p-2 border rounded-lg"/></div>
                        )}
                        {(isCommercial || generatedData.category === 'LAND') && (
                            <div><label className="text-xs text-gray-500">Size (Sqm)</label><input type="number" min="0" value={generatedData.specifications?.square_meters ?? ''} onChange={(e) => updateGeneratedSpec('square_meters', e.target.value)} className="w-full p-2 border rounded-lg"/></div>
                        )}
                    </div>
                    
                    {/* Amenities Section */}
                    <div className="pt-4 border-t border-gray-100 mb-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <Coffee size={14} /> Common Amenities
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {AMENITIES_LIST.map((amenity) => {
                                const isSelected = selectedFeatures.includes(amenity);
                                return (
                                    <button
                                        key={amenity}
                                        onClick={() => toggleFeature(amenity)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            isSelected 
                                            ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {amenity}
                                        {isSelected && <span className="ml-1">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <LayoutGrid size={14} /> Property Features
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FEATURES_BY_TYPE[category as keyof typeof FEATURES_BY_TYPE]?.map((feature) => {
                                const isSelected = selectedFeatures.includes(feature);
                                return (
                                    <button
                                        key={feature}
                                        onClick={() => toggleFeature(feature)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            isSelected 
                                            ? 'bg-primary text-white border-primary shadow-sm' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {feature}
                                        {isSelected && <span className="ml-1">✓</span>}
                                    </button>
                                );
                            })}
                             <button className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600">
                                + Custom
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Description AI Generated */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Generated Description</h3>
                            <Sparkles size={14} className="text-emerald-600" />
                        </div>

                        {/* Auto-Transcribe Voice Note Button */}
                        <div>
                            {!isRecordingDescription ? (
                                <button
                                    type="button"
                                    onClick={() => startDescriptionVoiceRecording('review')}
                                    disabled={isTranscribingDescription}
                                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
                                    title="Auto-transcribe additional spoken voice note directly into description"
                                >
                                    <Mic size={14} className="text-emerald-300 animate-pulse" />
                                    <span>Auto-Transcribe Voice Note</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={stopDescriptionVoiceRecording}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm animate-pulse cursor-pointer"
                                >
                                    <MicOff size={14} />
                                    <span>Stop Recording (0:{descriptionRecordingSeconds < 10 ? '0' : ''}{descriptionRecordingSeconds}s)</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {isTranscribingDescription && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                            <Loader2 size={14} className="animate-spin text-emerald-600 shrink-0" />
                            <span>Ilé AI is transcribing your note...</span>
                        </div>
                    )}

                    {transcribeStatusMessage && !isTranscribingDescription && (
                        <div className="p-2 bg-emerald-100/80 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle size={14} className="text-emerald-700 shrink-0" />
                            <span>{transcribeStatusMessage}</span>
                        </div>
                    )}

                    <textarea 
                        value={reviewDescription || generatedData.description}
                        onChange={(e) => {
                            setReviewDescription(e.target.value);
                            setGeneratedData({ ...generatedData, description: e.target.value });
                        }}
                        className="w-full p-4 border border-gray-200 bg-gray-50 rounded-xl text-sm leading-relaxed outline-none focus:bg-white focus:border-emerald-600 transition-colors resize-none h-40 font-normal"
                    />
                </div>

                {/* Map Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={16} /> Pinpoint Location
                        </h3>
                        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                            Choose a pin to save coordinates
                        </span>
                    </div>
                    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
                        <MapContainer center={coordinates || [9.082, 8.675]} zoom={6} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <LocationPicker position={coordinates} setPosition={setCoordinates} />
                        </MapContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 text-sm text-gray-600">
                    Title documents can be submitted privately after the listing is saved. Ilé does not perform government registry checks.
                </div>
            </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 md:px-8 flex justify-end gap-4 z-40">
            <button onClick={() => setStep('input')} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                Back to Edit
            </button>
            <button onClick={handleFinalSubmit} className="px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                Publish Listing
            </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AddListingWizard;
