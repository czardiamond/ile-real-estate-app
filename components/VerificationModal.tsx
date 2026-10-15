import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { User } from '../types';

interface VerificationModalProps {
  user: User;
  onClose: () => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <section className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
      <header className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Identity verification unavailable</h2>
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
      </header>
      <div className="p-6">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
        <p className="text-sm leading-relaxed text-gray-700">Ilé has not connected an identity-verification provider. NIN, vNIN, BVN, CAC identifiers and biometric captures are not requested or checked by this app.</p>
        <p className="text-sm leading-relaxed text-gray-700 mt-3">No identity badge or verification result is issued here. Do not send identity numbers or biometric information through property enquiries.</p>
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-gray-900 text-white font-bold py-3">Close</button>
      </div>
    </section>
  </div>
);

export default VerificationModal;
