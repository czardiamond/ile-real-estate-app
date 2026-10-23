import React from 'react';
import { ArrowLeft, BookOpen, Building2, CheckCircle2, Compass, Heart, HelpCircle, MapPin, MessageCircle, Scale, ShieldCheck, Sparkles } from 'lucide-react';

interface InfoPageProps {
  onBack: () => void;
  onExplore?: () => void;
}

const PageHeader: React.FC<{ eyebrow: string; title: string; description: string; onBack: () => void }> = ({ eyebrow, title, description, onBack }) => (
  <header className="border-b border-outline-variant/70 bg-surface">
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <button type="button" onClick={onBack} className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <ArrowLeft size={17} aria-hidden="true" /> Back to Ilé
      </button>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="max-w-4xl font-display text-4xl font-medium leading-tight tracking-tight text-on-surface md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant md:text-lg">{description}</p>
    </div>
  </header>
);

const GuideStep: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <article className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{number}</p>
    <h3 className="mt-2 text-lg font-semibold text-on-surface">{title}</h3>
    <div className="mt-3 text-sm leading-6 text-on-surface-variant">{children}</div>
  </article>
);

export const GuideView: React.FC<InfoPageProps> = ({ onBack, onExplore }) => (
  <div className="min-h-[70vh] bg-surface text-on-surface">
    <PageHeader eyebrow="Ilé field guide" title="Find a space with more confidence." description="A practical walkthrough for searching, comparing, saving and enquiring about property on Ilé." onBack={onBack} />
    <main className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-12">
      <section aria-labelledby="guide-search" className="mb-12">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Compass size={20} aria-hidden="true" /></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">For buyers, renters and guests</p><h2 id="guide-search" className="mt-1 text-2xl font-semibold">Explore at your own pace</h2></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <GuideStep number="01" title="Search and narrow the field">
            <p>Search by property name, neighbourhood or city. Choose a category, open Filters to narrow the available listings, and sort by newest or price.</p>
          </GuideStep>
          <GuideStep number="02" title="Review each listing carefully">
            <p>Open a listing to read its description, price and terms, location area, features and photos. Public listings show neighbourhood-level location; exact street addresses and seller-pinned coordinates are kept private.</p>
          </GuideStep>
          <GuideStep number="03" title="Save or compare options">
            <p>Use the heart to save a listing on this browser, or compare up to three properties at once. Saved items are stored locally in your browser and are not currently synced across devices.</p>
          </GuideStep>
          <GuideStep number="04" title="Send an enquiry when ready">
            <p>Sign in to contact a listing owner through Ilé. Confirm the full address, availability, fees and terms directly with the owner before making a decision.</p>
          </GuideStep>
        </div>
      </section>

      <section aria-labelledby="guide-listing" className="mb-12 rounded-3xl bg-[#213b31] p-6 text-white md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Building2 size={22} aria-hidden="true" /></div>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d5c29e]">For property owners and agents</p>
            <h2 id="guide-listing" className="mt-2 text-2xl font-semibold">Publish a clear, useful listing</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-white/85">
              <li><strong className="text-white">1.</strong> Sign in with an owner or agent account and open your portfolio.</li>
              <li><strong className="text-white">2.</strong> Choose Add listing and complete the guided form. You can start with an AI-assisted draft or enter details manually.</li>
              <li><strong className="text-white">3.</strong> Check every AI-suggested detail, price, description and photo before publishing. AI suggestions are drafts, not verified facts.</li>
              <li><strong className="text-white">4.</strong> Return to your portfolio to manage your listings and review buyer enquiries.</li>
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="guide-safety" className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[#c6aa77]/50 bg-[#f2ecdf] p-5 md:p-6">
          <div className="flex items-center gap-2 text-[#573f1e]"><ShieldCheck size={19} aria-hidden="true" /><h2 id="guide-safety" className="font-semibold">A note on trust and safety</h2></div>
          <p className="mt-3 text-sm leading-6 text-[#4f493e]">An Ilé document-review label means an internal review was recorded; it is not a government title search, proof of ownership, identity check or legal opinion. Ilé does not process rent or purchase payments, provide escrow, or verify independent valuations. Inspect the property and have qualified local professionals check documents before paying.</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
          <div className="flex items-center gap-2"><HelpCircle size={19} className="text-primary" aria-hidden="true" /><h2 className="font-semibold">Need a quick reminder?</h2></div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
            <li className="flex gap-2"><MapPin size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />Map locations may be unavailable; use the list when no pins are shown.</li>
            <li className="flex gap-2"><Heart size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />Saved listings stay in this browser.</li>
            <li className="flex gap-2"><MessageCircle size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />An enquiry is a conversation starter, not a booking.</li>
          </ul>
        </div>
      </section>

      {onExplore && <button type="button" onClick={onExplore} className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Compass size={17} aria-hidden="true" />Explore listings</button>}
    </main>
  </div>
);

export const AboutView: React.FC<InfoPageProps> = ({ onBack, onExplore }) => (
  <div className="min-h-[70vh] bg-surface text-on-surface">
    <PageHeader eyebrow="About Ilé" title="A more considered way to find a place." description="Ilé is a property marketplace designed to make discovery, comparison and owner enquiries feel clear and intentional." onBack={onBack} />
    <main className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-12">
      <div className="grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
          <Compass size={22} className="text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">Discover</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">Browse public listings, search and filter, switch between list and map views when location data is available, and compare options.</p>
        </article>
        <article className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
          <MessageCircle size={22} className="text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">Connect</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">Signed-in users can send enquiries to listing owners. Owners and agents can manage listings and respond through their account.</p>
        </article>
        <article className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
          <Sparkles size={22} className="text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-semibold">Create</h2><p className="mt-2 text-sm leading-6 text-on-surface-variant">Owners and agents can prepare listing drafts with AI assistance or complete the listing form manually. Review all suggested text before publishing.</p>
        </article>
      </div>

      <section className="mt-8 rounded-3xl border border-outline-variant/80 bg-surface-container-low p-6 md:p-8" aria-labelledby="about-scope">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="mt-1 shrink-0 text-primary" size={22} aria-hidden="true" />
          <div><h2 id="about-scope" className="text-xl font-semibold">What Ilé does—and does not do</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">The current product supports public listing discovery, owner enquiries, account-based listing management, and AI-assisted listing drafts. Its listings and property taxonomy currently focus on Nigeria; international inventory and jurisdiction-specific services are not established by this app.</p>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">Ilé does not currently process rent or purchase payments, offer escrow, perform identity/KYC checks or government title-registry searches, send email or push alerts, or provide independently verified valuations or neighbourhood safety data. Any internal document review is not a legal opinion or proof of ownership.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="Copyright and licensing">
        <article className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
          <h2 className="text-lg font-semibold">Copyright</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">© {new Date().getFullYear()} Ilé. This notice grants no reuse license for the Ilé name, logo or original materials; any permission must come from the applicable rights holder. Property listing information and photographs remain subject to the rights and permissions of their respective contributors.</p>
        </article>
        <article className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 md:p-6">
          <h2 className="text-lg font-semibold">Software licensing</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">No standalone open-source license for this application is published in the repository. Third-party libraries, maps, fonts and other external assets remain subject to their own licenses and terms. This summary is informational and is not legal advice.</p>
        </article>
      </section>

      <div className="mt-8 rounded-2xl border border-outline-variant/80 p-5 text-sm leading-6 text-on-surface-variant">
        <div className="flex items-center gap-2 font-semibold text-on-surface"><Scale size={18} className="text-primary" aria-hidden="true" />Independent checks matter</div>
        <p className="mt-2">Property details are provided by listing contributors. Confirm availability, fees, ownership documents, permitted use and all transaction terms independently before making a commitment.</p>
      </div>

      {onExplore && <button type="button" onClick={onExplore} className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Compass size={17} aria-hidden="true" />Explore listings</button>}
    </main>
  </div>
);
