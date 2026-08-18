
import React, { useState, useEffect } from 'react';
import { User, NetworkRank, UserRole, VerificationStatus } from '../types';
import { getAgentsByAgency, updateUserPermissions } from '../services/firebase';
import { MOCK_PROPERTIES } from '../services/mockData';
import { Users, Briefcase, TrendingUp, Building2, Plus, Search, MoreVertical, Award, BadgeCheck, AlertTriangle, Settings, Mail, X, Shield, Lock, Power, ChevronDown, Check, UserCog, UserPlus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BrokerageViewProps {
  user: User;
}

const BrokerageView: React.FC<BrokerageViewProps> = ({ user }) => {
  const [agents, setAgents] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'roster'>('overview');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Permission Modal State
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempRole, setTempRole] = useState<'Standard' | 'Manager'>('Standard');
  const [tempActive, setTempActive] = useState(true);

  // Add Agent Modal State
  const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
  const [newAgentData, setNewAgentData] = useState({ name: '', email: '' });

  useEffect(() => {
    if (user.agencyName) {
      getAgentsByAgency(user.agencyName).then(companyAgents => {
        setAgents(companyAgents);
      }).catch(err => {
        console.warn('Error fetching agency agents:', err);
      });
    }
  }, [user.agencyName]);

  // Derived Stats
  const totalAgents = agents.length;
  const totalLifetimeRevenue = agents.reduce((acc, curr) => acc + curr.wallet.lifetimeEarnings, 0);
  
  // Calculate active listings for the entire brokerage
  const agencyListingsCount = MOCK_PROPERTIES.filter(p => 
      agents.some(a => a.id === p.agentId)
  ).length;

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `₦${(val/1000000).toFixed(1)}M`;
    return `₦${val.toLocaleString()}`;
  };

  const handleOpenPermissions = (agent: User) => {
      setSelectedAgent(agent);
      setTempRole(agent.brokerageRole || 'Standard');
      setTempActive(agent.isActive !== false); // Default to true if undefined
      setIsPermissionModalOpen(true);
  };

  const handleSavePermissions = async () => {
      if (!selectedAgent) return;
      setIsSaving(true);
      
      const success = await updateUserPermissions(selectedAgent.id, {
          brokerageRole: tempRole,
          isActive: tempActive
      });

      if (success) {
          // Update local state to reflect changes immediately
          setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, brokerageRole: tempRole, isActive: tempActive } : a));
          setIsPermissionModalOpen(false);
          setSelectedAgent(null);
      } else {
          alert('Failed to update permissions.');
      }
      setIsSaving(false);
  };

  const handleAddAgent = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAgentData.name || !newAgentData.email) return;

      const newAgent: User = {
          id: `u_new_${Date.now()}`,
          name: newAgentData.name,
          email: newAgentData.email,
          phone: '',
          role: UserRole.AGENT,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newAgentData.name)}&background=random`,
          verified: false,
          verification: { status: VerificationStatus.UNVERIFIED },
          agencyName: user.agencyName,
          brokerageRole: 'Standard',
          isActive: true,
          referralCode: newAgentData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
          networkRank: NetworkRank.SCOUT,
          downlineCount: 0,
          wallet: { balance: 0, lifetimeEarnings: 0, pendingClearance: 0 }
      };

      setAgents(prev => [...prev, newAgent]);
      setNewAgentData({ name: '', email: '' });
      setIsAddAgentModalOpen(false);
  };

  const filteredAgents = agents.filter(agent => 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock Chart Data
  const performanceData = [
      { name: 'Jan', revenue: 4500000 },
      { name: 'Feb', revenue: 5200000 },
      { name: 'Mar', revenue: 4800000 },
      { name: 'Apr', revenue: 6100000 },
      { name: 'May', revenue: 5900000 },
      { name: 'Jun', revenue: 7500000 },
      { name: 'Jul', revenue: 8200000 },
  ];

  return (
    <div className="pb-24 pt-4 md:pt-8 bg-gray-50 min-h-screen px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                  <Building2 size={24} className="text-primary" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user.agencyName}</h1>
                  <p className="text-sm text-gray-500">Brokerage Dashboard • {user.verification.lasera_id}</p>
              </div>
          </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Agents</p>
                  <h3 className="text-3xl font-bold text-gray-900">{totalAgents}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Users size={24} />
              </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Team Revenue (YTD)</p>
                  <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(totalLifetimeRevenue)}</h3>
              </div>
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <TrendingUp size={24} />
              </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Listings</p>
                  <h3 className="text-3xl font-bold text-gray-900">{agencyListingsCount}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                  <Briefcase size={24} />
              </div>
          </div>
      </div>

      {/* TABS */}
      <div className="flex mb-6 bg-gray-200 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
              Overview
          </button>
          <button 
            onClick={() => setActiveTab('roster')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'roster' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
              Agent Roster
          </button>
      </div>

      {activeTab === 'overview' && (
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-gray-900">Revenue Performance</h3>
                  <select className="bg-gray-50 border-none text-sm font-bold text-gray-500 rounded-lg p-2 outline-none">
                      <option>Last 6 Months</option>
                      <option>This Year</option>
                  </select>
              </div>
              <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#166534" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#166534" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} tickFormatter={(val) => `₦${val/1000000}M`} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`₦${(value/1000000).toFixed(2)}M`, 'Revenue']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#166534" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      )}

      {activeTab === 'roster' && (
          <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search agents by name or email..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary w-full sm:w-80 shadow-sm"
                      />
                  </div>
                  <button 
                    onClick={() => setIsAddAgentModalOpen(true)}
                    className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                      <UserPlus size={18} /> Add Agent
                  </button>
              </div>

              <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Agent</th>
                              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Performance</th>
                              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {filteredAgents.map(agent => (
                              <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <div className="relative">
                                            <img src={agent.avatarUrl} alt="" className={`w-10 h-10 rounded-full object-cover bg-gray-100 ${agent.isActive === false ? 'grayscale' : ''}`} />
                                            {agent.isActive === false && (
                                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                                    <Lock size={12} className="text-white" />
                                                </div>
                                            )}
                                          </div>
                                          <div>
                                              <p className={`font-bold text-sm ${agent.isActive === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{agent.name}</p>
                                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                                  <Mail size={10} /> {agent.email}
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="flex flex-col">
                                          <div className="flex items-center gap-1.5">
                                              {agent.brokerageRole === 'Manager' && <Shield size={14} className="text-primary fill-primary/20" />}
                                              <span className={`text-sm font-medium ${agent.brokerageRole === 'Manager' ? 'text-primary' : 'text-gray-900'}`}>
                                                  {agent.brokerageRole || 'Standard Agent'}
                                              </span>
                                          </div>
                                          <span className="text-xs text-gray-500">{agent.networkRank}</span>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="text-sm">
                                          <p className="font-bold text-gray-900">{formatCurrency(agent.wallet.lifetimeEarnings)}</p>
                                          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 w-fit px-1.5 py-0.5 rounded mt-0.5 font-bold">
                                               <TrendingUp size={10} /> Lifetime
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      {agent.isActive === false ? (
                                           <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1.5 rounded-full w-fit border border-red-100">
                                              <Power size={14} />
                                              <span className="text-xs font-bold">Revoked</span>
                                          </div>
                                      ) : agent.verified ? (
                                          <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-full w-fit border border-green-100">
                                              <BadgeCheck size={14} />
                                              <span className="text-xs font-bold">Verified</span>
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full w-fit border border-amber-100">
                                              <AlertTriangle size={14} />
                                              <span className="text-xs font-bold">Unverified</span>
                                          </div>
                                      )}
                                  </td>
                                  <td className="p-4 text-right">
                                      <button 
                                        onClick={() => handleOpenPermissions(agent)}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary hover:text-primary transition-all shadow-sm group"
                                      >
                                          <UserCog size={14} className="text-gray-400 group-hover:text-primary transition-colors" />
                                          Manage
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredAgents.length === 0 && (
                      <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                          <div className="bg-gray-100 p-4 rounded-full mb-3">
                              <Search size={24} className="opacity-50" />
                          </div>
                          <p>No agents found matching "{searchQuery}"</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Permission Management Modal */}
      {isPermissionModalOpen && selectedAgent && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 relative">
                  {/* Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Agent Permissions</h3>
                      <button onClick={() => setIsPermissionModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6">
                      {/* Agent Info Snippet */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <img src={selectedAgent.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                          <div>
                              <p className="font-bold text-gray-900">{selectedAgent.name}</p>
                              <p className="text-xs text-gray-500">{selectedAgent.email}</p>
                          </div>
                      </div>

                      {/* Role Selection */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Assign Role</label>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setTempRole('Standard')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                    tempRole === 'Standard' 
                                    ? 'border-primary bg-primary/5 text-primary' 
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                  <Users size={24} />
                                  <span className="text-sm font-bold">Standard Agent</span>
                              </button>
                              <button 
                                onClick={() => setTempRole('Manager')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                    tempRole === 'Manager' 
                                    ? 'border-primary bg-primary/5 text-primary' 
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                  <Shield size={24} />
                                  <span className="text-sm font-bold">Team Manager</span>
                              </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                              {tempRole === 'Manager' 
                                  ? 'Managers can view full team stats, approve withdrawals, and edit listings.' 
                                  : 'Standard Agents can only manage their own listings and leads.'}
                          </p>
                      </div>

                      {/* Access Toggle */}
                      <div className="pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                              <div>
                                  <p className="font-bold text-gray-900 text-sm">Account Access</p>
                                  <p className="text-xs text-gray-500">Allow agent to log in</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={tempActive} 
                                    onChange={(e) => setTempActive(e.target.checked)} 
                                    className="sr-only peer" 
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                              </label>
                          </div>
                      </div>

                      {!tempActive && (
                          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs flex gap-2">
                              <AlertTriangle size={16} className="shrink-0" />
                              <p>Revoking access will immediately log this user out and hide their listings from the public marketplace.</p>
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                      <button 
                        onClick={() => setIsPermissionModalOpen(false)}
                        className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleSavePermissions}
                        disabled={isSaving}
                        className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ADD AGENT MODAL */}
      {isAddAgentModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 relative">
                  {/* Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Add New Agent</h3>
                      <button onClick={() => setIsAddAgentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                          <X size={20} />
                      </button>
                  </div>

                  <form onSubmit={handleAddAgent}>
                      <div className="p-6 space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                              <input 
                                  type="text" 
                                  required
                                  value={newAgentData.name}
                                  onChange={(e) => setNewAgentData({...newAgentData, name: e.target.value})}
                                  placeholder="e.g. John Doe"
                                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                              <input 
                                  type="email" 
                                  required
                                  value={newAgentData.email}
                                  onChange={(e) => setNewAgentData({...newAgentData, email: e.target.value})}
                                  placeholder="e.g. john@ile.ng"
                                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
                              />
                          </div>
                          <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                              <Mail size={16} className="shrink-0 mt-0.5" />
                              <p>An invitation link will be sent to this email address for the agent to set up their password.</p>
                          </div>
                      </div>

                      <div className="p-4 bg-gray-50 border-t border-gray-100">
                          <button 
                            type="submit"
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                          >
                              <UserPlus size={18} /> Send Invitation
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default BrokerageView;
