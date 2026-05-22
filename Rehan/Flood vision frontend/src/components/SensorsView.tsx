import React, { useEffect, useState, useRef } from "react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Database, Terminal } from "lucide-react";

export default function SensorsView() {
  const {
    sensorNodes,
    selectedNodeId,
    setSelectedNodeId,
    telemetryLogs,
    showToast,
    refreshSensorsFromApi,
    applySensorUpdate,
    activeLayout,
  } = useAppStore();

  const { lastMessage, isConnected } = useWebSocket<any>("/sensors/");

  useEffect(() => {
    refreshSensorsFromApi();
  }, [refreshSensorsFromApi]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === "sensor_update") {
      applySensorUpdate(lastMessage.data);
    }
  }, [lastMessage, applySensorUpdate]);

  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass
    ? "glass-panel text-on-surface"
    : "neu-extrude text-on-surface";
  const innerCardStyle = isGlass
    ? "bg-white/5 border border-white/10"
    : "neu-recess";

  // Selected Node statistics
  const activeNode =
    sensorNodes.find((n) => n.id === selectedNodeId) || sensorNodes[0];

  // Build historical data from live telemetry logs (meters)
  const nodeTelem = telemetryLogs
    .filter((t) => t.nodeName === (activeNode?.name || ""))
    .slice(0, 12)
    .reverse();

  const historicalData =
    nodeTelem.length > 0
      ? nodeTelem.map((t) => ({ hour: t.timestamp, level: t.waterLevel }))
      : [
          {
            hour: new Date().toLocaleTimeString(),
            level: parseFloat((activeNode.waterLevel / 100).toFixed(2)),
          },
        ];

  // trend indicator
  const isUp = activeNode.trend === "rising";

  // Threshold alerting (in cm) — avoid repeated toasts per node
  const ALERT_THRESHOLD_CM = 100;
  const alertedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeNode) return;
    const exceeded = activeNode.waterLevel >= ALERT_THRESHOLD_CM;
    if (exceeded && !alertedRef.current[activeNode.id]) {
      showToast(
        `CRITICAL: ${activeNode.name} at ${activeNode.location} reports ${activeNode.waterLevel}cm (threshold ${ALERT_THRESHOLD_CM}cm).`,
      );
      alertedRef.current[activeNode.id] = true;
    } else if (!exceeded && alertedRef.current[activeNode.id]) {
      alertedRef.current[activeNode.id] = false;
    }
  }, [activeNode.waterLevel, activeNode.id, showToast]);

  // --- Ultrasonic simulation (component-local). Default to false so live data is used when available ---
  const [simulating, setSimulating] = useState(false);
  const nodesRef = useRef(sensorNodes);
  useEffect(() => {
    nodesRef.current = sensorNodes;
  }, [sensorNodes]);

  // If the WebSocket is connected, prefer live data and disable local simulation
  useEffect(() => {
    if (isConnected) setSimulating(false);
  }, [isConnected]);

  useEffect(() => {
    if (!simulating) return;
    const id = setInterval(() => {
      const nodes = nodesRef.current;
      nodes.forEach((node) => {
        const current = Number(node.waterLevel) || 0;
        let delta = 0;
        if (node.trend === "rising") delta = Math.round(Math.random() * 4);
        else if (node.trend === "falling")
          delta = -Math.round(Math.random() * 3);
        else delta = Math.round((Math.random() - 0.5) * 2);

        const newLevel = Math.max(0, current + delta);

        applySensorUpdate({
          node_id: node.id,
          water_level_cm: newLevel,
          rssi: -40 - Math.floor(Math.random() * 40),
          temperature: parseFloat((25 + Math.random() * 10).toFixed(1)),
          timestamp: new Date().toISOString(),
        });
      });
    }, 1500);
    return () => clearInterval(id);
  }, [simulating, applySensorUpdate]);

  // no static broadcast actions — UI driven by ultrasonic data

  const latestTelem = telemetryLogs.find((t) => t.nodeName === activeNode.name);

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-8 no-scrollbar text-left select-none pb-20">
      {/* Live Sensor Header — fully derived from ultrasonic sensor values */}
      <section className="mb-4">
        <div className={`${panelStyle} rounded-2xl p-5 flex items-center justify-between`}>
          <div>
            <h3 className="text-lg font-bold text-white font-sans">{activeNode.name}</h3>
            <p className="text-[10px] text-outline font-mono mt-0.5">
              {activeNode.location} • {activeNode.id}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-block px-3 py-1 rounded text-xs font-mono ${
                String(activeNode.status).toUpperCase() === "CRITICAL"
                  ? "bg-brand-warning/20 text-brand-warning"
                  : String(activeNode.status).toUpperCase() === "WARNING"
                  ? "bg-secondary/20 text-secondary"
                  : "bg-white/5 text-outline"
              }`}
            >
              {String(activeNode.status).toUpperCase()}
            </div>
            <div className="text-2xl font-mono font-semibold mt-2">
              {(activeNode.waterLevel / 100).toFixed(2)} m
            </div>
            <div className="text-[10px] text-outline mt-1">{activeNode.lastSeen}</div>
          </div>
        </div>
      </section>

      {/* CORE ANALYSIS SPLIT: CHART ON LEFT, GAUGE DIAGNOSTIC ON RIGHT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart (8 columns on desktop) */}
        <div
          className={`col-span-1 lg:col-span-8 ${panelStyle} rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-3 gap-3">
            <div>
              <h3 className="font-bold text-lg text-white font-sans flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span>12h Basin Water Hydrograph</span>
              </h3>
              <p className="text-[10px] text-outline font-mono uppercase mt-0.5">
                Target Node: {activeNode.location} ({activeNode.id})
              </p>
            </div>

            {/* Selection Dropdown */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-[10px] text-outline font-mono shrink-0 uppercase">
                Query Node:
              </span>
              <select
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                className="bg-surface-container border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none w-full sm:w-44 select-none cursor-pointer"
              >
                {sensorNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recharts responsive render */}
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historicalData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isUp ? "#FF453A" : "#aac7ff"}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={isUp ? "#FF453A" : "#aac7ff"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="hour"
                  stroke="#8b91a0"
                  fontSize={10}
                  fontFamily="monospace"
                />
                <YAxis stroke="#8b91a0" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#201f1f",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="level"
                  stroke={isUp ? "#FF453A" : "#aac7ff"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLevel)"
                  name="Water (m)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Nodes Detail Diagnostic Box (4 columns on desktop) */}
        <div
          className={`col-span-1 lg:col-span-4 ${panelStyle} rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl`}
        >
          <div className="border-b border-white/5 pb-3">
            <h3 className="font-bold text-base text-white font-sans flex items-center gap-2">
              <Database className="h-5 w-5 text-[#47e266] shrink-0" />
              <span>Diagnostic Feed</span>
            </h3>
            <span className="text-[10px] font-mono text-outline mt-0.5 block uppercase">
              UPLINK: {activeNode.name}
            </span>
          </div>

          <div className="space-y-4">
            {/* Water level indicator */}
            <div
              className={`${innerCardStyle} rounded-xl p-3 flex justify-between items-center`}
            >
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-[10px] font-mono text-outline block leading-none">
                    Water Level
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      activeNode.waterLevel >= ALERT_THRESHOLD_CM
                        ? "text-brand-warning"
                        : "text-white"
                    } font-mono mt-0.5 block`}
                  >
                    {(activeNode.waterLevel / 100).toFixed(2)} m
                  </span>
                </div>
              </div>
              <div className="w-24 h-3 bg-white/5 rounded overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (activeNode.waterLevel / ALERT_THRESHOLD_CM) * 100,
                    )}%`,
                  }}
                  className={`h-full ${
                    activeNode.waterLevel >= ALERT_THRESHOLD_CM
                      ? "bg-brand-warning"
                      : "bg-primary"
                  }`}
                ></div>
              </div>
            </div>

            {/* Latest telemetry sample */}
            <div className={`${innerCardStyle} rounded-xl p-3`}>
              <div className="text-[10px] text-outline font-mono">Latest Sample</div>
              <div className="flex gap-4 mt-2 text-sm font-mono">
                <div>RSSI: {latestTelem?.rssi ?? "—"} dBm</div>
                <div>Temp: {latestTelem?.temp ?? "—"} °C</div>
                <div>Time: {latestTelem?.timestamp ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSimulating((s) => !s)}
              className="hover:text-white transition-colors cursor-pointer text-[10px] font-mono uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded"
            >
              {simulating ? "Pause Simulation" : "Resume Simulation"}
            </button>

            <button
              onClick={refreshSensorsFromApi}
              className="hover:text-white transition-colors cursor-pointer text-[10px] font-mono uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded"
            >
              Refresh From API
            </button>
          </div>
        </div>
      </section>

      {/* Realtime telemetry panel (ultrasonic-driven) */}
      <section className="grid grid-cols-1 gap-6">
        <div className={`${panelStyle} rounded-2xl p-6 shadow-xl`}>
          <div className="border-b border-white/5 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-base text-white font-sans flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <span>Realtime Telemetry (Ultrasonic)</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSimulating((s) => !s)}
                className="hover:text-white transition-colors cursor-pointer text-[10px] font-mono uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded"
              >
                {simulating ? "Pause" : "Resume"}
              </button>

              <button
                onClick={refreshSensorsFromApi}
                className="hover:text-white transition-colors cursor-pointer text-[10px] font-mono uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-on-surface-variant/90 space-y-2 text-left select-text mt-4">
            {telemetryLogs.map((log) => {
              const matchesSelected = log.nodeName === activeNode.name;
              return (
                <div
                  key={log.id}
                  className={`py-1 flex flex-col sm:flex-row gap-2 border-b border-white/2 transition-colors duration-200 ${
                    matchesSelected ? "bg-primary/5 text-primary font-semibold" : ""
                  }`}
                >
                  <span className="text-outline shrink-0">[{log.timestamp}]</span>
                  <span className="text-[#ffb691] font-semibold shrink-0">{log.nodeName}:</span>
                  <span className="text-white grow truncate">
                    RX PACKET: LVL = {log.waterLevel}m, RSSI = {log.rssi}dBm, TEMP = {log.temp}&deg;C {log.message ? `| ERR: ${log.message}` : ""}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${log.status === "MAINTENANCE" || log.status === "WARNING" ? "bg-brand-warning/20 text-brand-warning font-semibold" : "bg-secondary/20 text-secondary"}`}>
                    {log.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
