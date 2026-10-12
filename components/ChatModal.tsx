import React, { useState } from 'react';
import type { Property, User } from '../types';
import { AlertCircle, CheckCircle2, LockKeyhole, Send, X } from 'lucide-react';
import { saveLeadToFirestore } from '../services/firebase';

interface ChatModalProps {
  property: Property;
  onClose: () => void;
  user?: User;
}

const ChatModal: React.FC<ChatModalProps> = ({ property, onClose, user }) => {
  const [message, setMessage] = useState(`Hi, I'm interested in ${property.title}. Please contact me with more information.`);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError('Sign in before sending a property enquiry.');
      return;
    }
    if (message.trim().length < 5) {
      setError('Please enter a little more detail.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const saved = await saveLeadToFirestore({
        id: `lead_${user.id}_${property.id}_${Date.now()}`,
        buyerId: user.id,
        agentId: property.ownerId || property.agentId,
        propertyId: property.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        budget: 0,
        value: property.price,
        notes: message.trim(),
      });
      if (!saved) throw new Error('Your enquiry could not be saved. Check your connection and try again.');
      setSent(true);
    } catch (sendError: any) {
      setError(sendError?.message || 'Your enquiry could not be saved. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <section className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <header className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Contact listing owner</h2>
            <p className="text-xs text-gray-500 mt-1">Your enquiry goes to the owner's Ilé dashboard.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
        </header>

        <div className="p-5 bg-gray-50 flex gap-3 items-center border-b border-gray-100">
          <img src={property.images[0]} alt="" className="w-16 h-14 rounded-xl object-cover bg-gray-200" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{property.title}</p>
            <p className="text-sm font-bold text-emerald-800">₦{property.price.toLocaleString()}{property.period ? ` / ${property.period}` : ''}</p>
          </div>
        </div>

        <div className="p-5">
          {!user ? (
            <div className="text-sm text-gray-700 flex items-center gap-2"><LockKeyhole size={18} /> Sign in to send an enquiry to this listing's owner.</div>
          ) : sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={20} /> Enquiry sent</div>
              <p className="text-sm mt-2">It has been added to the listing owner's lead inbox. Email and WhatsApp notifications are not connected yet.</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600">Message
                <textarea value={message} onChange={event => setMessage(event.target.value)} rows={4} maxLength={4000} required className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-sm font-normal normal-case tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-600" />
              </label>
              <div className="text-xs text-gray-500">Sending as {user.name}{user.email ? ` · ${user.email}` : ''}</div>
              {error && <div className="text-sm text-red-700 flex items-start gap-2"><AlertCircle size={17} className="shrink-0" /> {error}</div>}
              <button type="submit" disabled={sending} className="w-full rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-bold py-3 flex items-center justify-center gap-2">
                <Send size={16} /> {sending ? 'Sending…' : 'Send enquiry'}
              </button>
            </form>
          )}
          <p className="mt-4 text-[11px] text-gray-500">Do not send payment details. Verify a property independently before making any payment.</p>
        </div>
      </section>
    </div>
  );
};

export default ChatModal;
