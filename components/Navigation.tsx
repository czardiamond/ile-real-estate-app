
import React, { useState, useEffect } from 'react';
import { Store, Search, Plus, Armchair, Users, MessageSquare, Menu, Building2, Sun, Moon, Gamepad2, Cloud, CheckCircle2, Video, FileSpreadsheet } from 'lucide-react';
import { UserRole } from '../types';
import type { User } from '../types';
import Logo from './Logo';
import { checkFirestoreSyncStatus } from '../services/firebase';

interface NavigationProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  user?: User;
  onOpenWhatsAppHub?: () => void;
  onOpenIleWalkthrough?: () => void;
  onOpenQASuite?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentRole, activeTab, onTabChange, isDarkMode = false, onToggleTheme, user, onOpenWhatsAppHub, onOpenIleWalkthrough, onOpenQASuite }) => {
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [showSyncInfo, setShowSyncInfo] = useState<boolean>(false);

  useEffect(() => {
    checkFirestoreSyncStatus().then(status => setIsCloudSynced(status));
    const interval = setInterval(() => {
      checkFirestoreSyncStatus().then(status => setIsCloudSynced(status));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getNavItems = () => {
    // Shared Items
    const chatItem = { id: 'chat', label: 'Ilé AI', icon: MessageSquare };
    const academyItem = { id: 'academy', label: 'Academy', icon: Gamepad2 };
    const menuItem = { id: 'menu', label: 'Menu', icon: Menu };

    if (currentRole === UserRole.BROKERAGE) {
        return [
            { id: 'brokerage-dashboard', label: 'Company', icon: Building2 },
            academyItem,
            menuItem
        ];
    }

    if (currentRole === UserRole.AGENT) {
      return [
        { id: 'dashboard', label: 'Portfolio', icon: Armchair }, 
        { id: 'leads', label: 'Guests', icon: Users },
        { id: 'add-listing', label: 'Add', icon: Plus },
        academyItem,
        menuItem
      ];
    }

    // Public User
    return [
      { id: 'explore', label: 'Discover', icon: Search },
      { id: 'saved', label: 'Saved', icon: Store }, 
      academyItem,
      chatItem,
      menuItem
    ];
  };

  const navItems = getNavItems();

  const CloudStatusBadge = () => (
    <div className="relative">
      <button 
        onClick={() => setShowSyncInfo(!showSyncInfo)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition-all cursor-pointer"
        title="Firebase Firestore Cloud Synced"
      >
        <Cloud size={14} className="text-emerald-600 dark:text-emerald-400" />
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline text-[11px] font-semibold">Synced</span>
      </button>

      {showSyncInfo && (
        <div className="absolute right-0 top-10 w-64 bg-surface border border-outline-variant/30 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 text-xs text-on-surface">
          <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <CheckCircle2 size={16} />
            <span>Firebase Cloud Persistence</span>
          </div>
          <p className="text-on-surface-variant text-[11px] leading-relaxed">
            Authenticated and synchronized with Firestore database. Your properties, profile preferences, and conversation logs are secured in the cloud.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Nav Bar with Logo & Theme Toggle */}
      <nav className="md:hidden fixed top-0 w-full bg-surface/95 backdrop-blur-md z-50 px-4 py-3 flex items-center justify-between border-b border-surface-container-high">
        <div 
          className="flex items-center gap-2.5 cursor-pointer" 
          onClick={() => onTabChange(currentRole === UserRole.AGENT ? 'dashboard' : currentRole === UserRole.BROKERAGE ? 'brokerage-dashboard' : 'explore')}
        >
             <div className="w-8 h-8 bg-surface-container-low rounded-full shadow-sm border border-outline-variant/30 flex items-center justify-center">
                <Logo size={20} />
             </div>
             <span className="text-lg font-bold text-on-surface tracking-tight">Ilé</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenQASuite && (
            <button
              onClick={onOpenQASuite}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-bold transition-all shadow-sm"
              title="QA & Testing Suite"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span className="text-[11px] font-bold">QA</span>
            </button>
          )}

          {onOpenIleWalkthrough && (
            <button
              onClick={onOpenIleWalkthrough}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold transition-all shadow-sm"
              title="60-Second AI Video Walkthrough"
            >
              <Video size={14} />
              <span className="text-[11px] font-bold">60s Video</span>
            </button>
          )}

          {onOpenWhatsAppHub && (
            <button
              onClick={onOpenWhatsAppHub}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              title="WhatsApp Business Transaction Hub"
            >
              <MessageSquare size={14} />
              <span className="text-[11px] font-bold">WhatsApp</span>
            </button>
          )}

          <CloudStatusBadge />

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface transition-all flex items-center justify-center active:scale-95"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle dark mode theme"
            >
              {isDarkMode ? (
                <Sun size={18} className="text-amber-400 transition-transform rotate-0" />
              ) : (
                <Moon size={18} className="text-slate-700 dark:text-slate-200 transition-transform rotate-0" />
              )}
            </button>
          )}

          <div 
            className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden cursor-pointer"
            onClick={() => onTabChange('menu')}
          >
             <img src={user?.avatarUrl || "https://picsum.photos/100/100"} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      {/* Desktop Top Nav - Material 3 Style */}
      <nav className="hidden md:flex fixed top-0 w-full bg-surface/95 backdrop-blur-sm z-50 px-8 py-4 items-center justify-between border-b border-surface-container-high">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onTabChange(currentRole === UserRole.AGENT ? 'dashboard' : currentRole === UserRole.BROKERAGE ? 'brokerage-dashboard' : 'explore')}>
             <div className="w-10 h-10 bg-surface-container-low rounded-full shadow-sm border border-outline-variant/30 flex items-center justify-center transition-transform group-hover:scale-105">
                <Logo size={24} />
             </div>
            <div className="flex flex-col justify-center">
                <h1 className="text-xl font-medium text-on-surface tracking-tight leading-none">Ilé</h1>
            </div>
        </div>

        <div className="flex gap-3">
          {navItems.filter(item => item.id !== 'menu').map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                activeTab === item.id 
                ? 'bg-primary-container text-on-primary-container font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2}/>
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {onOpenQASuite && (
            <button
              onClick={onOpenQASuite}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Quality Assurance Testing Suite (Test Strategy, 22 Test Cases, Jira Bug Reports)"
            >
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span>QA Suite</span>
            </button>
          )}

          {onOpenIleWalkthrough && (
            <button
              onClick={onOpenIleWalkthrough}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Ilé 60-Second AI Video Walkthrough Generator"
            >
              <Video size={16} />
              <span>60s Video Studio</span>
            </button>
          )}

          {onOpenWhatsAppHub && (
            <button
              onClick={onOpenWhatsAppHub}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95"
              title="Meta WhatsApp Business Cloud API Hub"
            >
              <MessageSquare size={16} />
              <span>WhatsApp Hub</span>
            </button>
          )}

          <CloudStatusBadge />

          {/* Material 3 Global Theme Toggle Switch */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface transition-all flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle dark mode theme"
            >
              {isDarkMode ? (
                <Sun size={18} className="text-amber-400" />
              ) : (
                <Moon size={18} className="text-slate-700 dark:text-slate-200" />
              )}
            </button>
          )}

          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high p-2 pr-4 rounded-full transition-colors"
            onClick={() => onTabChange('menu')}
          >
               <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden">
                  <img src={user?.avatarUrl || "https://picsum.photos/100/100"} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <span className={`text-sm font-medium ${activeTab === 'menu' ? 'text-primary font-bold' : 'text-on-surface'}`}>{currentRole}</span>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav - Material Design 3 Implementation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-surface-container-low z-50 pb-safe">
        {/* MD3 Nav Bar is taller (80px standard) */}
        <div className="flex justify-around items-center h-20 px-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center gap-1 w-full"
              >
                {/* Active Indicator Pill */}
                <div className={`w-16 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-primary-container' : 'bg-transparent'
                }`}>
                    <item.icon 
                        size={24} 
                        className={isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}
                        strokeWidth={isActive ? 2.5 : 2}
                    />
                </div>
                {/* Label */}
                <span className={`text-[12px] font-medium tracking-wide transition-colors ${
                    isActive ? 'text-on-surface' : 'text-on-surface-variant'
                }`}>
                    {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
