import { useAppStore } from '../store';
import { ThemeVariant } from '../types';
import { 
  Map, 
  TrendingUp, 
  HelpCircle,
  LogOut,
  Sliders,
  Database,
  Eye,
  Shield,
  Moon,
  Sun,
  BookOpen,
  Wifi,
  Terminal,
  X
} from 'lucide-react';

export default function Sidebar() {
  const { 
    currentView, 
    setView, 
    activeLayout, 
    setLayout,
    activeTheme,
    setTheme,
    systemStats,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    showToast
  } = useAppStore();

  const handleLayoutToggle = () => {
    setLayout(
      activeLayout === ThemeVariant.GLASSMORPHISM 
        ? ThemeVariant.NEUMORPHISM 
        : ThemeVariant.GLASSMORPHISM
    );
  };

  const handleThemeToggle = () => {
    setTheme(activeTheme === 'dark' ? 'light' : 'dark');
  };

  const menuItems = [
    { id: 'landing' as const, label: 'Intro Portal', icon: Shield },
    { id: 'dashboard' as const, label: 'Live Map Feed', icon: Map },
    { id: 'ai-analysis' as const, label: 'AI Street Analysis', icon: Eye },
    { id: 'route-sim' as const, label: 'Route Optimizer', icon: Sliders },
    { id: 'sensors' as const, label: 'IoT Telemetry', icon: Database },
    { id: 'architect' as const, label: 'System Design', icon: BookOpen },
  ];

  const panelStyle = activeLayout === ThemeVariant.GLASSMORPHISM 
    ? 'glass-panel text-on-surface' 
    : 'neu-extrude text-on-surface';

  return (
    <aside className={`w-[280px] md:w-[300px] flex-shrink-0 border-r border-white/10 ${panelStyle} flex-col justify-between pt-10 pb-6 h-screen overflow-y-auto no-scrollbar z-50 transition-all duration-300 fixed lg:relative inset-y-0 left-0 lg:translate-x-0 ${mobileSidebarOpen ? 'flex translate-x-0 shadow-2xl' : 'hidden lg:flex -translate-x-full lg:translate-x-0'}`}>
      {/* Brand Header */}
      <div className="px-6 mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_10px_#47e266]"></div>
            <span className="text-[10px] font-mono text-outline uppercase tracking-widest">
              VIGILANT MODE ACTIVE
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Flood Vision
          </h2>
          <p className="font-mono text-[10px] text-outline mt-1 uppercase">
            Station ID: ALPHA-01
          </p>
        </div>

        {/* Mobile Close Button */}
        <button 
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg border border-white/10 bg-white/5 text-outline hover:text-white transition-colors cursor-pointer"
          title="Close Navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1">
        <div className="px-3 mb-2 text-xs font-mono tracking-widest text-[#8b91a0] uppercase">
          Command Center
        </div>
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          let navItemStyle = "";
          if (isActive) {
            navItemStyle = activeLayout === ThemeVariant.GLASSMORPHISM
              ? "bg-primary/10 text-primary border-l-4 border-primary shadow-[0_0_15px_rgba(170,199,255,0.15)]"
              : "neu-recess text-secondary border-l-4 border-secondary font-bold";
          } else {
            navItemStyle = "text-[#c0c6d6]/75 hover:bg-white/5 hover:text-white";
          }

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-4 transition-all duration-200 cursor-pointer ${navItemStyle}`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Style Control Panels */}
      <div className="px-6 mt-auto space-y-4">
        <div className="p-4 rounded-xl bg-surface-container-low/50 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-outline uppercase">Design Dualism</span>
            <span className="text-[10px] bg-primary/20 text-primary font-mono px-2 py-0.5 rounded uppercase">
              {activeLayout}
            </span>
          </div>
          
          {/* Aesthetic Toggle */}
          <button 
            onClick={handleLayoutToggle}
            className="w-full text-xs py-2 bg-gradient-to-r from-primary/20 to-secondary/10 hover:from-primary/30 hover:to-secondary/20 text-on-surface border border-white/10 rounded-lg transition-colors cursor-pointer text-center font-medium uppercase tracking-wider"
          >
            Morph UI Styles
          </button>

          {/* Theme Switcher Toggle */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-xs font-mono text-outline">Theme Mode</span>
            <button 
              onClick={handleThemeToggle}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-primary hover:text-white transition-colors cursor-pointer"
              title={`Switch to ${activeTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {activeTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* CTA export */}
        <button 
          onClick={() => {
            showToast(`Exported ${systemStats.totalSensors} sensor nodes configuration payload successfully (JSON format)! Live metrics buffer dumped inside sandbox logs. Station Latency: ${systemStats.latencyMs}ms.`);
          }}
          className="w-full py-3 bg-gradient-to-r from-primary-container to-primary text-black font-semibold rounded-lg hover:brightness-110 active:scale-98 transition-all duration-150 shadow-lg shadow-primary/20 cursor-pointer text-sm text-center font-semibold"
        >
          Export Dataset
        </button>

        {/* Bottom Footer links */}
        <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-outline font-mono">
          <button onClick={() => setView('architect')} className="hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span>Support Docs</span>
          </button>
          <button onClick={() => setView('landing')} className="hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer">
            <LogOut className="h-4 w-4 text-danger" />
            <span>Reset Setup</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
