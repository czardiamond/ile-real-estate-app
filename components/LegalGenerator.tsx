import React, { useState } from 'react';
import { Property } from '../types';
import { generateTenancyAgreement } from '../services/geminiService';
import { FileText, Download, X, Loader2, PenTool } from 'lucide-react';

interface LegalGeneratorProps {
    property: Property;
    onClose: () => void;
}

const LegalGenerator: React.FC<LegalGeneratorProps> = ({ property, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [agreementText, setAgreementText] = useState<string | null>(null);
    const [tenantName, setTenantName] = useState('');
    const [landlordName, setLandlordName] = useState('');
    const [duration, setDuration] = useState('');
    const [error, setError] = useState('');
    const rentPeriod = property.period === 'per year' || property.period === 'per month' ? property.period : '';

    const handleGenerate = async () => {
        if (!tenantName.trim() || !landlordName.trim() || !duration.trim() || !rentPeriod) {
            setError('Provide both parties’ names and the agreed duration. Rental drafts are available only for listings with a monthly or yearly price.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const address = [property.location.address, property.location.area, property.location.state].filter(Boolean).join(', ');
            const text = await generateTenancyAgreement(tenantName.trim(), landlordName.trim(), address, property.price, rentPeriod, duration.trim());
            setAgreementText(text);
        } catch {
            setError('The AI service could not create this draft. Check server AI configuration and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        if (!agreementText) return;
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            setError('The browser blocked the print window. Allow pop-ups for this site and try again.');
            return;
        }
        const escapedText = agreementText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ilé AI Rental Draft</title><style>body{font:16px/1.6 Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#222}pre{white-space:pre-wrap;font:inherit}h1{font:700 20px Arial,sans-serif;margin-bottom:24px}.notice{font:12px/1.5 Arial,sans-serif;border:1px solid #d9a441;padding:12px;margin-bottom:24px}@media print{body{margin:0 auto}}</style></head><body><h1>Ilé AI — Non-binding rental draft</h1><div class="notice">AI-generated starting point only. Not legal advice and not confirmed as compliant with current law. Have a qualified lawyer review it before use.</div><pre>${escapedText}</pre></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        window.setTimeout(() => printWindow.print(), 250);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Header */}
                <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="text-secondary" /> Ilé Legal Draftsman
                        </h2>
                        <p className="text-gray-400 text-xs">AI-assisted rental template — lawyer review required</p>
                    </div>
                    <button onClick={onClose} aria-label="Close agreement draft" className="bg-gray-800 p-2 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {!agreementText ? (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-sm">
                                <div className="p-2 bg-amber-100 rounded-lg shrink-0 text-amber-700">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-950 text-sm mb-1">Important Legal Disclaimer</h4>
                                    <p className="leading-relaxed">
                                        AI-generated starting point only. Ilé does not provide legal advice and this draft is not confirmed as compliant with current law. Have a qualified legal practitioner review all terms before signing or making any payment.
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tenant Name (You)</label>
                                    <input 
                                        type="text"
                                        required
                                        value={tenantName} 
                                        onChange={(e) => setTenantName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Landlord / Agency legal name</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="Enter the agreed legal name"
                                        value={landlordName} 
                                        onChange={(e) => setLandlordName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                <h4 className="font-bold text-gray-700">Deal Terms</h4>
                                <ul className="text-sm space-y-2 text-gray-600">
                                    <li className="flex justify-between gap-3"><span>Property:</span> <span className="font-medium text-right">{property.title}</span></li>
                                    <li className="flex justify-between gap-3"><span>Seller-listed rent:</span> <span className="font-medium text-right">₦{property.price.toLocaleString()} {rentPeriod || '(price period unavailable)'}</span></li>
                                    <li className="flex justify-between gap-3"><span>Location supplied:</span> <span className="font-medium text-right">{[property.location.area, property.location.state].filter(Boolean).join(', ') || 'Not provided'}</span></li>
                                </ul>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Agreed duration</label>
                                    <input type="text" required value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="For example, 12 months" className="w-full p-3 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            {!rentPeriod && <div className="bg-gray-100 border border-gray-200 p-3 rounded-lg text-xs text-gray-700">A rental price period (per month or per year) is required. Outright sale listings do not support this rental draft.</div>}
                            {error && <div role="alert" className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800">{error}</div>}

                            <button 
                                onClick={handleGenerate}
                                disabled={isLoading || !rentPeriod || !tenantName.trim() || !landlordName.trim() || !duration.trim()}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center gap-2 shadow-lg"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <PenTool size={20} />}
                                {isLoading ? 'Drafting template…' : 'Generate rental draft'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Persistent Legal Warning Header Banner */}
                            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                                <span className="font-semibold">
                                    <strong>Legal disclaimer:</strong> AI starting point only — not legal advice and not confirmed as compliant with current law. Consult a qualified legal practitioner before using it.
                                </span>
                                <span className="text-[10px] bg-amber-200/60 text-amber-900 font-bold px-2 py-0.5 rounded">
                                    Non-binding draft
                                </span>
                            </div>

                            <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap font-serif bg-white p-8 border border-gray-200 shadow-sm min-h-[450px] rounded-xl text-gray-800 leading-relaxed relative">
                                    {agreementText}

                                    {/* Document Disclaimer Stamp */}
                                    <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 text-[11px] text-gray-500 font-sans italic bg-gray-50 p-4 rounded-lg">
                                        <p className="font-bold text-gray-700 not-italic uppercase tracking-wider mb-1">Notice & Disclaimer</p>
                                        This rental template was generated with AI for review. Ilé and its affiliates do not provide legal advice or represent either party. Independently verify every detail and consult a qualified legal practitioner before use.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {agreementText && (
                    <div className="p-4 bg-white border-t border-gray-200 flex flex-wrap gap-3 items-center">
                         <button 
                            onClick={() => setAgreementText(null)}
                            className="px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-lg text-xs"
                        >
                            Edit Details
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 bg-secondary text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Download size={16} /> Print / Save PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegalGenerator;
