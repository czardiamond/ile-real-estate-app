import React, { useState, useEffect } from 'react';
import { Property, User } from '../types';
import { savePropertyAlertPreference, getPropertyAlertPreference, PropertyAlertPreference } from '../services/firebase';
import { sendGmailEmail } from '../services/gmailService';
import { Bell, BellOff, CheckCircle2, Loader2, Mail, Sparkles, TrendingDown, Home, ShieldCheck } from 'lucide-react';

interface PropertyAlertsNotifyProps {
  property: Property;
  user: User;
}

export const PropertyAlertsNotify: React.FC<PropertyAlertsNotifyProps> = ({ property, user }) => {
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [notifyPriceDrop, setNotifyPriceDrop] = useState<boolean>(true);
  const [notifySimilar, setNotifySimilar] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>(user.email || 'anyanwudiamond@gmail.com');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [testEmailSent, setTestEmailSent] = useState<boolean>(false);

  useEffect(() => {
    loadAlertPreference();
  }, [property.id, user.id]);

  const loadAlertPreference = async () => {
    setIsLoading(true);
    const pref = await getPropertyAlertPreference(user.id || 'default_user', property.id);
    if (pref) {
      setIsSubscribed(true);
      setNotifyPriceDrop(pref.notifyPriceDrop);
      setNotifySimilar(pref.notifySimilarListings);
      if (pref.userEmail) setUserEmail(pref.userEmail);
    } else {
      setIsSubscribed(false);
    }
    setIsLoading(false);
  };

  const handleToggleSubscription = async () => {
    setIsSaving(true);
    const newStatus = !isSubscribed;
    setIsSubscribed(newStatus);

    if (newStatus) {
      const prefData: PropertyAlertPreference = {
        userId: user.id || 'default_user',
        userEmail,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyPrice: property.price,
        locationArea: property.location.area || property.location.city,
        notifyPriceDrop,
        notifySimilarListings: notifySimilar,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await savePropertyAlertPreference(prefData);

      // Send automated confirmation email via Gmail API
      await sendGmailEmail({
        to: userEmail,
        subject: `[Ilé Price Alert Set] Subscribed to ${property.title}`,
        bodyText: `You have successfully subscribed to price drop alerts for ${property.title} in ${property.location.area}. Asking price: ₦${property.price.toLocaleString()}.`,
        bodyHtml: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #065f46;">🔔 Price Drop & Alert Subscription Confirmed</h2>
            <p>Hello ${user.name || 'Valued User'},</p>
            <p>You will now receive instant Gmail notifications whenever there is a <strong>price drop</strong> or a <strong>new similar listing</strong> for:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0; color: #0f172a;">${property.title}</h3>
              <p style="margin: 0; font-weight: bold; color: #059669;">Current Price: ₦${property.price.toLocaleString()}</p>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Location: ${property.location.area}, ${property.location.city}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Stored securely in Ilé Firestore Notification Preferences.</p>
          </div>
        `
      });
      setTestEmailSent(true);
      setTimeout(() => setTestEmailSent(false), 5000);
    } else {
      const prefData: PropertyAlertPreference = {
        userId: user.id || 'default_user',
        userEmail,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyPrice: property.price,
        locationArea: property.location.area || property.location.city,
        notifyPriceDrop: false,
        notifySimilarListings: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await savePropertyAlertPreference(prefData);
    }

    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleUpdatePreferences = async () => {
    if (!isSubscribed) return;
    setIsSaving(true);
    const prefData: PropertyAlertPreference = {
      userId: user.id || 'default_user',
      userEmail,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyPrice: property.price,
      locationArea: property.location.area || property.location.city,
      notifyPriceDrop,
      notifySimilarListings: notifySimilar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await savePropertyAlertPreference(prefData);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex items-center gap-3 text-xs text-on-surface-variant">
        <Loader2 size={16} className="animate-spin text-primary" /> Loading alert preferences...
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      isSubscribed 
        ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-surface border-emerald-500/30' 
        : 'bg-surface-container-low border-outline-variant/20'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isSubscribed ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {isSubscribed ? <Bell size={20} className="animate-bounce" /> : <BellOff size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-on-surface">Price Drop & Market Alerts</h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                Firebase Firestore
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Get notified immediately via Gmail when price drops or new spaces launch in {property.location.area || property.location.city}.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggleSubscription}
          disabled={isSaving}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 ${
            isSubscribed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-primary hover:bg-primary/90 text-white'
          }`}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isSubscribed ? (
            <>
              <CheckCircle2 size={16} /> Subscribed (On)
            </>
          ) : (
            <>
              <Bell size={16} /> Notify Me
            </>
          )}
        </button>
      </div>

      {/* Expanded Subscription Options */}
      {isSubscribed && (
        <div className="mt-4 pt-4 border-t border-outline-variant/15 space-y-3 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-surface border border-outline-variant/15 hover:border-emerald-500/30 transition-colors">
              <input
                type="checkbox"
                checked={notifyPriceDrop}
                onChange={(e) => {
                  setNotifyPriceDrop(e.target.checked);
                  handleUpdatePreferences();
                }}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <div className="flex items-center gap-1.5 font-bold text-on-surface">
                <TrendingDown size={14} className="text-emerald-600" />
                Notify on Price Reductions
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-surface border border-outline-variant/15 hover:border-emerald-500/30 transition-colors">
              <input
                type="checkbox"
                checked={notifySimilar}
                onChange={(e) => {
                  setNotifySimilar(e.target.checked);
                  handleUpdatePreferences();
                }}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <div className="flex items-center gap-1.5 font-bold text-on-surface">
                <Home size={14} className="text-primary" />
                Notify on Similar Nearby Spaces
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <Mail size={13} className="text-emerald-600" />
              Notification Email: <strong className="text-on-surface">{userEmail}</strong>
            </div>

            {testEmailSent && (
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 animate-in fade-in">
                <Sparkles size={12} /> Confirmation email dispatched via Gmail!
              </span>
            )}
            {savedSuccess && !testEmailSent && (
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <ShieldCheck size={12} /> Saved to Firestore!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
