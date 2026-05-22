import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ThemeVariant } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Database, 
  Wifi, 
  Cpu, 
  Clock, 
  Radio, 
  Terminal, 
  Volume2, 
  CheckCircle, 
  AlertTriangle, 
  ServerCrash,
  RefreshCw,
  LineChart,
  Hammer
} from 'lucide-react';

export default function SensorsView() {
  const {
    sensorNodes,
    selectedNodeId,
    setSelectedNodeId,
    telemetryLogs,
    systemStats,
    isSyncing,
    toggleSync,
    activeLayout,
    dispatchMaintenance,
    showToast
  } = useAppStore();

  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? 'glass-panel text-on-surface' : 'neu-extrude text-on-surface';
  const innerCardStyle = isGlass ? 'bg-white/5 border border-white/10' : 'neu-recess';

  // Selected Node statistics
  const activeNode = sensorNodes.find(n => n.id === selectedNodeId) || sensorNodes[0];

  // Dummy 12h trend tracking (mutated based on chosen sensor values)
  const isUp = activeNode.trend === 'rising';
  const offsetMultiplier = activeNode.waterLevel / 100;

  const historicalData = [
    { hour: '12:00', level: parseFloat((0.24 * offsetMultiplier).toFixed(2)) },
    { hour: '14:00', level: parseFloat((0.45 * offsetMultiplier).toFixed(2)) },
    { hour: '16:00', level: parseFloat((0.68 * offsetMultiplier).toFixed(2)) },
    { hour: '18:00', level: parseFloat((0.85 * offsetMultiplier).toFixed(2)) },
    { hour: '20:00', level: parseFloat((1.12 * offsetMultiplier).toFixed(2)) },
    { hour: '22:00', level: parseFloat((1.35 * offsetMultiplier).toFixed(2)) },
    { hour: '00:00', level: parseFloat((activeNode.waterLevel / 100).toFixed(2)) },
  ];

  const handleBroadcastAlert = () => {
    showToast(`AUDIBLE ALARM BROADCST SENT TO SECTOR NODE: ${activeNode.name} (${activeNode.location})! Low-frequency alerts triggered successfully at embankments.`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 space-y-8 no-scrollbar text-left select-none pb-20">
      {/* HEADER SYSTEMS CLUSTERS MODULE */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${panelStyle} rounded-2xl p-5 flex flex-col gap-1.5`}>
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider block font-semibold">
            Telemetry Feed Source
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-white">
              {systemStats.totalSensors}
            </h3>
            <span className="text-[10px] bg-secondary/20 text-secondary font-mono px-2 py-0.5 rounded font-semibold">
              STABLE CORRIDORS
            </span>
          </div>
          <p className="text-[10px] text-outline pt-1 border-t border-white/5 mt-2">
            Remote ESP32 MQTT connections registered
          </p>
        </div>

        <div className={`${panelStyle} rounded-2xl p-5 flex flex-col gap-1.5`}>
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider block font-semibold">
            Online Sensors
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-secondary">
              {systemStats.activeNodes}
            </h3>
            <span className="text-[10px] text-outline font-mono">
              99.8% Available
            </span>
          </div>
          <p className="text-[10px] text-outline pt-1 border-t border-white/5 mt-2">
            Average reporting interval 5.0 seconds
          </p>
        </div>

        <div className={`${panelStyle} rounded-2xl p-5 flex flex-col gap-1.5`}>
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider block font-semibold">
            Active Hazard Warning
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-brand-warning">
              {systemStats.offlineCount}
            </h3>
            <span className="text-[10px] bg-brand-warning/20 text-brand-warning font-mono px-2 py-0.5 rounded font-semibold animate-pulse">
              WARNING LIMIT
            </span>
          </div>
          <p className="text-[10px] text-outline pt-1 border-t border-white/5 mt-2">
            Inundated zones or signal failures
          </p>
        </div>

        <div className={`${panelStyle} rounded-2xl p-5 flex flex-col gap-1.5`}>
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider block font-semibold">
            Satellite Link Ping
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-primary">
              {systemStats.latencyMs}ms
            </h3>
            <span className="text-[10px] text-outline font-mono">
              AWS/IoT Hub
            </span>
          </div>
          <p className="text-[10px] text-outline pt-1 border-t border-white/5 mt-2">
            Dynamic connection loop ping metrics
          </p>
        </div>
      </section>

      {/* CORE ANALYSIS SPLIT: CHART ON LEFT, GAUGE DIAGNOSTIC ON RIGHT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Area Chart (8 columns on desktop) */}
        <div className={`col-span-1 lg:col-span-8 ${panelStyle} rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl`}>
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
              <span className="text-[10px] text-outline font-mono shrink-0 uppercase">Query Node:</span>
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
              <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isUp ? "#FF453A" : "#aac7ff"} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={isUp ? "#FF453A" : "#aac7ff"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="#8b91a0" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#8b91a0" fontSize={10} fontFamily="monospace" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#201f1f', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  labelStyle={{ fontWeight: 'bold' }}
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
        <div className={`col-span-1 lg:col-span-4 ${panelStyle} rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl`}>
          <div className="border-b border-white/5 pb-3">
            <h3 className="font-bold text-base text-white font-sans flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[#47e266] shrink-0" />
              <span>Diagnostic Feed</span>
            </h3>
            <span className="text-[10px] font-mono text-outline mt-0.5 block uppercase">
              UPLINK: {activeNode.name}
            </span>
          </div>

          {/* Metric gauge sliders matching details perfectly */}
          <div className="space-y-4">
            {/* CPU temperature */}
            <div className={`${innerCardStyle} rounded-xl p-3 flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-[#ffb691]" />
                <div>
                  <span className="text-[10px] font-mono text-outline block leading-none">CPU Temp</span>
                  <span className="text-sm font-semibold text-white font-mono mt-0.5 block">{activeNode.cpuTemp}&deg;C</span>
                </div>
              </div>
              <span className="text-[9px] font-mono bg-white/5 text-outline px-2 py-1 rounded">SAFE LEVEL</span>
            </div>

            {/* Heap memory available */}
            <div className={`${innerCardStyle} rounded-xl p-3 flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <Radio className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-[10px] font-mono text-outline block leading-none">Esp32 RAM heap</span>
                  <span className="text-sm font-semibold text-white font-mono mt-0.5 block">{activeNode.heapUsage}</span>
                </div>
              </div>
              <span className="text-[9px] font-mono bg-[#47e266]/10 text-secondary px-2 py-1 rounded">HEALTHY</span>
            </div>

            {/* Device uptime */}
            <div className={`${innerCardStyle} rounded-xl p-3 flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-secondary" />
                <div>
                  <span className="text-[10px] font-mono text-outline block leading-none">System Uptime</span>
                  <span className="text-sm font-semibold text-white font-mono mt-0.5 block">{activeNode.uptime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rapid trigger dispatch team action */}
          <button
            onClick={() => {
              dispatchMaintenance(activeNode.id);
              showToast(`MAINTENANCE TEAM DIRECT DISPATCH ASSIGNED FOR ${activeNode.location} (${activeNode.id})! Rapid response unit routing scheduled.`);
            }}
            className="w-full py-2.5 border border-brand-warning/30 hover:bg-brand-warning/5 active:bg-brand-warning/10 text-brand-warning uppercase font-mono tracking-widest text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Hammer className="h-4 w-4" />
            DISPATCH CREW OVERRIDE
          </button>
        </div>
      </section>

      {/* SYSLOG INTERACTIVE MARQUEE LIST & EMERGENCY AUDIBLE BROADCAST CARDS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Tactile emergency audible override button (5 columns) */}
        <div className={`col-span-1 lg:col-span-5 ${panelStyle} rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl text-center relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-brand-danger to-transparent animate-pulse"></div>
          
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-white font-sans flex items-center justify-center gap-2">
              <Volume2 className="h-5 w-5 text-brand-danger animate-bounce shrink-0" />
              <span>Audible Alarm Override</span>
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed font-sans">
              Manually activate audio frequency flood safety strobe horns mounted on the ESP32 mesh nodes to warn civilians in vulnerable locations immediately.
            </p>
          </div>

          {/* Interactive big clicking dial button */}
          <div className="py-2 flex justify-center">
            <button
              onClick={handleBroadcastAlert}
              className="h-28 w-28 rounded-full border-4 border-brand-danger/30 hover:border-brand-danger/60 bg-brand-danger/10 hover:bg-brand-danger/20 pulse-danger active:scale-95 transition-all text-brand-danger font-mono text-xs uppercase tracking-widest flex flex-col justify-center items-center gap-2 cursor-pointer shadow-inner"
            >
              <Volume2 className="h-8 w-8 text-brand-danger" />
              <span className="text-[10px] font-bold">ACTIVATE</span>
            </button>
          </div>

          <p className="text-[10px] text-outline font-mono uppercase">
            UPLINK: SIREN SECURE AT MAIN ST
          </p>
        </div>

        {/* Syslog Incoming raw stream terminal (7 columns) */}
        <div className={`col-span-1 lg:col-span-7 ${panelStyle} rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-xl relative`}>
          <div className="border-b border-white/5 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-base text-white font-sans flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <span>Realtime Syslog Uplink (ESP32 JSON Broadcast)</span>
            </h3>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#47e266] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#47e266]"></span>
            </span>
          </div>

          {/* Live syslog feed box */}
          <div className="bg-[#0e0e0e] border border-white/5 rounded-xl p-4 h-48 overflow-y-auto font-mono text-xs text-on-surface-variant/90 space-y-2 text-left select-text">
            {telemetryLogs.map((log) => {
              const matchesSelected = log.nodeName === activeNode.name;
              return (
                <div 
                  key={log.id} 
                  className={`py-1 flex flex-col sm:flex-row gap-2 border-b border-white/2 transition-colors duration-200 ${
                    matchesSelected ? 'bg-primary/5 text-primary font-semibold' : ''
                  }`}
                >
                  <span className="text-outline shrink-0">[{log.timestamp}]</span>
                  <span className="text-[#ffb691] font-semibold shrink-0">{log.nodeName}:</span>
                  <span className="text-white flex-grow truncate">
                    RX PACKET: LVL = {log.waterLevel}m, RSSI = {log.rssi}dBm, TEMP = {log.temp}&deg;C {log.message ? `| ERR: ${log.message}` : ''}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                    log.status === 'MAINTENANCE' || log.status === 'WARNING' 
                      ? 'bg-brand-warning/20 text-brand-warning font-semibold' 
                      : 'bg-secondary/20 text-secondary'
                  }`}>
                    {log.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] text-outline font-mono">
            <span>PACKET PROTOCOL: MQTT SUBSCRIBER ON TOPIC: tele/esp32/+</span>
            <button 
              onClick={toggleSync}
              className="hover:text-white transition-colors cursor-pointer text-[10px] font-mono uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded"
            >
              {isSyncing ? 'PAUSE UPLINK SPEED' : 'RESUME UPLINK SPEED'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
