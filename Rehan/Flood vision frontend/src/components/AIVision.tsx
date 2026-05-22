import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";
import type { AIAnalysisResult } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  MapPin,
  Brain,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Droplets,
  CircleAlert,
  Mountain,
  Lightbulb,
  Loader2,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  X,
  Trash2,
} from "lucide-react";
import {
  analyzeImage,
  analyzeCoordinates,
  fetchAiAnalyses,
} from "../api/endpoints";

// ─── Mock Data Generator ──────────────────────────────────────
function generateMockAnalysis(): AIAnalysisResult {
  const risk = Math.floor(Math.random() * 100);
  const conditions = ["Good", "Fair", "Degraded", "Poor", "Critical"];
  const drainStatuses = [
    "Clear",
    "Partially Blocked",
    "Blocked",
    "Overflowing",
  ];
  const elevationRisks = [
    "Low - Above flood plain",
    "Moderate - Near water table",
    "High - Below flood level",
    "Critical - In flood zone",
  ];

  return {
    id: Date.now(),
    risk_percentage: risk,
    road_condition: conditions[Math.floor(Math.random() * conditions.length)],
    drain_status:
      drainStatuses[Math.floor(Math.random() * drainStatuses.length)],
    pothole_count: Math.floor(Math.random() * 15),
    elevation_risk:
      elevationRisks[Math.floor(Math.random() * elevationRisks.length)],
    analysis_text: `AI detected ${risk > 60 ? "significant" : risk > 30 ? "moderate" : "minimal"} flood risk indicators in this area. ${
      risk > 60
        ? "Water accumulation patterns, compromised drainage infrastructure, and low elevation contribute to high vulnerability. Immediate action recommended."
        : risk > 30
          ? "Some drainage issues and moderate water levels detected. Monitoring recommended with periodic reassessment."
          : "Infrastructure appears adequate. Drainage systems operational. Continued monitoring advised as standard protocol."
    }`,
    recommendations: [
      risk > 60
        ? "Deploy emergency flood barriers immediately"
        : "Continue standard monitoring",
      risk > 40
        ? "Clear drainage infrastructure within 24 hours"
        : "Schedule routine drainage inspection",
      risk > 50
        ? "Alert nearby residents and prepare evacuation routes"
        : "No immediate civilian alerts needed",
      "Update sensor calibration for this zone",
      risk > 70
        ? "Request municipal engineering assessment"
        : "Log findings for quarterly review",
    ].slice(0, 3 + Math.floor(Math.random() * 3)),
    created_at: new Date().toISOString(),
  };
}

// ─── Risk Color Helper ────────────────────────────────────────
function riskColor(pct: number) {
  if (pct >= 70)
    return {
      text: "text-[#ff453a]",
      bg: "bg-[#ff453a]",
      border: "border-[#ff453a]",
      label: "Critical",
      glow: "rgba(255,69,58,0.4)",
    };
  if (pct >= 40)
    return {
      text: "text-[#ffd60a]",
      bg: "bg-[#ffd60a]",
      border: "border-[#ffd60a]",
      label: "Warning",
      glow: "rgba(255,214,10,0.4)",
    };
  return {
    text: "text-[#47e266]",
    bg: "bg-[#47e266]",
    border: "border-[#47e266]",
    label: "Safe",
    glow: "rgba(71,226,102,0.4)",
  };
}

