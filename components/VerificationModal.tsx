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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Intro, 2: vNIN, 3: Selfie, 4: Success
  const [vNIN, setVNIN] = useState('');
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
            const result = await submitIdentityVerification(user.id, vNIN, imageBase64);
            if (result.success && result.data) {
                onSuccess(result.data);
                setStep(4);
            } else {
                setError(result.message || "Verification failed.");
                setStep(2); // Go back to try again
            }
        } catch (e) {
            setError("Network error. Please try again.");
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

            {/* STEP 2: vNIN INPUT */}
            {step === 2 && (
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Virtual NIN (vNIN)</label>
                    <input 
                        type="text" 
                        maxLength={16}
                        placeholder="Enter 16-digit vNIN"
                        value={vNIN}
                        onChange={(e) => setVNIN(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-4 border border-gray-300 rounded-xl text-lg tracking-widest font-mono mb-4 focus:border-primary outline-none"
                    />
                    <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 mb-6">
                        <strong>How to get it:</strong> Dial <code>*346*3*YourNIN*121021#</code> (Enterprise ID for Ilé). 
                        Do <strong>NOT</strong> use your raw 11-digit NIN.
                    </div>
                    <button 
                        onClick={() => setStep(3)}
                        disabled={vNIN.length !== 16}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50"
                    >
                        Continue to Selfie
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