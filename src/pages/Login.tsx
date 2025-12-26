// ai-workspace/src/pages/Login.tsx
import React, { useState } from 'react';
import { BrainCircuit, Lock, Mail, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { authApi, isValidEmail } from '../services/api';
import type { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToSignUp: () => void;
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignUp, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = email.length > 0 && isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      onLogin(response.user);
    } catch (err: unknown) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <BrainCircuit size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">AI Workspace</h1>
          <p className="text-blue-100">Intelligent Collaboration Platform</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in shake duration-300">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className={`${email.length > 0 ? (isEmailValid ? 'text-emerald-500' : 'text-rose-400') : 'text-slate-400'} transition-colors duration-300`} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 pr-10 block w-full rounded-lg border py-3 text-slate-900 placeholder-slate-400 transition-all outline-none focus:ring-4 ${
                    email.length > 0 
                      ? isEmailValid 
                        ? 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/10' 
                        : 'border-rose-200 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/10'
                  }`}
                  placeholder="you@company.com"
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

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button 
                  type="button" 
                  onClick={onForgotPassword}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-slate-300 py-3 text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 mt-2
                ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4">
             <p className="text-sm text-slate-600">
               Don't have an account?{' '}
               <button onClick={onSwitchToSignUp} className="text-blue-600 hover:underline font-medium">
                 Sign Up
               </button>
             </p>
             <p className="text-xs text-slate-400">
               Secure login with SHA-256 password hashing simulation.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