export default function AIAnalysisView() {
  const { activeLayout, activeTheme, addAiAnalysis } = useAppStore();
  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? "glass-panel" : "neu-extrude";
  const isDark = activeTheme === "dark";

  // ─── State ──────────────────────────────────────────────────
  const [mode, setMode] = useState<"image" | "coordinates">("image");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AIAnalysisResult[]>(
    [],
  );
  useEffect(() => {
    fetchAiAnalyses()
      .then((data) => setAnalysisHistory(data))
      .catch(() => undefined);
  }, []);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [animatedRisk, setAnimatedRisk] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File Handling ──────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const clearUpload = useCallback(() => {
    setUploadedImage(null);
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ─── Animated Gauge ─────────────────────────────────────────
  const animateGauge = useCallback((targetVal: number) => {
    setAnimatedRisk(0);
    let current = 0;
    const step = targetVal / 40;
    const interval = setInterval(() => {
      current += step;
      if (current >= targetVal) {
        setAnimatedRisk(targetVal);
        clearInterval(interval);
      } else {
        setAnimatedRisk(Math.round(current));
      }
    }, 25);
  }, []);

  // ─── Analysis Handler ───────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      let analysis: AIAnalysisResult;

      if (mode === "image" && uploadedFile) {
        const formData = new FormData();
        formData.append("image", uploadedFile);
        analysis = await analyzeImage(formData);
      } else if (mode === "coordinates" && lat && lng) {
        analysis = await analyzeCoordinates(parseFloat(lat), parseFloat(lng));
      } else {
        throw new Error("No input");
      }

      setResult(analysis);
      animateGauge(analysis.risk_percentage);
      setAnalysisHistory((prev) => [analysis, ...prev].slice(0, 10));
      addAiAnalysis(analysis);
    } catch {
      // Fallback to mock data when backend is offline
      const mockResult = generateMockAnalysis();
      setResult(mockResult);
      animateGauge(mockResult.risk_percentage);
      setAnalysisHistory((prev) => [mockResult, ...prev].slice(0, 10));
    } finally {
      setIsAnalyzing(false);
    }
  }, [mode, uploadedFile, lat, lng, animateGauge]);

  const canAnalyze = mode === "image" ? !!uploadedFile : !!(lat && lng);

  // ─── SVG Gauge Helpers ──────────────────────────────────────
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset =
    gaugeCircumference - (animatedRisk / 100) * gaugeCircumference;
  const colors = result ? riskColor(result.risk_percentage) : riskColor(0);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-on-surface)] flex items-center gap-3">
            <Brain className="h-7 w-7 text-[var(--color-primary)]" />
            AI Flood Risk Analysis
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
            Upload street imagery or enter coordinates for real-time AI-powered
            flood vulnerability assessment.
          </p>
        </div>
        <span className="text-[10px] font-mono bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-3 py-1 rounded-full self-start sm:self-auto uppercase tracking-widest">
          Gemini Vision Model
        </span>
      </div>

      {/* ─── Two-Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── LEFT: Input Panel ─────────────────────────────────── */}
        <div className={`${panelStyle} rounded-2xl p-5 sm:p-6 space-y-5`}>
          <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--color-primary)]" />
            Analysis Input
          </h3>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            {[
              { key: "image" as const, label: "Image Upload", icon: ImageIcon },
              {
                key: "coordinates" as const,
                label: "Coordinates",
                icon: MapPin,
              },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all border cursor-pointer ${
                  mode === m.key
                    ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30 text-[var(--color-primary)]"
                    : `border-white/10 text-[var(--color-on-surface-variant)] hover:bg-white/5`
                }`}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Image Upload */}
          <AnimatePresence mode="wait">
            {mode === "image" && (
              <motion.div
                key="image-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {uploadedImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                    <img
                      src={uploadedImage}
                      alt="Uploaded preview"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <button
                      onClick={clearUpload}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[#47e266]" />
                      <span className="text-[10px] font-mono text-white/90">
                        {uploadedFile?.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                      isDragging
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.02]"
                        : `border-white/20 hover:border-[var(--color-primary)]/40 ${isDark ? "bg-white/[0.02]" : "bg-black/[0.02]"}`
                    }`}
                  >
                    <Upload
                      className={`h-8 w-8 ${isDragging ? "text-[var(--color-primary)]" : "text-[var(--color-outline)]"}`}
                    />
                    <div className="text-center">
                      <p className="text-sm text-[var(--color-on-surface-variant)] font-medium">
                        {isDragging
                          ? "Drop image here"
                          : "Drag & drop street image"}
                      </p>
                      <p className="text-[10px] text-[var(--color-outline)] mt-0.5">
                        JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFile(e.target.files[0])
                  }
                />
              </motion.div>
            )}

            {mode === "coordinates" && (
              <motion.div
                key="coord-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[10px] font-mono text-[var(--color-outline)] uppercase tracking-wider block mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 28.6139"
                    className={`w-full px-4 py-3 rounded-xl text-sm font-mono border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
                        : "bg-black/5 border-black/10 text-black placeholder:text-black/30 focus:border-[var(--color-primary)]/50"
                    } outline-none`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[var(--color-outline)] uppercase tracking-wider block mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="e.g. 77.2090"
                    className={`w-full px-4 py-3 rounded-xl text-sm font-mono border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[var(--color-primary)]/50"
                        : "bg-black/5 border-black/10 text-black placeholder:text-black/30 focus:border-[var(--color-primary)]/50"
                    } outline-none`}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              canAnalyze && !isAnalyzing
                ? "bg-gradient-to-r from-[var(--color-primary-container)] to-[var(--color-primary)] text-black hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[var(--color-primary)]/20"
                : `${isDark ? "bg-white/10 text-white/30" : "bg-black/10 text-black/30"} cursor-not-allowed`
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Run AI Analysis
              </>
            )}
          </button>
        </div>

        {/* ─── RIGHT: Results Panel ────────────────────────────── */}
        <div className={`${panelStyle} rounded-2xl p-5 sm:p-6 space-y-5`}>
          <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#47e266]" />
            Analysis Results
          </h3>

          {result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              {/* Risk Gauge */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <svg
                    width="180"
                    height="180"
                    viewBox="0 0 180 180"
                    className="transform -rotate-90"
                  >
                    {/* Background circle */}
                    <circle
                      cx="90"
                      cy="90"
                      r={gaugeRadius}
                      fill="none"
                      stroke={
                        isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                      }
                      strokeWidth="10"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="90"
                      cy="90"
                      r={gaugeRadius}
                      fill="none"
                      stroke={riskColor(animatedRisk)
                        .bg.replace("bg-[", "")
                        .replace("]", "")}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeOffset}
                      style={{
                        transition: "stroke-dashoffset 0.1s linear",
                        filter: `drop-shadow(0 0 8px ${riskColor(animatedRisk).glow})`,
                      }}
                    />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-4xl font-bold font-mono ${colors.text}`}
                    >
                      {animatedRisk}%
                    </span>
                    <span
                      className={`text-xs font-semibold ${colors.text} uppercase tracking-wider mt-0.5`}
                    >
                      {colors.label}
                    </span>
                  </div>
                </div>

                {/* Risk Badge */}
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-bold ${colors.bg} ${
                    result.risk_percentage >= 40 ? "text-black" : "text-black"
                  } flex items-center gap-1.5`}
                >
                  {result.risk_percentage >= 70 ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {colors.label} Risk Level
                </span>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: MapPin,
                    label: "Road Condition",
                    value: result.road_condition,
                  },
                  {
                    icon: Droplets,
                    label: "Drain Status",
                    value: result.drain_status,
                  },
                  {
                    icon: CircleAlert,
                    label: "Potholes",
                    value: `${result.pothole_count} detected`,
                  },
                  {
                    icon: Mountain,
                    label: "Elevation Risk",
                    value: result.elevation_risk,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className={`p-3 rounded-xl border transition-colors ${
                      isDark
                        ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                        : "bg-black/[0.03] border-black/10 hover:bg-black/[0.06]"
                    }`}
                  >
                    <card.icon className="h-4 w-4 text-[var(--color-primary)] mb-1.5" />
                    <p className="text-[9px] font-mono text-[var(--color-outline)] uppercase tracking-wider">
                      {card.label}
                    </p>
                    <p className="text-xs font-semibold text-[var(--color-on-surface)] mt-0.5 leading-tight">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Analysis Text */}
              <div
                className={`p-4 rounded-xl border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-black/[0.02] border-black/10"}`}
              >
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                  {result.analysis_text}
                </p>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-xs font-mono text-[var(--color-outline)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-[#ffd60a]" />
                  Recommendations
                </h4>
                <ul className="space-y-1.5">
                  {result.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]"
                    >
                      <span className="text-[var(--color-primary)] font-mono text-[10px] mt-0.5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div
                className={`p-6 rounded-full ${isDark ? "bg-white/[0.03]" : "bg-black/[0.03]"}`}
              >
                <Brain className="h-12 w-12 text-[var(--color-outline)]" />
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  No analysis results yet
                </p>
                <p className="text-[10px] text-[var(--color-outline)] mt-1">
                  Upload an image or enter coordinates to begin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Analysis History ──────────────────────────────────── */}
      {analysisHistory.length > 0 && (
        <div className={`${panelStyle} rounded-2xl p-5 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-primary)]" />
              Analysis History
            </h3>
            <button
              onClick={() => setAnalysisHistory([])}
              className="text-[10px] font-mono text-[var(--color-outline)] hover:text-[#ff453a] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  className={`border-b ${isDark ? "border-white/10" : "border-black/10"}`}
                >
                  {["#", "Risk", "Road", "Drains", "Potholes", "Time"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-[9px] font-mono text-[var(--color-outline)] uppercase tracking-wider py-2 px-2"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {analysisHistory.map((item, idx) => {
                  const c = riskColor(item.risk_percentage);
                  return (
                    <tr
                      key={item.id || idx}
                      className={`border-b cursor-pointer transition-colors ${isDark ? "border-white/5 hover:bg-white/[0.03]" : "border-black/5 hover:bg-black/[0.03]"}`}
                      onClick={() => {
                        setResult(item);
                        animateGauge(item.risk_percentage);
                      }}
                    >
                      <td className="text-[10px] font-mono text-[var(--color-outline)] py-2.5 px-2">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`text-xs font-bold font-mono ${c.text}`}
                        >
                          {item.risk_percentage}%
                        </span>
                      </td>
                      <td className="text-xs text-[var(--color-on-surface-variant)] py-2.5 px-2">
                        {item.road_condition}
                      </td>
                      <td className="text-xs text-[var(--color-on-surface-variant)] py-2.5 px-2">
                        {item.drain_status}
                      </td>
                      <td className="text-xs text-[var(--color-on-surface-variant)] py-2.5 px-2">
                        {item.pothole_count}
                      </td>
                      <td className="text-[10px] font-mono text-[var(--color-outline)] py-2.5 px-2">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
