// ai-workspace/src/pages/SignUp.tsx
import React, { useState, useMemo } from 'react';
import { BrainCircuit, Lock, Mail, User, ArrowRight, AlertCircle, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
import { authApi, checkPasswordStrength, isValidEmail } from '../services/api';
import type { User as UserType } from '../types';

interface SignUpProps {
  onSignUp: (user: UserType) => void;
  onSwitchToLogin: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUp, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => checkPasswordStrength(password), [password]);
  const isEmailValid = email.length > 0 && isValidEmail(email);
  
  const validation = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };
  }, [password]);

  const categoriesMet = useMemo(() => {
    return [validation.upper, validation.lower, validation.number, validation.special].filter(Boolean).length;
  }, [validation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    if (strength === 'weak') {
      setError('Password is too weak. Please meet at least 3 complexity requirements and 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.signup(name, email, password);
      onSignUp(response.user);
    } catch (err: unknown) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = {
    weak: 'bg-rose-500',
    fair: 'bg-amber-500',
    strong: 'bg-emerald-500'
  }[strength];

  const strengthLabel = {
    weak: 'Weak (Unacceptable)',
    fair: 'Good (Acceptable)',
    strong: 'Excellent (Secure)'
  }[strength];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-indigo-600 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <BrainCircuit size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-indigo-100">Join the Intelligent Collaboration Platform</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in shake duration-300">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className={`${name.length > 0 ? 'text-indigo-500' : 'text-slate-400'} transition-colors`} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`pl-10 block w-full rounded-xl border py-3 text-slate-900 placeholder-slate-400 transition-all outline-none focus:ring-4 ${
                    name.length > 0 ? 'border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                  placeholder="Alex Engineer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className={`${email.length > 0 ? (isEmailValid ? 'text-emerald-500' : 'text-rose-400') : 'text-slate-400'} transition-colors`} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 pr-10 block w-full rounded-xl border py-3 text-slate-900 placeholder-slate-400 transition-all outline-none focus:ring-4 ${
                    email.length > 0 
                      ? isEmailValid 
                        ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/10' 
                        : 'border-rose-200 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                  placeholder="you@company.com"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {email.length > 0 && (
                    isEmailValid 
                      ? <Check size={18} className="text-emerald-500 animate-in zoom-in" />
                      : <AlertCircle size={18} className="text-rose-400 animate-in zoom-in" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className={`${password.length > 0 ? 'text-indigo-500' : 'text-slate-400'} transition-colors`} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 block w-full rounded-xl border py-3 text-slate-900 placeholder-slate-400 transition-all outline-none focus:ring-4 ${
                    password.length > 0 ? 'border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Enhanced Password Strength Meter */}
              {password.length > 0 && (
                <div className="pt-2 animate-in fade-in duration-300 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck size={12} className={strength === 'strong' ? 'text-emerald-500' : 'text-slate-400'} />
                      Security Level
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${strength === 'strong' ? 'text-emerald-600' : strength === 'fair' ? 'text-amber-600' : 'text-rose-600'}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1 bg-transparent">
                    <div className={`h-full rounded-full transition-all duration-500 ${strength === 'weak' || strength === 'fair' || strength === 'strong' ? strengthColor : 'bg-slate-200'} w-1/3`} />
                    <div className={`h-full rounded-full transition-all duration-500 ${strength === 'fair' || strength === 'strong' ? strengthColor : 'bg-slate-100'} w-1/3`} />
                    <div className={`h-full rounded-full transition-all duration-500 ${strength === 'strong' ? strengthColor : 'bg-slate-100'} w-1/3`} />
                  </div>

                  {/* Reactive Checklist */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 ${validation.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {validation.length ? <Check size={12} strokeWidth={3} className="animate-in zoom-in" /> : <X size={12} strokeWidth={3} className="opacity-30" />}
                      8+ Characters
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 ${categoriesMet >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {categoriesMet >= 3 ? <Check size={12} strokeWidth={3} className="animate-in zoom-in" /> : <X size={12} strokeWidth={3} className="opacity-30" />}
                      3+ Categories met:
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4 opacity-80">
                    {[
                      { key: 'upper', label: 'ABC' },
                      { key: 'lower', label: 'abc' },
                      { key: 'number', label: '123' },
                      { key: 'special', label: '@#$' }
                    ].map((item) => (
                      <div key={item.key} className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${validation[item.key as keyof typeof validation] ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {item.label}
                      </div>
                    ))}
                  </div>
                  {strength === 'weak' && (
                    <p className="text-[10px] text-rose-500 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100 animate-in fade-in duration-300">
                      Minimum requirement: 8 characters and at least 3 categories (Uppercase, Lowercase, Numbers, or Symbols).
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || strength === 'weak'}
              className={`
                w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5
                ${isLoading || strength === 'weak' ? 'opacity-75 cursor-not-allowed transform-none' : ''}
              `}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <button onClick={onSwitchToLogin} className="text-indigo-600 hover:underline font-medium">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
