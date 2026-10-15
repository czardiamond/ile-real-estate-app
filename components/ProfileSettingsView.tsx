
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import {
  User as UserIcon, Settings, Shield, Lock, Info, LogOut,
  ChevronRight, Globe, Moon, HelpCircle,
  FileText, CheckCircle, AlertTriangle, ArrowLeft, Save, Mail, MessageSquare, CloudCheck, Loader2
} from 'lucide-react';
import Logo from './Logo';
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from '../services/firebase';
import { auth } from '../src/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface ProfileSettingsViewProps {
  user: User;
  onLogout: () => void;
  onVerifyClick: () => void;
  onTabChange: (tab: string) => void;
  onUserUpdate?: (updatedUser: User) => void;
  onOpenLandTitleUpload?: () => void;
  onOpenAdminPanel?: () => void;
}

type SubView = 'main' | 'personal-info' | 'about' | 'privacy';

const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  user,
  onLogout,
  onVerifyClick,
  onTabChange,
  onUserUpdate,
  onOpenLandTitleUpload,
  onOpenAdminPanel
}) => {
  const [currentView, setCurrentView] = useState<SubView>('main');
  const [currentUserData, setCurrentUserData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Form states
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [agencyName, setAgencyName] = useState(user.agencyName || '');

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

  const isVerified = false;

  const handlePasswordReset = async () => {
    try {
      if (!auth.currentUser?.email) throw new Error('No sign-in email is available for this account.');
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      window.alert('Password reset instructions were sent to your sign-in email.');
    } catch (error: any) {
      window.alert(error?.message || 'Could not send password reset instructions.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');

    const updated: User = {
      ...currentUserData,
      name: fullName,
      phone: phone,
      agencyName: agencyName
    };

    const ok = await saveUserProfileToFirestore(updated);
    setIsSaving(false);

    if (ok) {
      setCurrentUserData(updated);
      if (onUserUpdate) onUserUpdate(updated);
      setSaveSuccessMsg('Profile saved.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } else {
      setSaveSuccessMsg('Could not save to Firestore. Check your connection and try again.');
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
            {currentUserData.avatarUrl ? (
              <img src={currentUserData.avatarUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-sm object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-sm bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{currentUserData.name?.charAt(0)?.toUpperCase() || 'I'}</div>
            )}
            <p className="mt-2 text-sm text-gray-500">Profile photo changes are not enabled here.</p>
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
                      readOnly
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl outline-none font-medium text-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">Sign-in email changes are managed through your authentication provider.</p>
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
                {isSaving ? 'Saving...' : 'Save profile'}
            </button>
        </form>
      </div>
    </div>
  );

  const AboutView = () => (
    <div className="min-h-full bg-surface pb-8">
      <Header title="About Ilé" onBack={() => setCurrentView('main')} />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#213b31] text-white"><Logo size={36} /></div>
          <div><p className="font-display text-3xl font-semibold text-on-surface">Ilé</p><p className="mt-1 text-sm text-on-surface-variant">Property, considered.</p></div>
        </div>
        <div className="space-y-5">
          <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
            <h3 className="font-semibold text-on-surface">What you can do here</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">Browse and compare public listings, save options in this browser, contact owners after signing in, manage listings, and prepare AI-assisted listing drafts. Ilé’s current listing taxonomy focuses on Nigeria; global inventory is not established.</p>
          </section>
          <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
            <h3 className="font-semibold text-on-surface">What is not connected</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">Ilé does not process payments or escrow, perform identity checks or government title searches, send email or push alerts, or provide independently verified valuations or neighbourhood safety data. An internal document review is not proof of ownership or a legal opinion.</p>
          </section>
          <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
            <h3 className="font-semibold text-on-surface">Copyright & software licensing</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">© {new Date().getFullYear()} Ilé. No standalone open-source license for this application is published in the repository. Third-party libraries and external assets remain subject to their own licenses and terms. This information is not legal advice.</p>
          </section>
          <p className="text-xs leading-5 text-on-surface-variant">Listing details and photos are provided by contributors. Confirm availability, ownership documents, fees and terms independently before committing.</p>
        </div>
      </div>
    </div>
  );

  const PrivacyView = () => (
    <div className="min-h-full bg-white pb-8">
      <Header title="Privacy information" onBack={() => setCurrentView('main')} />
      <div className="p-6 max-w-lg mx-auto prose prose-sm">
        <p><strong>This is a technical summary, not a legally approved privacy policy.</strong> The site owner must publish an appropriate policy and contact details before public launch.</p>
        <h3>Data used by the app</h3>
        <p>Depending on enabled features, the app processes account details, listing information and uploaded listing media, saved-item preferences, buyer enquiries, and title documents submitted for private internal review. Saved-item preferences may remain in this browser.</p>
        <h3>AI tools</h3>
        <p>When an AI feature is used, the relevant prompt and listing or enquiry context is sent to the AI provider configured by the site operator. Do not submit identity numbers, payment details, or other sensitive personal information.</p>
        <h3>Before launch</h3>
        <p>Configure Firebase access rules, retention and deletion processes, provider agreements, a verified privacy contact and a jurisdiction-appropriate notice. Title documents are private to their owner and authorized reviewers when the security rules are deployed.</p>
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

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="bg-white p-6 mb-6 border-b border-gray-200 shadow-sm md:rounded-b-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {currentUserData.avatarUrl ? <img src={currentUserData.avatarUrl} alt={currentUserData.name} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" /> : <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{currentUserData.name?.charAt(0)?.toUpperCase() || 'I'}</div>}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{currentUserData.name}</h2>
          <p className="text-gray-500 text-sm mb-2">{currentUserData.email}</p>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
            isVerified
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}>
            Identity verification not connected
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
                <p className="text-sm font-bold text-red-800">Identity verification unavailable</p>
                <p className="text-xs text-red-600">No identity provider is connected</p>
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

          </div>
        </div>

        {/* Section: Tools */}
        <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Tools & Verification</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <MenuItem
                icon={MessageSquare}
                label="Ilé AI Assistant"
                subLabel="Chat with your AI copilot"
                onClick={() => onTabChange('chat')}
            />
            {onOpenLandTitleUpload && (
              <MenuItem
                  icon={FileText}
                  label="Submit title document for review"
                  subLabel="Private file for internal Ilé review only"
                  onClick={onOpenLandTitleUpload}
              />
            )}
            {onOpenAdminPanel && (
              <MenuItem
                  icon={CheckCircle}
                  label="Ilé Document Review Console"
                  subLabel="Record an internal document review"
                  onClick={onOpenAdminPanel}
              />
            )}
          </div>
        </div>

         {/* Section: Security */}
         <div>
          <h3 className="px-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Privacy & Security</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <MenuItem
                icon={Lock}
                label="Change Password"
                onClick={handlePasswordReset}
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
                icon={Info}
                label="About Ilé"
                subLabel="Property marketplace"
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
            Ilé Real Estate
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsView;
