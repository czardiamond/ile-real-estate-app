
import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { getPaymentPlans, processPayment, PaymentPlan } from '../services/fintechService';
import { X, CreditCard, Calendar, CheckCircle, Shield, Loader2, Wallet, Building2, Phone, Copy, ArrowLeft, Fingerprint, ScanFace, Lock, Cpu, Smartphone, ShieldCheck } from 'lucide-react';

interface RentPaymentModalProps {
    property: Property;
    onClose: () => void;
}

const RentPaymentModal: React.FC<RentPaymentModalProps> = ({ property, onClose }) => {
    const [step, setStep] = useState<'SELECT' | 'BNPL_OPTIONS' | 'PAYMENT_METHOD' | 'CARD_INPUT' | 'TRANSFER_INFO' | 'FRAUD_CHECK' | 'BIOMETRIC_CHECK' | 'PROCESSING' | 'SUCCESS'>('SELECT');
    const [plans, setPlans] = useState<PaymentPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
    const [paymentRef, setPaymentRef] = useState('');
    const [riskScore, setRiskScore] = useState(0); // 0 - 100
    
    // Mock Account for Transfer
    const transferAccount = { bank: 'Wema Bank', number: '0123456789', name: 'Ilé Escrow: ' + property.title.substring(0, 10) };

    useEffect(() => {
        // Pre-fetch BNPL plans
        getPaymentPlans(property.price).then(setPlans);
    }, [property.price]);

    const handleSelectFullPayment = () => {
        setStep('PAYMENT_METHOD');
    }

    // Start the security flow instead of direct processing
    const initiateSecurityFlow = () => {
        setStep('FRAUD_CHECK');
        
        // Simulate AI Risk Analysis (2s)
        let score = 0;
        const interval = setInterval(() => {
            score += Math.floor(Math.random() * 20);
            if (score > 98) score = 99;
            setRiskScore(score);
        }, 300);

        setTimeout(() => {
            clearInterval(interval);
            setRiskScore(99); // High safety score
            setTimeout(() => setStep('BIOMETRIC_CHECK'), 800);
        }, 2500);
    };

    const handleBiometricAuth = async () => {
        // Simulate WebAuthn / Hardware Authenticator
        setStep('PROCESSING');
        
        const method = step === 'TRANSFER_INFO' ? 'TRANSFER' : 'CARD'; // Simplified mapping
        const amount = selectedPlan ? selectedPlan.total : property.price;

        const res = await processPayment(amount, 'CARD', selectedPlan || undefined);
        if (res.success) {
            setPaymentRef(res.reference);
            setStep('SUCCESS');
        }
    };

    const handleSelectBNPL = (plan: PaymentPlan) => {
        setSelectedPlan(plan);
        initiateSecurityFlow();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                
                {/* Header Actions */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"><X size={20}/></button>
                </div>
                {step !== 'SELECT' && step !== 'SUCCESS' && step !== 'FRAUD_CHECK' && step !== 'BIOMETRIC_CHECK' && step !== 'PROCESSING' && (
                    <div className="absolute top-4 left-4 z-10">
                         <button onClick={() => setStep('SELECT')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"><ArrowLeft size={20}/></button>
                    </div>
                )}

                {step === 'SELECT' && (
                    <div className="p-6 pt-12">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="text-primary fill-primary/20" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Secure Checkout</h2>
                        </div>
                        <p className="text-gray-500 text-sm mb-6">Choose how you want to pay for <span className="text-gray-900 font-bold">{property.title}</span></p>

                        <div className="space-y-4">
                            <button onClick={handleSelectFullPayment} className="w-full p-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-primary hover:bg-green-50 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-3 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Pay Full Rent</p>
                                        <p className="text-xs text-gray-500">₦{property.price.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-primary font-bold text-sm">Pay Now</div>
                            </button>

                            <button onClick={() => setStep('BNPL_OPTIONS')} className="w-full p-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Rent Now, Pay Later</p>
                                        <p className="text-xs text-gray-500">Spread payment up to 12 months</p>
                                    </div>
                                </div>
                                <div className="text-blue-600 font-bold text-sm">View Plans</div>
                            </button>
                        </div>
                        
                        <div className="mt-8 bg-gray-50 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-500 border border-gray-100">
                            <Lock size={12} className="text-primary" /> End-to-End Encryption with Ilé AI Guardian
                        </div>
                    </div>
                )}

                {step === 'BNPL_OPTIONS' && (
                    <div className="p-6 pt-12 overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Select Payment Plan</h2>
                        
                        <div className="space-y-3">
                            {plans.map((plan, i) => (
                                <button key={i} onClick={() => handleSelectBNPL(plan)} className="w-full p-4 border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left group">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-blue-900">{plan.provider}</span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">{plan.months} Months</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">₦{plan.monthly.toLocaleString()}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                                            <p className="text-xs text-gray-400 mt-1">Total repayment: ₦{plan.total.toLocaleString()}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <ArrowLeft className="rotate-180" size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'PAYMENT_METHOD' && (
                    <div className="p-6 pt-12">
                        <h2 className="text-xl font-bold mb-4">Select Payment Method</h2>
                        <div className="space-y-3">
                            <button onClick={() => setStep('CARD_INPUT')} className="w-full p-4 border border-gray-200 rounded-2xl flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CreditCard size={20}/></div>
                                <div className="text-left flex-1">
                                    <p className="font-bold text-gray-900">Pay with Card</p>
                                    <p className="text-xs text-gray-500">Debit or Credit Card</p>
                                </div>
                                <ArrowLeft className="rotate-180 text-gray-300" size={20} />
                            </button>
                            <button onClick={() => setStep('TRANSFER_INFO')} className="w-full p-4 border border-gray-200 rounded-2xl flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Building2 size={20}/></div>
                                <div className="text-left flex-1">
                                    <p className="font-bold text-gray-900">Bank Transfer</p>
                                    <p className="text-xs text-gray-500">Instant transfer to virtual account</p>
                                </div>
                                <ArrowLeft className="rotate-180 text-gray-300" size={20} />
                            </button>
                            <button onClick={() => initiateSecurityFlow()} className="w-full p-4 border border-gray-200 rounded-2xl flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Phone size={20}/></div>
                                <div className="text-left flex-1">
                                    <p className="font-bold text-gray-900">USSD</p>
                                    <p className="text-xs text-gray-500">*737#, *901#, etc</p>
                                </div>
                                <ArrowLeft className="rotate-180 text-gray-300" size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'CARD_INPUT' && (
                    <div className="p-6 pt-12">
                        <h2 className="text-xl font-bold mb-6">Enter Card Details</h2>
                        <form onSubmit={(e) => { e.preventDefault(); initiateSecurityFlow(); }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Number</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-primary" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry</label>
                                    <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-primary" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                                    <input type="text" placeholder="123" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-primary" required />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold mt-4 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                Pay ₦{property.price.toLocaleString()}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'TRANSFER_INFO' && (
                    <div className="p-6 pt-12">
                        <h2 className="text-xl font-bold mb-2">Transfer to Account</h2>
                        <p className="text-sm text-gray-500 mb-6">Transfer exact amount to the account below. Use session ID or name as ref.</p>
                        
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Bank Name</p>
                                <p className="text-lg font-bold text-gray-900">{transferAccount.bank}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Account Number</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-3xl font-mono font-bold text-primary">{transferAccount.number}</p>
                                    <button onClick={() => copyToClipboard(transferAccount.number)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><Copy size={16} /></button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Account Name</p>
                                <p className="text-sm font-medium text-gray-900">{transferAccount.name}</p>
                            </div>
                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 uppercase font-bold">Amount</p>
                                <p className="text-xl font-bold text-gray-900">₦{property.price.toLocaleString()}</p>
                            </div>
                        </div>

                        <button onClick={initiateSecurityFlow} className="w-full bg-primary text-white py-4 rounded-xl font-bold mt-6 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                            I have sent the money
                        </button>
                    </div>
                )}

                {/* --- NEW SECURITY STEPS --- */}

                {step === 'FRAUD_CHECK' && (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                            <div className="bg-white p-4 rounded-full shadow-lg border-2 border-primary relative z-10">
                                <Cpu size={40} className="text-primary" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">AI Guardian Analysis</h3>
                        <p className="text-gray-500 text-sm max-w-[200px] mb-6">Checking device fingerprint, location patterns, and velocity...</p>
                        
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${riskScore}%` }}></div>
                        </div>
                        <div className="flex justify-between w-full text-xs font-bold uppercase tracking-wide px-1">
                            <span className="text-gray-400">Analyzing</span>
                            <span className="text-primary">{riskScore}% Safe</span>
                        </div>
                    </div>
                )}

                {step === 'BIOMETRIC_CHECK' && (
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                        <div className="mb-8 relative cursor-pointer group" onClick={handleBiometricAuth}>
                            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                            <ScanFace size={80} strokeWidth={1} className="text-gray-800 mx-auto relative z-10" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-1 bg-blue-500/50 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Verifying It's You</h3>
                        <p className="text-gray-500 text-sm mb-8">
                            Please use Touch ID or Face ID to sign this transaction securely.
                        </p>

                        <button 
                            onClick={handleBiometricAuth}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-3"
                        >
                            <Fingerprint size={20} /> Authenticate
                        </button>
                    </div>
                )}

                {step === 'PROCESSING' && (
                    <div className="p-12 text-center flex flex-col items-center justify-center h-80">
                        <Loader2 size={48} className="text-primary animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">Processing Payment...</h3>
                        <p className="text-gray-500 text-sm mt-2">Connecting to secure gateway.</p>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                        <p className="text-gray-600 mb-8 text-sm max-w-[200px]">
                            Your rent for <span className="font-bold text-gray-900">{property.title}</span> has been secured in Ilé Escrow.
                        </p>
                        
                        <div className="w-full bg-gray-50 p-4 rounded-xl mb-6">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-500">Transaction Ref</span>
                                <span className="font-mono font-bold text-gray-800">{paymentRef}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-500">Security Check</span>
                                <span className="font-bold text-green-700 flex items-center gap-1"><ShieldCheck size={12}/> Verified</span>
                            </div>
                            {selectedPlan && (
                                <div className="flex justify-between items-center text-sm text-blue-700 bg-blue-50 p-2 rounded-lg mt-2">
                                    <span>Next Installment</span>
                                    <span className="font-bold">₦{selectedPlan.monthly.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        <button onClick={onClose} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                            Download Receipt
                        </button>
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default RentPaymentModal;
