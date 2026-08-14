
import React, { useState, useEffect } from 'react';
import { VerificationStatus } from '../types';
import type { User } from '../types';
import { 
  User as UserIcon, Settings, Shield, Lock, Info, LogOut, 
  ChevronRight, CreditCard, Bell, Globe, Moon, HelpCircle, 
  FileText, CheckCircle, AlertTriangle, ArrowLeft, Camera, Save, Mail, MessageSquare, CloudCheck, Loader2
} from 'lucide-react';
import Logo from './Logo';
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from '../services/firebase';

interface ProfileSettingsViewProps {
  user: User;
  onLogout: () => void;
  onVerifyClick: () => void;
  onTabChange: (tab: string) => void;
  onUserUpdate?: (updatedUser: User) => void;
}

type SubView = 'main' | 'personal-info' | 'about' | 'privacy' | 'notifications';

const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({ user, onLogout, onVerifyClick, onTabChange, onUserUpdate }) => {
  const [currentView, setCurrentView] = useState<SubView>('main');
  const [currentUserData, setCurrentUserData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Form states
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [agencyName, setAgencyName] = useState(user.agencyName || '');

  // Notifications preferences state
  const [notifState, setNotifState] = useState({
    listingAlerts: true,
    messages: true,
    priceDrops: true,
    marketing: false
  });

  useEffect(() => {
    // Fetch latest profile from Firestore on mount
    getUserProfileFromFirestore(user.id).then(fetched => {
      if (fetched) {
        setCurrentUserData(fetched);
        setFullName(fetched.name);
        setEmail(fetched.email);
        setPhone(fetched.phone);
        setAgencyName(fetched.agencyName || '');
      }
    });
  }, [user.id]);

  // Avatar Upload Handler
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const newAvatar = reader.result;
        const updated: User = { ...currentUserData, avatarUrl: newAvatar };
        setCurrentUserData(updated);
        if (onUserUpdate) onUserUpdate(updated);
        await saveUserProfileToFirestore(updated);
        setSaveSuccessMsg('Avatar updated and saved to Firestore successfully!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const isVerified = currentUserData.verification.status === VerificationStatus.VERIFIED;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');

    const updated: User = {
      ...currentUserData,
      name: fullName,
      email: email,
      phone: phone,
      agencyName: agencyName
    };

    const ok = await saveUserProfileToFirestore(updated);
    setIsSaving(false);

    if (ok) {
      setCurrentUserData(updated);
      if (onUserUpdate) onUserUpdate(updated);
      setSaveSuccessMsg('Profile synced to Firebase Firestore successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    }
  };

  // --- Sub-Views ---

  const Header = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="flex items-center gap-4 p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
      <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
        <ArrowLeft size={20} className="text-gray-600" />
      </button>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    </div>
  );

  const PersonalInfoView = () => (
    <div className="min-h-full bg-gray-50 pb-8">
      <Header title="Personal Information" onBack={() => setCurrentView('main')} />
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex flex-col items-center mb-8">
            <div className="relative">
                <img src={currentUserData.avatarUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-sm object-cover" />
                <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-sm hover:bg-primary/90 cursor-pointer">
                    <Camera size={16} />
                    <input type="file" accept="image/*" onChange={handleAvatarFileSelect} className="hidden" />
                </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">Tap camera icon to upload custom avatar photo</p>
        </div>

        {saveSuccessMsg && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm font-semibold animate-in fade-in">
            <CloudCheck size={20} className="text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSaveProfile}>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" 
                    />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agency Name (Optional)</label>
                    <input 
                      type="text" 
                      value={agencyName} 
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. Lekki Homes" 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" 
                    />
                </div>
            </div>

            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
                {isSaving ? 'Syncing to Cloud...' : 'Save & Sync to Firestore'}
            </button>
        </form>
      </div>
    </div>
  );

  const AboutView = () => (
    <div className="min-h-full bg-white pb-8">
      <Header title="About Gemini" onBack={() => setCurrentView('main')} />
      <div className="p-6 max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Logo size={40} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Gemini</h3>
        <p className="text-gray-500 font-medium mb-8">Version 1.0.2 (Beta)</p>
        
        <div className="text-left space-y-4 text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <p>
                <strong>Gemini</strong> (formerly Ilé) is Nigeria's first AI-powered real estate companion. We are on a mission to bring trust, transparency, and ease to finding property in Nigeria.
            </p>
            <p>
                Whether you are looking for a flat in Yaba, a shop in Alaba, or an event center for your Owambe, Gemini helps you find it without the usual "agent wahala".
            </p>
            <p className="pt-4 text-xs text-gray-500 border-t border-gray-200">
                Designed & Built with ❤️ in Lagos.
            </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
            <button 
              type="button"
              onClick={() => window.open('https://ile.ng', '_blank', 'noopener,noreferrer')} 
              className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95"
              title="Visit Website (https://ile.ng)"
            >
              <Globe size={20} />
            </button>
            <button 
              type="button"
              onClick={() => { window.location.href = 'mailto:support@ile.ng'; }} 
              className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95"
              title="Email Support (support@ile.ng)"
            >
              <Mail size={20} />
            </button>
            <button 
              type="button"
              onClick={() => setCurrentView('privacy')} 
              className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95"
              title="View Privacy Policy"
            >
              <Shield size={20} />
            </button>
        </div>
      </div>
    </div>
  );

  const PrivacyView = () => (
    <div className="min-h-full bg-white pb-8">
      <Header title="Privacy Policy" onBack={() => setCurrentView('main')} />
      <div className="p-6 max-w-lg mx-auto">
        <div className="prose prose-sm prose-green">
            <h3>Data Protection</h3>
            <p>We take your privacy seriously. All verification data (NIN, Biometrics) is processed securely via our partners (Smile ID / YouVerify) and is never stored in raw form on our servers.</p>
            
            <h3>What we collect</h3>
            <ul>
                <li>Contact information (Email, Phone)</li>
                <li>Property preferences and search history</li>
                <li>Usage data to improve Gemini AI</li>
            </ul>

            <h3>Your Rights</h3>
            <p>You have the right to request deletion of your data at any time. Contact support@ile.ng for assistance.</p>
        </div>
      </div>
    </div>
  );

  const NotificationsView = () => (
      <div className="min-h-full bg-gray-50 pb-8">
        <Header title="Notifications" onBack={() => setCurrentView('main')} />
        <div className="p-4 max-w-lg mx-auto space-y-4">
            {[
                { label: 'New Listing Alerts', desc: 'Get notified when new properties match your search.', default: true },
                { label: 'Message Notifications', desc: 'When an agent or client messages you.', default: true },
                { label: 'Price Drops', desc: 'Alerts when saved properties reduce price.', default: false },
                { label: 'Marketing & Tips', desc: 'News from the Gemini team.', default: false }
            ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <div className="font-bold text-gray-900">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            ))}
        </div>
      </div>
  );

  // --- Main View ---

  const MenuItem = ({ icon: Icon, label, subLabel, onClick, isDestructive = false }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 bg-white border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${isDestructive ? 'text-red-600' : 'text-gray-800'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
          <Icon size={20} />
        </div>
        <div className="text-left">
          <div className="font-semibold text-sm">{label}</div>
          {subLabel && <div className="text-xs text-gray-400 font-medium">{subLabel}</div>}
        </div>
      </div>
      {!isDestructive && <ChevronRight size={18} className="text-gray-300" />}
    </button>
  );

  if (currentView === 'personal-info') return <PersonalInfoView />;
  if (currentView === 'about') return <AboutView />;
  if (currentView === 'privacy') return <PrivacyView />;
  if (currentView === 'notifications') return <NotificationsView />;

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white p-6 mb-6 border-b border-gray-200 shadow-sm md:rounded-b-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 group cursor-pointer" onClick={() => setCurrentView('personal-info')}>
            <img 
              src={currentUserData.avatarUrl} 
              alt={currentUserData.name} 
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <label className="absolute bottom-0 right-0 p-1.5 rounded-full border-2 border-white shadow-sm bg-primary text-white hover:scale-110 transition-transform cursor-pointer">
              <Camera size={14} />
              <input type="file" accept="image/*" onChange={handleAvatarFileSelect} className="hidden" onClick={(e) => e.stopPropagation()} />
            </label>
            <div className={`absolute top-0 right-0 p-1 rounded-full border-2 border-white shadow-sm ${isVerified ? 'bg-green-500' : 'bg-gray-400'}`}>
              {isVerified ? <CheckCircle size={12} className="text-white" /> : <AlertTriangle size={12} className="text-white" />}
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{currentUserData.name}</h2>
          <p className="text-gray-500 text-sm mb-2">{currentUserData.email}</p>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
            isVerified 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}>
            {isVerified ? 'Verified Identity' : 'Unverified Account'}
          </span>
        </div>

        {!isVerified && (
          <div 
            onClick={onVerifyClick}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-200 text-red-700 p-2 rounded-full">
                <Shield size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-red-800">Verify your Identity</p>
                <p className="text-xs text-red-600">Unlock full access to Gemini</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-red-400" />
          </div>
        )}
      </div>

      <div className="px-4 space-y-6">
        {/* Section: Account */}
        <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Account</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <MenuItem 
                icon={UserIcon} 
                label="Personal Information" 
                subLabel="Edit name, phone, agency"
                onClick={() => setCurrentView('personal-info')} 
            />
             <MenuItem 
                icon={CreditCard} 
                label="Payment Methods" 
                subLabel="Manage cards & bank accounts"
                onClick={() => alert('Wallet coming soon')} 
            />
          </div>
        </div>

        {/* Section: Tools */}
        <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <MenuItem 
                icon={MessageSquare} 
                label="Gemini AI Assistant" 
                subLabel="Chat with your AI copilot"
                onClick={() => onTabChange('chat')} 
            />
          </div>
        </div>

        {/* Section: App Settings */}
        <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Preferences</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <MenuItem 
                icon={Bell} 
                label="Notifications" 
                onClick={() => setCurrentView('notifications')} 
            />
            <MenuItem 
                icon={Globe} 
                label="Language" 
                subLabel="English (Nigeria)"
                onClick={() => alert('Language selector coming soon')} 
            />
          </div>
        </div>

         {/* Section: Security */}
         <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Privacy & Security</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <MenuItem 
                icon={Lock} 
                label="Change Password" 
                onClick={() => alert('Password reset')} 
            />
             <MenuItem 
                icon={Shield} 
                label="Privacy Policy" 
                onClick={() => setCurrentView('privacy')} 
            />
          </div>
        </div>

        {/* Section: About */}
        <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Support</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <MenuItem 
                icon={HelpCircle} 
                label="Help & Support" 
                onClick={() => alert('Opening support chat...')} 
            />
             <MenuItem 
                icon={FileText} 
                label="Terms of Service" 
                onClick={() => window.open('#', '_blank')} 
            />
             <MenuItem 
                icon={Info} 
                label="About Gemini" 
                subLabel="Version 1.0.2 (Beta)"
                onClick={() => setCurrentView('about')} 
            />
          </div>
        </div>

        <button 
            onClick={onLogout}
            className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors border border-red-100"
        >
            <LogOut size={20} /> Log Out
        </button>

        <div className="text-center text-xs text-gray-400 mt-8 pb-8">
            Gemini Real Estate Platform © 2025
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsView;
