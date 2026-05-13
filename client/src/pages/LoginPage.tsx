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
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">SmartAPI Login</h2>
          <p className="text-sm text-muted-foreground">Verify your identity with TOTP to access live data</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300 ml-1">Client Code</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text"
                required
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="Enter Angel One Client ID"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300 ml-1">PIN</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="Enter your 4-digit PIN"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300 ml-1">Authenticator TOTP</label>
            <div className="relative">
              <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text"
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono tracking-widest text-lg"
                placeholder="123 456"
                maxLength={6}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 text-black font-semibold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Authenticating...' : 'Connect to SmartAPI'}
          </button>
        </form>
      </div>
    </div>
  );
}
