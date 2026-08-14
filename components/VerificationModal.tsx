import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { submitIdentityVerification } from '../services/verificationService';
import { User, VerificationData } from '../types';

interface VerificationModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (data: VerificationData) => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ user, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Intro, 2: Gov ID Input, 3: Liveness Selfie, 4: Success
  const [idType, setIdType] = useState<'VNIN' | 'NIN' | 'BVN' | 'CAC'>('VNIN');
  const [idNumber, setIdNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Step 3: Initialize Camera
  useEffect(() => {
    if (step === 3) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const isInputValid = () => {
    const cleaned = idNumber.trim();
    if (idType === 'VNIN') return cleaned.length === 16 && /^\d+$/.test(cleaned);
    if (idType === 'NIN') return cleaned.length === 11 && /^\d+$/.test(cleaned);
    if (idType === 'BVN') return cleaned.length === 11 && /^\d+$/.test(cleaned);
    if (idType === 'CAC') return cleaned.length >= 6;
    return false;
  };

  const captureAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Draw video frame to canvas
    const context = canvasRef.current.getContext('2d');
    if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 300);
        const imageBase64 = canvasRef.current.toDataURL('image/jpeg');
        
        stopCamera();
        setIsLoading(true);
        setError('');

        try {
            const result = await submitIdentityVerification(user.id, idNumber, imageBase64, idType);
            if (result.success && result.data) {
                onSuccess(result.data);
                setStep(4);
            } else {
                setError(result.message || "Government ID verification failed.");
                setStep(2); // Go back to try again
            }
        } catch (e) {
            setError("Network error contacting NIMC/NIBSS verification server. Please try again.");
            setStep(2);
        } finally {
            setIsLoading(false);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 z-10">
            <X size={24} />
        </button>

        {/* Header Progress */}
        <div className="bg-gray-50 p-6 border-b border-gray-100 text-center">
            <div className="flex justify-center mb-4">
                <div className={`w-3 h-3 rounded-full mx-1 ${step >= 1 ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full mx-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full mx-1 ${step >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full mx-1 ${step >= 4 ? 'bg-primary' : 'bg-gray-300'}`} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
                {step === 1 && "Identity Verification"}
                {step === 2 && "Enter Virtual NIN"}
                {step === 3 && "Liveness Check"}
                {step === 4 && "Verification Complete"}
            </h2>
        </div>

        <div className="p-6">
            {/* ERROR DISPLAY */}
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* STEP 1: INTRO */}
            {step === 1 && (
                <div className="text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={40} className="text-primary" />
                    </div>
                    <p className="text-gray-600 mb-6">
                        To protect our community, Ilé requires all agents to be verified. 
                        We use <strong>NIMC Virtual NIN</strong> and <strong>Facial Biometrics</strong> to ensure trust.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-xl text-left mb-6">
                        <h4 className="text-sm font-bold text-blue-800 mb-2">Why verify?</h4>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc pl-4">
                            <li>Get the <span className="font-bold">Green Shield</span> badge.</li>
                            <li>List unlimited properties.</li>
                            <li>Build trust with clients instantly.</li>
                        </ul>
                    </div>
                    <button 
                        onClick={() => setStep(2)}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90"
                    >
                        Start Verification
                    </button>
                </div>
            )}

            {/* STEP 2: GOV ID SELECTION & INPUT */}
            {step === 2 && (
                <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Select Government ID Method
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => { setIdType('VNIN'); setIdNumber(''); setError(''); }}
                            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                idType === 'VNIN' 
                                ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Virtual NIN (vNIN)
                            <span className="block text-[10px] text-gray-500 font-normal mt-0.5">16-Digit NIMC Code</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIdType('NIN'); setIdNumber(''); setError(''); }}
                            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                idType === 'NIN' 
                                ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            Raw NIN Number
                            <span className="block text-[10px] text-gray-500 font-normal mt-0.5">11-Digit NIMC NIN</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIdType('BVN'); setIdNumber(''); setError(''); }}
                            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                idType === 'BVN' 
                                ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            NIBSS BVN
                            <span className="block text-[10px] text-gray-500 font-normal mt-0.5">11-Digit Bank Number</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIdType('CAC'); setIdNumber(''); setError(''); }}
                            className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                idType === 'CAC' 
                                ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            CAC Registration
                            <span className="block text-[10px] text-gray-500 font-normal mt-0.5">Company RC / BN</span>
                        </button>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-700">
                                {idType === 'VNIN' && "16-Digit NIMC Virtual NIN (vNIN)"}
                                {idType === 'NIN' && "11-Digit NIMC Raw National Identity Number (NIN)"}
                                {idType === 'BVN' && "11-Digit NIBSS Bank Verification Number (BVN)"}
                                {idType === 'CAC' && "CAC Business Registration Number (RC/BN)"}
                            </label>
                            <span className="text-[10px] font-mono text-primary font-bold">
                                {idNumber.length} {idType === 'VNIN' ? '/ 16' : idType === 'NIN' || idType === 'BVN' ? '/ 11' : ''}
                            </span>
                        </div>
                        <input 
                            type="text" 
                            maxLength={idType === 'VNIN' ? 16 : idType === 'NIN' || idType === 'BVN' ? 11 : 15}
                            placeholder={
                                idType === 'VNIN' ? "1234 5678 9012 3456" :
                                idType === 'NIN' ? "11223344556" :
                                idType === 'BVN' ? "22114433556" : "RC123456"
                            }
                            value={idNumber}
                            onChange={(e) => {
                                const val = idType === 'CAC' ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '');
                                setIdNumber(val);
                            }}
                            className="w-full p-3.5 border border-gray-300 rounded-xl text-base tracking-wider font-mono mb-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900">
                        {idType === 'VNIN' && (
                            <span><strong>How to generate vNIN:</strong> Dial <code>*346*3*YourNIN*121021#</code> from your registered phone number. Generates secure 16-digit NIMC token for Ilé.</span>
                        )}
                        {idType === 'NIN' && (
                            <span><strong>NIMC Portal Direct Verification:</strong> Your 11-digit NIN will be checked against the official NIMC database checksum gateway.</span>
                        )}
                        {idType === 'BVN' && (
                            <span><strong>NIBSS Portal Check:</strong> Your 11-digit BVN will be cross-checked with NIBSS verification service.</span>
                        )}
                        {idType === 'CAC' && (
                            <span><strong>CAC Business Verification:</strong> Enter your official Corporate Affairs Commission RC or BN number for company identity check.</span>
                        )}
                    </div>

                    <button 
                        onClick={() => setStep(3)}
                        disabled={!isInputValid()}
                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md mt-2"
                    >
                        Proceed to Biometric Liveness Check
                    </button>
                </div>
            )}

            {/* STEP 3: LIVENESS CHECK */}
            {step === 3 && (
                <div className="flex flex-col items-center">
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary mb-6 bg-black">
                        {isLoading ? (
                             <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm z-20">
                                <div className="text-center text-white">
                                    <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                                    <span className="text-sm font-bold">Verifying Biometrics...</span>
                                </div>
                             </div>
                        ) : null}
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                        <canvas ref={canvasRef} width="300" height="300" className="hidden" />
                    </div>
                    <p className="text-center text-gray-500 text-sm mb-6">
                        Position your face in the circle. Make sure you are in a well-lit area.
                    </p>
                    <button 
                        onClick={captureAndSubmit}
                        disabled={isLoading}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90"
                    >
                        <Camera size={20} /> Capture & Verify
                    </button>
                </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 4 && (
                <div className="text-center py-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">You are Verified!</h3>
                    <p className="text-gray-600 mb-6">
                        Your identity has been confirmed. You now have the <strong>Green Shield</strong> badge on all your listings.
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
                    >
                        Go to Dashboard
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;