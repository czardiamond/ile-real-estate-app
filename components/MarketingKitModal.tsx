
import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { X, Copy, Check, Linkedin, Instagram, MessageCircle, Sparkles, Loader2, Share2 } from 'lucide-react';
import { generateMarketingKit } from '../services/geminiService';

interface MarketingKitModalProps {
    property: Property;
    onClose: () => void;
}

const MarketingKitModal: React.FC<MarketingKitModalProps> = ({ property, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [kit, setKit] = useState<{ linkedin: string, instagram: string, whatsapp: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        const loadKit = async () => {
            setLoading(true);
            const data = await generateMarketingKit(property);
            setKit(data);
            setLoading(false);
        };
        loadKit();
    }, [property]);

    const handleCopy = (text: string, platform: string) => {
        navigator.clipboard.writeText(text);
        setCopied(platform);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <Sparkles size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-on-surface">AI Marketing Kit</h3>
                            <p className="text-sm text-on-surface-variant line-clamp-1">{property.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 size={48} className="text-primary animate-spin" />
                            <p className="text-on-surface-variant font-medium animate-pulse">Ilé is crafting your posts...</p>
                        </div>
                    ) : kit ? (
                        <>
                            {/* LinkedIn */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-[#0A66C2] font-bold">
                                        <Linkedin size={20} fill="currentColor" />
                                        <span>LinkedIn Post</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(kit.linkedin, 'linkedin')}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary-container transition-all text-xs font-bold"
                                    >
                                        {copied === 'linkedin' ? <Check size={14} /> : <Copy size={14} />}
                                        {copied === 'linkedin' ? 'Copied' : 'Copy Text'}
                                    </button>
                                </div>
                                <div className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                                    {kit.linkedin}
                                </div>
                            </div>

                            {/* Instagram */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-[#E4405F] font-bold">
                                        <Instagram size={20} />
                                        <span>Instagram Caption</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(kit.instagram, 'instagram')}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary-container transition-all text-xs font-bold"
                                    >
                                        {copied === 'instagram' ? <Check size={14} /> : <Copy size={14} />}
                                        {copied === 'instagram' ? 'Copied' : 'Copy Text'}
                                    </button>
                                </div>
                                <div className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                                    {kit.instagram}
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-[#25D366] font-bold">
                                        <MessageCircle size={20} fill="currentColor" />
                                        <span>WhatsApp Status / Broadcast</span>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(kit.whatsapp, 'whatsapp')}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary-container transition-all text-xs font-bold"
                                    >
                                        {copied === 'whatsapp' ? <Check size={14} /> : <Copy size={14} />}
                                        {copied === 'whatsapp' ? 'Copied' : 'Copy Text'}
                                    </button>
                                </div>
                                <div className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                                    {kit.whatsapp}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-red-500">Failed to generate marketing kit. Please try again.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-surface-container-low border-t border-outline-variant/20 flex justify-center">
                    <p className="text-xs text-on-surface-variant flex items-center gap-2">
                        <Share2 size={14} /> Posts are optimized for engagement in the Nigerian market.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MarketingKitModal;
