
import React, { useState, useEffect } from 'react';
import { User, NetworkRank, NetworkTransaction, Property, BankDetails } from '../types';
import { MOCK_PROPERTIES } from '../services/mockData';
import { resolveBankAccount, initiateWithdrawal, BANKS } from '../services/walletService';
import { sendEmailNotification } from '../services/notificationService';
import { Share2, Copy, Users, Wallet, ChevronRight, TrendingUp, Award, ArrowUpRight, ArrowDownLeft, Lock, Link as LinkIcon, Sparkles, Check, X, Building2, CreditCard, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

interface NetworkMarketingViewProps {
  user: User;
}

const NetworkMarketingView: React.FC<NetworkMarketingViewProps> = ({ user }) => {
  // Local state to simulate user data updates without backend reload
  const [localUser, setLocalUser] = useState<User>(user);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'tools'>('overview');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'SETUP_BANK' | 'INPUT_AMOUNT' | 'SUCCESS'>('SETUP_BANK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Bank Form State
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedBankDetails, setResolvedBankDetails] = useState<BankDetails | null>(null);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Mock Transactions (Persist in state for this view to show updates)
  const [transactions, setTransactions] = useState<NetworkTransaction[]>([
    { id: 't1', type: 'DIRECT_COMMISSION', amount: 50000, description: 'Referral Bonus: 3 Bed Flat Lekki', date: 'Oct 24, 2023', status: 'CLEARED', fromUserId: 'Client A' },
    { id: 't2', type: 'DOWNLINE_OVERRIDE', amount: 12500, description: '2.5% Override from Tunde (Tier 1)', date: 'Oct 22, 2023', status: 'PENDING', fromUserId: 'Tunde' },
    { id: 't3', type: 'WITHDRAWAL', amount: -100000, description: 'Transfer to GTBank', date: 'Oct 20, 2023', status: 'CLEARED' },
    { id: 't4', type: 'DOWNLINE_OVERRIDE', amount: 5000, description: '1% Override from Grace (Tier 2)', date: 'Oct 18, 2023', status: 'CLEARED', fromUserId: 'Grace' },
  ]);

  // Mock Team
  const team = [
    { id: 'tm1', name: 'Tunde Bakare', role: 'Agent', joined: 'Sept 2023', tier: 1, sales: 2, status: 'Active' },
    { id: 'tm2', name: 'Grace Okafor', role: 'Scout', joined: 'Sept 2023', tier: 2, sales: 1, status: 'Active' },
    { id: 'tm3', name: 'Emmanuel K.', role: 'Scout', joined: 'Oct 2023', tier: 1, sales: 0, status: 'Inactive' },
  ];

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Math.abs(val));
  };

  const handleGenerateLink = (property: Property) => {
      const partnerName = localUser.name.split(' ')[0].toUpperCase();
      const partnerIdSuffix = localUser.id.slice(-2).padStart(4, '0');
      const referralCode = localUser.referralCode || `${partnerName}_${partnerIdSuffix}`;
      const slug = property.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const smartLink = `https://ile.ng/p/${slug}?ref=${referralCode}`;
      setGeneratedLink(smartLink);
      setActivePropertyId(property.id);
  };

  // --- WITHDRAWAL LOGIC ---

  const openWithdrawal = () => {
      if (localUser.bankDetails?.is_verified) {
          setWithdrawStep('INPUT_AMOUNT');
      } else {
          setWithdrawStep('SETUP_BANK');
      }
      setIsWithdrawModalOpen(true);
      setError('');
  };

  const handleVerifyBank = async () => {
      if (!selectedBankCode || !accountNumber) {
          setError("Please select a bank and enter account number.");
          return;
      }
      setLoading(true);
      setError('');
      
      const result = await resolveBankAccount(accountNumber, selectedBankCode, localUser.name);
      
      setLoading(false);
      
      if (result.success && result.data) {
          setResolvedBankDetails(result.data);
      } else {
          setError(result.message || "Verification failed.");
      }
  };

  const confirmBankDetails = () => {
      if (resolvedBankDetails) {
          // Update local user state
          setLocalUser(prev => ({
              ...prev,
              bankDetails: resolvedBankDetails
          }));
          setWithdrawStep('INPUT_AMOUNT');
          setError('');
      }
  };

  const handleWithdraw = async () => {
      const amount = Number(withdrawAmount);
      if (!amount || amount <= 0) return;

      setLoading(true);
      const result = await initiateWithdrawal(amount, localUser.wallet.balance);
      setLoading(false);

      if (result.success) {
          // Deduct balance locally
          setLocalUser(prev => ({
              ...prev,
              wallet: {
                  ...prev.wallet,
                  balance: prev.wallet.balance - amount
              }
          }));
          // Add transaction
          setTransactions(prev => [{
              id: `t${Date.now()}`,
              type: 'WITHDRAWAL',
              amount: -amount,
              description: `Withdrawal to ${localUser.bankDetails?.bank_name}`,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              status: 'PENDING'
          }, ...prev]);
          
          setWithdrawStep('SUCCESS');

          // Notification
          await sendEmailNotification(
              user.email,
              'Withdrawal Successful',
              `You have successfully withdrawn ₦${amount.toLocaleString()} to ${localUser.bankDetails?.bank_name}. Funds will arrive shortly.`
          );
      } else {
          setError(result.message);
      }
  };

  return (
    <div className="pb-28 pt-4 md:pt-8 bg-gray-50 min-h-screen">
      
      {/* HEADER CARD */}
      <div className="mx-4 mb-6 bg-gradient-to-br from-primary to-green-900 rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl -ml-5 -mb-5"></div>
        
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-green-100 text-sm font-medium mb-1">Total Wallet Balance</p>
                    <h1 className="text-3xl font-bold">{formatCurrency(localUser.wallet.balance)}</h1>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20 flex items-center gap-1">
                    <Award size={14} className="text-yellow-300" /> {localUser.networkRank}
                </div>
            </div>

            <div className="flex gap-3">
                <div className="flex-1 bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-[10px] text-green-100 uppercase tracking-wider mb-1">Pending</p>
                    <p className="font-mono font-bold flex items-center gap-1">
                        <Lock size={12} className="opacity-70" /> {formatCurrency(localUser.wallet.pendingClearance)}
                    </p>
                </div>
                <div className="flex-1 bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-[10px] text-green-100 uppercase tracking-wider mb-1">Lifetime</p>
                    <p className="font-mono font-bold">{formatCurrency(localUser.wallet.lifetimeEarnings)}</p>
                </div>
            </div>

            <button 
                onClick={openWithdrawal}
                className="w-full mt-6 bg-yellow-500 text-yellow-950 font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
            >
                <Wallet size={18} /> Withdraw Funds
            </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex mx-4 mb-6 bg-gray-200 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
              Overview
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'team' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
              Circle ({localUser.downlineCount})
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'tools' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
              Smart Tools
          </button>
      </div>

      {/* CONTENT AREA */}
      <div className="mx-4">
        {activeTab === 'overview' && (
            <div className="space-y-4">
                {/* REFERRAL CODE */}
                <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
                    <h3 className="text-gray-900 font-bold mb-2 flex items-center gap-2">
                        <Users size={18} className="text-primary" /> Invite & Earn
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Share your code. Earn <span className="text-green-700 font-bold">50%</span> of platform fees from your direct recruits and <span className="text-green-700 font-bold">10%</span> from their recruits.
                    </p>
                    
                    <div className="flex gap-2">
                        <div className="flex-1 bg-gray-100 rounded-xl p-3 flex items-center justify-between border-2 border-dashed border-gray-300">
                            <span className="font-mono font-bold text-lg text-gray-800 tracking-wider">{localUser.referralCode}</span>
                            <button onClick={() => copyCode(localUser.referralCode)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-500">
                                <Copy size={18} />
                            </button>
                        </div>
                        <button className="bg-primary-container text-on-primary-container p-3 rounded-xl flex items-center justify-center min-w-[50px] hover:brightness-95">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-2">Recent Activity</h3>
                {transactions.map(tx => (
                    <div key={tx.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'WITHDRAWAL' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>
                                {tx.type === 'WITHDRAWAL' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{tx.description}</p>
                                <p className="text-xs text-gray-500">{tx.date} • {tx.status}</p>
                            </div>
                        </div>
                        <span className={`font-mono font-bold text-sm ${
                             tx.type === 'WITHDRAWAL' ? 'text-gray-900' : 'text-primary'
                        }`}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'team' && (
            <div className="space-y-4">
                 <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                    <TrendingUp className="text-blue-600 shrink-0 mt-1" size={20} />
                    <div>
                        <h4 className="font-bold text-blue-900 text-sm">Grow your Rank</h4>
                        <p className="text-xs text-blue-700 mt-1">Recruit 2 more active agents to reach <span className="font-bold">Connector</span> status and unlock Tier 3 earnings.</p>
                    </div>
                 </div>

                 <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-2">Downline Members</h3>
                 {team.map(member => (
                     <div key={member.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                                 {member.name.substring(0,2).toUpperCase()}
                             </div>
                             <div>
                                 <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                                 <p className="text-xs text-gray-500">{member.role} • Joined {member.joined}</p>
                             </div>
                         </div>
                         <div className="text-right">
                             <span className="block text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded-md mb-1">
                                 Tier {member.tier}
                             </span>
                             <span className={`text-[10px] ${member.status === 'Active' ? 'text-green-600' : 'text-gray-400'}`}>
                                 {member.status} • {member.sales} Sales
                             </span>
                         </div>
                     </div>
                 ))}
            </div>
        )}

        {activeTab === 'tools' && (
            <div className="space-y-6">
                 <div className="bg-purple-50 p-5 rounded-[24px] border border-purple-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200 rounded-full blur-2xl -mr-5 -mt-5 opacity-50"></div>
                    <div className="relative z-10">
                        <h4 className="font-bold text-purple-900 flex items-center gap-2">
                            <LinkIcon size={18} /> Smart Link Generator
                        </h4>
                        <p className="text-xs text-purple-700 mt-2 leading-relaxed">
                            Generate unique tracking links for properties. When a buyer clicks your link, you are automatically assigned as the referrer in the commission engine.
                        </p>
                    </div>
                 </div>

                 <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-2">Hot Properties to Promote</h3>
                 
                 <div className="grid gap-4">
                     {MOCK_PROPERTIES.slice(0, 3).map(property => {
                        // Mock potential commission (e.g., 2.5% of price)
                        const potentialComm = property.price * 0.025;
                        const isGenerated = activePropertyId === property.id;

                        return (
                             <div key={property.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                 <div className="flex gap-4 mb-4">
                                     <img src={property.images[0]} alt={property.title} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
                                     <div className="flex-1 min-w-0">
                                         <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-1">{property.type}</p>
                                         <h4 className="font-bold text-gray-900 text-sm truncate">{property.title}</h4>
                                         <p className="text-xs text-gray-500 truncate">{property.location.area}, {property.location.city}</p>
                                         
                                         <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold border border-green-100">
                                            <Sparkles size={12} /> Earn up to {formatCurrency(potentialComm)}
                                         </div>
                                     </div>
                                 </div>

                                 {isGenerated && generatedLink ? (
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Your Smart Link</p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 text-xs bg-white p-2 rounded border border-gray-200 text-gray-700 font-mono truncate">
                                                {generatedLink}
                                            </code>
                                            <button 
                                                onClick={() => copyCode(generatedLink)}
                                                className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 transition-colors"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    </div>
                                 ) : (
                                    <button 
                                        onClick={() => handleGenerateLink(property)}
                                        className="w-full py-3 rounded-xl border border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LinkIcon size={16} /> Generate Smart Link
                                    </button>
                                 )}
                             </div>
                         )
                     })}
                 </div>
            </div>
        )}

        {/* --- SECURE WITHDRAWAL MODAL --- */}
        {isWithdrawModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
                    <button 
                        onClick={() => setIsWithdrawModalOpen(false)}
                        className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    {/* Step 1: Setup Bank */}
                    {withdrawStep === 'SETUP_BANK' && (
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 size={24} className="text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-1">Add Bank Account</h2>
                            <p className="text-xs text-gray-500 text-center mb-6">
                                For security, the account name MUST match your profile name: <strong className="text-gray-900">{localUser.name}</strong>
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Select Bank</label>
                                    <select 
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                        value={selectedBankCode}
                                        onChange={(e) => {
                                            setSelectedBankCode(e.target.value);
                                            setResolvedBankDetails(null); 
                                            setError('');
                                        }}
                                    >
                                        <option value="">Select Bank...</option>
                                        {BANKS.map(bank => (
                                            <option key={bank.code} value={bank.code}>{bank.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Account Number</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input 
                                            type="text" 
                                            maxLength={10}
                                            value={accountNumber}
                                            onChange={(e) => {
                                                setAccountNumber(e.target.value.replace(/\D/g, ''));
                                                setResolvedBankDetails(null);
                                                setError('');
                                            }}
                                            placeholder="0123456789"
                                            className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary font-mono tracking-widest"
                                        />
                                    </div>
                                </div>

                                {resolvedBankDetails && (
                                    <div className="bg-green-50 border border-green-200 p-3 rounded-xl flex items-start gap-3">
                                        <ShieldCheck className="text-green-600 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-green-800 uppercase">Account Verified</p>
                                            <p className="text-sm font-bold text-gray-900">{resolvedBankDetails.account_name}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">Name matches profile.</p>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2">
                                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                                        <p className="text-xs text-red-700">{error}</p>
                                    </div>
                                )}

                                {resolvedBankDetails ? (
                                    <button 
                                        onClick={confirmBankDetails}
                                        className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                                    >
                                        Save & Continue
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleVerifyBank}
                                        disabled={loading}
                                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Account'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Input Amount */}
                    {withdrawStep === 'INPUT_AMOUNT' && (
                        <div className="p-6">
                             <div className="bg-gray-100 p-4 rounded-xl text-center mb-6">
                                <p className="text-xs text-gray-500 font-bold uppercase">Available Balance</p>
                                <h2 className="text-3xl font-bold text-primary">{formatCurrency(localUser.wallet.balance)}</h2>
                             </div>

                             <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Amount to Withdraw</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₦</span>
                                    <input 
                                        type="number" 
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold outline-none focus:border-primary text-gray-900"
                                        placeholder="0.00"
                                    />
                                </div>
                             </div>

                             <div className="bg-gray-50 p-3 rounded-xl mb-6 text-xs text-gray-500 flex justify-between items-center">
                                 <span>Destination:</span>
                                 <span className="font-bold text-gray-900 flex items-center gap-1">
                                     <Building2 size={12} /> {localUser.bankDetails?.bank_name} •••• {localUser.bankDetails?.account_number.slice(-4)}
                                 </span>
                             </div>

                             {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4 text-center font-bold">
                                    {error}
                                </div>
                             )}

                             <button 
                                onClick={handleWithdraw}
                                disabled={loading || Number(withdrawAmount) <= 0}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                             >
                                 {loading ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
                                 {loading ? 'Processing...' : 'Secure Withdrawal'}
                             </button>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {withdrawStep === 'SUCCESS' && (
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <Check size={40} className="text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Withdrawal Successful!</h2>
                            <p className="text-gray-600 text-sm mb-6">
                                Your funds are on the way. You should receive a credit alert within 15 minutes.
                            </p>
                            <button 
                                onClick={() => setIsWithdrawModalOpen(false)}
                                className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-200"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default NetworkMarketingView;
