import { useState, useEffect } from 'react';
import { LogIn, Key, Shield, User } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useLoginMutation, useCheckStatusQuery } from '../features/auth/authApiSlice';

export default function LoginPage() {
  const [clientCode, setClientCode] = useState('');
  const [pin, setPin] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const { data: authStatus, isLoading: isChecking } = useCheckStatusQuery();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const data = await login({ clientCode, pin, totpCode }).unwrap();
      if (data.success) {
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.data?.message || 'Server connection failed. Please try again.');
    }
  };

  if (authStatus?.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }



  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 bg-[#050505]">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[420px] p-6 md:p-10 space-y-6 md:space-y-8 bg-[#0F0F0F]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="text-center relative">
          <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-primary/30 to-primary/5 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-8 border border-primary/20 shadow-[0_0_50px_rgba(34,197,94,0.15)] ring-1 ring-white/10">
            <Shield className="w-7 h-7 md:w-10 md:h-10 text-primary" />
          </div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2 md:mb-3">SmartAPI Login</h2>
          <p className="text-xs md:text-sm text-muted-foreground max-w-[280px] mx-auto">Verify your identity with TOTP to access live market data</p>
        </div>

        {error && (
          <div className="p-3.5 md:p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs md:text-sm text-center font-medium animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 md:space-y-6 relative z-10">
          <div className="space-y-1.5 md:space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-400 ml-1">Client Code</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                required
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 md:py-4 pl-12 pr-4 text-sm md:text-base text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all outline-none"
                placeholder="Angel One Client ID"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-400 ml-1">Secure PIN</label>
            <div className="relative group">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 md:py-4 pl-12 pr-4 text-sm md:text-base text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all outline-none"
                placeholder="Your 4-digit PIN"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <label className="text-xs md:text-sm font-semibold text-gray-400 ml-1">Authenticator TOTP</label>
            <div className="relative group">
              <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 md:py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all font-mono tracking-[0.2em] md:tracking-[0.4em] text-center text-lg md:text-xl"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 md:py-4 bg-gradient-to-r from-primary to-emerald-500 hover:scale-[1.02] active:scale-[0.98] text-black font-bold text-sm md:text-base rounded-2xl shadow-[0_20px_40px_rgba(34,197,94,0.2)] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : 'Connect to SmartAPI'}
          </button>
        </form>
      </div>
    </div>
  );
}
