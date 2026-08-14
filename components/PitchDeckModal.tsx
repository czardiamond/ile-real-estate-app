import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { DEFAULT_APPLIED_AI_DECK, createGoogleSlidesPresentation, PitchDeckData, PitchSlide } from '../services/googleSlidesService';
import { sendGmailEmail } from '../services/gmailService';
import { X, Presentation, FileText, Download, ExternalLink, Copy, Check, Sparkles, ChevronLeft, ChevronRight, Share2, Layers, Loader2, Building2, Globe, ShieldCheck, Mail, Send, CheckCircle2 } from 'lucide-react';

interface PitchDeckModalProps {
  property?: Property | null;
  onClose: () => void;
}

export const PitchDeckModal: React.FC<PitchDeckModalProps> = ({ property, onClose }) => {
  const [deckType, setDeckType] = useState<'applied_ai' | 'property_deck' | 'investor_deck'>('applied_ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deckData, setDeckData] = useState<PitchDeckData | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [copiedSlidesUrl, setCopiedSlidesUrl] = useState(false);
  const [copiedPdfUrl, setCopiedPdfUrl] = useState(false);

  // Gmail State
  const [showGmailBox, setShowGmailBox] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('applied-ai-lab@google.com');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // Generate customized deck slides based on selected deck type
  const getSlidesForType = (): PitchSlide[] => {
    if (deckType === 'property_deck' && property) {
      const docTypeStr = property.titleDocument ? property.titleDocument.type : 'Certificate of Occupancy (C of O)';
      const areaName = property.location.area || property.location.city;
      return [
        {
          title: property.title,
          subtitle: `Investment & Acquisition Pitch Deck | ₦${property.price.toLocaleString()}`,
          bullets: [
            `Prime Property Location: ${areaName}, ${property.location.city}`,
            `Verified Title Document: ${docTypeStr}`,
            `Property Type: ${property.type} | ${property.specs?.bedrooms || 'N/A'} Beds, ${property.specs?.bathrooms || 'N/A'} Baths`
          ],
          metrics: [
            { label: "Asking Price", value: `₦${(property.price / 1000000).toFixed(1)}M` },
            { label: "Verification", value: property.isVerified ? 'VERIFIED' : 'PENDING' },
            { label: "Flood Risk", value: property.floodRisk || 'Low Risk' }
          ],
          speakerNotes: `Presenting ${property.title}. Excellent yield opportunity in ${areaName}. Fully verified on Ilé Land Registry.`,
          bgGradient: "from-emerald-900 to-slate-900"
        },
        {
          title: "Property Features & High Spec Highlights",
          subtitle: "Key Value Drivers & Building Amenities",
          bullets: property.features.map(f => `• ${f}`).concat([
            `Land Size / Square Meters: ${property.specs?.sizeSqM || 450} sqm`,
            `Power & Infrastructure: ${property.smartMeterId ? 'Smart Prepaid Power Meter Installed' : '24/7 Serviced Utility Grid'}`
          ]),
          metrics: [
            { label: "Floor Size", value: `${property.specs?.sizeSqM || 450} sqm` },
            { label: "Est. ROI", value: "14.2% / yr" },
            { label: "Capital Growth", value: "18.5% YoY" }
          ],
          speakerNotes: "Highlighting premium finishings, smart meter telemetry, and verified documentation.",
          bgGradient: "from-teal-950 to-emerald-900"
        },
        {
          title: "Legal Title & Due Diligence Verification",
          subtitle: "100% Audited Title Registry Compliance",
          bullets: [
            `Title Document: ${docTypeStr}`,
            `Survey Plan Reference: LA/SURV/${property.id.toUpperCase()}/0892`,
            `Court Lis Pendens & Encumbrances: Clear (No Active Disputes)`,
            `Ilé Trust Rating: Verified Authentic with Digital Seal`
          ],
          metrics: [
            { label: "Registry Audit", value: "PASSED" },
            { label: "Lis Pendens", value: "CLEAR" },
            { label: "Title Grade", value: "AAA" }
          ],
          speakerNotes: "Title documents have passed automated Ministry of Lands verification with zero encumbrances.",
          bgGradient: "from-slate-900 to-emerald-950"
        },
        {
          title: "Financial Overview & Acquisition Terms",
          subtitle: "Flexible Payment Structure & Rental Projections",
          bullets: [
            `Outright Purchase Price: ₦${property.price.toLocaleString()}`,
            `Estimated Annual Rental Income: ₦${Math.round(property.price * 0.08).toLocaleString()} / year`,
            `Available Financing: Outright Transfer, Escrow Deposit, or Bank Mortgage`
          ],
          metrics: [
            { label: "Est. Rental Yield", value: "8.0%" },
            { label: "Payback Period", value: "12.5 Years" },
            { label: "Down Payment", value: "20%" }
          ],
          speakerNotes: "Strong cashflow projections supported by local rental demand metrics in Lagos highbrow district.",
          bgGradient: "from-emerald-950 to-gray-900"
        }
      ];
    }

    return DEFAULT_APPLIED_AI_DECK;
  };

  const handleGenerateDeck = async () => {
    setIsGenerating(true);
    const slides = getSlidesForType();
    const title = deckType === 'applied_ai' 
      ? 'Google Africa Applied AI Lab Application Pitch Deck — Ilé'
      : deckType === 'property_deck' && property
      ? `Investment Pitch Deck — ${property.title}`
      : 'Ilé Real Estate AI Platform — Investor Presentation';

    // Simulate short processing delay
    await new Promise(res => setTimeout(res, 800));

    const result = await createGoogleSlidesPresentation(title, slides);
    setDeckData(result);
    setIsGenerating(false);
    setActiveSlideIndex(0);
  };

  useEffect(() => {
    handleGenerateDeck();
  }, [deckType, property]);

  const copyToClipboard = (text: string, type: 'slides' | 'pdf') => {
    navigator.clipboard.writeText(text);
    if (type === 'slides') {
      setCopiedSlidesUrl(true);
      setTimeout(() => setCopiedSlidesUrl(false), 2000);
    } else {
      setCopiedPdfUrl(true);
      setTimeout(() => setCopiedPdfUrl(false), 2000);
    }
  };

  const handleSendGmail = async () => {
    if (!recipientEmail || !deckData) return;
    setIsSendingEmail(true);

    const subject = `[Ilé Platform] ${deckData.title}`;
    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #065f46;">${deckData.title}</h2>
        <p>Hello,</p>
        <p>Please find the generated pitch deck links for <strong>Ilé — AI-Native Real Estate Engine</strong> attached below:</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>📊 Google Slides Presentation:</strong></p>
          <p style="margin: 0 0 16px 0;"><a href="${deckData.slidesUrl}" style="color: #2563eb; font-weight: bold;">${deckData.slidesUrl}</a></p>
          <p style="margin: 0 0 8px 0;"><strong>📄 PDF Export Presentation:</strong></p>
          <p style="margin: 0;"><a href="${deckData.pdfUrl}" style="color: #059669; font-weight: bold;">${deckData.pdfUrl}</a></p>
        </div>
        <p style="font-size: 13px; color: #64748b;">Sent via Ilé Google Workspace & Gmail Integration.</p>
      </div>
    `;

    await sendGmailEmail({
      to: recipientEmail,
      subject,
      bodyText: `View Presentation: ${deckData.slidesUrl} | Download PDF: ${deckData.pdfUrl}`,
      bodyHtml,
    });

    setIsSendingEmail(false);
    setEmailSentSuccess(true);
    setTimeout(() => setEmailSentSuccess(false), 4000);
  };

  const currentSlide = deckData?.slides[activeSlideIndex] || DEFAULT_APPLIED_AI_DECK[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="bg-surface w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-outline-variant/30">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/20 flex flex-wrap justify-between items-center bg-surface-container-low gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Presentation size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-on-surface">Google Slides & PDF Pitch Deck</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">Generate shareable Google Slides link and downloadable PDF presentation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Deck Type Selectors */}
        <div className="px-6 py-3 bg-surface-container-lowest border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setDeckType('applied_ai')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                deckType === 'applied_ai'
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Globe size={15} />
              Google Africa Applied AI Lab Deck
            </button>

            {property && (
              <button
                onClick={() => setDeckType('property_deck')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  deckType === 'property_deck'
                    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Building2 size={15} />
                Property Investment Deck
              </button>
            )}

            <button
              onClick={() => setDeckType('investor_deck')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                deckType === 'investor_deck'
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Sparkles size={15} />
              Ilé Startup Investor Deck
            </button>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              Building Google Presentation & PDF...
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-container-lowest">

          {/* Direct Link Action Bar */}
          {deckData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Google Slides Link Box */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent rounded-2xl border border-amber-500/20 flex flex-col justify-between space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                      <Presentation size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Google Slides Link</h4>
                      <p className="text-[11px] text-on-surface-variant">Editable & shareable Google Presentation</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    Live Link
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={deckData.slidesUrl}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-xs font-mono border border-outline-variant/30 text-on-surface-variant truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(deckData.slidesUrl, 'slides')}
                    className="p-2 rounded-lg bg-surface hover:bg-surface-container transition-colors text-on-surface text-xs font-semibold flex items-center gap-1 border border-outline-variant/30"
                    title="Copy Google Slides Link"
                  >
                    {copiedSlidesUrl ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  <a
                    href={deckData.slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <ExternalLink size={14} /> Open
                  </a>
                </div>
              </div>

              {/* PDF Export Link Box */}
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-2xl border border-emerald-500/20 flex flex-col justify-between space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">PDF Presentation Link</h4>
                      <p className="text-[11px] text-on-surface-variant">High-resolution exportable PDF deck</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    PDF Document
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={deckData.pdfUrl}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-surface text-xs font-mono border border-outline-variant/30 text-on-surface-variant truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(deckData.pdfUrl, 'pdf')}
                    className="p-2 rounded-lg bg-surface hover:bg-surface-container transition-colors text-on-surface text-xs font-semibold flex items-center gap-1 border border-outline-variant/30"
                    title="Copy PDF Link"
                  >
                    {copiedPdfUrl ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                  <a
                    href={deckData.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 transition-colors text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Download size={14} /> Download PDF
                  </a>
                </div>
              </div>

              {/* Gmail Dispatch Box */}
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent rounded-2xl border border-blue-500/20 flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Dispatch via Gmail</h4>
                      <p className="text-[11px] text-on-surface-variant">Email pitch deck & PDF links directly via Gmail API</p>
                    </div>
                  </div>
                  {emailSentSuccess && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 size={14} /> Sent via Gmail!
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Recipient email (e.g., investor@fund.com)"
                    className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-surface text-xs font-medium border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={handleSendGmail}
                    disabled={isSendingEmail || !recipientEmail}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send via Gmail
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Interactive Slide Viewer Canvas */}
          {deckData && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                  <Layers size={16} className="text-emerald-600" />
                  <span>Slide {activeSlideIndex + 1} of {deckData.slides.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                    disabled={activeSlideIndex === 0}
                    className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-40 transition-colors text-on-surface"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setActiveSlideIndex(prev => Math.min(deckData.slides.length - 1, prev + 1))}
                    disabled={activeSlideIndex === deckData.slides.length - 1}
                    className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-40 transition-colors text-on-surface"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Individual Slide Display Canvas */}
              <div className={`relative aspect-[16/9] w-full rounded-3xl p-8 text-white bg-gradient-to-br ${currentSlide.bgGradient || 'from-emerald-950 to-slate-950'} shadow-2xl flex flex-col justify-between overflow-hidden border border-white/10`}>
                
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Slide Top Branding */}
                <div className="flex justify-between items-center z-10">
                  <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase text-emerald-400">
                    <Sparkles size={14} /> ILÉ REAL ESTATE AI ENGINE
                  </div>
                  <div className="text-[10px] font-mono opacity-60">
                    SLIDE {activeSlideIndex + 1} / {deckData.slides.length}
                  </div>
                </div>

                {/* Slide Main Content */}
                <div className="my-auto z-10 space-y-4 max-w-3xl">
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                    {currentSlide.title}
                  </h2>
                  {currentSlide.subtitle && (
                    <p className="text-sm md:text-base text-emerald-200/80 font-medium">
                      {currentSlide.subtitle}
                    </p>
                  )}

                  <div className="pt-2 space-y-2">
                    {currentSlide.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slide Metrics Footer Bar */}
                {currentSlide.metrics && currentSlide.metrics.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 z-10 pt-4 border-t border-white/10">
                    {currentSlide.metrics.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                        <div className="text-[10px] uppercase font-bold text-emerald-300/80">{m.label}</div>
                        <div className="text-base md:text-lg font-black text-white mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Speaker Notes */}
              {currentSlide.speakerNotes && (
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs text-on-surface-variant space-y-1">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-600" /> Speaker Notes & Key Context:
                  </div>
                  <p className="italic">{currentSlide.speakerNotes}</p>
                </div>
              )}

              {/* Slide Thumbnail Strip */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
                {deckData.slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`shrink-0 w-36 aspect-[16/9] rounded-xl p-2.5 text-left border transition-all flex flex-col justify-between text-[10px] ${
                      activeSlideIndex === idx
                        ? 'border-emerald-600 bg-emerald-950 text-white ring-2 ring-emerald-500/30'
                        : 'border-outline-variant/30 bg-surface-container text-on-surface-variant hover:border-outline-variant'
                    }`}
                  >
                    <div className="font-bold truncate">{s.title}</div>
                    <div className="text-[9px] opacity-70">Slide {idx + 1}</div>
                  </button>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-surface-container-low border-t border-outline-variant/20 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs text-on-surface-variant flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Ready for Google Africa Applied AI Lab submission</span>
          </div>

          <div className="flex items-center gap-3">
            {deckData && (
              <>
                <a
                  href={deckData.slidesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-2 border border-amber-500/20 transition-colors"
                >
                  <Presentation size={16} /> Open in Google Slides
                </a>

                <a
                  href={deckData.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-900/10 transition-colors"
                >
                  <Download size={16} /> Download PDF Link
                </a>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
