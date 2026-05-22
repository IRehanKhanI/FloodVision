import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Activity,
  Droplets,
  Shield,
  Cpu,
  Wifi,
  Route,
} from "lucide-react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";
import FloodMap from "./FloodMap";
import { analyzeLocation } from "../api/endpoints";

export default function DashboardView() {
  const {
    sensorNodes,
    selectedNodeId,
    setSelectedNodeId,
    floodZones,
    refreshFloodZonesFromApi,
    refreshSensorsFromApi,
    aiRiskLevel,
    aiWaterIncrement,
    aiDrainStatus,
    isScanningAI,
    rescanAI,
    activeLayout,
    activeTheme,
    setView,
    showToast,
  } = useAppStore();

  const [activeMobileTab, setActiveMobileTab] = useState<"map" | "ai" | "iot">(
    "map",
  );

  const panelStyle =
    activeLayout === ThemeVariant.GLASSMORPHISM ? "glass-panel" : "neu-extrude";
  const innerCard =
    activeLayout === ThemeVariant.GLASSMORPHISM ? "glass-panel" : "neu-recess";

  useEffect(() => {
    refreshFloodZonesFromApi();
    refreshSensorsFromApi();
  }, [refreshFloodZonesFromApi, refreshSensorsFromApi]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "var(--color-danger)";
      case "warning":
        return "var(--color-warning)";
      case "stable":
        return "var(--color-secondary)";
      default:
        return "var(--color-primary)";
    }
  };

  const getRiskColor = (level: number) => {
    if (level >= 70) return "var(--color-danger)";
    if (level >= 40) return "var(--color-warning)";
    return "var(--color-secondary)";
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
      {/* Mobile Tab Bar */}
      <div
        className="lg:hidden flex border-b"
        style={{ borderColor: "var(--card-border)" }}
      >
        {[
          { key: "map", label: "Live Map" },
          { key: "ai", label: "AI CCTV" },
          { key: "iot", label: "IoT Feed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMobileTab(tab.key as any)}
            className={`flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 ${
              activeMobileTab === tab.key ? "border-b-2" : ""
            }`}
            style={{
              color:
                activeMobileTab === tab.key
                  ? "var(--color-primary)"
                  : "var(--text-muted)",
              borderColor:
                activeMobileTab === tab.key
                  ? "var(--color-primary)"
                  : "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== MAP SECTION ===== */}
      <div
        className={`flex-1 relative overflow-hidden ${
          activeMobileTab !== "map" ? "hidden lg:block" : ""
        }`}
      >
        <FloodMap
          floodZones={floodZones}
          sensors={sensorNodes}
          onSensorClick={setSelectedNodeId}
          onMapClick={async (lat, lng) => {
            try {
              await analyzeLocation(lat, lng);
              await refreshFloodZonesFromApi();
              showToast(
                `AI flood scan queued for (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              );
            } catch {
              showToast(
                "Failed to analyze location. Check backend connection.",
              );
            }
          }}
        />

        {/* Top Warning Banner */}
        <div className="absolute top-3 left-3 right-3 z-20">
          <div
            className={`${panelStyle} rounded-xl px-4 py-2 flex items-center gap-2`}
            style={{ borderLeft: "3px solid var(--color-danger)" }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "var(--color-danger)" }}
              className="animate-pulse shrink-0"
            />
            <span className="text-[10px] font-mono tracking-wider theme-text flex-1">
              <span
                style={{ color: "var(--color-danger)" }}
                className="font-bold"
              >
                HIGH SURGE WARNING:
              </span>
              <span className="theme-text-secondary ml-1">
                SECTOR 7 — Water levels exceeding safe threshold
              </span>
            </span>
          </div>
        </div>

        {/* Risk Legend */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className={`${panelStyle} rounded-xl p-3 flex flex-col gap-2`}>
            <span className="text-[8px] font-mono tracking-[0.2em] uppercase theme-text-muted mb-1">
              Risk Index
            </span>
            {[
              {
                label: "🟢 Safe Zone",
                desc: "No flood risk",
                color: "var(--color-secondary)",
              },
              {
                label: "🟡 Moderate",
                desc: "Monitor closely",
                color: "var(--color-warning)",
              },
              {
                label: "🔴 High Risk",
                desc: "Evacuate area",
                color: "var(--color-danger)",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: item.color }}
                />
                <span className="text-[9px] font-semibold theme-text">
                  {item.label}
                </span>
                <span className="text-[8px] theme-text-muted ml-auto">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom controls now handled by map gestures */}
      </div>

      {/* ===== AI RISK PANEL (Left on desktop) ===== */}
      <div
        className={`lg:w-[320px] shrink-0 flex flex-col overflow-y-auto no-scrollbar border-r ${
          activeMobileTab !== "ai" ? "hidden lg:flex" : "flex"
        }`}
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="p-4 flex flex-col gap-4">
          {/* AI Risk Header */}
          <div className={`${panelStyle} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase theme-text-muted">
                AI Risk Assessment
              </span>
              <Shield size={14} style={{ color: getRiskColor(aiRiskLevel) }} />
            </div>

            {/* Risk Gauge */}
            <div className="flex items-center gap-4 mb-3">
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="var(--card-border)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={getRiskColor(aiRiskLevel)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${aiRiskLevel * 2.64} 264`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-xl font-bold font-mono"
                    style={{ color: getRiskColor(aiRiskLevel) }}
                  >
                    {aiRiskLevel}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="text-[9px] font-mono theme-text-muted">
                  WATER INCREMENT
                </div>
                <div className="text-lg font-bold theme-text">
                  +{aiWaterIncrement} cm/hr
                </div>
                <div
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                    aiDrainStatus === "blocked"
                      ? "risk-red-bg risk-red"
                      : "risk-green-bg risk-green"
                  }`}
                >
                  DRAIN: {aiDrainStatus.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={rescanAI}
                disabled={isScanningAI}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer transition-all duration-200 ${
                  isScanningAI ? "opacity-50" : "hover:scale-[1.02]"
                }`}
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-on-primary)",
                }}
              >
                {isScanningAI ? (
                  <Activity size={12} className="inline animate-spin mr-1" />
                ) : null}
                {isScanningAI ? "SCANNING..." : "RESCAN FEED"}
              </button>
              <button
                onClick={() => setView("route-sim")}
                className={`${innerCard} flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer transition-all duration-200 hover:scale-[1.02]`}
                style={{ color: "var(--color-primary)" }}
              >
                <Route size={12} />
                ROUTE
              </button>
            </div>
          </div>

          {/* CCTV Panel */}
          <div className={`${panelStyle} rounded-2xl overflow-hidden`}>
            <div
              className="relative aspect-video"
              style={{
                background:
                  activeTheme === "dark"
                    ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
                    : "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
              }}
            >
              {/* Simulated CCTV overlay boxes */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Cpu size={48} className="opacity-10 theme-text" />
              </div>
              <div className="absolute top-4 left-4 right-4 bottom-4">
                {/* Water detection box */}
                <div
                  className="absolute bottom-0 left-2 right-8 h-16 border-2 rounded border-dashed animate-pulse"
                  style={{ borderColor: "var(--color-danger)" }}
                >
                  <span
                    className="absolute -top-4 left-1 text-[7px] font-mono px-1 rounded"
                    style={{
                      background: "rgba(255,69,58,0.3)",
                      color: "var(--color-danger)",
                    }}
                  >
                    WATER_INC: +{aiWaterIncrement}cm
                  </span>
                </div>
                {/* Drain classification box */}
                <div
                  className="absolute top-2 right-0 w-12 h-20 border-2 rounded border-dashed"
                  style={{
                    borderColor:
                      aiDrainStatus === "blocked"
                        ? "var(--color-danger)"
                        : "var(--color-secondary)",
                  }}
                >
                  <span
                    className="absolute -bottom-4 right-0 text-[7px] font-mono px-1 rounded"
                    style={{
                      background:
                        aiDrainStatus === "blocked"
                          ? "rgba(255,69,58,0.3)"
                          : "rgba(71,226,102,0.3)",
                      color:
                        aiDrainStatus === "blocked"
                          ? "var(--color-danger)"
                          : "var(--color-secondary)",
                    }}
                  >
                    DRAIN: {aiDrainStatus.toUpperCase()}
                  </span>
                </div>
              </div>
              {/* Live indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span
                  className="text-[8px] font-mono tracking-wider"
                  style={{ color: "var(--color-danger)" }}
                >
                  LIVE FEED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== IoT NODES PANEL (Right on desktop) ===== */}
      <div
        className={`lg:w-[280px] shrink-0 flex flex-col overflow-y-auto no-scrollbar border-l ${
          activeMobileTab !== "iot" ? "hidden lg:flex" : "flex"
        }`}
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[9px] font-mono tracking-[0.2em] uppercase theme-text-muted">
              IoT Sensor Nodes
            </span>
            <button
              onClick={() => setView("sensors")}
              className="text-[9px] font-mono tracking-wider cursor-pointer transition-colors"
              style={{ color: "var(--color-primary)" }}
            >
              View All →
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {sensorNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`${
                  selectedNodeId === node.id ? innerCard : ""
                } rounded-xl p-3 w-full text-left cursor-pointer transition-all duration-200 theme-hover`}
                style={{
                  borderLeft: `3px solid ${getStatusColor(node.status)}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold theme-text">
                    {node.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: getStatusColor(node.status) }}
                    />
                    <span
                      className="text-[8px] font-mono uppercase"
                      style={{ color: getStatusColor(node.status) }}
                    >
                      {node.status}
                    </span>
                  </div>
                </div>
                <div className="text-[9px] theme-text-muted mb-1.5">
                  {node.location}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Droplets
                      size={10}
                      style={{ color: getStatusColor(node.status) }}
                    />
                    <span
                      className="text-xs font-bold font-mono"
                      style={{ color: getStatusColor(node.status) }}
                    >
                      {node.waterLevel} cm
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono ${
                      node.rate > 0
                        ? "risk-red"
                        : node.rate < 0
                          ? "risk-green"
                          : "theme-text-muted"
                    }`}
                  >
                    {node.rate > 0 ? "+" : ""}
                    {node.rate} cm/hr
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Wifi size={8} className="theme-text-muted" />
                  <span className="text-[8px] font-mono theme-text-muted">
                    Last: {node.lastSeen}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
