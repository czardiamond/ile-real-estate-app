
import React, { useState } from 'react';
import { User, VerificationStatus } from '../types';
import { 
  User as UserIcon, Settings, Shield, Lock, Info, LogOut, 
  ChevronRight, CreditCard, Bell, Globe, Moon, HelpCircle, 
  FileText, CheckCircle, AlertTriangle, ArrowLeft, Camera, Save, Mail, MessageSquare
} from 'lucide-react';
import Logo from './Logo';

interface ProfileSettingsViewProps {
  user: User;
  onLogout: () => void;
  onVerifyClick: () => void;
  onTabChange: (tab: string) => void;
}

type SubView = 'main' | 'personal-info' | 'about' | 'privacy' | 'notifications';

const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({ user, onLogout, onVerifyClick, onTabChange }) => {
  const [currentView, setCurrentView] = useState<SubView>('main');
  const isVerified = user.verification.status === VerificationStatus.VERIFIED;

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
                <img src={user.avatarUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-sm" />
                <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-sm hover:bg-primary/90">
                    <Camera size={16} />
                </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">Tap to change avatar</p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input type="text" defaultValue={user.name} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                    <input type="email" defaultValue={user.email} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                    <input type="tel" defaultValue={user.phone} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agency Name (Optional)</label>
                    <input type="text" defaultValue={user.agencyName || ''} placeholder="e.g. Lekki Homes" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary outline-none font-medium" />
                </div>
            </div>

            <button className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Save size={20} /> Save Changes
            </button>
        </form>
      </div>
    </div>
  );

  const AboutView = () => (
    <div className="min-h-full bg-white pb-8">
      <Header title="About Ilé" onBack={() => setCurrentView('main')} />
      <div className="p-6 max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Logo size={40} />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ilé</h3>
        <p className="text-gray-500 font-medium mb-8">Version 1.0.2 (Beta)</p>
        
        <div className="text-left space-y-4 text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <p>
                <strong>Ilé</strong> (Yoruba for "Home") is Nigeria's first AI-powered real estate companion. We are on a mission to bring trust, transparency, and ease to finding property in Nigeria.
            </p>
            <p>
                Whether you are looking for a flat in Yaba, a shop in Alaba, or an event center for your Owambe, Ilé helps you find it without the usual "agent wahala".
            </p>
            <p className="pt-4 text-xs text-gray-500 border-t border-gray-200">
                Designed & Built with ❤️ in Lagos.
            </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
            <button className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><Globe size={20} /></button>
            <button className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><Mail size={20} /></button>
            <button className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><Shield size={20} /></button>
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
                <li>Usage data to improve Ilé AI</li>
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
                { label: 'Marketing & Tips', desc: 'News from the Ilé team.', default: false }
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
          <div className="relative mb-4">
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <div className={`absolute bottom-0 right-0 p-1.5 rounded-full border-2 border-white shadow-sm ${isVerified ? 'bg-green-500' : 'bg-gray-400'}`}>
              {isVerified ? <CheckCircle size={14} className="text-white" /> : <AlertTriangle size={14} className="text-white" />}
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-gray-500 text-sm mb-2">{user.email}</p>
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
                <p className="text-xs text-red-600">Unlock full access to Ilé</p>
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
                label="Ilé AI Assistant" 
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
                label="About Ilé" 
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
            Ilé Real Estate Platform © 2025
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsView;
