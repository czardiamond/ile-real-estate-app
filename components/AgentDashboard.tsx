
import React, { useState, useEffect } from 'react';
import { MOCK_LEADS, MOCK_PROPERTIES, MOCK_REVIEWS } from '../services/mockData';
import { Lead, LeadStatus, User, VerificationStatus, Property, ListingStatus, Review } from '../types';
import { BarChart, Bar, LineChart, Line, CartesianGrid, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Phone, MessageCircle, MoreVertical, BrainCircuit, Coffee, Sun, ShieldAlert, ArrowRight, ShieldCheck, Home, Edit, Archive, MapPin, CheckCircle, AlertTriangle, Loader2, Sparkles, TrendingUp, Star, StarHalf, MessageSquare, Users, Plus, ChevronDown, Bell, Zap, X, BadgeCheck, Share2, FileEdit, Video } from 'lucide-react';
import { analyzeLeadPotential, generateMarketingTip } from '../services/geminiService';
import MarketingKitModal from './MarketingKitModal';
import { BuyerIntentModal } from './BuyerIntentModal';
import { sendEmailNotification } from '../services/notificationService';

interface AgentDashboardProps {
    user: User;
    onVerifyClick: () => void;
    onTabChange: (tab: string) => void;
    onQuickAdd: (text: string) => void;
    onOpenIleWalkthrough?: () => void;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ user, onVerifyClick, onTabChange, onQuickAdd, onOpenIleWalkthrough }) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'analytics' | 'listings' | 'reviews'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [myListings, setMyListings] = useState<Property[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  
  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, {sentiment: string, suggestedAction: string}>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);
  const [marketingTip, setMarketingTip] = useState<string>('');

  // Quick Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickLocation, setQuickLocation] = useState('');

  // Marketing Kit State
  const [marketingKitProperty, setMarketingKitProperty] = useState<Property | null>(null);

  // Buyer Intent Analysis Modal State
  const [selectedLeadForIntent, setSelectedLeadForIntent] = useState<Lead | null>(null);

  // Activity Log & Toast State
  const [activities, setActivities] = useState<Array<{
    id: string;
    leadName: string;
    type: 'CALL' | 'WHATSAPP';
    timestamp: string;
    details: string;
  }>>([
    {
      id: 'init-1',
      leadName: 'Chief Emeka Okafor',
      type: 'CALL',
      timestamp: '10:15 AM',
      details: 'Followed up on Lekki Phase 1 duplex inspection inquiry'
    },
    {
      id: 'init-2',
      leadName: 'Amina Bello',
      type: 'WHATSAPP',
      timestamp: '08:45 AM',
      details: 'Shared video tour link for Victoria Island penthouse'
    }
  ]);
  const [activityToast, setActivityToast] = useState<string | null>(null);

  const handleCallLead = (lead: Lead) => {
    const newAct = {
      id: Date.now().toString(),
      leadName: lead.name,
      type: 'CALL' as const,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details: `Placed direct phone call to ${lead.phone}`
    };
    setActivities(prev => [newAct, ...prev]);
    setActivityToast(`Logged Phone Call activity for ${lead.name}`);
    setTimeout(() => setActivityToast(null), 3500);
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsAppLead = (lead: Lead) => {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const newAct = {
      id: Date.now().toString(),
      leadName: lead.name,
      type: 'WHATSAPP' as const,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details: `Opened WhatsApp messaging with ${lead.name}`
    };
    setActivities(prev => [newAct, ...prev]);
    setActivityToast(`Logged WhatsApp activity for ${lead.name}`);
    setTimeout(() => setActivityToast(null), 3500);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name}, I am following up on your property inquiry on Gemini real estate platform.`)}`, '_blank');
  };

  const handleExportReport = () => {
    const csvRows = [
      ['=== GEMINI REAL ESTATE - AGENT PERFORMANCE REPORT ==='],
      ['Agent Name', user.name],
      ['Agency Name', user.agencyName || 'Independent Agent'],
      ['Report Date', new Date().toLocaleString()],
      ['Total Active Listings', myListings.length],
      ['Total Portfolio Leads', leads.length],
      [],
      ['=== PORTFOLIO LISTINGS SUMMARY ==='],
      ['Listing Title', 'Category', 'Price (NGN)', 'Status', 'Location'],
      ...myListings.map(p => [
        `"${p.title.replace(/"/g, '""')}"`,
        p.category,
        p.price,
        p.status,
        `"${p.location.area}, ${p.location.state}"`
      ]),
      [],
      ['=== ACTIVE LEADS DATA ==='],
      ['Lead Name', 'Email', 'Phone', 'Status', 'Est. Value (NGN)', 'Notes'],
      ...leads.map(l => [
        `"${l.name}"`,
        l.email,
        l.phone,
        l.status,
        l.value || 0,
        `"${(l.notes || '').replace(/"/g, '""')}"`
      ]),
      [],
      ['=== ACTIVITY AUDIT LOG ==='],
      ['Timestamp', 'Lead Name', 'Action Type', 'Details'],
      ...activities.map(a => [
        a.timestamp,
        `"${a.leadName}"`,
        a.type,
        `"${a.details}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gemini_Agent_Report_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
      // Load Properties
      const agentProperties = MOCK_PROPERTIES.filter(p => p.agentId === user.id);
      setMyListings(agentProperties);
      
      // Load Leads
      const agentPropertyIds = new Set(agentProperties.map(p => p.id));
      const agentLeads = MOCK_LEADS.filter(l => agentPropertyIds.has(l.propertyId));
      setLeads(agentLeads);

      // Load Reviews
      const reviews = MOCK_REVIEWS.filter(r => r.agentId === user.id);
      setMyReviews(reviews);
  }, [user.id]);

  const handleStatusUpdate = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? {...l, status: newStatus} : l));
    
    // Send Notification
    if (lead) {
        await sendEmailNotification(
            lead.email,
            `Update on your property interest`,
            `Hello ${lead.name}, your status has been updated to ${newStatus}. An agent will be in touch shortly.`
        );
    }
  };

  const handlePropertyStatusChange = async (propertyId: string, newStatus: ListingStatus) => {
      const property = myListings.find(p => p.id === propertyId);
      setMyListings(prev => prev.map(p => p.id === propertyId ? {...p, status: newStatus} : p));

      // Send Notification to Agent (Confirmation)
      if (property) {
          await sendEmailNotification(
              user.email,
              `Listing Status Changed: ${property.title}`,
              `You have successfully updated the status of "${property.title}" to ${newStatus}.`
          );
      }
  };

  const handleAnalyzeLead = async (leadId: string, notes: string, propId: string) => {
      setLoadingAnalysis(leadId);
      const prop = MOCK_PROPERTIES.find(p => p.id === propId);
      if(prop) {
          const resultStr = await analyzeLeadPotential(notes, prop.price);
          try {
             const result = JSON.parse(resultStr);
             setAiAnalysis(prev => ({...prev, [leadId]: result}));
          } catch(e) {
              console.error("Failed to parse AI response");
              alert("Ilé AI is taking a nap. Try again later.");
          }
      }
      setLoadingAnalysis(null);
  }

  const handleArchiveListing = (id: string) => {
      if(window.confirm('Are you sure you want to archive this listing?')) {
          setMyListings(prev => prev.filter(p => p.id !== id));
      }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle || !quickPrice || !quickLocation) return;
    
    // Construct a natural language prompt for the wizard
    const text = `I want to list a property titled "${quickTitle}" located in ${quickLocation}. The price is ${quickPrice}.`;
    
    onQuickAdd(text);
    setIsQuickAddOpen(false);
    
    // Reset fields
    setQuickTitle('');
    setQuickPrice('');
    setQuickLocation('');
  };

  const pipelineData = [
    { name: 'New', count: leads.filter(l => l.status === LeadStatus.NEW).length },
    { name: 'Talking', count: leads.filter(l => l.status === LeadStatus.CONTACTED).length },
    { name: 'Visiting', count: leads.filter(l => l.status === LeadStatus.VIEWING_SCHEDULED).length },
    { name: 'Deal', count: leads.filter(l => l.status === LeadStatus.OFFER_MADE).length },
  ];

  const conversionData = [
    { month: 'May', agent: 5, average: 8 },
    { month: 'Jun', agent: 12, average: 9 },
    { month: 'Jul', agent: 18, average: 10 },
    { month: 'Aug', agent: 15, average: 11 },
    { month: 'Sep', agent: 22, average: 12 },
    { month: 'Oct', agent: 28, average: 14 },
  ];

  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Verification Helper Variables
  const verificationStatus = user.verification.status;
  const isVerified = verificationStatus === VerificationStatus.VERIFIED;
  const isPending = verificationStatus === VerificationStatus.PENDING;

  // Calculate Ratings
  const averageRating = myReviews.length > 0 
    ? (myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length).toFixed(1)
    : "New";

  const renderStars = (rating: number) => {
      return (
          <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={14} 
                    className={`${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                  />
              ))}
          </div>
      );
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'leads':
              return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2 mt-6">
                        <h3 className="font-normal text-xl text-on-surface">Active Portfolio Leads</h3>
                        <button className="text-sm text-primary font-bold bg-primary-container text-on-primary-container px-4 py-2 rounded-full hover:shadow-sm transition-all">+ Invite Client</button>
                    </div>
                    
                    {leads.length === 0 ? (
                        <div className="text-center py-16 bg-surface-container-low rounded-[28px]">
                             <p className="text-on-surface-variant">No active guests yet.</p>
                        </div>
                    ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {leads.map(lead => {
                            const property = MOCK_PROPERTIES.find(p => p.id === lead.propertyId);
                            const analysis = aiAnalysis[lead.id];
                            
                            return (
                                <div key={lead.id} className="bg-surface-container-low p-5 rounded-[24px] hover:bg-surface-container transition-colors group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-on-surface text-lg">{lead.name}</h4>
                                            <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-1">
                                                 <span className="opacity-70">Interested in</span>
                                                 <span className="font-bold text-primary">{property?.type || 'Property'}</span>
                                                 {property && <span className="text-[10px] opacity-50">({property.title.substring(0, 15)}...)</span>}
                                            </div>
                                        </div>
                                        
                                        {/* Status Pipeline Dropdown */}
                                        <div className="relative">
                                            <select
                                                value={lead.status}
                                                onChange={(e) => handleStatusUpdate(lead.id, e.target.value as LeadStatus)}
                                                className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide outline-none cursor-pointer transition-all border border-transparent focus:border-primary/20 focus:ring-2 focus:ring-primary/10 ${
                                                     lead.status === LeadStatus.NEW ? 'bg-blue-50 text-blue-700' :
                                                     lead.status === LeadStatus.CONTACTED ? 'bg-yellow-50 text-yellow-700' :
                                                     lead.status === LeadStatus.VIEWING_SCHEDULED ? 'bg-purple-50 text-purple-700' :
                                                     lead.status === LeadStatus.OFFER_MADE ? 'bg-green-50 text-green-700' :
                                                     lead.status === LeadStatus.CLOSED ? 'bg-gray-200 text-gray-700' :
                                                     'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {Object.values(LeadStatus).map((status) => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                                                 lead.status === LeadStatus.NEW ? 'text-blue-700' :
                                                 lead.status === LeadStatus.CONTACTED ? 'text-yellow-700' :
                                                 lead.status === LeadStatus.VIEWING_SCHEDULED ? 'text-purple-700' :
                                                 lead.status === LeadStatus.OFFER_MADE ? 'text-green-700' :
                                                 'text-gray-600'
                                            }`} />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-surface-container p-4 rounded-xl text-sm text-on-surface-variant mb-4 italic">
                                        "{lead.notes}"
                                    </div>

                                    <button
                                        onClick={() => setSelectedLeadForIntent(lead)}
                                        className="mb-4 w-full py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={15} className="text-purple-600 dark:text-purple-400 animate-pulse" />
                                        <span>AI Chat Log & Buyer Intent Score</span>
                                    </button>

                                    {/* AI Analysis Section */}
                                    {analysis ? (
                                        <div className={`mb-4 p-4 rounded-xl text-xs flex gap-3 animate-in slide-in-from-top-2 duration-300 ${
                                            analysis.sentiment === 'Hot' ? 'bg-red-50 text-red-900 border border-red-100' : 
                                            analysis.sentiment === 'Warm' ? 'bg-orange-50 text-orange-900 border border-orange-100' :
                                            'bg-blue-50 text-blue-900 border border-blue-100'
                                        }`}>
                                            <Sparkles size={16} className="shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold block mb-1">Lead Sentiment: {analysis.sentiment}</span>
                                                <p className="leading-relaxed">{analysis.suggestedAction}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleAnalyzeLead(lead.id, lead.notes, lead.propertyId)}
                                            disabled={loadingAnalysis === lead.id}
                                            className="mb-4 w-full py-3 text-xs flex items-center justify-center gap-2 text-primary bg-surface-container hover:bg-primary-container hover:text-on-primary-container rounded-full transition-colors font-medium"
                                        >
                                            {loadingAnalysis === lead.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <BrainCircuit size={16} /> 
                                            )}
                                            {loadingAnalysis === lead.id ? 'Analyzing with Ilé...' : 'Analyze with Ilé'}
                                        </button>
                                    )}

                                    <div className="flex gap-2 border-t border-outline-variant/20 pt-4">
                                        <button 
                                            onClick={() => handleCallLead(lead)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
                                        >
                                            <Phone size={18} /> Call
                                        </button>
                                        <button 
                                            onClick={() => handleWhatsAppLead(lead)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition-colors text-sm font-medium shadow-sm"
                                        >
                                            <MessageCircle size={18} /> WhatsApp
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}

                    {/* Activity Audit Log Feed */}
                    <div className="mt-8 bg-surface-container-low p-6 rounded-[28px] border border-outline-variant/10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                    <Bell size={16} />
                                </div>
                                <h4 className="font-bold text-base text-on-surface">Lead Communication Activity Log</h4>
                            </div>
                            <span className="text-xs text-on-surface-variant font-medium bg-surface-container px-3 py-1 rounded-full">
                                {activities.length} Events Logged
                            </span>
                        </div>

                        <div className="space-y-3">
                            {activities.map((act) => (
                                <div key={act.id} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl text-white ${act.type === 'CALL' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                            {act.type === 'CALL' ? <Phone size={14} /> : <MessageCircle size={14} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{act.details}</p>
                                            <p className="text-[10px] text-gray-400">Lead: <span className="font-medium text-gray-600">{act.leadName}</span></p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                                        {act.timestamp}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              );
          case 'analytics':
              return (
                <div className="space-y-4">
                    {/* Pipeline Chart */}
                    <div className="bg-surface-container-low p-6 rounded-[32px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-medium text-xl text-on-surface">Pipeline Health</h3>
                            <div className="p-2 bg-surface-container rounded-full">
                                <Coffee size={20} className="text-on-surface-variant"/>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pipelineData}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#404943'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#404943'}} />
                                    <Tooltip 
                                        cursor={{fill: '#eceee9'}} 
                                        contentStyle={{ borderRadius: '16px', border: 'none', background: '#e2e5e0', color: '#191c1a' }} 
                                    />
                                    <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                                        {pipelineData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#166534' : '#ca8a04'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Conversion Rate Comparison Chart */}
                    <div className="bg-surface-container-low p-6 rounded-[32px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-medium text-xl text-on-surface">Conversion Trends</h3>
                                <p className="text-sm text-on-surface-variant">Your performance vs Market Average</p>
                            </div>
                            <div className="p-2 bg-surface-container rounded-full">
                                <TrendingUp size={20} className="text-on-surface-variant"/>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={conversionData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5e0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#404943'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#404943'}} unit="%" />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', background: '#e2e5e0', color: '#191c1a' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Line type="monotone" dataKey="agent" name="You" stroke="#166534" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                    <Line type="monotone" dataKey="average" name="Market Avg" stroke="#ca8a04" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
              );
          case 'listings':
              return (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center px-2 flex-wrap gap-2">
                          <h3 className="font-normal text-xl text-on-surface">My Listings</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-full flex items-center">{myListings.length} Active</span>
                             <button 
                                onClick={() => onTabChange('add-listing-ai')}
                                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                             >
                                <Sparkles size={14} /> AI Wizard
                             </button>
                             <button 
                                onClick={() => onTabChange('add-listing-manual')}
                                className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                             >
                                <FileEdit size={14} className="text-emerald-700" /> Create Manual Listing
                             </button>
                             <button 
                                onClick={() => setIsQuickAddOpen(true)}
                                className="bg-surface-container-high text-on-surface-variant p-2 rounded-xl hover:bg-surface-container hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                                title="Quick Add"
                             >
                                <Zap size={16} fill="currentColor" />
                             </button>
                          </div>
                      </div>
                      
                      {myListings.length === 0 ? (
                        <div className="text-center py-16 bg-surface-container-low rounded-[28px] border border-dashed border-outline-variant/30">
                             <Home size={32} className="mx-auto mb-3 text-on-surface-variant/50" />
                             <p className="text-on-surface-variant mb-4 font-medium">You haven't listed any properties yet.</p>
                             <div className="flex flex-wrap gap-2.5 justify-center">
                                 <button onClick={() => onTabChange('add-listing-ai')} className="px-5 py-2.5 bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow-sm hover:bg-emerald-900 transition-all flex items-center gap-2">
                                    <Sparkles size={15} /> AI Listing Wizard
                                 </button>
                                 <button onClick={() => onTabChange('add-listing-manual')} className="px-5 py-2.5 bg-white text-gray-800 border border-gray-300 rounded-2xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                                    <FileEdit size={15} className="text-emerald-700" /> Create Manual Listing
                                 </button>
                                 <button onClick={() => setIsQuickAddOpen(true)} className="px-4 py-2.5 bg-surface text-primary border border-primary/20 rounded-2xl text-xs font-bold hover:bg-primary/5 transition-all flex items-center gap-2">
                                    <Zap size={14} /> Quick Add
                                 </button>
                             </div>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {myListings.map(prop => (
                              <div key={prop.id} className="bg-surface-container-low p-4 rounded-[24px] flex flex-col group border border-transparent hover:border-outline-variant/20 transition-all">
                                  <div className="relative h-40 rounded-2xl overflow-hidden mb-3">
                                      <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      {/* Status Select Overlay */}
                                      <div className="absolute top-2 left-2">
                                          <div className="relative">
                                              <select 
                                                value={prop.status}
                                                onChange={(e) => handlePropertyStatusChange(prop.id, e.target.value as ListingStatus)}
                                                className={`appearance-none pl-3 pr-8 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border shadow-sm ${
                                                  prop.status === ListingStatus.AVAILABLE ? 'bg-green-100 text-green-800 border-green-200' : 
                                                  prop.status === ListingStatus.TAKEN ? 'bg-red-100 text-red-800 border-red-200' :
                                                  'bg-amber-100 text-amber-800 border-amber-200'
                                              }`}
                                              >
                                                  {Object.values(ListingStatus).map(s => (
                                                      <option key={s} value={s}>{s}</option>
                                                  ))}
                                              </select>
                                              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                          </div>
                                      </div>
                                  </div>
                                  <h4 className="font-bold text-on-surface text-sm line-clamp-1">{prop.title}</h4>
                                  <div className="flex items-center text-xs text-on-surface-variant mt-1 mb-4">
                                      <MapPin size={12} className="mr-1" /> {prop.location.area}
                                  </div>
                                  
                                  <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-outline-variant/10">
                                      <button 
                                        onClick={() => setMarketingKitProperty(prop)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/10"
                                      >
                                          <Sparkles size={14} fill="currentColor" /> Generate Marketing Kit
                                      </button>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => alert(`Editing ${prop.title}`)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold transition-colors"
                                          >
                                              <Edit size={14} /> Edit
                                          </button>
                                          <button 
                                              onClick={() => handleArchiveListing(prop.id)}
                                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-surface-container hover:bg-red-50 hover:text-red-600 text-xs font-bold transition-colors"
                                          >
                                              <Archive size={14} /> Archive
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                        </div>
                      )}
                  </div>
              );
        case 'reviews':
            return (
                <div className="space-y-4">
                     <div className="flex justify-between items-center px-2">
                        <h3 className="font-normal text-xl text-on-surface">Client Reviews</h3>
                        <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full border border-yellow-100">
                             <span className="font-bold text-lg">{averageRating}</span>
                             <div className="flex">{renderStars(Math.round(Number(averageRating) || 0))}</div>
                        </div>
                    </div>

                    {myReviews.length === 0 ? (
                        <div className="text-center py-16 bg-surface-container-low rounded-[28px]">
                             <MessageSquare size={32} className="mx-auto mb-3 text-on-surface-variant/50" />
                             <p className="text-on-surface-variant">No reviews yet. Keep closing deals!</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {myReviews.map(review => (
                                <div key={review.id} className="bg-surface-container-low p-5 rounded-[24px] hover:bg-surface-container transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                                                {review.reviewerName.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-on-surface text-sm">{review.reviewerName}</h4>
                                                <p className="text-xs text-on-surface-variant">{review.date}</p>
                                            </div>
                                        </div>
                                        {renderStars(review.rating)}
                                    </div>
                                    <p className="text-sm text-on-surface-variant leading-relaxed">
                                        "{review.comment}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
          default:
              return null;
      }
  };

  return (
    <div className="px-4 md:px-8 pb-24 max-w-7xl mx-auto">
        {/* Activity Toast Alert */}
        {activityToast && (
          <div className="fixed top-20 right-4 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-600 animate-in fade-in slide-in-from-top duration-300">
             <CheckCircle size={20} className="text-emerald-300 flex-shrink-0" />
             <span className="text-xs font-bold">{activityToast}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pt-4">
            <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">{today}</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-normal text-on-surface">Hello, {user.name.split(' ')[0]}</h1>
                        {verificationStatus === VerificationStatus.VERIFIED && (
                            <BadgeCheck size={28} className="text-green-600" fill="#dcfce7" />
                        )}
                         {verificationStatus === VerificationStatus.PENDING && (
                            <div className="bg-yellow-100 rounded-full p-1" title="Verification Pending">
                                <Loader2 size={20} className="text-yellow-700 animate-spin" />
                            </div>
                        )}
                         {verificationStatus === VerificationStatus.REJECTED && (
                            <div className="bg-red-100 rounded-full p-1" title="Verification Rejected">
                                <AlertTriangle size={20} className="text-red-700" />
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => onTabChange('chat')} 
                        className="p-2 bg-primary/10 rounded-full text-primary hover:bg-primary/20 transition-colors"
                        title="Open AI Chat"
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
                
                {/* STATUS BADGES */}
                {verificationStatus === VerificationStatus.UNVERIFIED && (
                    <div 
                        onClick={onVerifyClick}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors"
                    >
                        <ShieldAlert size={14} />
                        <span>Verify Identity to boost visibility</span>
                        <ArrowRight size={14} />
                    </div>
                )}
                
                {verificationStatus === VerificationStatus.PENDING && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Verification Pending Review</span>
                    </div>
                )}
                
                {verificationStatus === VerificationStatus.VERIFIED && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 text-green-700 rounded-lg text-xs font-bold">
                        <CheckCircle size={14} />
                        <span>Verified Agent</span>
                    </div>
                )}

                 {verificationStatus === VerificationStatus.REJECTED && (
                    <div 
                        onClick={onVerifyClick}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-200 text-red-800 rounded-lg text-xs font-bold cursor-pointer hover:bg-red-200"
                    >
                        <AlertTriangle size={14} />
                        <span>Verification Rejected</span>
                        <ArrowRight size={14} />
                    </div>
                )}
            </div>
            
            {/* Quick Stats & Export Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 md:mt-0 w-full md:w-auto overflow-x-auto no-scrollbar">
                 {onOpenIleWalkthrough && (
                   <button 
                     onClick={onOpenIleWalkthrough}
                     className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-md hover:shadow-lg transition-all flex-shrink-0 cursor-pointer"
                     title="Synthesize 60-second AI Video Walkthrough for your agency"
                   >
                      <Video size={16} className="text-emerald-200" /> Ilé 60s Video Studio
                   </button>
                 )}
                 <button 
                   onClick={handleExportReport}
                   className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs shadow-md transition-all flex-shrink-0"
                   title="Export CSV Performance Report"
                 >
                    <Share2 size={16} /> Export Report (CSV)
                 </button>
                 <div className="bg-surface-container px-5 py-3 rounded-2xl min-w-[120px] flex-shrink-0">
                    <p className="text-xs text-on-surface-variant font-medium mb-1">Total Leads</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-on-surface">{leads.length}</p>
                        <Users size={16} className="text-on-surface-variant mb-1.5 opacity-50" />
                    </div>
                 </div>
                 <div className="bg-surface-container px-5 py-3 rounded-2xl min-w-[120px] flex-shrink-0">
                    <p className="text-xs text-on-surface-variant font-medium mb-1">Active Listings</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-on-surface">{myListings.length}</p>
                        <Home size={16} className="text-on-surface-variant mb-1.5 opacity-50" />
                    </div>
                 </div>
                 <div className="bg-yellow-50 border border-yellow-100 px-5 py-3 rounded-2xl min-w-[120px] flex-shrink-0">
                    <p className="text-xs text-yellow-800 font-medium mb-1">Avg. Rating</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-yellow-900">{averageRating}</p>
                        <div className="mb-1.5 flex">
                             <Star size={16} className="text-yellow-600 fill-yellow-600" />
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Verification Banner (Only if not verified) - Now Prominent */}
        {!isVerified && (
            <div className={`mb-8 border rounded-[28px] p-6 relative overflow-hidden ${isPending ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                    {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none ${isPending ? 'bg-yellow-100' : 'bg-red-100'}`}></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex gap-4">
                        <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 ${isPending ? 'text-yellow-600' : 'text-red-600'}`}>
                            {isPending ? <Loader2 size={24} className="animate-spin" /> : <ShieldAlert size={24} />}
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${isPending ? 'text-yellow-900' : 'text-red-900'}`}>
                                {isPending ? 'Verification in Progress' : 'Verify Your Identity'}
                            </h3>
                            <p className={`text-sm mt-1 max-w-lg ${isPending ? 'text-yellow-800' : 'text-red-800'}`}>
                                {isPending 
                                    ? 'Your documents are currently under review. We will notify you once completed.' 
                                    : 'Build trust with clients and unlock full access to leads by verifying your account today.'
                                }
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onVerifyClick}
                        className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-all whitespace-nowrap ${
                            isPending 
                            ? 'bg-white text-yellow-700 border border-yellow-200 hover:bg-yellow-50'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                        }`}
                    >
                        {isPending ? 'Check Status' : 'Start Verification'}
                    </button>
                </div>
            </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-surface-container-low p-1 rounded-2xl inline-flex flex-wrap mb-8 w-full md:w-auto">
            <button 
                onClick={() => setActiveTab('leads')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'leads' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
                Leads
            </button>
            <button 
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'analytics' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
                Analytics
            </button>
            <button 
                onClick={() => setActiveTab('listings')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'listings' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
                Listings
            </button>
            <button 
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'reviews' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
                Reviews
            </button>
        </div>

        {renderContent()}

        {/* Quick Add Modal */}
        {isQuickAddOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-surface w-full max-w-sm rounded-[24px] shadow-2xl p-6 relative animate-in slide-in-from-bottom duration-300">
                    <button onClick={() => setIsQuickAddOpen(false)} className="absolute top-4 right-4 p-2 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors">
                        <X size={18} />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-on-surface">Quick Add</h3>
                            <p className="text-xs text-on-surface-variant">Fast track to listing wizard</p>
                        </div>
                    </div>

                    <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Property Title</label>
                            <input 
                                type="text" 
                                required
                                value={quickTitle}
                                onChange={(e) => setQuickTitle(e.target.value)}
                                placeholder="e.g. 2 Bed Flat"
                                className="w-full p-3 bg-surface-container border border-transparent focus:border-primary rounded-xl text-sm outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Price</label>
                            <input 
                                type="text" 
                                required
                                value={quickPrice}
                                onChange={(e) => setQuickPrice(e.target.value)}
                                placeholder="e.g. 1.5m"
                                className="w-full p-3 bg-surface-container border border-transparent focus:border-primary rounded-xl text-sm outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">Location</label>
                            <input 
                                type="text" 
                                required
                                value={quickLocation}
                                onChange={(e) => setQuickLocation(e.target.value)}
                                placeholder="e.g. Yaba, Lagos"
                                className="w-full p-3 bg-surface-container border border-transparent focus:border-primary rounded-xl text-sm outline-none transition-colors"
                            />
                        </div>

                        <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2">
                            Continue to Wizard <ArrowRight size={18} />
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Marketing Kit Modal */}
        {marketingKitProperty && (
            <MarketingKitModal 
                property={marketingKitProperty} 
                onClose={() => setMarketingKitProperty(null)} 
            />
        )}

        {/* AI Buyer Intent Score Modal */}
        {selectedLeadForIntent && (
            <BuyerIntentModal
                lead={selectedLeadForIntent}
                property={MOCK_PROPERTIES.find(p => p.id === selectedLeadForIntent.propertyId)}
                onClose={() => setSelectedLeadForIntent(null)}
            />
        )}
    </div>
  );
};

export default AgentDashboard;
