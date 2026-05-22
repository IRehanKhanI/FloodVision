import {
  Menu,
  X,
  Zap,
  Bell,
  Settings,
  Shield,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";

export default function Header() {
  const {
    currentView,
    setView,
    activeLayout,
    activeTheme,
    isSyncing,
    toggleSync,
    alerts,
    addAlert,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    showToast,
  } = useAppStore();

  const panelStyle =
    activeLayout === ThemeVariant.GLASSMORPHISM
      ? "glass-panel"
      : "neu-extrude";

  const activeAlertCount = alerts.filter((a) => a.active).length;

  const headerBg =
    activeLayout === ThemeVariant.GLASSMORPHISM
      ? "bg-black/10 backdrop-blur-xl border-b"
      : "";

  const navItems = [
    { key: "dashboard", label: "Portal" },
    { key: "ai-analysis", label: "AI Vision" },
    { key: "weather", label: "Weather" },
    { key: "route-sim", label: "Routing" },
    { key: "sensors", label: "Telemetry" },
    { key: "alerts", label: "Alerts" },
  ] as const;

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 gap-2 ${headerBg}`}
      style={{ borderColor: 'var(--card-border)' }}
    >
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2 rounded-lg theme-hover transition-colors cursor-pointer"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        {mobileSidebarOpen ? (
          <X size={20} style={{ color: 'var(--text-primary)' }} />
        ) : (
          <Menu size={20} style={{ color: 'var(--text-primary)' }} />
        )}
      </button>

      {/* Brand title */}
      <button
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setView("landing")}
      >
        <Zap size={18} style={{ color: 'var(--color-primary)' }} className="animate-glow-pulse" />
        <span className="font-bold text-sm tracking-wider font-mono theme-text hidden sm:block">
          Flood Vision <span className="text-[10px] theme-text-muted">Live</span>
        </span>
      </button>

      {/* Desktop navigation */}
      <nav className="hidden lg:flex items-center gap-1 ml-4">
        {navItems.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key as any)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                isActive
                  ? `${panelStyle} font-bold`
                  : "theme-hover"
              }`}
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* SIM LINK toggle */}
      <button
        onClick={toggleSync}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest border cursor-pointer transition-all duration-300 ${
          isSyncing
            ? "border-[var(--color-secondary)]/40 text-[var(--color-secondary)]"
            : "border-[var(--color-outline-variant)] theme-text-muted"
        }`}
        style={{
          background: isSyncing ? 'rgba(71, 226, 102, 0.08)' : 'transparent',
        }}
        title={isSyncing ? "Simulation running" : "Simulation paused"}
      >
        <RefreshCw
          size={12}
          className={isSyncing ? "animate-spin-slow" : ""}
          style={{ color: isSyncing ? 'var(--color-secondary)' : 'var(--text-muted)' }}
        />
        <span className="hidden sm:inline">SIM LINK</span>
      </button>

      {/* Emergency Protocol */}
      <button
        onClick={() => {
          addAlert({
            station: "Emergency Broadcast",
            message: "MANUAL EMERGENCY PROTOCOL ACTIVATED — All sectors under immediate review.",
            severity: "critical",
          });
          showToast("🚨 Emergency protocol activated — alerting all sectors.");
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 hover:scale-105"
        style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--color-danger)',
        }}
      >
        <Shield size={12} />
        <span className="hidden sm:inline">EMERGENCY</span>
      </button>

      {/* Alerts bell */}
      <button
        onClick={() => setView("alerts")}
        className="relative p-2 rounded-lg theme-hover cursor-pointer transition-colors"
      >
        <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
        {activeAlertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[var(--color-danger)] text-white text-[8px] flex items-center justify-center font-bold pulse-danger">
            {activeAlertCount}
          </span>
        )}
      </button>

      {/* Settings */}
      <button
        onClick={() => setView("architect")}
        className="p-2 rounded-lg theme-hover cursor-pointer transition-colors"
      >
        <Settings size={18} style={{ color: 'var(--text-secondary)' }} />
      </button>
    </header>
  );
}
