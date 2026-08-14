import React, { useState } from 'react';
import { Lead, Property } from '../types';
import { analyzeBuyerIntentFromChatLogs, BuyerIntentAnalysis } from '../services/geminiService';
import { Sparkles, X, BrainCircuit, CheckCircle, AlertTriangle, MessageSquare, TrendingUp, Copy, Check, Send, ShieldCheck, Flame, Loader2, DollarSign, Clock } from 'lucide-react';

interface BuyerIntentModalProps {
  lead: Lead;
  property?: Property;
  onClose: () => void;
}

const DEFAULT_CHAT_LOGS: Record<string, string> = {
  default: `Buyer: Hi, I saw your listing for the property in Lekki Phase 1. Is the Governor Consent title fully verified?
Agent: Hello! Yes, the Governor's Consent is verified with Lagos State Land Registry.
Buyer: Fantastic. My bank has approved my mortgage financing for up to ₦180M. Can we schedule an inspection this Saturday at 10 AM?
Agent: Absolutely, Saturday 10 AM works. I will have the key and title copies ready for you.
Buyer: Perfect. If the structural inspection passes, I am ready to pay the 10% escrow deposit immediately.`
};

export const BuyerIntentModal: React.FC<BuyerIntentModalProps> = ({ lead, property, onClose }) => {
  const [chatLogInput, setChatLogInput] = useState<string>(
    DEFAULT_CHAT_LOGS[lead.id] || `Buyer: Hello! I am interested in ${property?.title || 'this property'}. What is the last price?
Agent: Hi ${lead.name}, thank you for reaching out! The price is ₦${lead.budget.toLocaleString()}. We offer flexible payment plans.
Buyer: Okay, I have cash available and would like to inspect the property this weekend if possible. Does it have 24/7 power and borehole water treatment?
Agent: Yes, it features backup solar power, central generator, and treated borehole water.
Buyer: Excellent. Send me the location pin and title document summary so my lawyer can review before our inspection.`
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<BuyerIntentAnalysis | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const res = await analyzeBuyerIntentFromChatLogs(
        lead.name,
        property?.title || 'Property Listing',
        lead.budget || property?.price || 150000000,
        chatLogInput
      );
      setAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-outline-variant/30 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low rounded-t-3xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <BrainCircuit size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-on-surface">AI Buyer Intent Score Analyzer</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-700 dark:text-purple-300">
                  Lead Intelligence
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Analyzing buyer chat logs for <strong className="text-on-surface">{lead.name}</strong> • Budget: ₦{lead.budget.toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6">
          {/* Chat Transcript Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <MessageSquare size={14} className="text-primary" /> Conversation Chat Log Transcript
              </label>
              <span className="text-[11px] text-on-surface-variant">Paste WhatsApp, In-App or SMS logs</span>
            </div>

            <textarea
              value={chatLogInput}
              onChange={(e) => setChatLogInput(e.target.value)}
              rows={5}
              placeholder="Paste conversation transcript between buyer and agent..."
              className="w-full p-3.5 bg-surface-container-low border border-outline-variant/30 rounded-2xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono leading-relaxed"
            />

            <button
              onClick={handleRunAnalysis}
              disabled={loading || !chatLogInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Evaluating Buyer Intent Signals with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Analyze Chat Log & Calculate Buyer Intent Score</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Score Metric Header */}
              <div className="p-5 bg-gradient-to-r from-surface-container-low via-purple-500/5 to-surface-container rounded-2xl border border-purple-500/20 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 flex items-center gap-4 border-r-0 md:border-r border-outline-variant/20 pr-4">
                  <div className="relative w-20 h-20 rounded-full bg-surface-container flex items-center justify-center border-4 border-purple-500/30 shadow-inner shrink-0">
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {analysis.score}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                      Intent Score
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide mt-1 ${
                        analysis.intentTier === 'HOT_LEAD'
                          ? 'bg-rose-500 text-white'
                          : analysis.intentTier === 'WARM_PROSPECT'
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {analysis.intentTier === 'HOT_LEAD' && '🔥 Hot High-Intent Buyer'}
                      {analysis.intentTier === 'WARM_PROSPECT' && '🟡 Warm Qualified Prospect'}
                      {analysis.intentTier === 'COLD_INQUIRY' && '❄️ Cold Window Shopper'}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-1">
                  <h4 className="font-bold text-sm text-on-surface">Executive Lead Assessment</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              {/* Signals & Readiness Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Financial & Timeline */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                    <DollarSign size={16} className="text-emerald-500" /> Financial Readiness & Budget
                  </div>
                  <p className="text-xs text-on-surface-variant bg-surface p-3 rounded-xl border border-outline-variant/10">
                    {analysis.financialReadiness}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface pt-2">
                    <Clock size={16} className="text-amber-500" /> Purchase Urgency & Timeline
                  </div>
                  <p className="text-xs text-on-surface-variant bg-surface p-3 rounded-xl border border-outline-variant/10">
                    {analysis.urgencyLevel}
                  </p>
                </div>

                {/* Detected Buying Signals */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                    <Flame size={16} className="text-rose-500" /> Detected Buying Intent Signals
                  </div>

                  <ul className="space-y-2">
                    {analysis.keyIntentSignals.map((signal, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-on-surface bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>

                  {analysis.perceivedRisks.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-1">
                        Hesitations / Objections to Address:
                      </span>
                      <ul className="space-y-1">
                        {analysis.perceivedRisks.map((risk, idx) => (
                          <li key={idx} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Closing Response Script */}
              <div className="p-4 bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-surface rounded-2xl border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} /> AI Recommended Agent Closing Response
                  </span>

                  <button
                    onClick={() => handleCopyScript(analysis.recommendedClosingScript)}
                    className="px-3 py-1 bg-surface hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface rounded-xl transition-all flex items-center gap-1.5"
                  >
                    {copiedScript ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiedScript ? 'Copied!' : 'Copy Response'}</span>
                  </button>
                </div>

                <p className="text-xs text-on-surface font-medium italic bg-surface/80 p-3 rounded-xl border border-outline-variant/20 leading-relaxed">
                  "{analysis.recommendedClosingScript}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
