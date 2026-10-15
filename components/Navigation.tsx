import React from 'react';
import { Building2, Heart, LayoutDashboard, Menu, MessageCircle, Moon, Plus, Search, Sun } from 'lucide-react';
import { UserRole } from '../types';
import type { User } from '../types';
import Logo from './Logo';

interface NavigationProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  user?: User;
}

type NavItem = { id: string; label: string; icon: React.ElementType };

const Navigation: React.FC<NavigationProps> = ({ currentRole, activeTab, onTabChange, isDarkMode = false, onToggleTheme, user }) => {
  const navItems: NavItem[] = currentRole === UserRole.AGENT
    ? [
        { id: 'dashboard', label: 'Portfolio', icon: LayoutDashboard },
        { id: 'add-listing', label: 'Add listing', icon: Plus },
        { id: 'chat', label: 'Ilé AI', icon: MessageCircle },
      ]
    : currentRole === UserRole.BROKERAGE
      ? [
          { id: 'brokerage-dashboard', label: 'Company', icon: Building2 },
          { id: 'chat', label: 'Ilé AI', icon: MessageCircle },
        ]
      : [
          { id: 'explore', label: 'Discover', icon: Search },
          { id: 'saved', label: 'Saved', icon: Heart },
          { id: 'chat', label: 'Ilé AI', icon: MessageCircle },
        ];

  const homeTab = currentRole === UserRole.AGENT ? 'dashboard' : currentRole === UserRole.BROKERAGE ? 'brokerage-dashboard' : 'explore';
  const displayName = user?.name?.trim() || 'Account';
  const avatar = user?.avatarUrl;

  const ThemeButton = () => onToggleTheme ? (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {isDarkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  ) : null;

  const AccountButton = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={() => onTabChange('menu')}
      aria-label="Open account and settings"
      aria-current={activeTab === 'menu' ? 'page' : undefined}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full text-sm font-medium text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${compact ? 'justify-center px-1' : 'px-3 py-1.5'}`}
    >
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container text-sm font-semibold text-primary" aria-hidden="true">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
      </span>
      {!compact && <span className="max-w-28 truncate">{displayName}</span>}
      {compact && <span className="text-[11px] leading-tight">Account</span>}
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-outline-variant/80 bg-surface">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <button
            type="button"
            onClick={() => onTabChange(homeTab)}
            aria-label="Ilé home"
            className="group inline-flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#213b31] text-white transition-colors group-hover:bg-[#294b3e]"><Logo size={23} /></span>
            <span className="text-left">
              <span className="block font-display text-[22px] font-semibold leading-none tracking-tight text-on-surface">Ilé</span>
              <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-on-surface-variant sm:block">Property, considered</span>
            </span>
          </button>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                >
                  <Icon size={17} aria-hidden="true" />{label}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            <ThemeButton />
            <AccountButton />
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeButton />
            <AccountButton compact />
          </div>
        </div>
      </header>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/80 bg-surface-container-low pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex h-[68px] max-w-xl items-stretch justify-around px-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary/10' : ''}`}><Icon size={19} aria-hidden="true" /></span>
                <span className="max-w-full truncate px-1">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
