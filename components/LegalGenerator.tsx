import React, { useState } from 'react';
import { Property, User } from '../types';
import { generateTenancyAgreement } from '../services/geminiService';
import { FileText, Download, CheckCircle, Loader2, PenTool } from 'lucide-react';

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
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                                This tool uses AI to draft a standard <strong>Lagos State Tenancy Agreement</strong>. 
                                Please review with a real lawyer before signing.
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
                        <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap font-serif bg-white p-8 border border-gray-200 shadow-sm min-h-[500px]">
                                {agreementText}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {agreementText && (
                    <div className="p-4 bg-white border-t border-gray-200 flex gap-3">
                         <button 
                            onClick={() => setAgreementText(null)}
                            className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-lg"
                        >
                            Edit Details
                        </button>
                        <button className="flex-1 bg-secondary text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm">
                            <Download size={18} /> Download PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegalGenerator;
