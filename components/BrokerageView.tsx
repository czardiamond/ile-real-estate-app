import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Users, Home, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { User, Property } from '../types';
import { AgentDirectoryProfile, getAgentsByAgency } from '../services/firebase';
import { getProperties } from '../src/services/propertyService';

interface BrokerageViewProps {
  user: User;
}

const BrokerageView: React.FC<BrokerageViewProps> = ({ user }) => {
  const [agents, setAgents] = useState<AgentDirectoryProfile[]>([]);
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    if (!user.agencyName) {
      setAgents([]);
      setListings([]);
      return;
    }
    setLoading(true);
    setLoadError('');
    Promise.all([getAgentsByAgency(user.agencyName), getProperties()])
      .then(([directory, allListings]) => {
        if (!active) return;
        const currentProfile: AgentDirectoryProfile = {
          id: user.id,
          name: user.name,
          role: user.role,
          agencyName: user.agencyName,
          avatarUrl: user.avatarUrl,
        };
        const byId = new Map<string, AgentDirectoryProfile>();
        [...directory, currentProfile].forEach(profile => byId.set(profile.id, profile));
        const roster = [...byId.values()];
        const ids = new Set(roster.map(profile => profile.id));
        setAgents(roster);
        setListings(allListings.filter(property => ids.has(property.agentId)));
      })
      .catch(error => {
        console.error('Unable to load brokerage data:', error);
        if (active) setLoadError('Brokerage data could not be loaded. Check your connection and Firebase rules.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user.id, user.name, user.role, user.agencyName, user.avatarUrl]);

  const listingsByAgent = useMemo(() => {
    const counts = new Map<string, number>();
    listings.forEach(listing => counts.set(listing.agentId, (counts.get(listing.agentId) || 0) + 1));
    return counts;
  }, [listings]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header className="rounded-3xl bg-slate-950 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 size={16} /> Brokerage workspace
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{user.agencyName || 'Your brokerage'}</h1>
          <p className="text-sm text-slate-300 mt-2">Team and listing data currently available in Ilé.</p>
        </div>
        <div className="text-xs text-slate-300 max-w-sm">
          This view is read-only. Invitations, access changes, commissions and payments need a trusted brokerage backend and are not enabled here.
        </div>
      </header>

      {!user.agencyName && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 text-sm">
          Add your brokerage name in profile settings to build a team directory.
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle size={18} /> {loadError}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold"><Users size={16} /> Team profiles</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{loading ? '—' : agents.length}</div>
          <p className="text-xs text-gray-500 mt-1">Profiles with this brokerage name</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold"><Home size={16} /> Published listings</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{loading ? '—' : listings.length}</div>
          <p className="text-xs text-gray-500 mt-1">Listings owned by directory members</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
          <div className="text-gray-500 text-xs uppercase font-bold">Revenue reporting</div>
          <div className="mt-3 text-xl font-bold text-gray-900">Not connected</div>
          <p className="text-xs text-gray-500 mt-1">Ilé does not process or report brokerage payments.</p>
        </div>
      </div>

      <section className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
        <div className="p-5 md:p-6 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">Team directory</h2>
          <p className="text-sm text-gray-500 mt-1">Only display names, account type and published listing counts are shown.</p>
        </div>
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-gray-500"><Loader2 className="animate-spin" size={18} /> Loading brokerage data…</div>
        ) : agents.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No team profiles are linked to this brokerage yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {agents.map(agent => (
              <li key={agent.id} className="p-4 md:px-6 flex items-center gap-4">
                <img src={agent.avatarUrl || '/property-placeholder.svg'} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate">{agent.name || 'Ilé member'}</div>
                  <div className="text-xs text-gray-500">{agent.role}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{listingsByAgent.get(agent.id) || 0}</div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500">listings</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {listings.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-lg text-gray-900">Published listing portfolio</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {listings.map(listing => (
              <article key={listing.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4">
                <img src={listing.images[0]} alt="" className="w-24 h-20 rounded-xl object-cover bg-gray-100" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                  <p className="text-sm text-emerald-800 font-bold">₦{listing.price.toLocaleString()}{listing.period ? ` / ${listing.period}` : ''}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={12} /> {listing.location.area}{listing.location.state ? `, ${listing.location.state}` : ''}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BrokerageView;
