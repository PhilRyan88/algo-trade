import { LayoutDashboard, TrendingUp, DollarSign, Settings, Bell, Search } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F0F0F] border-r border-white/5 flex flex-col hidden md:flex">
        <Link to="/" className="p-6 flex items-center gap-3 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp className="text-black w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">AlgoTrade <span className="text-primary">Pro</span></span>
        </Link>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          <NavItem to="/breakouts" icon={<TrendingUp className="w-5 h-5" />} label="Breakouts" />
          <NavItem to="/dividends" icon={<DollarSign className="w-5 h-5" />} label="Dividends" />
          <NavItem to="/signals" icon={<Bell className="w-5 h-5" />} label="Signals" />
          <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-card p-4 rounded-xl border-primary/20">
            <p className="text-xs text-muted-foreground mb-2">Live Connection</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">SmartAPI Connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search stocks, indices, signals..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
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
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
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
        isActive ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
}
