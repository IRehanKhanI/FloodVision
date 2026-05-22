import { useState } from "react";
import {
  Navigation,
  Clock,
  Ruler,
  Droplets,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  MapPin,
  ArrowDown,
  Gauge,
} from "lucide-react";
import { useAppStore } from "../store";
import { ThemeVariant, OptimizerParam } from "../types";
import FloodMap from "./FloodMap";

export default function RouteSimView() {
  const {
    startPoint,
    destination,
    optimizerParam,
    maxDepthTolerance,
    routeCalculated,
    isCalculatingRoute,
    routeViability,
    routeResult,
    setStartPoint,
    setDestination,
    setMaxDepthTolerance,
    setOptimizerParam,
    calculateRoute,
    activeLayout,
  } = useAppStore();

  const [activeMobileTab, setActiveMobileTab] = useState<"form" | "map">(
    "form",
  );

  const panelStyle =
    activeLayout === ThemeVariant.GLASSMORPHISM ? "glass-panel" : "neu-extrude";
  const innerCard =
    activeLayout === ThemeVariant.GLASSMORPHISM ? "glass-panel" : "neu-recess";

  const presetDestinations = [
    { label: "Hindmata Junction", value: "19.0330, 72.8438" },
    { label: "Bandra West", value: "19.0596, 72.8295" },
    { label: "Andheri East", value: "19.1136, 72.8697" },
    { label: "Santacruz", value: "19.0895, 72.8656" },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
      {/* Mobile Tab Bar */}
      <div
        className="lg:hidden flex border-b"
        style={{ borderColor: "var(--card-border)" }}
      >
        {[
          { key: "form", label: "Parameters" },
          { key: "map", label: "Corridor Map" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMobileTab(tab.key as "form" | "map")}
            className={`flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase cursor-pointer transition-all ${
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

      {/* ===== LEFT PANEL: Controls ===== */}
      <div
        className={`lg:w-[340px] shrink-0 overflow-y-auto no-scrollbar border-r ${
          activeMobileTab !== "form" ? "hidden lg:block" : ""
        }`}
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="p-4 flex flex-col gap-4">
          <div>
            <span className="text-[9px] font-mono tracking-[0.2em] uppercase theme-text-muted">
              Route Optimization Engine
            </span>
            <h2 className="text-lg font-bold theme-text mt-1">
              Safe Corridor Planner
            </h2>
          </div>

          {/* Start Point */}
          <div className={`${panelStyle} rounded-xl p-4`}>
            <label className="text-[9px] font-mono tracking-wider uppercase theme-text-muted mb-2 block">
              Origin Coordinates
            </label>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "var(--color-secondary)" }}
              />
              <input
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
                className="flex-1 bg-transparent text-sm font-semibold theme-text outline-none font-mono"
                placeholder="lat, lng (e.g. 19.0330, 72.8438)"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowDown size={16} className="theme-text-muted" />
          </div>

          {/* Destination */}
          <div className={`${panelStyle} rounded-xl p-4`}>
            <label className="text-[9px] font-mono tracking-wider uppercase theme-text-muted mb-2 block">
              Destination Coordinates
            </label>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: "var(--color-danger)" }}
              />
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex-1 bg-transparent text-sm font-semibold theme-text outline-none font-mono"
                placeholder="lat, lng (e.g. 19.0895, 72.8656)"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presetDestinations.map((dest) => (
                <button
                  key={dest.value}
                  onClick={() => setDestination(dest.value)}
                  className={`text-[9px] font-mono px-2 py-1 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                    destination === dest.value ? innerCard : ""
                  }`}
                  style={{
                    background:
                      destination === dest.value
                        ? "rgba(170,199,255,0.12)"
                        : "var(--input-bg)",
                    border: `1px solid ${destination === dest.value ? "rgba(170,199,255,0.3)" : "var(--input-border)"}`,
                    color:
                      destination === dest.value
                        ? "var(--color-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  <MapPin size={8} className="inline mr-1" />
                  {dest.label}
                </button>
              ))}
            </div>
          </div>

          {/* Depth Tolerance */}
          <div className={`${panelStyle} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-mono tracking-wider uppercase theme-text-muted">
                Max Depth Tolerance
              </label>
              <span
                className="text-sm font-bold font-mono"
                style={{ color: "var(--color-primary)" }}
              >
                {maxDepthTolerance.toFixed(1)}m
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={maxDepthTolerance}
              onChange={(e) => setMaxDepthTolerance(parseFloat(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background:
                  "linear-gradient(to right, var(--color-secondary) 0%, var(--color-warning) 50%, var(--color-danger) 100%)",
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[8px] font-mono theme-text-muted">
                0.1m
              </span>
              <span className="text-[8px] font-mono theme-text-muted">
                1.5m
              </span>
            </div>
          </div>

          {/* Optimization Param */}
          <div className={`${panelStyle} rounded-xl p-4`}>
            <label className="text-[9px] font-mono tracking-wider uppercase theme-text-muted mb-2 block">
              Optimization Metric
            </label>
            <div className="flex gap-2">
              {[OptimizerParam.LOWEST_RISK, OptimizerParam.SHORTEST_PATH].map(
                (param) => (
                  <button
                    key={param}
                    onClick={() => setOptimizerParam(param)}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer transition-all duration-200 ${
                      optimizerParam === param ? innerCard : ""
                    }`}
                    style={{
                      color:
                        optimizerParam === param
                          ? "var(--color-primary)"
                          : "var(--text-muted)",
                      border:
                        optimizerParam === param
                          ? "1px solid rgba(170,199,255,0.3)"
                          : "1px solid var(--input-border)",
                      background:
                        optimizerParam === param
                          ? "rgba(170,199,255,0.08)"
                          : "var(--input-bg)",
                    }}
                  >
                    {param === OptimizerParam.LOWEST_RISK ? (
                      <ShieldCheck size={12} className="inline mr-1" />
                    ) : (
                      <Gauge size={12} className="inline mr-1" />
                    )}
                    {param}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateRoute}
            disabled={isCalculatingRoute || !destination}
            className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-widest uppercase cursor-pointer transition-all duration-200 ${
              isCalculatingRoute || !destination
                ? "opacity-50"
                : "hover:scale-[1.02] hover:shadow-lg"
            }`}
            style={{
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            {isCalculatingRoute ? (
              <>
                <Loader2 size={16} className="inline animate-spin mr-2" />
                CALCULATING CORRIDOR...
              </>
            ) : (
              <>
                <Navigation size={16} className="inline mr-2" />
                CALCULATE SAFE CORRIDOR
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== RIGHT: MAP ===== */}
      <div
        className={`flex-1 relative overflow-hidden ${
          activeMobileTab !== "map" ? "hidden lg:block" : ""
        }`}
      >
        <FloodMap route={routeResult} />

        {!routeCalculated && !isCalculatingRoute && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`${panelStyle} rounded-2xl p-6 text-center max-w-xs`}
            >
              <Navigation
                size={32}
                className="mx-auto mb-3"
                style={{ color: "var(--color-primary)", opacity: 0.5 }}
              />
              <p className="text-sm font-semibold theme-text mb-1">
                No Route Calculated
              </p>
              <p className="text-[10px] theme-text-muted">
                Provide coordinates and calculate a safe corridor to see route
                visualization.
              </p>
            </div>
          </div>
        )}

        {isCalculatingRoute && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`${panelStyle} rounded-2xl p-6 text-center`}>
              <Loader2
                size={32}
                className="mx-auto mb-3 animate-spin"
                style={{ color: "var(--color-primary)" }}
              />
              <p className="text-sm font-semibold theme-text">
                Calculating Safe Corridor...
              </p>
              <p className="text-[10px] theme-text-muted mt-1">
                Cross-referencing flood risk data
              </p>
            </div>
          </div>
        )}

        {routeCalculated && routeViability && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className={`${panelStyle} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                {routeViability.status === "optimal" ? (
                  <ShieldCheck
                    size={16}
                    style={{ color: "var(--color-secondary)" }}
                  />
                ) : (
                  <ShieldAlert
                    size={16}
                    style={{ color: "var(--color-danger)" }}
                  />
                )}
                <span
                  className="text-[10px] font-mono tracking-wider font-bold uppercase"
                  style={{
                    color:
                      routeViability.status === "optimal"
                        ? "var(--color-secondary)"
                        : "var(--color-danger)",
                  }}
                >
                  Route Status: {routeViability.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className={`${innerCard} rounded-xl p-3 text-center`}>
                  <Clock size={14} className="mx-auto mb-1 theme-text-muted" />
                  <div className="text-sm font-bold font-mono theme-text">
                    {routeViability.duration}
                  </div>
                  <div className="text-[8px] font-mono theme-text-muted">
                    EST. DURATION
                  </div>
                </div>
                <div className={`${innerCard} rounded-xl p-3 text-center`}>
                  <Ruler size={14} className="mx-auto mb-1 theme-text-muted" />
                  <div className="text-sm font-bold font-mono theme-text">
                    {routeViability.distance}
                  </div>
                  <div className="text-[8px] font-mono theme-text-muted">
                    DISTANCE
                  </div>
                </div>
                <div className={`${innerCard} rounded-xl p-3 text-center`}>
                  <Droplets
                    size={14}
                    className="mx-auto mb-1"
                    style={{
                      color:
                        routeViability.status === "optimal"
                          ? "var(--color-secondary)"
                          : "var(--color-danger)",
                    }}
                  />
                  <div
                    className="text-sm font-bold font-mono"
                    style={{
                      color:
                        routeViability.status === "optimal"
                          ? "var(--color-secondary)"
                          : "var(--color-danger)",
                    }}
                  >
                    {routeViability.maxDepthExposure}
                  </div>
                  <div className="text-[8px] font-mono theme-text-muted">
                    MAX EXPOSURE
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
