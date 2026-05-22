import { Zap, MapPin, Radio, ArrowRight, Shield, Brain, Route as RouteIcon } from "lucide-react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";

export default function LandingView() {
  const { setView, activeLayout } = useAppStore();

  const panelStyle =
    activeLayout === ThemeVariant.GLASSMORPHISM
      ? "glass-panel"
      : "neu-extrude";

  const features = [
    {
      icon: Brain,
      title: "Street View AI",
      description: "Gemini Vision analyzes road conditions, drainage, and infrastructure to predict flood-prone areas with risk scoring.",
      color: "var(--color-primary)",
      bgGlow: "rgba(62, 144, 255, 0.08)",
    },
    {
      icon: RouteIcon,
      title: "Smart Routing",
      description: "Real-time route optimization that calculates paths with lowest flood risk instead of just shortest distance.",
      color: "var(--color-secondary)",
      bgGlow: "rgba(71, 226, 102, 0.08)",
    },
    {
      icon: Radio,
      title: "IoT Sentinel",
      description: "ESP32 ultrasonic sensors monitor water levels in real-time, feeding live data to the predictive dashboard.",
      color: "var(--color-tertiary)",
      bgGlow: "rgba(255, 182, 145, 0.08)",
    },
    {
      icon: Shield,
      title: "Emergency Alerts",
      description: "Instant flood warnings pushed to citizens, emergency responders, and authorities through multiple channels.",
      color: "var(--color-danger)",
      bgGlow: "rgba(255, 69, 58, 0.08)",
    },
    {
      icon: MapPin,
      title: "Live Flood Map",
      description: "Interactive real-time flood map with color-coded risk zones, sensor data overlay, and weather integration.",
      color: "var(--color-warning)",
      bgGlow: "rgba(255, 214, 10, 0.08)",
    },
    {
      icon: Zap,
      title: "Weather Prediction",
      description: "Live rainfall and weather data combined with AI models to predict flooding before water accumulation begins.",
      color: "#a78bfa",
      bgGlow: "rgba(167, 139, 250, 0.08)",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar relative">
      {/* Hero Section */}
      <div className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Decorative orbs */}
        <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-30 pointer-events-none" style={{ background: 'var(--color-primary)' }} />
        <div className="absolute bottom-20 right-1/4 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none" style={{ background: 'var(--color-secondary)' }} />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
          {/* Badge */}
          <div
            className={`${panelStyle} rounded-full px-4 py-1.5 text-[10px] font-mono tracking-[0.2em] uppercase animate-fade-in-up`}
            style={{ color: 'var(--color-primary)', animationDelay: '0.1s' }}
          >
            ⚡ AI-Powered Flood Intelligence Platform
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="theme-text">AI-Powered</span>
            <br />
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              Flood Resilience
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base max-w-xl leading-relaxed theme-text-secondary animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            An intelligent platform combining computer vision, IoT sensors, and weather analytics
            to predict, monitor, and navigate flood events in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => setView("dashboard")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wider cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
            >
              Launch Dashboard
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => setView("ai-analysis")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold tracking-wider cursor-pointer transition-all duration-200 hover:scale-105 ${panelStyle}`}
              style={{ color: 'var(--color-primary)' }}
            >
              <Brain size={16} />
              Try AI Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Badge */}
      <div className="flex justify-center pb-8">
        <div className={`${panelStyle} rounded-2xl px-6 py-4 flex items-center gap-6 animate-float`}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--color-secondary)] pulse-secondary" />
            <span className="text-[11px] font-mono tracking-wider theme-text-muted">2.4K Sensors</span>
          </div>
          <div className="h-6 w-px" style={{ background: 'var(--card-border)' }} />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-ping" />
            <span className="text-[11px] font-mono tracking-wider theme-text-muted">LIVE FEED</span>
          </div>
          <div className="h-6 w-px" style={{ background: 'var(--card-border)' }} />
          <span className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--color-secondary)' }}>ONLINE</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight theme-text mb-2">
            Six Foundations of Flood Mitigation
          </h2>
          <p className="text-sm theme-text-muted max-w-md mx-auto">
            Each module operates independently yet synergizes with the full platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className={`${panelStyle} rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group animate-fade-in-up`}
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: feat.bgGlow, color: feat.color }}
                >
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-bold tracking-wide mb-2 theme-text">
                  {feat.title}
                </h3>
                <p className="text-[11px] leading-relaxed theme-text-muted">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-12">
        <div
          className={`${panelStyle} rounded-2xl p-8 text-center max-w-3xl mx-auto`}
        >
          <h3 className="text-lg font-bold tracking-wide mb-2 theme-text">
            Ready to Activate the Console?
          </h3>
          <p className="text-xs theme-text-muted mb-5 max-w-md mx-auto">
            Access the real-time monitoring dashboard, configure IoT sensors, and deploy AI analysis across your city.
          </p>
          <button
            onClick={() => setView("dashboard")}
            className="px-8 py-3 rounded-xl text-sm font-bold tracking-widest cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              color: '#000',
            }}
          >
            ACTIVATE CONSOLE →
          </button>
        </div>
      </div>
    </div>
  );
}
