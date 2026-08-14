
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { loginUser, registerUser } from '../services/authService';
import { sendEmailNotification } from '../services/notificationService';
import { Lock, Mail, Phone, User as UserIcon, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import Logo from './Logo';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PUBLIC);

  // Verification State
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const user = await loginUser(identifier, password);
        onLogin(user);
      } else {
        const isEmail = identifier.includes('@');
        const user = await registerUser({
            fullName,
            password,
            role,
            email: isEmail ? identifier : '',
            phone: !isEmail ? identifier : ''
        });

        // Agent Email Verification Flow
        if (role === UserRole.AGENT && isEmail) {
            await sendEmailNotification(
                identifier,
                "Verify your Agent Identity",
                `Welcome to Gemini! Please click here to verify your email address: https://gemini.ng/verify/${user.id}`
            );
            setVerificationSentTo(identifier);
            setPendingUser(user);
            setIsLoading(false);
            return;
        }

        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSentTo && pendingUser) {
    return (
        <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 relative overflow-hidden">
             {/* Background Shapes */}
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container rounded-full blur-[100px] opacity-60"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container rounded-full blur-[100px] opacity-60"></div>

             <div className="w-full max-w-md bg-white rounded-[32px] p-8 text-center shadow-xl animate-in fade-in zoom-in duration-300 relative z-10">
                 <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Mail size={40} className="text-green-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your Email</h2>
                 <p className="text-gray-500 mb-6 leading-relaxed">
                     We've sent a verification link to <strong>{verificationSentTo}</strong>. 
                     Please verify your email to activate your Agent account and access the dashboard.
                 </p>
                 <button 
                    onClick={() => onLogin(pendingUser)}
                    className="w-full bg-primary text-white py-4 rounded-full font-medium text-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
                 >
                    I've Verified, Continue <ArrowRight size={20} />
                 </button>
                 <button 
                    onClick={() => { setVerificationSentTo(null); setPendingUser(null); }}
                    className="mt-6 text-sm text-gray-500 hover:text-primary font-medium"
                 >
                    Back to Login
                 </button>
             </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Pixel Style Background Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container rounded-full blur-[100px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container rounded-full blur-[100px] opacity-60"></div>

      <div className="w-full max-w-md bg-surface-container-low rounded-[32px] p-8 relative z-10 shadow-sm border border-white/50">
        
        {/* LOGO SECTION */}
        <div className="flex flex-col items-center justify-center mb-8 pt-4">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md border border-outline-variant/30">
                 <Logo size={40} />
             </div>
            <h1 className="text-4xl font-medium text-on-surface tracking-tight mb-1">Gemini</h1>
            <p className="text-sm font-medium text-on-surface-variant tracking-widest uppercase">Find Your Space</p>
        </div>
        
        <h2 className="text-2xl font-normal text-center text-on-surface mb-8">
            {isLogin ? 'Welcome back' : 'Create account'}
        </h2>

        {error && (
            <div className="bg-red-50 text-red-900 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full" />
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1">
                <div className="relative group">
                    <UserIcon className="absolute left-4 top-4 text-on-surface-variant z-10" size={20} />
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:ring-2 focus:ring-primary transition-all"
                        required={!isLogin}
                    />
                </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="relative">
                <Mail className="absolute left-4 top-4 text-on-surface-variant z-10" size={20} />
                <input
                    type="text"
                    placeholder="Email or Phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
                <Lock className="absolute left-4 top-4 text-on-surface-variant z-10" size={20} />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                />
            </div>
          </div>

          {!isLogin && (
            <div className="pt-2">
                <div className="grid grid-cols-2 gap-3 bg-surface-container p-1 rounded-full">
                    <button
                        type="button"
                        onClick={() => setRole(UserRole.PUBLIC)}
                        className={`py-3 rounded-full text-sm font-medium transition-all ${role === UserRole.PUBLIC ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        Seeker
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole(UserRole.AGENT)}
                        className={`py-3 rounded-full text-sm font-medium transition-all ${role === UserRole.AGENT ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        Agent
                    </button>
                </div>
                {role === UserRole.AGENT && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                        Agents require email verification upon registration.
                    </p>
                )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-4 rounded-full font-medium text-lg hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
                <>
                    {isLogin ? 'Log In' : 'Sign Up'}
                    <ArrowRight size={20} />
                </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
                {isLogin ? "No account?" : "Have an account?"}
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="ml-2 font-bold text-primary hover:underline"
                >
                    {isLogin ? 'Sign up' : 'Log in'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
