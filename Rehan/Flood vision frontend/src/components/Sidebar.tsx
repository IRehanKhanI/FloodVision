import {
  LayoutDashboard,
  Map,
  Route,
  Radio,
  BookOpen,
  Brain,
  CloudRain,
  AlertTriangle,
  Sun,
  Moon,
  Layers,
  Gem,
  Download,
  HelpCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";

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
    showToast,
  } = useAppStore();

  const panelStyle =
    activeLayout === ThemeVariant.GLASSMORPHISM
      ? "glass-panel"
      : "neu-extrude";

  const navItems = [
    { key: "landing", label: "Intro Portal", icon: LayoutDashboard },
    { key: "dashboard", label: "Live Map Feed", icon: Map },
    { key: "ai-analysis", label: "AI Vision Lab", icon: Brain },
    { key: "weather", label: "Weather Intel", icon: CloudRain },
    { key: "route-sim", label: "Route Optimizer", icon: Route },
    { key: "sensors", label: "IoT Telemetry", icon: Radio },
    { key: "alerts", label: "Alert Center", icon: AlertTriangle },
    { key: "architect", label: "System Design", icon: BookOpen },
  ] as const;

  return (
    <aside
      className={`fixed lg:static z-50 top-0 left-0 h-screen w-[280px] lg:w-[260px] flex flex-col transition-transform duration-300 ${
        mobileSidebarOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
      } ${panelStyle} rounded-none lg:rounded-r-2xl`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Gem size={18} style={{ color: 'var(--color-primary)' }} />
            <span className="font-bold text-sm tracking-widest font-mono theme-text">
              Flood Vision
            </span>
          </div>
          <span className="text-[9px] tracking-[0.2em] font-mono theme-text-muted ml-[26px]">
            STATION ID: HQ-7A
          </span>
          <div className="flex items-center gap-1.5 ml-[26px] mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)] pulse-secondary" />
            <span className="text-[8px] font-mono tracking-widest" style={{ color: 'var(--color-secondary)' }}>
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Mobile close */}
        <button
          className="lg:hidden p-1 rounded-lg theme-hover cursor-pointer"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <X size={18} className="theme-text" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px" style={{ background: 'var(--card-border)' }} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = currentView === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => setView(item.key as any)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide w-full text-left cursor-pointer transition-all duration-200 ${
                isActive
                  ? activeLayout === ThemeVariant.GLASSMORPHISM
                    ? "glass-panel"
                    : "neu-recess"
                  : "theme-hover"
              }`}
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {isActive && (
                <div
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--color-primary)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Design Controls */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="text-[8px] font-mono tracking-[0.25em] uppercase theme-text-muted">
          Design Dualism
        </div>

        {/* Layout toggle */}
        <div
          className="flex items-center rounded-xl p-1 gap-1"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
        >
          <button
            onClick={() => setLayout(ThemeVariant.GLASSMORPHISM)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wider cursor-pointer transition-all duration-200 ${
              activeLayout === ThemeVariant.GLASSMORPHISM
                ? "glass-panel"
                : ""
            }`}
            style={{
              color: activeLayout === ThemeVariant.GLASSMORPHISM
                ? 'var(--color-primary)'
                : 'var(--text-muted)',
            }}
          >
            <Layers size={10} />
            Glass
          </button>
          <button
            onClick={() => setLayout(ThemeVariant.NEUMORPHISM)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wider cursor-pointer transition-all duration-200 ${
              activeLayout === ThemeVariant.NEUMORPHISM
                ? "neu-extrude"
                : ""
            }`}
            style={{
              color: activeLayout === ThemeVariant.NEUMORPHISM
                ? 'var(--color-primary)'
                : 'var(--text-muted)',
            }}
          >
            <Gem size={10} />
            Neu
          </button>
        </div>

        {/* Theme toggle */}
        <div
          className="flex items-center rounded-xl p-1 gap-1"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
        >
          <button
            onClick={() => setTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wider cursor-pointer transition-all duration-200 ${
              activeTheme === "dark" ? "glass-panel" : ""
            }`}
            style={{
              color: activeTheme === "dark"
                ? 'var(--color-primary)'
                : 'var(--text-muted)',
            }}
          >
            <Moon size={10} />
            Dark
          </button>
          <button
            onClick={() => setTheme("light")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wider cursor-pointer transition-all duration-200 ${
              activeTheme === "light" ? "glass-panel" : ""
            }`}
            style={{
              color: activeTheme === "light"
                ? 'var(--color-primary)'
                : 'var(--text-muted)',
            }}
          >
            <Sun size={10} />
            Light
          </button>
        </div>
      </div>

      {/* Export button */}
      <div className="px-4 pb-2">
        <button
          onClick={() =>
            showToast(
              `📦 Exporting ${systemStats.totalSensors} sensor datasets — queued for processing.`
            )
          }
          className="w-full py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
          }}
        >
          <Download size={12} className="inline mr-2" />
          Export Dataset
        </button>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3 text-[9px] font-mono"
        style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
      >
        <button
          onClick={() => setView("architect")}
          className="flex items-center gap-1 cursor-pointer transition-colors hover:opacity-80"
        >
          <HelpCircle size={10} />
          Support Docs
        </button>
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-1 cursor-pointer transition-colors hover:opacity-80"
        >
          <RotateCcw size={10} />
          Reset Setup
        </button>
      </div>
    </aside>
  );
}
