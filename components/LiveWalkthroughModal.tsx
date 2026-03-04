
import React, { useState } from 'react';
import { Property, User } from '../types';
import { X, Calendar, Video, Clock, CheckCircle, CreditCard, ShieldCheck } from 'lucide-react';
import { sendEmailNotification } from '../services/notificationService';

interface LiveWalkthroughModalProps {
  property: Property;
  user: User;
  onClose: () => void;
}

const LiveWalkthroughModal: React.FC<LiveWalkthroughModalProps> = ({ property, user, onClose }) => {
  const [step, setStep] = useState<'schedule' | 'success'>('schedule');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Notification
    await sendEmailNotification(
        user.email,
        'Walkthrough Booking Confirmed',
        `Your live walkthrough for ${property.title} is scheduled for ${date} at ${time}.`
    );

    setIsSubmitting(false);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
            >
                <X size={20} />
            </button>

            {step === 'schedule' ? (
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="bg-blue-600 p-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-2 bg-white/20 rounded-lg">
                                <Video size={24} className="text-white" />
                             </div>
                             <span className="bg-blue-500 text-xs font-bold px-2 py-1 rounded border border-blue-400">Diaspora Service</span>
                        </div>
                        <h2 className="text-2xl font-bold">Request Live Walkthrough</h2>
                        <p className="text-blue-100 text-sm mt-1">Hire a verified Ilé Scout to visit on your behalf.</p>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Value Prop */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                             <ShieldCheck className="text-blue-600 shrink-0" size={24} />
                             <div>
                                 <h4 className="font-bold text-blue-900 text-sm">Vetted Scouts Only</h4>
                                 <p className="text-xs text-blue-700 mt-1">Our scouts check for water pressure, noise levels, and structural integrity via HD Video Call.</p>
                             </div>
                        </div>

                        {/* Date & Time Selection */}
                        <div className="space-y-4">
                             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Select Time Slot</h3>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                                     <div className="relative">
                                         <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                                         <input 
                                            type="date" 
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none" 
                                        />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-semibold text-gray-500 mb-1">Time (WAT)</label>
                                     <div className="relative">
                                         <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                         <input 
                                            type="time" 
                                            required
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none" 
                                        />
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* Property Context */}
                        <div>
                             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Inspection For</h3>
                             <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                 <img src={property.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                 <div className="flex-1 min-w-0">
                                     <p className="font-bold text-sm truncate">{property.title}</p>
                                     <p className="text-xs text-gray-500">{property.location.area}</p>
                                 </div>
                             </div>
                        </div>

                        {/* Pricing */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 font-medium">Service Fee</p>
                                <p className="text-xl font-bold text-gray-900">₦15,000</p>
                            </div>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-200"
                            >
                                {isSubmitting ? 'Booking...' : 'Book Scout'}
                                {!isSubmitting && <CreditCard size={18} />}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Confirmed!</h2>
                    <p className="text-gray-600 mb-6">
                        An Ilé Scout has been notified. You will receive a payment link via email shortly to confirm the slot for <strong>{date} at {time}</strong>.
                    </p>
                    <button 
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
                    >
                        Back to Property
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default LiveWalkthroughModal;
