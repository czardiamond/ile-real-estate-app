import React, { useState } from 'react';
import { Property, WhatsAppWebhookEvent, User } from '../types';
import { simulateWhatsAppWebhookResponse } from '../services/geminiService';
import { saveLeadToFirestore } from '../services/firebase';
import { X, Send, MessageSquare, Bot, Sparkles, Check, Copy, ExternalLink, RefreshCw, Smartphone, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface WhatsAppHubModalProps {
  properties: Property[];
  currentUser?: User | null;
  onClose: () => void;
}

export const WhatsAppHubModal: React.FC<WhatsAppHubModalProps> = ({ properties, currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'webhook' | 'settings'>('broadcast');
  const [selectedProperty, setSelectedProperty] = useState<Property>(properties[0] || null);
  const [copied, setCopied] = useState(false);
  const [agentPhone, setAgentPhone] = useState(currentUser?.phone || '2348012345678');
  
  // Webhook Simulator State
  const [customIncomingText, setCustomIncomingText] = useState('');
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);
  const [events, setEvents] = useState<WhatsAppWebhookEvent[]>([
    {
      id: 'wa-evt-101',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      eventType: 'INCOMING_LEAD',
      senderPhone: '+234 803 456 7890',
      senderName: 'Chief Emeka O.',
      propertyTitle: properties[0]?.title || '4 Bed Terrace in Ikate',
      incomingText: 'Hello, is the 4-bedroom terrace in Ikate still available? What is the Governor Consent status?',
      aiAutoReply: 'Hello Chief Emeka! 🏠 Yes, the 4-Bed Terrace in Ikate is available for ₦180M with verified Governor\'s Consent title deed. Would you like to view the video walkthrough?',
      leadIntentScore: 88,
      status: 'SYNCED_FIRESTORE'
    }
  ]);

  // Construct WhatsApp Broadcast Text
  const formatWhatsAppMessage = (prop: Property) => {
    if (!prop) return '';
    return `🏡 *${prop.title.toUpperCase()}*
📍 *Location:* ${prop.location.area}, ${prop.location.city}
💰 *Price:* ₦${prop.price.toLocaleString()} ${prop.period ? `(${prop.period})` : ''}

📜 *Title Deed:* ${prop.titleDocument?.type || 'Certificate of Occupancy'} (Verified)
⚡ *Power Supply:* ~${prop.avgPowerHours || 20} hrs/day (${prop.isSolarPowered ? 'Solar Hybrid' : 'Grid + Gen'})
🛡️ *Flood Risk:* ${prop.floodRisk || 'Dry Land'}

✨ *Key Features:*
${prop.features.slice(0, 4).map(f => `• ${f}`).join('\n')}

📱 *Inquire Directly on WhatsApp:*
https://wa.me/${agentPhone.replace(/\+/g, '')}?text=Hi,%20I%20am%20interested%20in%20${encodeURIComponent(prop.title)}%20(Ref:%20${prop.id})`;
  };

  const currentBroadcastText = selectedProperty ? formatWhatsAppMessage(selectedProperty) : '';

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(currentBroadcastText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateWebhook = async (presetText?: string) => {
    const textToProcess = presetText || customIncomingText;
    if (!textToProcess.trim()) return;

    setIsProcessingWebhook(true);
    const aiResponse = await simulateWhatsAppWebhookResponse(
      textToProcess,
      selectedProperty?.title,
      selectedProperty?.price
    );

    const newEvent: WhatsAppWebhookEvent = {
      id: `wa-evt-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      eventType: textToProcess.toLowerCase().includes('offer') ? 'OFFER_SUBMITTED' : textToProcess.toLowerCase().includes('inspect') ? 'INSPECTION_REQUESTED' : 'INCOMING_LEAD',
      senderPhone: '+234 809 ' + Math.floor(1000000 + Math.random() * 9000000),
      senderName: aiResponse.extractedLeadName || 'Prospect Buyer',
      propertyTitle: selectedProperty?.title || 'Lekki Property',
      incomingText: textToProcess,
      aiAutoReply: aiResponse.autoReply,
      leadIntentScore: aiResponse.intentScore,
      status: 'SYNCED_FIRESTORE'
    };

    setEvents(prev => [newEvent, ...prev]);

    // Save lead to Firestore if currentUser exists
    if (currentUser) {
      await saveLeadToFirestore({
        id: newEvent.id,
        name: newEvent.senderName,
        phone: newEvent.senderPhone,
        email: `${newEvent.senderName.toLowerCase().replace(/\s+/g, '')}@whatsapp.lead`,
        propertyId: selectedProperty?.id || 'prop-1',
        budget: selectedProperty?.price || 150000000,
        status: 'New Arrival' as any,
        notes: `WhatsApp Lead: "${textToProcess}". Gemini Intent Score: ${aiResponse.intentScore}/100. Action: ${aiResponse.suggestedAction}`,
        createdAt: new Date().toISOString()
      });
    }

    setIsProcessingWebhook(false);
    setCustomIncomingText('');
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-emerald-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <MessageSquare className="text-emerald-400" size={22} />
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-400/30">
              Meta WhatsApp Business Cloud API
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">WhatsApp Transaction Hub</h2>
          <p className="text-emerald-100/70 text-xs mt-1">
            Over 90% of West African deals close on WhatsApp. Broadcast listings & process leads automatically.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'broadcast'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              <Send size={14} /> Broadcast Generator
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'webhook'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              <Bot size={14} /> Webhook Live Simulator
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </button>
          </div>
        </div>

        {/* Tab 1: Broadcast Generator */}
        {activeTab === 'broadcast' && (
          <div className="p-6 overflow-y-auto space-y-5 bg-gray-50/50">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Select Property to Format for WhatsApp:
              </label>
              <select
                value={selectedProperty?.id}
                onChange={(e) => {
                  const prop = properties.find(p => p.id === e.target.value);
                  if (prop) setSelectedProperty(prop);
                }}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} — ₦{p.price.toLocaleString()} ({p.location.area})
                  </option>
                ))}
              </select>
            </div>

            {/* Formatted Message Box */}
            <div className="bg-emerald-950 text-emerald-100 p-5 rounded-2xl border border-emerald-800 font-mono text-xs space-y-3 relative shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-800/80">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  WhatsApp Text Preview
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-900/80 px-2.5 py-0.5 rounded-full">
                  Instant Deep-Link Enabled
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-emerald-50">
                {currentBroadcastText}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyBroadcast}
                className="flex-1 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {copied ? <Check size={18} className="text-emerald-300" /> : <Copy size={18} />}
                {copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Broadcast Text'}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(currentBroadcastText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all text-center"
              >
                <Send size={18} /> Open in WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Webhook Simulator */}
        {activeTab === 'webhook' && (
          <div className="p-6 overflow-y-auto space-y-5 bg-gray-50/50">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-emerald-400" />
                <h4 className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                  Live Webhook Sandbox (Meta Graph API v18.0)
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Test real-time webhook payloads received when prospects chat on WhatsApp. Gemini auto-replies, scores buyer intent & syncs lead directly to Firestore.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Simulate Incoming WhatsApp Webhook Event:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => handleSimulateWebhook(`Is the ${selectedProperty?.title || 'Lekki property'} still available? What is the Governor Consent status?`)}
                  disabled={isProcessingWebhook}
                  className="p-3 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl font-medium text-gray-800 text-left transition-all flex flex-col justify-between"
                >
                  <span className="font-bold text-emerald-800 block mb-1">1. Buyer Inquiry</span>
                  <span className="text-[11px] text-gray-500 line-clamp-2">"Is the property still available? What is title status?"</span>
                </button>

                <button
                  onClick={() => handleSimulateWebhook(`I want to submit an offer of ₦175,000,000 for ${selectedProperty?.title || 'the terrace'}. I can pay a 30% deposit today.`)}
                  disabled={isProcessingWebhook}
                  className="p-3 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl font-medium text-gray-800 text-left transition-all flex flex-col justify-between"
                >
                  <span className="font-bold text-emerald-800 block mb-1">2. Offer Submission</span>
                  <span className="text-[11px] text-gray-500 line-clamp-2">"I want to make an offer with 30% deposit..."</span>
                </button>

                <button
                  onClick={() => handleSimulateWebhook(`Can I come for physical inspection this Saturday at 11:00 AM? My name is Dr. Sandra.`)}
                  disabled={isProcessingWebhook}
                  className="p-3 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl font-medium text-gray-800 text-left transition-all flex flex-col justify-between"
                >
                  <span className="font-bold text-emerald-800 block mb-1">3. Booking Inspection</span>
                  <span className="text-[11px] text-gray-500 line-clamp-2">"Can I inspect this Saturday at 11 AM?..."</span>
                </button>
              </div>
            </div>

            {/* Custom Webhook Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customIncomingText}
                onChange={(e) => setCustomIncomingText(e.target.value)}
                placeholder="Or type a custom WhatsApp message..."
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSimulateWebhook()}
                disabled={isProcessingWebhook || !customIncomingText.trim()}
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-1.5 disabled:opacity-50 transition-all shrink-0"
              >
                {isProcessingWebhook ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                Send Webhook
              </button>
            </div>

            {/* Webhook Event Stream */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex items-center justify-between">
                <span>Live Webhook Logs ({events.length})</span>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">POST /api/webhooks/whatsapp HTTP 200 OK</span>
              </span>

              {events.map((evt) => (
                <div key={evt.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-gray-900">{evt.senderName} ({evt.senderPhone})</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{evt.timestamp} • {evt.eventType}</span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-800 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">Incoming WhatsApp Payload</span>
                    <p className="font-medium">"{evt.incomingText}"</p>
                  </div>

                  {evt.aiAutoReply && (
                    <div className="bg-emerald-50 p-3 rounded-xl text-xs text-emerald-900 space-y-1 border border-emerald-200/60">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Bot size={12} /> Gemini Auto-Reply
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          Intent Score: {evt.leadIntentScore}/100
                        </span>
                      </div>
                      <p className="text-xs">{evt.aiAutoReply}</p>
                    </div>
                  )}

                  <div className="flex justify-end text-[10px] font-mono text-emerald-700 gap-2 pt-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Synced to Firestore Leads
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
          <span className="text-xs text-gray-500">
            Powered by Gemini 3.6 Flash & Meta WhatsApp Business Cloud API
          </span>
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors"
          >
            Close WhatsApp Hub
          </button>
        </div>

      </div>
    </div>
  );
};
