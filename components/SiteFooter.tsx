import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface SiteFooterProps {
  onNavigate: (tab: string) => void;
}

const SiteFooter: React.FC<SiteFooterProps> = ({ onNavigate }) => (
  <footer className="border-t border-outline-variant/70 bg-surface-container-low">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-8">
      <div>
        <p className="font-display text-xl font-semibold tracking-tight text-on-surface">Ilé</p>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">Find your next space with clarity.</p>
      </div>
      <nav aria-label="Helpful pages" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={() => onNavigate('guide')} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">How to use Ilé <ArrowUpRight size={14} aria-hidden="true" /></button>
        <button type="button" onClick={() => onNavigate('about')} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">About & licensing <ArrowUpRight size={14} aria-hidden="true" /></button>
        <button type="button" onClick={() => onNavigate('explore')} className="inline-flex min-h-10 items-center text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Browse listings</button>
      </nav>
      <p className="text-xs leading-5 text-on-surface-variant">© {new Date().getFullYear()} Ilé</p>
    </div>
  </footer>
);

export default SiteFooter;
