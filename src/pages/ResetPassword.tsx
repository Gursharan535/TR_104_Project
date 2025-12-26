// ai-workspace/src/pages/ResetPassword.tsx
import React, { useState, useMemo } from 'react';
import { BrainCircuit, Lock, CheckCircle, AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Check, X, ShieldCheck } from 'lucide-react';
import { authApi, checkPasswordStrength } from '../services/api';

interface ResetPasswordProps {
  token: string | null;
  onResetSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onResetSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = useMemo(() => checkPasswordStrength(password), [password]);
  const doPasswordsMatch = password === confirmPassword && password !== '';
  
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
    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }
    if (strength === 'weak') {
      setError('Password is too weak. Please ensure it has 8+ characters and satisfies 3 complexity requirements.');
      return;
    }
    if (!token) {
      setError('Missing reset token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.resetPassword(token, password);
      setIsSuccess(true);
      setTimeout(() => onResetSuccess(), 2500);
    } catch (err: unknown) {
      setError(err.message || 'Failed to reset password');
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
    weak: 'Unacceptable',
    fair: 'Good',
    strong: 'Secure'
  }[strength];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-indigo-600 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <BrainCircuit size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Secure Reset</h1>
          <p className="text-indigo-100">Establish a strong new credential</p>
        </div>

        <div className="p-8">
          {isSuccess ? (
            <div className="text-center space-y-4 py-6 animate-in zoom-in duration-500">
              <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Password Updated</h2>
              <p className="text-slate-500">Secure sync complete. Redirecting...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in shake duration-300">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">New Password</label>
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
                  
                  {password.length > 0 && (
                    <div className="pt-2 animate-in fade-in duration-300 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ShieldCheck size={12} /> Strength
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

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                        <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 ${validation.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {validation.length ? <Check size={12} strokeWidth={3} className="animate-in zoom-in" /> : <X size={12} strokeWidth={3} className="opacity-30" />}
                          8+ Characters
                        </div>
                        <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 ${categoriesMet >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {categoriesMet >= 3 ? <Check size={12} strokeWidth={3} className="animate-in zoom-in" /> : <X size={12} strokeWidth={3} className="opacity-30" />}
                          3+ Categories
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className={`${confirmPassword.length > 0 ? (doPasswordsMatch ? 'text-emerald-500' : 'text-rose-400') : 'text-slate-400'} transition-colors`} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 block w-full rounded-xl border py-3 text-slate-900 transition-all outline-none focus:ring-4 ${
                        confirmPassword.length > 0 
                          ? doPasswordsMatch 
                            ? 'border-emerald-200 bg-emerald-50/10 focus:border-emerald-500 focus:ring-emerald-500/10' 
                            : 'border-rose-200 bg-rose-50/10 focus:border-rose-500 focus:ring-rose-500/10'
                          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10'
                      }`}
                      placeholder="••••••••"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {confirmPassword.length > 0 && (
                        doPasswordsMatch 
                          ? <Check size={18} className="text-emerald-500 animate-in zoom-in" />
                          : <AlertCircle size={18} className="text-rose-400 animate-in zoom-in" />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !doPasswordsMatch || strength === 'weak'}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none mt-2"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                    <>Update Password <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Added missing default export
export default ResetPassword;
