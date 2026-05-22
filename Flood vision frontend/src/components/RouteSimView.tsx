import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ThemeVariant, OptimizerParam } from '../types';
import { 
  Navigation,
  HelpCircle,
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  Locate,
  ArrowRightLeft,
  Settings2,
  Info,
  Layers,
  Sparkles,
  Search,
  Check,
  ShieldAlert
} from 'lucide-react';

export default function RouteSimView() {
  const {
    startPoint,
    destination,
    optimizerParam,
    maxDepthTolerance,
    routeCalculated,
    isCalculatingRoute,
    routeViability,
    setStartPoint,
    setDestination,
    setMaxDepthTolerance,
    setOptimizerParam,
    calculateRoute,
    activeLayout
  } = useAppStore();

  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? 'glass-panel text-on-surface' : 'neu-extrude text-on-surface';
  const innerCardStyle = isGlass ? 'bg-white/5 border border-white/10' : 'neu-recess';

  const routePresets = [
    'Emergency Shelter Gamma-3',
    'Sector-7 Community Safe Center',
    'Westside Medical Substation',
    'Vigilant Tactical Depot'
  ];

  const [activeMobileTab, setActiveMobileTab] = useState<'form' | 'map'>('form');

  return (
    <div className="flex-grow flex flex-col lg:flex-row h-full relative overflow-hidden select-none">
      {/* Mobile / Tablet tabs */}
      <div className="flex lg:hidden bg-black/40 backdrop-blur-md border-b border-white/10 w-full p-2.5 z-30 gap-1.5 sticky top-0 shrink-0">
        <button 
          onClick={() => setActiveMobileTab('form')}
          className={`flex-1 py-2.5 text-center text-[10px] font-mono font-bold tracking-widest rounded-lg border uppercase transition-all duration-200 cursor-pointer ${
            activeMobileTab === 'form' 
              ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_12px_rgba(170,199,255,0.25)]' 
              : 'bg-transparent border-transparent text-[#9ea4b6] hover:text-white'
          }`}
        >
          Parameters Form
        </button>
        <button 
          onClick={() => setActiveMobileTab('map')}
          className={`flex-1 py-2.5 text-center text-[10px] font-mono font-bold tracking-widest rounded-lg border uppercase transition-all duration-200 cursor-pointer ${
            activeMobileTab === 'map' 
              ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_12px_rgba(170,199,255,0.25)]' 
              : 'bg-transparent border-transparent text-[#9ea4b6] hover:text-white'
          }`}
        >
          Corridor Map {routeCalculated && '✓'}
        </button>
      </div>

      {/* MAP CANVAS IN BACKGROUND */}
      <div 
        className={`absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 brightness-[0.4] lg:block ${activeMobileTab === 'map' ? 'block' : 'hidden'}`}
        style={{ 
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuHks0Z0GCO-VfK-J9X_oPyl1lT5g-8898FByfRIs7g3vA-qY381hP889-owv0fK0-oYxZ4ooxvR_HNDf2lWdfK5_HwN0BwsYt0vXWxfE_Gyn7nN0-eC99mX6xY09xXWw8B7hVz69y3X_oQ')`
        }}
      >
        {/* Draw interactive SVG Path mapping corresponding detours */}
        {routeCalculated && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="safeRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#aac7ff" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#47e266" stopOpacity="0.8"/>
              </linearGradient>
              <linearGradient id="dangerRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF453A" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#ffd60a" stopOpacity="0.8"/>
              </linearGradient>
            </defs>

            {/* Render Red Danger Zones */}
            <circle cx="50%" cy="45%" r="100" className="fill-brand-danger/10 stroke-brand-danger/30 stroke-2 stroke-dasharray-[5,5] animate-pulse" />
            <text x="50%" y="42%" className="fill-brand-danger text-[10px] font-mono font-bold uppercase tracking-widest text-center" textAnchor="middle">
              SURGE FLOODING: 0.82m
            </text>

            <circle cx="75%" cy="65%" r="60" className="fill-brand-danger/10 stroke-brand-danger/20 stroke-2" />

            {/* ROUTE DANGER OR ROUTE DETOUR PATH drawing */}
            {optimizerParam === OptimizerParam.LOWEST_RISK ? (
              <>
                {/* Safe Detour: Curves beautiful path away from center bubble */}
                <path 
                  d="M 150 500 Q 250 220 520 200 T 800 150 T 1100 480" 
                  className="stroke-[6px] fill-none animate-dash"
                  stroke="url(#safeRouteGrad)"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="500" r="10" className="fill-primary stroke-white stroke-2" />
                <circle cx="1100" cy="480" r="10" className="fill-secondary stroke-white stroke-2" />
              </>
            ) : (
              <>
                {/* Shortest Path (Dangerous Direct line through circles) */}
                <path 
                  d="M 150 500 L 550 420 L 1100 480" 
                  className="stroke-[6px] fill-none animate-dash"
                  stroke="url(#dangerRouteGrad)"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="500" r="10" className="fill-danger stroke-white stroke-2" />
                <circle cx="1100" cy="480" r="10" className="fill-warning stroke-white stroke-2" />
              </>
            )}
          </svg>
        )}
      </div>

      {/* LEFT PANEL CONTROLS CARD */}
      <section className={`w-full lg:w-[420px] shrink-0 ${panelStyle} p-5 sm:p-6 z-10 border-r border-white/10 h-[calc(100vh-120px)] sm:h-full pb-10 sm:pb-6 no-scrollbar overflow-y-auto ${activeMobileTab === 'form' ? 'flex flex-col justify-between gap-6' : 'hidden lg:flex lg:flex-col'}`}>
        <div className="space-y-6 text-left">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="font-bold text-lg text-white font-sans flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary animate-pulse" />
              <span>Route Optimizer</span>
            </h3>
            <span className="text-[10px] font-mono bg-secondary/20 text-[#47e266] px-2 py-0.5 rounded uppercase font-semibold">
              SAFE CORRIDOR
            </span>
          </div>

          {/* Form Routing */}
          <div className="space-y-4">
            {/* Start Location input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-outline uppercase tracking-wider block font-semibold">
                Starting Node Point
              </label>
              <div className="flex items-center bg-surface-container rounded-lg px-3 py-2.5 border border-white/5 relative">
                <Locate className="h-4 w-4 text-primary shrink-0 mr-3" />
                <input 
                  type="text" 
                  value={startPoint} 
                  onChange={(e) => setStartPoint(e.target.value)}
                  className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-mono placeholder-outline/50" 
                  placeholder="Enter start coordinates..."
                />
              </div>
            </div>

            {/* Destination Selector preset buttons and input */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[#8b91a0] uppercase tracking-wider block font-semibold">
                Target Safety Destination
              </label>
              <div className="flex items-center bg-surface-container rounded-lg px-3 py-2.5 border border-white/5">
                <Navigation className="h-4 w-4 text-[#ffb691] shrink-0 mr-3 rotate-45" />
                <input 
                  type="text" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-mono placeholder-[#8b91a0]/70"
                  placeholder="Select pre-surveyed target coordinates..."
                />
              </div>
              
              {/* Preset clickable list buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                {routePresets.map((preset) => {
                  const isSel = destination === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDestination(preset)}
                      className={`px-3 py-2 text-left rounded text-[10px] font-mono border transition-all truncate text-left cursor-pointer ${
                        isSel 
                          ? 'bg-primary/20 text-primary border-primary/30 font-bold' 
                          : 'bg-white/2 hover:bg-white/5 text-outline border-white/5'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider tolerance block */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-outline uppercase tracking-wider font-semibold">
                  Max Clearance Tolerance
                </label>
                <span className="text-xs font-mono font-bold text-primary">
                  {maxDepthTolerance.toFixed(1)}m <span className="text-[9px] font-normal text-outline">(limit)</span>
                </span>
              </div>
              <input 
                type="range"
                min="0.1"
                max="1.5"
                step="0.1"
                value={maxDepthTolerance}
                onChange={(e) => setMaxDepthTolerance(parseFloat(e.target.value))}
                className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[9px] text-[#9ea4b6] text-left leading-tight">
                Defines vehicle suspension wading depth. Paths with flood level bounds exceeding this limit are completely bypassed.
              </p>
            </div>

            {/* Switch parameter selector */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-mono text-outline uppercase tracking-wider block font-semibold">
                Optimization Metric
              </label>
              <div className="grid grid-cols-2 gap-2 bg-surface-container-lowest border border-white/5 p-1 rounded-lg">
                {[OptimizerParam.LOWEST_RISK, OptimizerParam.SHORTEST_PATH].map((param) => {
                  const isSel = optimizerParam === param;
                  return (
                    <button
                      key={param}
                      type="button"
                      onClick={() => setOptimizerParam(param)}
                      className={`py-2 text-center rounded-md text-[10px] font-mono transition-all font-semibold cursor-pointer ${
                        isSel 
                          ? 'bg-gradient-to-r from-primary/35 to-primary/10 text-primary border border-primary/30' 
                          : 'hover:bg-white/5 text-outline'
                      }`}
                    >
                      {param}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Big corridor trigger button and loader */}
        <button
          onClick={() => {
            calculateRoute();
            setActiveMobileTab('map');
          }}
          disabled={!destination || isCalculatingRoute}
          className={`w-full py-4 text-xs font-semibold uppercase tracking-widest text-black bg-gradient-to-r from-[#aac7ff] to-[#47e266] rounded-xl hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 ${
            (!destination || isCalculatingRoute) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {isCalculatingRoute ? (
            <>
              <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <span>SOLVING KINEMATICS...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>CALCULATE SAFE CORRIDOR</span>
            </>
          )}
        </button>
      </section>

      {/* OVERLAY CORRIDOR METRICS ON MAP AREA */}
      {routeCalculated && routeViability && (
        <aside className={`absolute bottom-20 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-6 lg:left-[440px] z-20 pointer-events-none lg:block ${activeMobileTab === 'map' ? 'block' : 'hidden'}`}>
          <div className={`${panelStyle} bg-surface/90 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl pointer-events-auto text-left space-y-3 sm:space-y-4`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-2.5 sm:pb-3">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary animate-pulse" />
                  <span>Optimal Detour Plot Complete</span>
                </h4>
                <p className="text-outline text-[10px] font-mono mt-0.5 uppercase">
                  Avoids high flood risk Sector-7 underpass
                </p>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full font-bold border mt-2 sm:mt-0 ${
                optimizerParam === OptimizerParam.LOWEST_RISK 
                  ? 'bg-secondary/15 text-secondary border-secondary/20 shadow-[0_0_8px_rgba(71,226,102,0.15)]' 
                  : 'bg-danger/20 text-danger border-danger/30 blink'
              }`}>
                {optimizerParam === OptimizerParam.LOWEST_RISK ? 'ROUTE VIABLE - SECTOR STABLE' : 'WARN - CLEARANCE EXCEEDED'}
              </span>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className={`${innerCardStyle} rounded-xl p-3 sm:p-4 flex flex-col gap-1.5`}>
                <span className="text-[8px] sm:text-[9px] font-mono text-outline uppercase truncate">Est. Duration</span>
                <span className="text-base sm:text-xl font-bold font-mono text-white leading-none">
                  {routeViability.duration}
                </span>
              </div>
              
              <div className={`${innerCardStyle} rounded-xl p-3 sm:p-4 flex flex-col gap-1.5`}>
                <span className="text-[8px] sm:text-[9px] font-mono text-outline uppercase truncate">Corridor Dist</span>
                <span className="text-base sm:text-xl font-bold font-mono text-white leading-none">
                  {routeViability.distance}
                </span>
              </div>

              <div className={`${innerCardStyle} rounded-xl p-3 sm:p-4 flex flex-col gap-1.5`}>
                <span className="text-[8px] sm:text-[9px] font-mono text-outline uppercase truncate">Max Exposure</span>
                <span className={`text-base sm:text-xl font-bold font-mono leading-none ${
                  optimizerParam === OptimizerParam.LOWEST_RISK ? 'text-secondary' : 'text-danger'
                }`}>
                  {routeViability.maxDepthExposure}
                </span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* BEFORE CALCULATION GENTLE FLOATING PROMPT IN MAP INTERACTIVE FEED */}
      {!routeCalculated && !isCalculatingRoute && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none p-6 lg:flex ${activeMobileTab === 'map' ? 'flex' : 'hidden'}`}>
          <div className="bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center max-w-sm space-y-4 pointer-events-auto">
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto animate-bounce">
              <Navigation className="h-6 w-6 rotate-45" />
            </div>
            <h3 className="font-bold text-white text-base">Solver Core Awaiting Endpoint</h3>
            <p className="text-xs text-outline leading-relaxed font-sans">
              Choose a Target Safety Destination in the left form and slider clearance tolerance bounds, then execute the kinematic optimizer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
