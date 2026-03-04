
import React from 'react';
import { Store, Search, Plus, Armchair, Users, MessageSquare, Menu, Network, Building2 } from 'lucide-react';
import { UserRole } from '../types';
import Logo from './Logo';

interface NavigationProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentRole, activeTab, onTabChange }) => {
  
  const getNavItems = () => {
    // Shared Items
    const circleItem = { id: 'network', label: 'Network', icon: Network };
    const chatItem = { id: 'chat', label: 'Ilé AI', icon: MessageSquare };
    const menuItem = { id: 'menu', label: 'Menu', icon: Menu };

    if (currentRole === UserRole.BROKERAGE) {
        return [
            { id: 'brokerage-dashboard', label: 'Company', icon: Building2 },
            { id: 'network', label: 'Network', icon: Network }, // Brokerages also use Network view for wallet/withdrawals
            menuItem
        ];
    }

    if (currentRole === UserRole.AGENT) {
      return [
        { id: 'dashboard', label: 'Veranda', icon: Armchair }, 
        { id: 'leads', label: 'Guests', icon: Users },
        { id: 'add-listing', label: 'Add', icon: Plus },
        circleItem,
        menuItem
      ];
    }

    // Public User
    return [
      { id: 'explore', label: 'Discover', icon: Search },
      { id: 'saved', label: 'Saved', icon: Store }, 
      circleItem,
      chatItem,
      menuItem
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Desktop Top Nav - Material 3 Style */}
      <nav className="hidden md:flex fixed top-0 w-full bg-surface/95 backdrop-blur-sm z-50 px-8 py-4 items-center justify-between border-b border-surface-container-high">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onTabChange(currentRole === UserRole.AGENT ? 'dashboard' : currentRole === UserRole.BROKERAGE ? 'brokerage-dashboard' : 'explore')}>
             <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <Logo size={24} />
             </div>
            <div className="flex flex-col justify-center">
                <h1 className="text-xl font-medium text-on-surface tracking-tight leading-none">Ilé</h1>
            </div>
        </div>
        <div className="flex gap-4">
          {navItems.filter(item => item.id !== 'menu').map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                activeTab === item.id 
                ? 'bg-primary-container text-on-primary-container' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2}/>
              {item.label}
            </button>
          ))}
        </div>
        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high p-2 pr-4 rounded-full transition-colors"
          onClick={() => onTabChange('menu')}
        >
             <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden">
                <img src="https://picsum.photos/100/100" alt="Profile" className="w-full h-full object-cover" />
             </div>
             <span className={`text-sm font-medium ${activeTab === 'menu' ? 'text-primary' : 'text-on-surface'}`}>{currentRole}</span>
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
