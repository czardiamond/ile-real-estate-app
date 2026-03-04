
import React, { useState } from 'react';
import { SmartListingResponse, TitleDocument, VerificationStatus } from '../types';
import { generateListingFromRawText } from '../services/geminiService';
import { Sparkles, ArrowRight, Mic, CheckCircle, AlertCircle, Loader2, Image as ImageIcon, Trash2, Plus, X, Video, FileText, MapPin, AlertTriangle, Check, LayoutGrid, Coffee, Shield } from 'lucide-react';
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
  onComplete: (data: SmartListingResponse) => void;
  initialInput?: string;
}

const LocationPicker = ({ position, setPosition }: { position: {lat: number, lng: number}, setPosition: (pos: {lat: number, lng: number}) => void }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        }
    });
    return <Marker position={position} />
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

const AddListingWizard: React.FC<AddListingWizardProps> = ({ onCancel, onComplete, initialInput = '' }) => {
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');
  const [rawInput, setRawInput] = useState(initialInput);
  const [generatedData, setGeneratedData] = useState<SmartListingResponse | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  
  // Title Document State
  const [docType, setDocType] = useState<string>('C_OF_O');
  const [docNumber, setDocNumber] = useState<string>('');
  const [registeredOwner, setRegisteredOwner] = useState<string>('');
  const [docError, setDocError] = useState<string>('');

  // Features State
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Location State
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number}>({ lat: 6.5244, lng: 3.3792 }); // Default Lagos

  const handleGenerate = async () => {
    if (!rawInput.trim()) return;
    setStep('processing');
    const result = await generateListingFromRawText(rawInput);
    if (result) {
        setGeneratedData(result);
        setSelectedFeatures(result.features || []); // Initialize with AI detected features
        setStep('review');
    } else {
        setStep('input');
        alert('Failed to generate. Please try again or add more detail.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const filesArray = Array.from(e.target.files);
        const newImages = filesArray.map(file => URL.createObjectURL(file as Blob));
        setUploadedImages(prev => {
            const combined = [...prev, ...newImages];
            return combined.slice(0, 5); // Limit to 5
        });
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validate size (e.g., max 50MB)
          if (file.size > 50 * 1024 * 1024) {
              alert("Video file too large. Please keep under 50MB.");
              return;
          }
          // Create blob URL
          const videoUrl = URL.createObjectURL(file);
          setUploadedVideo(videoUrl);
      }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
      setUploadedVideo(null);
  };

  const toggleFeature = (feature: string) => {
      setSelectedFeatures(prev => 
        prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
      );
  };

  const validateDocNumber = (val: string) => {
      setDocNumber(val);
      // Basic validation: ensure it has reasonable length and characters
      if (val.length < 5) {
          setDocError("Number too short");
      } else if (!/^[A-Za-z0-9\/\-\.]+$/.test(val) && val.length > 0) {
          setDocError("Invalid characters found");
      } else {
          setDocError("");
      }
  };

  const handleFinalSubmit = () => {
    if (generatedData) {
        // Validation check for Title Doc
        if (docNumber && !registeredOwner) {
            alert("Please enter the Registered Owner for the Title Document.");
            return;
        }
        if (docError) {
            alert("Please fix the Document Number error.");
            return;
        }

        const titleDoc: TitleDocument | undefined = docNumber ? {
            type: docType as any,
            number: docNumber,
            registeredOwner: registeredOwner,
            status: VerificationStatus.UNVERIFIED
        } : undefined;

        const finalData = {
            ...generatedData,
            features: selectedFeatures, // Use manual selection
            images: uploadedImages,
            videoUrl: uploadedVideo || undefined,
            titleDocument: titleDoc,
            coordinates: coordinates
        };
        onComplete(finalData);
    }
  };

  // Step 1: Input Screen
  if (step === 'input') {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
            <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-900 mb-4">← Back to Veranda</button>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-secondary" /> Smart Lister
            </h2>
            <p className="text-gray-600">
                Describe the property naturally. Ilé AI will categorize, format, and write the description for you.
            </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1">
            <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="e.g. I have a 3 bedroom flat in Yaba, newly built. Price is 2.5m per year. It has POP ceiling, water heater, and ample parking. Very secure area."
                className="w-full h-48 p-4 rounded-xl outline-none resize-none text-lg text-gray-800 placeholder:text-gray-300"
            />
            <div className="flex justify-between items-center p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <button className="p-3 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors">
                    <Mic size={20} />
                </button>
                <button 
                    onClick={handleGenerate}
                    disabled={!rawInput.trim()}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Generate Listing <ArrowRight size={18} />
                </button>
            </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                <strong>Try:</strong> "Shop for rent at Alaba Int'l Market. Upstairs, double shop. 1.5m per year."
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-sm text-purple-800">
                <strong>Try:</strong> "Event center in Surulere. Capacity 500 guests. Has AC and changing room. 400k per day."
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-sm text-green-800">
                <strong>Try:</strong> "4 bedroom terrace in Lekki Phase 1. Serviced, 24h light. 150m sale."
            </div>
        </div>
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
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Core Details</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                            <input type="text" defaultValue={generatedData.title} className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Price ({generatedData.currency})</label>
                                <input type="number" defaultValue={generatedData.price} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-gray-900" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                                <select defaultValue={generatedData.category} className="w-full p-2 border border-gray-300 rounded-lg">
                                    <option value="RESIDENTIAL">Residential</option>
                                    <option value="COMMERCIAL">Commercial</option>
                                    <option value="EVENT">Event Center</option>
                                    <option value="LAND">Land</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Area</label>
                                <input type="text" defaultValue={generatedData.location.area} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                                <input type="text" defaultValue={generatedData.location.state} className="w-full p-2 border border-gray-300 rounded-lg" />
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
                                <div><label className="text-xs text-gray-500">Bedrooms</label><input type="number" defaultValue={generatedData.specifications.bedrooms || 0} className="w-full p-2 border rounded-lg"/></div>
                                <div><label className="text-xs text-gray-500">Bathrooms</label><input type="number" defaultValue={generatedData.specifications.bathrooms || 0} className="w-full p-2 border rounded-lg"/></div>
                            </>
                        )}
                        {isEvent && (
                            <div><label className="text-xs text-gray-500">Guest Capacity</label><input type="number" defaultValue={generatedData.specifications.capacity || 0} className="w-full p-2 border rounded-lg"/></div>
                        )}
                        {(isCommercial || generatedData.category === 'LAND') && (
                            <div><label className="text-xs text-gray-500">Size (Sqm)</label><input type="number" defaultValue={generatedData.specifications.square_meters || 0} className="w-full p-2 border rounded-lg"/></div>
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
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Generated Description</h3>
                        <Sparkles size={14} className="text-secondary" />
                    </div>
                    <textarea 
                        defaultValue={generatedData.description}
                        className="w-full p-4 border border-gray-100 bg-gray-50 rounded-lg text-sm leading-relaxed outline-none focus:bg-white focus:border-primary transition-colors resize-none h-40"
                    />
                </div>

                {/* Map Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={16} /> Pinpoint Location
                        </h3>
                        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                            Tap map to update
                        </span>
                    </div>
                    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
                        <MapContainer center={coordinates} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <LocationPicker position={coordinates} setPosition={setCoordinates} />
                        </MapContainer>
                    </div>
                </div>

                {/* UPDATED: Title Documents Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-600">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" /> Title Documentation
                        </h3>
                        <Shield size={16} className="text-gray-300" />
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 mb-4 leading-relaxed">
                        <p className="font-bold mb-1">Verify Ownership</p>
                        Providing valid title details increases trust by 300%. We verify this with the State Government Registry.
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Document Type</label>
                            <select 
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500 transition-colors"
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                            >
                                <option value="C_OF_O">Certificate of Occupancy (C of O)</option>
                                <option value="GOVERNOR_CONSENT">Governor's Consent</option>
                                <option value="GAZETTE">Gazette</option>
                                <option value="DEED_OF_ASSIGNMENT">Deed of Assignment</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Document Number</label>
                                <input 
                                    type="text" 
                                    className={`w-full p-3 border rounded-lg text-sm outline-none transition-colors ${docError ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                                    placeholder="e.g. L/1234/5678"
                                    value={docNumber}
                                    onChange={(e) => validateDocNumber(e.target.value)}
                                />
                                {docError && <span className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10}/> {docError}</span>}
                            </div>
                             <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Registered Owner</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Full Name on Title"
                                    value={registeredOwner}
                                    onChange={(e) => setRegisteredOwner(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
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
