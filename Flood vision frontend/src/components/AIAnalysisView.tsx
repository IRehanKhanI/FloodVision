import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  score: number;
  reasons: string[];
  processed_image: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_LOCATION = { lat: 15.5915, lng: 73.8087 }; // Mapusa, Goa

const RISK_COLORS: Record<string, { text: string; border: string; bg: string; badge: string }> = {
  HIGH:    { text: 'text-red-400',    border: 'border-red-500/40',    bg: 'bg-red-500/10',    badge: 'bg-red-500/20 text-red-300' },
  MEDIUM:  { text: 'text-amber-400',  border: 'border-amber-500/40',  bg: 'bg-amber-500/10',  badge: 'bg-amber-500/20 text-amber-300' },
  LOW:     { text: 'text-emerald-400',border: 'border-emerald-500/40',bg: 'bg-emerald-500/10',badge: 'bg-emerald-500/20 text-emerald-300' },
  UNKNOWN: { text: 'text-slate-400',  border: 'border-slate-500/40',  bg: 'bg-slate-500/10',  badge: 'bg-slate-500/20 text-slate-300' },
};

const RISK_ICON: Record<string, string> = {
  HIGH: '⚠', MEDIUM: '◈', LOW: '✓', UNKNOWN: '?',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIAnalysisView() {
  const mapRef  = useRef<HTMLDivElement>(null);
  const panoRef = useRef<HTMLDivElement>(null);

  // Track the current panorama position so Analyze uses wherever the user panned to
  const currentLocationRef = useRef(DEFAULT_LOCATION);

  const [result,  setResult]  = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState(DEFAULT_LOCATION);

  const mapsApiKey = import.meta.env.VITE_MAPS_API_KEY as string | undefined;

  // ── Analyze function ───────────────────────────────────────────────────────
  const analyzeFloodRisk = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const loc = currentLocationRef.current;

    // Build Street View Static API URL from current panorama position
    const imageUrl =
      `https://maps.googleapis.com/maps/api/streetview` +
      `?size=640x480` +
      `&location=${loc.lat},${loc.lng}` +
      `&fov=90` +
      `&pitch=0` +
      `&key=${mapsApiKey}`;

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('[FloodVision] Analyze error:', err);
      setError(
        err.message?.includes('fetch')
          ? 'Cannot connect to backend. Make sure Django server is running on http://127.0.0.1:8000'
          : err.message ?? 'Unknown error occurred.'
      );
    } finally {
      setLoading(false);
    }
  }, [loading, mapsApiKey]);

  // ── Google Maps + Street View setup ───────────────────────────────────────
  useEffect(() => {
    if (!mapsApiKey) return;

    const loadMap = () => {
      if (!mapRef.current || !panoRef.current) return;

      // ── Map ───────────────────────────────────────────────────────────────
      const map = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_LOCATION,
        zoom: 15,
        disableDefaultUI: false,
        styles: [
          { featureType: 'all',   elementType: 'geometry',   stylers: [{ color: '#0f172a' }] },
          { featureType: 'all',   elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
          { featureType: 'road',  elementType: 'geometry',   stylers: [{ color: '#1e3a5f' }] },
          { featureType: 'road',  elementType: 'geometry.stroke', stylers: [{ color: '#0f2744' }] },
          { featureType: 'water', elementType: 'geometry',   stylers: [{ color: '#0284c7' }] },
          { featureType: 'poi',   elementType: 'geometry',   stylers: [{ color: '#0f172a' }] },
          { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#071222' }] },
        ],
      });

      // Draggable marker — move it to analyze a different spot
      const marker = new window.google.maps.Marker({
        position: DEFAULT_LOCATION,
        map,
        title: 'Drag me to any location',
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#06b6d4',
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: '#ffffff',
        },
      });

      // ── Street View Panorama ───────────────────────────────────────────────
      const panorama = new window.google.maps.StreetViewPanorama(panoRef.current, {
        position: DEFAULT_LOCATION,
        pov: { heading: 34, pitch: 5 },
        zoom: 1,
        addressControl: true,
        fullscreenControl: true,
        motionTrackingControl: false,
      });

      map.setStreetView(panorama);

      // ── Sync location when panorama changes ────────────────────────────────
      const updateLocation = () => {
        const pos = panorama.getPosition();
        if (pos) {
          const newLoc = { lat: pos.lat(), lng: pos.lng() };
          currentLocationRef.current = newLoc;
          setCurrentCoords(newLoc);
          marker.setPosition(newLoc);
        }
      };

      panorama.addListener('position_changed', updateLocation);

      // Sync when marker is dragged
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLoc = { lat: pos.lat(), lng: pos.lng() };
          currentLocationRef.current = newLoc;
          setCurrentCoords(newLoc);
          panorama.setPosition(newLoc);
        }
      });

      // Click map to move marker
      map.addListener('click', (e: any) => {
        const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(newLoc);
        panorama.setPosition(newLoc);
        currentLocationRef.current = newLoc;
        setCurrentCoords(newLoc);
      });
    };

    // Load Maps JS SDK once
    if (window.google?.maps) {
      loadMap();
      return;
    }

    const existing = document.querySelector('script[data-gmaps="true"]');
    if (existing) {
      existing.addEventListener('load', loadMap, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.dataset.gmaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}`;
    script.async = true;
    script.onload = loadMap;
    document.body.appendChild(script);
  }, [mapsApiKey]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const riskStyle = result ? (RISK_COLORS[result.risk] ?? RISK_COLORS.UNKNOWN) : null;

  const riskLabel =
    result?.risk === 'HIGH'   ? 'High Flood Risk' :
    result?.risk === 'MEDIUM' ? 'Medium Risk' :
    result?.risk === 'LOW'    ? 'Low Risk' :
    result?.risk === 'UNKNOWN'? 'Analysis Failed' : '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full w-full bg-[#020617] text-white p-4 md:p-6 pb-12">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent mb-1 tracking-tight">
            FloodVision
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            AI-Powered Urban Flood Vulnerability — Mapusa, Goa
          </p>
        </div>

        {/* Live coords badge */}
        <div className="text-xs font-mono text-cyan-400/70 bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-3 py-2">
          <span className="mr-1 text-cyan-500">◉</span>
          {currentCoords.lat.toFixed(4)}°N, {currentCoords.lng.toFixed(4)}°E
        </div>
      </div>

      {/* ── MAP + STREET VIEW ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">

        {/* Map panel */}
        <div className="bg-white/5 border border-cyan-500/20 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
            <span className="text-cyan-400 text-sm">🗺</span>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
              Flood Risk Map — Mapusa
            </h2>
            <span className="ml-auto text-xs text-slate-500 font-mono">Click map or drag pin to change location</span>
          </div>
          <div ref={mapRef} className="h-[380px] md:h-[440px]" />
        </div>

        {/* Street View panel */}
        <div className="bg-white/5 border border-cyan-500/20 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
            <span className="text-cyan-400 text-sm">📷</span>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
              Street View — Live Camera
            </h2>
            <span className="ml-auto text-xs text-slate-500 font-mono">Pan to scan a street</span>
          </div>
          <div ref={panoRef} className="h-[380px] md:h-[440px]" />
        </div>

      </div>

      {/* ── ANALYZE BUTTON ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          id="analyze-btn"
          onClick={analyzeFloodRisk}
          disabled={loading}
          className={`
            relative px-8 py-4 rounded-xl text-base md:text-lg font-bold tracking-wide
            transition-all duration-200 flex items-center gap-3
            ${loading
              ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-400/60 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              AI Engine Running…
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104A8.25 8.25 0 1 0 20.896 14.25M15 3v6h6" />
              </svg>
              Analyze Flood Vulnerability
            </>
          )}
        </button>

        {result && !loading && (
          <div className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border
            ${riskStyle!.bg} ${riskStyle!.border} ${riskStyle!.text}
          `}>
            <span className="text-lg">{RISK_ICON[result.risk]}</span>
            {riskLabel} — Score: {result.score}/100
          </div>
        )}
      </div>

      {/* ── ERROR STATE ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <span className="text-red-400 text-xl mt-0.5">⚠</span>
          <div>
            <p className="text-red-300 font-semibold text-sm mb-0.5">Analysis Failed</p>
            <p className="text-red-400/80 text-xs font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* ── LOADING SKELETON ───────────────────────────────────────────────── */}
      {loading && (
        <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl animate-pulse">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-48 bg-white/10 rounded-lg" />
            <div className="ml-auto h-8 w-20 bg-white/10 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-24 bg-white/5 rounded-xl" />
              <div className="h-12 bg-white/5 rounded-xl" />
              <div className="h-12 bg-white/5 rounded-xl" />
              <div className="h-12 bg-white/5 rounded-xl" />
            </div>
            <div className="h-64 bg-white/5 rounded-xl" />
          </div>
          <p className="text-center text-cyan-400/60 text-sm mt-4 font-mono">
            ▶ Running YOLOv8 + OpenCV analysis on Street View image…
          </p>
        </div>
      )}

      {/* ── RESULT PANEL ──────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className={`
          bg-white/5 border rounded-2xl p-6 backdrop-blur-xl
          ${riskStyle!.border}
        `}>

          {/* Result header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-1">
                AI Flood Analysis
              </h2>
              <p className="text-slate-400 text-sm">
                Mapusa Urban Infrastructure Scan ·{' '}
                <span className="font-mono text-cyan-400/70">
                  {currentCoords.lat.toFixed(4)}°N {currentCoords.lng.toFixed(4)}°E
                </span>
              </p>
            </div>

            {/* Big score */}
            <div className="text-right">
              <div className={`text-6xl font-black leading-none ${riskStyle!.text}`}>
                {result.score}
                <span className="text-3xl text-slate-500">/100</span>
              </div>
              <div className={`text-sm font-bold mt-1 ${riskStyle!.text}`}>
                {RISK_ICON[result.risk]} {riskLabel}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
              <span>LOW</span><span>MEDIUM</span><span>HIGH</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  result.risk === 'HIGH'   ? 'bg-gradient-to-r from-amber-400 to-red-500' :
                  result.risk === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                             'bg-gradient-to-r from-emerald-400 to-cyan-500'
                }`}
                style={{ width: `${result.score}%` }}
              />
            </div>
            {/* Zone markers */}
            <div className="relative h-1 mt-1">
              <div className="absolute left-[30%] top-0 w-px h-3 bg-white/20" />
              <div className="absolute left-[60%] top-0 w-px h-3 bg-white/20" />
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT — Vulnerability card + reasons */}
            <div className="flex flex-col gap-4">

              {/* Vulnerability badge */}
              <div className={`
                rounded-xl p-5 border
                ${riskStyle!.bg} ${riskStyle!.border}
              `}>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1 font-mono">
                  Flood Vulnerability
                </p>
                <div className={`text-4xl font-black ${riskStyle!.text}`}>
                  {result.risk}
                </div>
                <p className="text-slate-400 text-xs mt-2">
                  Based on YOLOv8 urban object detection + OpenCV road analysis
                </p>
              </div>

              {/* Reasons list */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-mono">
                  Detection Factors
                </p>
                <div className="space-y-2">
                  {result.reasons.map((reason, i) => (
                    <div
                      key={i}
                      className={`
                        flex items-start gap-3 rounded-xl p-3 border text-sm
                        bg-white/[0.03] border-white/8 text-slate-300
                      `}
                    >
                      <span className={`mt-0.5 text-base shrink-0 ${riskStyle!.text}`}>
                        {i === 0 ? '◉' : '◈'}
                      </span>
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech stack badge */}
              <div className="flex flex-wrap gap-2 mt-auto">
                {['YOLOv8n', 'OpenCV 4.x', 'NumPy', 'Django REST'].map(tag => (
                  <span
                    key={tag}
                    className="text-xs font-mono px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400/70 border border-cyan-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT — processed image */}
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
                AI Flood Overlay — Processed Output
              </p>
              {result.processed_image ? (
                <div className={`rounded-xl overflow-hidden border ${riskStyle!.border} relative`}>
                  <img
                    src={`data:image/jpeg;base64,${result.processed_image}`}
                    alt="AI flood vulnerability overlay"
                    className="w-full object-cover"
                  />
                  {/* Overlay label */}
                  <div className="absolute top-2 left-2 text-[10px] font-mono bg-black/60 backdrop-blur-sm text-cyan-300 px-2 py-1 rounded-md">
                    FLOODVISION AI OVERLAY
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-500 text-sm">
                  No overlay image returned
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ── EMPTY STATE (before first analysis) ───────────────────────────── */}
      {!result && !loading && !error && (
        <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
          <div className="text-5xl mb-4">🌊</div>
          <p className="text-slate-400 font-medium mb-1">No analysis yet</p>
          <p className="text-slate-600 text-sm">
            Pan Street View to a road in Mapusa, then click{' '}
            <span className="text-cyan-400 font-semibold">Analyze Flood Vulnerability</span>
          </p>
        </div>
      )}

    </div>
  );
}