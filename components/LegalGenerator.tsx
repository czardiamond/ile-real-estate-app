import React, { useState } from 'react';
import { Property, User } from '../types';
import { generateTenancyAgreement } from '../services/geminiService';
import { sendGmailEmail } from '../services/gmailService';
import { FileText, Download, CheckCircle, Loader2, PenTool, Mail, Send, CheckCircle2 } from 'lucide-react';

interface LegalGeneratorProps {
    property: Property;
    user: User;
    onClose: () => void;
}

const LegalGenerator: React.FC<LegalGeneratorProps> = ({ property, user, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [agreementText, setAgreementText] = useState<string | null>(null);
    const [tenantName, setTenantName] = useState(user.name);
    const [landlordName, setLandlordName] = useState('Lekki Gardens Ltd'); // Mocked agent/landlord
    const [isSendingGmail, setIsSendingGmail] = useState(false);
    const [gmailSent, setGmailSent] = useState(false);

    const handleSendGmail = async () => {
        if (!agreementText) return;
        setIsSendingGmail(true);
        const subject = `[Ilé Legal Draft] Tenancy Agreement for ${property.title}`;
        await sendGmailEmail({
            to: user.email || 'tenant@ile.app',
            subject,
            bodyText: agreementText,
            bodyHtml: `<div style="font-family: serif; white-space: pre-wrap;">${agreementText}</div>`
        });
        setIsSendingGmail(false);
        setGmailSent(true);
        setTimeout(() => setGmailSent(false), 4000);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        const text = await generateTenancyAgreement(tenantName, landlordName, `${property.location.address}, ${property.location.area}`, property.price);
        setAgreementText(text);
        setIsLoading(false);
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
                        <p className="text-gray-400 text-xs">AI-Powered Tenancy Agreement Generator</p>
                    </div>
                    <button onClick={onClose} className="bg-gray-800 p-2 rounded-full hover:bg-gray-700">
                        <CheckCircle size={20} />
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
                                        Draft provided for guidance and informational purposes only. Ilé is a technology platform and does not provide formal legal advice. Always consult a qualified legal professional (registered with the Nigerian Bar Association) before signing or making any financial commitments.
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Tenant Name (You)</label>
                                    <input 
                                        type="text" 
                                        value={tenantName} 
                                        onChange={(e) => setTenantName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Landlord / Agency</label>
                                    <input 
                                        type="text" 
                                        value={landlordName} 
                                        onChange={(e) => setLandlordName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-gray-700 mb-2">Deal Terms</h4>
                                <ul className="text-sm space-y-2 text-gray-600">
                                    <li className="flex justify-between"><span>Property:</span> <span className="font-medium">{property.title}</span></li>
                                    <li className="flex justify-between"><span>Rent:</span> <span className="font-medium">₦{property.price.toLocaleString()}</span></li>
                                    <li className="flex justify-between"><span>Duration:</span> <span className="font-medium">1 Year (Standard)</span></li>
                                </ul>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center gap-2 shadow-lg"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <PenTool size={20} />}
                                {isLoading ? 'Drafting Contract...' : 'Generate Agreement Now'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Persistent Legal Warning Header Banner */}
                            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                                <span className="font-semibold">
                                    ⚠️ <strong>Legal Disclaimer:</strong> Draft provided for guidance. Consult a legal professional before signing or making payments.
                                </span>
                                <span className="text-[10px] bg-amber-200/60 text-amber-900 font-bold px-2 py-0.5 rounded">
                                    Non-Binding AI Draft
                                </span>
                            </div>

                            <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap font-serif bg-white p-8 border border-gray-200 shadow-sm min-h-[450px] rounded-xl text-gray-800 leading-relaxed relative">
                                    {agreementText}

                                    {/* Document Disclaimer Stamp */}
                                    <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 text-[11px] text-gray-500 font-sans italic bg-gray-50 p-4 rounded-lg">
                                        <p className="font-bold text-gray-700 not-italic uppercase tracking-wider mb-1">Notice & Disclaimer</p>
                                        This tenancy agreement template was generated by Ilé AI Assistant for guidance purposes only. Neither Ilé nor its affiliates provide legal advice or act as legal representatives. Users must independently verify all clauses and consult a certified legal practitioner before execution.
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
                            onClick={handleSendGmail}
                            disabled={isSendingGmail}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                        >
                            {isSendingGmail ? <Loader2 size={16} className="animate-spin" /> : gmailSent ? <CheckCircle2 size={16} className="text-emerald-300" /> : <Mail size={16} />}
                            {gmailSent ? 'Sent via Gmail!' : 'Send Draft via Gmail'}
                        </button>
                        <button className="flex-1 bg-secondary text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
                            <Download size={16} /> Download PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegalGenerator;
