/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { useAppStore } from "./store";
import { ThemeVariant } from "./types";
import { useWebSocket } from "./hooks/useWebSocket";

// Import Modular View components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import LandingView from "./components/LandingView";
import DashboardView from "./components/DashboardView";
import RouteSimView from "./components/RouteSimView";
import SensorsView from "./components/SensorsView";
import ArchitectDocsView from "./components/ArchitectDocsView";
import AIDualView from "./components/AIDualView";
import WeatherView from "./components/WeatherView";
import AlertCenter from "./components/AlertCenter";

export default function App() {
  const {
    currentView,
    activeTheme,
    activeLayout,
    tickSimulatedData,
    isSyncing,
    refreshBackend,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    activeToast,
    showToast,
    applySensorUpdate,
    pushAlertFromSocket,
  } = useAppStore();

  // WebSocket listeners
  const { lastMessage: sensorMsg } = useWebSocket<{
    type: string;
    data: any;
  }>("/sensors/");
  const { lastMessage: alertMsg } = useWebSocket<{
    type: string;
    data: any;
  }>("/alerts/");

  // Handle sensor updates from WebSocket
  useEffect(() => {
    if (sensorMsg && sensorMsg.type === "sensor_update") {
      applySensorUpdate(sensorMsg.data);
    }
  }, [sensorMsg, applySensorUpdate]);

  // Handle new alerts from WebSocket
  useEffect(() => {
    if (alertMsg && alertMsg.type === "new_alert") {
      pushAlertFromSocket(alertMsg.data);
      showToast(
        `New Alert: ${alertMsg.data.message || "Flood warning detected"}`,
      );
    }
  }, [alertMsg, pushAlertFromSocket, showToast]);

  // Run the background MQTT telemetry simulator loop
  useEffect(() => {
    if (!isSyncing) return;

    // Ticks random sensor variables every 3.5 seconds to make telemetry charts alive
    const interval = setInterval(() => {
      tickSimulatedData();
    }, 3500);

    return () => clearInterval(interval);
  }, [isSyncing, tickSimulatedData]);

  useEffect(() => {
    refreshBackend();
    const interval = setInterval(() => {
      refreshBackend();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshBackend]);

  // Render view router helper
  const renderCurrentView = () => {
    switch (currentView) {
      case "landing":
        return <LandingView />;
      case "dashboard":
        return <DashboardView />;
      case "route-sim":
        return <RouteSimView />;
      case "sensors":
        return <SensorsView />;
      case "architect":
        return <ArchitectDocsView />;
      case "ai-analysis":
        return <AIDualView />;
      case "weather":
        return <WeatherView />;
      case "alerts":
        return <AlertCenter />;
      default:
        return <LandingView />;
    }
  };

  const themeClass = activeTheme === "dark" ? "dark" : "light";

  return (
    <div
      className={`min-h-screen w-screen flex overflow-hidden font-sans transition-colors duration-300 relative ${themeClass}`}
      style={{
        color: "var(--text-primary)",
        background: "var(--color-surface)",
      }}
    >
      {/* Dynamic Liquid Glass Background Fluid Blobs */}
      {activeLayout === ThemeVariant.GLASSMORPHISM && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-[45vw] h-[45vw] rounded-full bg-cyan-500/15 blur-[110px] sm:blur-[140px] liquid-blob-1" />
          <div className="absolute top-1/2 right-1/4 w-[40vw] h-[40vw] rounded-full bg-blue-600/15 blur-[130px] sm:blur-[160px] liquid-blob-2" />
          <div className="absolute bottom-1/4 left-1/3 w-[35vw] h-[35vw] rounded-full bg-emerald-500/12 blur-[100px] sm:blur-[130px] liquid-blob-3" />
        </div>
      )}

      {/* Dynamic Non-blocking In-App Toast notification */}
      {activeToast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-xs sm:max-w-sm w-[calc(100vw-32px)] sm:w-full glass-panel p-4 rounded-xl flex items-start gap-3 animate-bounce-subtle pointer-events-auto"
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
        >
          <div className="h-2 w-2 rounded-full bg-[var(--color-secondary)] shrink-0 mt-1.5 animate-ping" />
          <div className="grow text-xs font-sans flex flex-col gap-0.5 text-left">
            <span
              className="font-bold tracking-widest font-mono text-[9px] uppercase"
              style={{ color: "var(--color-primary)" }}
            >
              System Event Command Push
            </span>
            <p className="leading-relaxed font-sans font-medium text-[11px] theme-text">
              {activeToast}
            </p>
          </div>
          <button
            onClick={() => showToast(null)}
            className="theme-text-muted hover:opacity-100 transition-opacity cursor-pointer text-xs font-extrabold px-1 font-mono shrink-0 ml-1"
            title="Dismiss Notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile Sidebar Back-drop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Dynamic left side navigation */}
      <Sidebar />

      {/* Main functional container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Dynamic Warning and Header tools */}
        <Header />

        {/* Scrollable View boundaries */}
        <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}
