import { useState } from 'react';
import { useAppStore } from '../store';
import { ThemeVariant, SensorNode } from '../types';
import { 
  Eye, 
  Layers, 
  MapPin, 
  RefreshCw, 
  Scan, 
  Activity, 
  Plus, 
  Minus, 
  Expand, 
  AlertTriangle, 
  AlertOctagon,
  ChevronsUp,
  X,
  Compass,
  CheckCircle,
  HelpCircle,
  Zap
} from 'lucide-react';

export default function DashboardView() {
  const { 
    sensorNodes, 
    selectedNodeId, 
    setSelectedNodeId,
    aiRiskLevel,
    aiWaterIncrement,
    aiDrainStatus,
    isScanningAI,
    rescanAI,
    setFocusArea,
    activeLayout,
    setView
  } = useAppStore();

  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? 'glass-panel text-on-surface' : 'neu-extrude text-on-surface';
  const controlStyle = isGlass ? 'glass-panel text-on-surface hover:bg-white/10' : 'neu-extrude text-on-surface hover:text-primary active:neu-recess';

  // Get active selected node
  const activeNode = sensorNodes.find(n => n.id === selectedNodeId) || sensorNodes[0];
  const [activeMobileTab, setActiveMobileTab] = useState<'map' | 'ai' | 'iot'>('map');

  return (
    <div className="flex-grow flex flex-col lg:flex-row h-full relative overflow-hidden select-none">
      {/* Tab Selectors for Mobile / Tablet clients */}
      <div className="flex lg:hidden bg-black/40 backdrop-blur-md border-b border-white/10 w-full p-2.5 z-30 gap-1.5 sticky top-0 shrink-0">
        <button 
          onClick={() => setActiveMobileTab('map')}
          className={`flex-1 py-2.5 text-center text-[10px] font-mono font-bold tracking-widest rounded-lg border uppercase transition-all duration-200 cursor-pointer ${
            activeMobileTab === 'map' 
              ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_12px_rgba(170,199,255,0.25)]' 
              : 'bg-transparent border-transparent text-[#9ea4b6] hover:text-white'
          }`}
        >
          Live Map
        </button>
        <button 
          onClick={() => setActiveMobileTab('ai')}
          className={`flex-1 py-2.5 text-center text-[10px] font-mono font-bold tracking-widest rounded-lg border uppercase transition-all duration-200 cursor-pointer ${
            activeMobileTab === 'ai' 
              ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_12px_rgba(170,199,255,0.25)]' 
              : 'bg-transparent border-transparent text-[#9ea4b6] hover:text-white'
          }`}
        >
          AI CCTV
        </button>
        <button 
          onClick={() => setActiveMobileTab('iot')}
          className={`flex-1 py-2.5 text-center text-[10px] font-mono font-bold tracking-widest rounded-lg border uppercase transition-all duration-200 cursor-pointer ${
            activeMobileTab === 'iot' 
              ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_12px_rgba(170,199,255,0.25)]' 
              : 'bg-transparent border-transparent text-[#9ea4b6] hover:text-white'
          }`}
        >
          IoT Feed ({sensorNodes.length})
        </button>
      </div>

      {/* BACKGROUND FLOOD MAP CANVAS */}
      <div 
        className={`absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 brightness-[0.4] lg:block ${activeMobileTab === 'map' ? 'block' : 'hidden'}`}
        style={{ 
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuGrgNe8p46ryZ-5OdxHYzHFxL7CHAehH4f5WjQyP1hr8qlOHTqLeqOMZhMiDyXasC4cpef4LhF_HN005kYXdWsktwO-owLBvstyZV6feCfGdjnN-J09a0gxs5ftPycmh-NqSM2P36P2Wx5DyvdFTauRHV-ywg1DdLJpmt4i1m_BJW0zBzDYSB2J66lO66TstxBRqMWc99aEsY6MGSt71hsQGV8AetwJ7mPws8dnEg2lP_k__M_chXa1-f8siQQYtOkwSYXPpjNa-o')`
        }}
      >
        {/* Glow Halos corresponding to warning centers */}
        <div className="absolute top-[35%] left-[45%] w-32 h-32 bg-brand-danger/20 rounded-full blur-[40px] animate-pulse pointer-events-none"></div>
        <div className="absolute top-[50%] left-[55%] w-16 h-16 bg-brand-danger/30 rounded-full blur-[20px] pb-5 pointer-events-none"></div>
        <div className="absolute top-[60%] left-[25%] w-44 h-44 bg-brand-warning/10 rounded-full blur-[50px] pointer-events-none"></div>
      </div>

      {/* FLOAT MAP OVERLAY INTERACTIVE PINS */}
      <div className={`absolute inset-0 z-10 pointer-events-none lg:block ${activeMobileTab === 'map' ? 'block' : 'hidden'}`}>
        {sensorNodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const statusColors = {
            critical: 'bg-brand-danger text-white border-red-500 animate-pulse',
            warning: 'bg-brand-warning text-black border-yellow-500',
            stable: 'bg-[#47e266] text-black border-green-500',
            info: 'bg-primary text-black border-blue-500'
          };

          return (
            <button
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`absolute p-1 cursor-pointer pointer-events-auto rounded-full transition-transform duration-300 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border-2 bg-black hover:scale-120 ${
                isSelected ? 'scale-120 ring-4 ring-primary/40' : 'scale-90 opacity-80'
              }`}
              style={{ top: `${node.latitude}%`, left: `${node.longitude}%` }}
              title={`${node.location} (${node.name}): ${node.waterLevel}cm`}
            >
              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${statusColors[node.status]}`}>
                <div className="h-1.5 w-1.5 bg-white rounded-full"></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* MID TOP FLOATING RADAR warning */}
      <div className={`absolute top-20 sm:top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-[92%] sm:w-auto lg:flex ${activeMobileTab === 'map' ? 'flex' : 'hidden'}`}>
        <div className="bg-surface-container-highest/95 backdrop-blur-md border border-brand-danger/40 text-brand-danger rounded-lg px-4 py-2 sm:px-6 sm:py-3 flex items-center justify-center gap-3 shadow-2xl animate-pulse pointer-events-auto w-full text-center">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-bounce shrink-0" />
          <span className="font-bold tracking-widest text-[#ff453a] text-[9px] sm:text-xs font-mono uppercase">
            HIGH SURGE WARNING: SECTOR 7 (ACTIVE RISK 78%)
          </span>
        </div>
      </div>

      {/* FLOATING MAP LAYERS PANEL (TOP RIGHT) */}
      <aside className={`absolute top-36 sm:top-24 right-5 sm:right-6 z-20 flex flex-col gap-4 w-52 sm:w-64 lg:flex ${activeMobileTab === 'map' ? 'flex' : 'hidden'}`}>
        {/* Risk Legend */}
        <div className={`${panelStyle} rounded-xl p-3 sm:p-4 shadow-xl border border-white/10 bg-surface/85 pointer-events-auto`}>
          <h3 className="text-outline text-[9px] sm:text-[10px] font-mono font-semibold tracking-wider uppercase mb-2 sm:mb-3">
            Grid Risk Legend
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-brand-danger shadow-[0_0_8px_rgba(255,69,58,0.8)]"></span>
              <span className="text-[10px] sm:text-xs font-medium text-on-surface">Critical Surge (&gt; 120cm)</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-brand-warning shadow-[0_0_8px_rgba(255,214,10,0.8)]"></span>
              <span className="text-[10px] sm:text-xs font-medium text-on-surface">Moderate Risk (50-120cm)</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(71,226,102,0.8)]"></span>
              <span className="text-[10px] sm:text-xs font-medium text-on-surface">Low System Risk (&lt; 50cm)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* FLOATING ZOOM/3D CONTROLS (BOTTOM RIGHT) */}
      <div className={`absolute bottom-20 right-6 z-20 flex flex-col gap-2 lg:flex ${activeMobileTab === 'map' ? 'flex' : 'hidden'}`}>
        <div className={`${panelStyle} rounded-lg overflow-hidden flex flex-col shadow-lg border border-white/5`}>
          <button className="p-2.5 sm:p-3 text-outline hover:text-white hover:bg-white/10 transition-colors border-b border-white/5" title="Recenter Base Node" onClick={() => setSelectedNodeId('SN-402')}>
            <Compass className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button className="p-2.5 sm:p-3 text-outline hover:text-white hover:bg-white/10 transition-colors" title="Zoom In">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button className="p-2.5 sm:p-3 text-outline hover:text-white hover:bg-white/10 transition-colors" title="Zoom Out">
            <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* LEFT PANEL: AI RISK DETAILS INSIDE SIDEBAR SPACE */}
      <section className={`w-full lg:w-[400px] shrink-0 ${panelStyle} p-5 sm:p-6 z-10 justify-between overflow-y-auto border-r border-white/10 lg:h-full no-scrollbar ${activeMobileTab === 'ai' ? 'flex flex-col h-[calc(100vh-120px)] sm:h-full pb-10' : 'hidden lg:flex lg:flex-col lg:h-full'}`}>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="font-bold text-lg text-white font-sans flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary animate-pulse" />
              <span>AI Risk Analysis</span>
            </h3>
            <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded text-right">
              GEMINI MODEL
            </span>
          </div>

          {/* Active AI prediction block */}
          <div className="bg-brand-danger/10 border border-brand-danger/30 rounded-lg p-5 flex flex-col items-center justify-center gap-2 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-brand-danger/5 pulse-danger pointer-events-none"></div>
            <span className="font-mono text-[10px] text-brand-danger uppercase tracking-wider font-semibold">
              Current Delta Risk
            </span>
            <span className="text-3xl md:text-4xl font-bold font-sans text-brand-danger tracking-tight leading-none">
              {aiRiskLevel}% High
            </span>
            <span className="bg-brand-danger/25 text-brand-danger px-3 py-1 rounded-full text-xs font-medium mt-2 flex items-center justify-center gap-1.5 border border-brand-danger/35 shadow-inner">
              <AlertOctagon className="h-4 w-4" /> Immediate Check Required
            </span>
          </div>

          {/* Core Visual AI feed matching Raw Security Feed mockup */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono text-outline uppercase tracking-wider font-semibold">
              CCTV Visual Feed Processing
            </h4>
            <div className="rounded-xl overflow-hidden border border-white/10 relative h-48 bg-surface-container shadow-2xl group cursor-pointer" onClick={setFocusArea}>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA58l0uoL2ldchvHIgQlHo9w11Y67igR-xfT3OOyCC8eaTcZV6qRN57b47gQKnlIZnnpxyKgF06YYqBGOibfRwtSoC_JxP5PJHnG7UNbkhpZFmmGn1UfhdnBPJXdaY650w_hZmwby6vnSLjVE7hSJJO9_x8SJGfFwFhyvXgzq8k4NjCF39t-ec0U3gWq6_3oE8ZeLO7JVL9HIi-SqP1aLU5YcWQhfS9c6duEuy1wVvMGKmcjyIHUDaiN1Cycr6hwkQ5fnT2qqs_m-8" 
                alt="Secure rainy stream computer vision feedback" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              
              {/* Overlay animated bounding box 1 (Water increment detection) */}
              <div className="absolute top-[35%] left-[20%] w-[35%] h-[25%] border-2 border-brand-danger bg-brand-danger/10 rounded flex flex-col justify-between items-start p-1.5">
                <span className="bg-brand-danger text-white text-[9px] font-semibold font-mono px-1 rounded uppercase tracking-wider">
                  Water Increment +{aiWaterIncrement}cm
                </span>
                <span className="text-[9px] text-[#ffdad6] font-mono leading-none">SECTOR-7 SEC-10</span>
              </div>

              {/* Bounding box 2 (potholes drain blocking classification) */}
              <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[35%] border-2 border-brand-warning bg-brand-warning/10 rounded flex flex-col justify-between items-start p-1.5">
                <span className="bg-brand-warning text-black text-[9px] font-bold font-mono px-1 rounded uppercase tracking-wider">
                  Drain {aiDrainStatus}
                </span>
                <span className="text-[9px] text-black font-semibold font-mono leading-none">OCCLUSION 88%</span>
              </div>
            </div>
            <p className="text-[10px] text-outline text-left italic">
              * Click view feed inside storm box to simulate automated cleaning focus.
            </p>
          </div>
        </div>

        {/* Control rescanner triggers */}
        <div className="flex gap-3">
          <button 
            onClick={rescanAI}
            disabled={isScanningAI}
            className="flex-1 py-3 border border-white/10 hover:bg-white/5 active:bg-white/10 text-xs font-mono tracking-widest text-[#aac7ff] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanningAI ? 'animate-spin text-secondary' : ''}`} />
            {isScanningAI ? 'SCANNING...' : 'RESCAN FEED'}
          </button>
          
          <button
            onClick={() => setView('route-sim')}
            className="flex-1 py-3 bg-primary-container text-black font-semibold text-xs rounded-lg shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="h-4 w-4" />
            ROUTE DEVIATION
          </button>
        </div>
      </section>

      {/* RIGHT SIDEBAR: IoT Nodes List Panel */}
      <section className={`w-full lg:w-[360px] shrink-0 ${panelStyle} p-5 sm:p-6 z-10 justify-between gap-6 border-l border-white/10 lg:h-full no-scrollbar ${activeMobileTab === 'iot' ? 'flex flex-col h-[calc(100vh-120px)] sm:h-full pb-10' : 'hidden lg:flex lg:flex-col lg:h-full'}`}>
        <div className="space-y-4 flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
            <h3 className="font-bold text-lg text-on-surface font-sans flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary pulse-secondary rounded-full" />
              <span>IoT Nodes Live</span>
            </h3>
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-secondary shadow-[0_0_5px_#47e266]"></span>
            </span>
          </div>

          {/* Responsive scrolling sensor logs */}
          <div className="no-scrollbar space-y-3 lg:max-h-[450px] flex-1 lg:flex-none overflow-y-auto pr-1">
            {sensorNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              
              // Status markers
              const colorMap = {
                critical: 'border-l-4 border-l-brand-danger bg-brand-danger/10',
                warning: 'border-l-4 border-l-brand-warning bg-brand-warning/5',
                stable: 'border-l-4 border-l-secondary bg-surface-container',
                info: 'border-l-4 border-l-primary bg-surface-container-low'
              };

              const textBadgeColor = {
                critical: 'text-brand-danger font-bold',
                warning: 'text-brand-warning',
                stable: 'text-secondary',
                info: 'text-primary'
              };

              return (
                <div 
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-4 rounded-xl relative cursor-pointer group transition-all duration-200 border border-white/5 flex flex-col gap-2 ${
                    isSelected ? 'ring-2 ring-primary bg-white/5 shadow-xl scale-102' : 'hover:bg-white/5 opacity-85 hover:opacity-100'
                  } ${colorMap[node.status]}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-outline block">{node.name}</span>
                      <h4 className="text-sm font-semibold text-white leading-tight font-sans tracking-tight">
                        {node.location}
                      </h4>
                    </div>
                    {node.status === 'critical' ? (
                      <AlertTriangle className="h-4 w-4 text-brand-danger animate-bounce shrink-0" />
                    ) : (
                      <CheckCircle className={`h-4 w-4 shrink-0 ${textBadgeColor[node.status]}`} />
                    )}
                  </div>

                  <div className="flex justify-between items-baseline mt-1 border-t border-white/5 pt-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono text-outline uppercase">Ultrasound Level</span>
                      <span className={`text-xl font-bold font-mono leading-none mt-0.5 ${textBadgeColor[node.status]}`}>
                        {node.waterLevel} <span className="text-xs font-normal text-outline">cm</span>
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono flex items-center gap-1 ${node.status === 'critical' ? 'text-brand-danger animate-pulse' : 'text-outline'}`}>
                      {node.rate > 0 ? `+${node.rate}cm/hr` : node.rate < 0 ? `${node.rate}cm/hr` : 'Stable'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* View telemetry deep dive link */}
        <button
          onClick={() => setView('sensors')}
          className="w-full py-3 border border-[#47e266]/30 bg-[#47e266]/5 hover:bg-[#47e266]/10 text-secondary font-mono tracking-widest text-xs uppercase font-semibold rounded-lg transition-colors cursor-pointer text-center"
        >
          Node Telemetry Metrics &rarr;
        </button>
      </section>
    </div>
  );
}
