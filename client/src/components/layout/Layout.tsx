import { LayoutDashboard, TrendingUp, DollarSign, Settings, Bell, Search, Activity, LineChart, LogOut, Menu, X, Plus } from 'lucide-react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLogoutMutation } from '../../features/auth/authApiSlice';
import { apiSlice } from '../../features/api/apiSlice';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();

  // Close speed dial on navigation
  useEffect(() => {
    setSpeedDialOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      // Clear RTK Query cache to remove auth and market data
      dispatch(apiSlice.util.resetApiState());
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      dispatch(apiSlice.util.resetApiState());
      navigate('/', { replace: true });
    }
  };

  const navItems = [
    { to: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { to: "/market", icon: <Activity className="w-5 h-5" />, label: "Live Market" },
    { to: "/paper-trade", icon: <LineChart className="w-5 h-5" />, label: "Paper Trade" },
    { to: "/dividends", icon: <DollarSign className="w-5 h-5" />, label: "Dividends" },
    { to: "/settings", icon: <Settings className="w-5 h-5" />, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden font-sans">
      {/* Mobile Speed Dial Overlay */}
      {speedDialOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] md:hidden backdrop-blur-md transition-all duration-300"
          onClick={() => setSpeedDialOpen(false)}
        />
      )}

      {/* Sidebar - Desktop Only (Mostly) */}
      <aside className="hidden md:flex w-64 h-full bg-[#0F0F0F]/95 backdrop-blur-xl border-r border-white/5 flex-col">
        <div className="flex items-center justify-between p-6 group">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <TrendingUp className="text-black w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">AlgoTrade <span className="text-primary">Pro</span></span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 space-y-3">
          <div className="glass-card p-4 rounded-xl border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-2">Live Connection</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-sm font-medium text-emerald-400">Algo Trade Connected</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Logo for mobile header */}
            <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <TrendingUp className="text-black w-4 h-4" />
              </div>
              <span className="font-bold text-sm">AlgoTrade</span>
            </Link>
            
            <div className="relative w-full max-w-[200px] md:max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search stocks..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[#0A0A0A]" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Ryan Phil</p>
                <p className="text-xs text-muted-foreground">Pro Trader</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          {children}
        </div>

        {/* Mobile Speed Dial FAB */}
        <div className="md:hidden fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-4">
          {/* Menu Items (visible when speed dial is open) */}
          <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${
            speedDialOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
          }`}>
            {navItems.map((item, index) => (
              <div 
                key={item.to} 
                className="flex items-center gap-3"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <span className="bg-[#0F0F0F] px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold shadow-xl">
                  {item.label}
                </span>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                    isActive ? 'bg-primary text-black scale-110' : 'bg-[#1A1A1A] text-white border border-white/10 hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                </NavLink>
              </div>
            ))}
            
            {/* Logout Item */}
            <div 
              className="flex items-center gap-3"
              style={{ transitionDelay: `${navItems.length * 50}ms` }}
            >
              <span className="bg-[#0F0F0F] px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold shadow-xl text-red-400">
                Disconnect
              </span>
              <button
                onClick={handleLogout}
                className="w-12 h-12 rounded-full bg-[#1A1A1A] text-red-400 border border-red-500/20 flex items-center justify-center shadow-2xl"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main FAB */}
          <button
            onClick={() => setSpeedDialOpen(!speedDialOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all duration-500 ${
              speedDialOpen ? 'bg-white text-black rotate-[135deg]' : 'bg-primary text-black'
            }`}
          >
            {speedDialOpen ? <Plus className="w-8 h-8" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
}
