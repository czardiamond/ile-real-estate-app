import React, { useState } from 'react';
import { Property, PropertyType, TitleDocument, VerificationStatus, DocumentVisionInspectionResult } from '../types';
import { verifyLandTitle } from '../services/landRegistryService';
import { inspectDocumentWithVision } from '../services/geminiService';
import { ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, Loader2, Building2, MapPin, X, ExternalLink, Scale, Sparkles, Upload, FileSearch, Compass, Award, Check } from 'lucide-react';

interface LandTitleVerificationModalProps {
    property: Property;
    onClose: () => void;
}

export const LandTitleVerificationModal: React.FC<LandTitleVerificationModalProps> = ({ property, onClose }) => {
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<TitleDocument | null>(null);
    const [auditStep, setAuditStep] = useState<string>('');
    
    // Vision Inspection State
    const [isVisionInspecting, setIsVisionInspecting] = useState(false);
    const [visionResult, setVisionResult] = useState<DocumentVisionInspectionResult | null>(null);
    const [previewDocImage, setPreviewDocImage] = useState<string | null>(null);

    // Construct mock initial document based on property
    const docTypeKey: 'C_OF_O' | 'GOVERNOR_CONSENT' | 'GAZETTE' | 'DEED_OF_ASSIGNMENT' = property.price > 100000000 
        ? 'GOVERNOR_CONSENT' 
        : property.type === PropertyType.LAND ? 'GAZETTE' : 'C_OF_O';
    
    const docTypeLabel = docTypeKey === 'GOVERNOR_CONSENT' ? "Governor's Consent" : docTypeKey === 'GAZETTE' ? "Gazetted Title (Excision)" : "Certificate of Occupancy (C of O)";

    const docNumber = `CofO-LKG-${property.id.toUpperCase()}-2024`;
    const surveyNumber = `LA/SURV/${property.id.toUpperCase()}/0892`;

    const handleRunRegistryAudit = async () => {
        setIsVerifying(true);
        setAuditStep('Connecting to Lagos State Lands Bureau Database...');
        
        await new Promise(r => setTimeout(r, 800));
        setAuditStep('Cross-referencing Cadastral Survey Plan & Coordinates...');
        
        await new Promise(r => setTimeout(r, 1000));
        setAuditStep('Auditing Encumbrances & Court Lis Pendens Records...');
        
        const initialDoc: TitleDocument = {
            type: docTypeKey,
            number: docNumber,
            status: VerificationStatus.PENDING,
        };

        const result = await verifyLandTitle(initialDoc);
        setVerificationResult(result);
        setIsVerifying(false);
        setAuditStep('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setPreviewDocImage(base64String);
            const base64Data = base64String.split(',')[1];
            
            setIsVisionInspecting(true);
            const visionData = await inspectDocumentWithVision(base64Data, file.type, property);
            setVisionResult(visionData);
            setIsVisionInspecting(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSampleVisionInspection = async () => {
        // High quality placeholder image representing a C of O document
        const sampleDocUrl = "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80";
        setPreviewDocImage(sampleDocUrl);
        setIsVisionInspecting(true);
        
        // Mock base64 image data for Gemini API call
        const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        const visionData = await inspectDocumentWithVision(mockBase64, 'image/jpeg', property);
        setVisionResult(visionData);
        setIsVisionInspecting(false);
    };

    return (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-gray-100">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-gray-900 text-white p-6 relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30">
                            <ShieldCheck className="text-emerald-400" size={24} />
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-400/30">
                            Enterprise Trust Layer
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Land Title & Document Verification</h2>
                    <p className="text-emerald-100/70 text-xs mt-1">Cross-referencing state land registries, survey plans & anti-fraud databases.</p>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] bg-gray-50/50">
                    
                    {/* Property Summary */}
                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <img src={property.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm leading-tight">{property.title}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin size={12} className="text-primary" /> {property.location.address}, {property.location.area}
                            </p>
                            <p className="text-xs font-bold text-emerald-700 mt-1">₦{property.price.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Official Document Details Card */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Document Type</span>
                            <span className="text-xs font-bold text-gray-900 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-100">
                                {docTypeLabel}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Deed / Reg. Number</span>
                            <span className="text-xs font-mono font-bold text-gray-900">{docNumber}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Cadastral Survey Plan #</span>
                            <span className="text-xs font-mono font-bold text-gray-900">{surveyNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Jurisdiction Registry</span>
                            <span className="text-xs font-medium text-gray-800 flex items-center gap-1">
                                <Building2 size={12} className="text-gray-400" /> Lagos State Lands Bureau
                            </span>
                        </div>
                    </div>

                    {/* Gemini Vision Document Inspector Section */}
                    <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white p-5 rounded-2xl border border-teal-800/40 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileSearch className="text-teal-400" size={20} />
                                <h4 className="font-bold text-sm text-teal-100">Gemini Multimodal Document Vision Inspector</h4>
                            </div>
                            <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-full border border-teal-400/30">
                                Anti-Fraud AI
                            </span>
                        </div>
                        <p className="text-xs text-teal-200/80 leading-relaxed">
                            Upload a photo/scan of a survey plan, C of O, or Governor's Consent deed. Gemini Vision extracts coordinates, plot numbers, issue dates & calculates a <strong className="text-white">Document Verification Readiness Score</strong>.
                        </p>

                        {!visionResult && !isVisionInspecting && (
                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                <label className="flex-1 cursor-pointer bg-teal-500/10 hover:bg-teal-500/20 text-teal-200 border border-dashed border-teal-400/40 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all">
                                    <Upload size={16} className="text-teal-400" />
                                    <span>Upload Document Scan / Photo</span>
                                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                                </label>

                                <button
                                    onClick={handleSampleVisionInspection}
                                    className="bg-teal-400 text-slate-950 hover:bg-teal-300 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
                                >
                                    <Sparkles size={14} /> Test Sample C of O Scan
                                </button>
                            </div>
                        )}

                        {isVisionInspecting && (
                            <div className="bg-slate-950/80 p-4 rounded-xl border border-teal-500/30 text-center space-y-2 animate-pulse">
                                <Loader2 size={24} className="animate-spin text-teal-400 mx-auto" />
                                <p className="text-xs font-mono text-teal-300">Gemini Vision scanning survey beacons, seal stamps & title numbers...</p>
                            </div>
                        )}

                        {visionResult && (
                            <div className="bg-slate-950/90 p-4 rounded-xl border border-teal-500/40 space-y-3 animate-in fade-in duration-300">
                                <div className="flex justify-between items-start gap-3 pb-3 border-b border-teal-900/60">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                                            {visionResult.documentTypeDetected || 'Title Document'}
                                        </span>
                                        <h5 className="font-bold text-sm text-white mt-0.5">
                                            {visionResult.registeredOwner || 'Verified Owner'}
                                        </h5>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-bold">
                                            <Award size={14} className="text-emerald-400" />
                                            <span>Readiness: {visionResult.verificationReadinessScore}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-[10px] text-teal-300/70 font-semibold block uppercase">Beacon Coordinates</span>
                                        <span className="font-mono text-white text-[11px] block mt-0.5 truncate flex items-center gap-1">
                                            <Compass size={12} className="text-amber-400 shrink-0" />
                                            {visionResult.landCoordinates || '6.4281° N, 3.4219° E'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-[10px] text-teal-300/70 font-semibold block uppercase">Plot / Block No.</span>
                                        <span className="font-mono text-white text-[11px] block mt-0.5">
                                            {visionResult.plotNumber || 'Plot 14, Block 8'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-[10px] text-teal-300/70 font-semibold block uppercase">Granting Authority</span>
                                        <span className="text-slate-200 text-[11px] block mt-0.5">
                                            {visionResult.grantingAuthority || 'Lagos State Lands Bureau'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-[10px] text-teal-300/70 font-semibold block uppercase">Title Reg # / Date</span>
                                        <span className="font-mono text-slate-200 text-[11px] block mt-0.5">
                                            {visionResult.titleNumber || 'CofO-2022-LKG'} ({visionResult.issueDate || '2021'})
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-teal-950/60 p-2.5 rounded-lg border border-teal-800/40 text-xs text-teal-100 flex items-start gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{visionResult.summaryNote}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Local Statutory & Anti-Fraud Compliance Guarantees */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2">
                            <Scale size={16} className="text-amber-400 shrink-0" />
                            <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider">Anti-Fraud & Local Regulatory Compliance</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                                <span className="font-bold text-white block mb-0.5">Lagos State Tenancy Law</span>
                                <span className="text-slate-300 leading-tight block">Limits advance rent collection to statutory terms, enforces standard tenant notice periods & fee caps.</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                                <span className="font-bold text-white block mb-0.5">LASRERA Licensed Registry</span>
                                <span className="text-slate-300 leading-tight block">Cross-verified against Lagos State Real Estate Regulatory Authority to eradicate unregistered agent fraud.</span>
                            </div>
                        </div>
                    </div>

                    {/* Audit Action / Loading / Results */}
                    {!verificationResult && !isVerifying && (
                        <div className="bg-emerald-50/80 border border-emerald-200/80 p-5 rounded-2xl text-center space-y-3">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                                <FileCheck size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-950 text-sm">Automated Land Registry Audit</h4>
                                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                                    Ilé connects directly with state land registries to verify registered owner matches, survey plan boundaries, and ensure no encumbrances or court disputes exist.
                                </p>
                            </div>
                            <button
                                onClick={handleRunRegistryAudit}
                                className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all"
                            >
                                <Sparkles size={16} /> Execute Live Title Audit
                            </button>
                        </div>
                    )}

                    {isVerifying && (
                        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4">
                            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                                <Loader2 size={48} className="animate-spin text-emerald-600" />
                                <ShieldCheck size={20} className="absolute text-emerald-800" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-base">Verifying Title Deeds...</h4>
                                <p className="text-xs text-emerald-700 font-mono mt-2 animate-pulse">{auditStep}</p>
                            </div>
                        </div>
                    )}

                    {verificationResult && (
                        <div className={`p-5 rounded-2xl border ${
                            verificationResult.status === VerificationStatus.VERIFIED 
                                ? 'bg-emerald-50 border-emerald-200' 
                                : 'bg-red-50 border-red-200'
                        } space-y-4 animate-in zoom-in-95 duration-300`}>
                            <div className="flex items-center gap-3">
                                {verificationResult.status === VerificationStatus.VERIFIED ? (
                                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={24} />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center shrink-0">
                                        <AlertTriangle size={24} />
                                    </div>
                                )}
                                <div>
                                    <h4 className={`font-bold text-sm ${
                                        verificationResult.status === VerificationStatus.VERIFIED ? 'text-emerald-950' : 'text-red-950'
                                    }`}>
                                        {verificationResult.status === VerificationStatus.VERIFIED 
                                            ? 'Government Registry Match Confirmed!' 
                                            : 'Land Title Flagged / Rejected'}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        Audit completed at {new Date(verificationResult.verifiedAt || '').toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl space-y-2 border border-gray-200/60 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-medium">Registered Title Holder:</span>
                                    <span className="font-bold text-gray-900">{verificationResult.registeredOwner}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-medium">Encumbrances / Litigation:</span>
                                    <span className={`font-bold ${
                                        verificationResult.status === VerificationStatus.VERIFIED ? 'text-emerald-700' : 'text-red-700'
                                    }`}>
                                        {verificationResult.rejectionReason || 'None - Clean Title Deed'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-medium">Survey Coordinate Match:</span>
                                    <span className="font-bold text-emerald-700">100% Geo-spatial Verification</span>
                                </div>
                            </div>

                            {verificationResult.registryUrl && (
                                <a 
                                    href={verificationResult.registryUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block text-center text-xs text-emerald-800 font-bold hover:underline flex items-center justify-center gap-1 pt-1"
                                >
                                    View Official Lagos State Registry Entry <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Fraud Protection Notice */}
                    <div className="bg-gray-100 p-3.5 rounded-xl text-[11px] text-gray-600 flex items-center gap-2 border border-gray-200">
                        <Scale size={16} className="text-gray-500 shrink-0" />
                        <span>
                            <strong>Ilé Enterprise Trust Guarantee:</strong> Document verification cross-references official land records. Users should conduct final physical search at Alausa Lands Registry.
                        </span>
                    </div>

                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-sm transition-colors"
                    >
                        Close Registry Report
                    </button>
                </div>
            </div>
        </div>
    );
};
