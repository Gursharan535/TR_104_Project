// ai-workspace/src/pages/ForgotPassword.tsx
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2, RefreshCw, Check } from 'lucide-react';
import { authApi, isValidEmail } from '../services/api';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  onResetRequestSent: (token: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin, onResetRequestSent }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [mockToken, setMockToken] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const isEmailValid = email.length > 0 && isValidEmail(email);

  useEffect(() => {
    let interval: number;
    if (resendTimer > 0) {
      interval = window.setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (resendTimer > 0) return;

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.requestPasswordReset(email);
      setIsSent(true);
      setMockToken(response.resetToken);
      setResendTimer(30); // 30 second cooldown
    } catch (err: unknown) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-slate-800 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <BrainCircuit size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
          <p className="text-slate-300">Recover access to your workspace</p>
        </div>

        <div className="p-8">
          {isSent ? (
            <div className="text-center space-y-6 animate-in fade-in duration-300">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Email sent!</h3>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                  We've sent a secure reset link to: <br/>
                  <span className="font-semibold text-slate-800 break-all">{email}</span>
                </p>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                 <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-3">Simulation Console</p>
                 <button 
                  onClick={() => mockToken && onResetRequestSent(mockToken)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                   Open Reset Interface
                 </button>
                 <button 
                  disabled={resendTimer > 0 || isLoading}
                  onClick={() => handleSubmit()}
                  className="w-full mt-3 text-xs font-bold text-slate-500 hover:text-indigo-600 disabled:text-slate-300 flex items-center justify-center gap-2 transition-colors"
                 >
                   <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                   {resendTimer > 0 ? `Resend email in ${resendTimer}s` : 'Resend email now'}
                 </button>
              </div>

              <button 
                onClick={onBackToLogin}
                className="flex items-center justify-center gap-2 w-full text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in shake duration-300">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Enter your registered workspace email and we'll send you a simulation link to recover your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={18} className={`${email.length > 0 ? (isEmailValid ? 'text-emerald-500' : 'text-rose-400') : 'text-slate-400'} transition-colors duration-300`} />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 pr-10 block w-full rounded-xl border py-3 text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-4 ${
                        email.length > 0 
                          ? isEmailValid 
                            ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/10' 
                            : 'border-rose-200 focus:border-rose-500 focus:ring-rose-500/10'
                          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10'
                      }`}
                      placeholder="alex@company.com"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {email.length > 0 && (
                        isEmailValid 
                          ? <Check size={18} className="text-emerald-500 animate-in zoom-in duration-300" />
                          : <AlertCircle size={18} className="text-rose-400 animate-in zoom-in duration-300" />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isEmailValid}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
                </button>

                <button 
                  type="button"
                  onClick={onBackToLogin}
                  className="flex items-center justify-center gap-2 w-full text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
