import { LayoutDashboard, TrendingUp, DollarSign, Settings, Bell, Search, Activity, LineChart, LogOut, Menu, X } from 'lucide-react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLogoutMutation } from '../../features/auth/authApiSlice';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/'); // Force redirect anyway
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden font-sans">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 w-64 h-full bg-[#0F0F0F]/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex items-center justify-between p-6 group">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <TrendingUp className="text-black w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">AlgoTrade <span className="text-primary">Pro</span></span>
          </Link>
          <button className="md:hidden p-1 text-gray-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem to="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
          <NavItem to="/market" icon={<Activity className="w-5 h-5" />} label="Live Market" onClick={() => setMobileMenuOpen(false)} />
          <NavItem to="/paper-trade" icon={<LineChart className="w-5 h-5" />} label="Paper Trade" onClick={() => setMobileMenuOpen(false)} />
          <NavItem to="/dividends" icon={<DollarSign className="w-5 h-5" />} label="Dividends" onClick={() => setMobileMenuOpen(false)} />
          <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" onClick={() => setMobileMenuOpen(false)} />
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 space-y-3">
          <div className="glass-card p-4 rounded-xl border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-2">Live Connection</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-sm font-medium text-emerald-400">SmartAPI Connected</span>
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
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
              <div className="text-right">
                <p className="text-sm font-medium">Ryan Phil</p>
                <p className="text-xs text-muted-foreground">Pro Trader</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, to, onClick }: { icon: React.ReactNode, label: string, to: string, onClick?: () => void }) {
  return (
    <NavLink 
      to={to}
      onClick={onClick}
      className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
}
