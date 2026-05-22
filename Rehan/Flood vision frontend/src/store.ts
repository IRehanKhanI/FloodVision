import { create } from "zustand";
import {
  SensorNode,
  TelemetryLog,
  AlertItem,
  SystemStats,
  ThemeVariant,
  OptimizerParam,
  FloodZone,
  WeatherCurrent,
  WeatherForecast,
  RouteResult,
  AIAnalysisResult,
  ApiSensorNode,
} from "./types";
import {
  fetchAlerts,
  fetchDashboardStats,
  fetchFloodZones,
  fetchLatestReadings,
  fetchCurrentWeather,
  fetchWeatherForecast,
  optimizeRoute,
} from "./api/endpoints";

interface AppState {
  currentView:
    | "landing"
    | "dashboard"
    | "route-sim"
    | "sensors"
    | "architect"
    | "ai-analysis"
    | "weather"
    | "alerts";
  activeTheme: "dark" | "light";
  activeLayout: ThemeVariant;
  sensorNodes: SensorNode[];
  selectedNodeId: string;
  telemetryLogs: TelemetryLog[];
  alerts: AlertItem[];
  systemStats: SystemStats;
  isSyncing: boolean;
  isBackendConnected: boolean;
  isLoadingBackend: boolean;
  floodZones: FloodZone[];
  weatherCurrent: WeatherCurrent | null;
  weatherForecast: WeatherForecast | null;
  routeResult: RouteResult | null;
  aiAnalyses: AIAnalysisResult[];

  // Optimizer view state
  startPoint: string;
  destination: string;
  maxDepthTolerance: number;
  optimizerParam: OptimizerParam;
  routeCalculated: boolean;
  isCalculatingRoute: boolean;
  routeViability: {
    duration: string;
    distance: string;
    maxDepthExposure: string;
    status: "optimal" | "hazardous" | "blocked";
  } | null;

  // AI analysis state
  aiRiskLevel: number;
  aiWaterIncrement: number;
  aiDrainStatus: "stable" | "blocked";
  isScanningAI: boolean;
  mobileSidebarOpen: boolean;
  activeToast: string | null;

  // Actions
  setView: (view: AppState["currentView"]) => void;
  setTheme: (theme: "dark" | "light") => void;
  setLayout: (layout: ThemeVariant) => void;
  setSelectedNodeId: (id: string) => void;
  toggleSync: () => void;
  addAlert: (alert: Omit<AlertItem, "id" | "timestamp" | "active">) => void;
  dismissAlert: (id: string) => void;
  dispatchMaintenance: (nodeId: string) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  showToast: (message: string | null) => void;
  setBackendConnected: (connected: boolean) => void;
  setRouteResult: (route: RouteResult | null) => void;
  addAiAnalysis: (analysis: AIAnalysisResult) => void;
  applySensorUpdate: (payload: {
    node_id: string;
    water_level_cm: number;
    temperature?: number | null;
    rssi?: number | null;
    timestamp?: string;
  }) => void;
  pushAlertFromSocket: (payload: {
    node_id?: string;
    name?: string;
    water_level_cm?: number;
    severity?: string;
  }) => void;

  // Backend sync actions
  refreshBackend: () => Promise<void>;
  refreshSensorsFromApi: () => Promise<void>;
  refreshAlertsFromApi: () => Promise<void>;
  refreshFloodZonesFromApi: () => Promise<void>;
  fetchWeatherFromApi: (lat: number, lng: number) => Promise<void>;
  fetchForecastFromApi: (lat: number, lng: number) => Promise<void>;

  // Input bindings
  setStartPoint: (point: string) => void;
  setDestination: (point: string) => void;
  setMaxDepthTolerance: (depth: number) => void;
  setOptimizerParam: (param: OptimizerParam) => void;
  calculateRoute: () => void;

  // Scanner actions
  rescanAI: () => void;
  setFocusArea: () => void;

  // Background tick callback
  tickSimulatedData: () => void;
}

const formatRelativeTime = (value?: string | null): string => {
  if (!value) return "unknown";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "unknown";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

const mapApiSensorNode = (
  api: ApiSensorNode,
  fallback?: SensorNode,
): SensorNode => {
  const latest = api.latest_reading;
  const waterLevel = latest?.water_level_cm ?? fallback?.waterLevel ?? 0;
  const status =
    waterLevel >= 100 ? "critical" : waterLevel >= 60 ? "warning" : "stable";

  return {
    id: api.node_id,
    name: api.name || fallback?.name || api.node_id,
    location: api.location || fallback?.location || "Unknown location",
    waterLevel,
    trend:
      fallback?.trend ??
      (latest?.flow_rate && latest.flow_rate > 0 ? "rising" : "stable"),
    rate: latest?.flow_rate ?? fallback?.rate ?? 0,
    status,
    lastSeen: formatRelativeTime(
      api.last_seen || latest?.timestamp || undefined,
    ),
    cpuTemp: fallback?.cpuTemp ?? 0,
    heapUsage: fallback?.heapUsage ?? "N/A",
    uptime: fallback?.uptime ?? "N/A",
    lat: api.lat,
    lng: api.lng,
    latitude: fallback?.latitude,
    longitude: fallback?.longitude,
  };
};

const parseLatLng = (value: string): { lat: number; lng: number } | null => {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

// Initial Sensor Nodes Matching standard screenshots perfectly
const INITIAL_SENSORS: SensorNode[] = [
  {
    id: "SN-402",
    name: "ESP32-Δ-492",
    location: "Main St. Underpass",
    waterLevel: 145, // cm
    trend: "rising",
    rate: 5, // cm/hr
    status: "critical",
    lastSeen: "0.4s ago",
    cpuTemp: 32.4,
    heapUsage: "82KB / 320KB",
    uptime: "14d 08h 12m",
    lat: 19.033,
    lng: 72.8438,
  },
  {
    id: "SN-219",
    name: "ESP32-Δ-481",
    location: "River Embankment",
    waterLevel: 82,
    trend: "rising",
    rate: 2,
    status: "warning",
    lastSeen: "2.1s ago",
    cpuTemp: 31.1,
    heapUsage: "94KB / 320KB",
    uptime: "28d 14h 45m",
    lat: 19.0895,
    lng: 72.8656,
  },
  {
    id: "SN-105",
    name: "ESP32-Ω-002",
    location: "Westside Drain",
    waterLevel: 12,
    trend: "stable",
    rate: 0,
    status: "stable",
    lastSeen: "1.8s ago",
    cpuTemp: 35.8,
    heapUsage: "78KB / 320KB",
    uptime: "5d 02h 19m",
    lat: 19.1136,
    lng: 72.8697,
  },
  {
    id: "SN-490",
    name: "ESP32-Δ-490",
    location: "North Sector Delta-9",
    waterLevel: 56,
    trend: "falling",
    rate: -1,
    status: "info",
    lastSeen: "0.8s ago",
    cpuTemp: 33.2,
    heapUsage: "81KB / 320KB",
    uptime: "42d 11h 06m",
    lat: 19.0596,
    lng: 72.8295,
  },
];

const INITIAL_TELEM: TelemetryLog[] = [
  {
    id: "1",
    timestamp: "00:43:51.584",
    nodeName: "ESP32-Δ-492",
    waterLevel: 1.44,
    rssi: -62,
    temp: 32.2,
    status: "SYNC_OK",
    message: "",
  },
  {
    id: "2",
    timestamp: "14:22:01.442",
    nodeName: "ESP32-Δ-492",
    waterLevel: 1.24,
    flowRate: 0.12,
    rssi: -64,
    temp: 32.4,
    status: "NORMAL",
  },
  {
    id: "3",
    timestamp: "14:22:02.118",
    nodeName: "ESP32-Δ-481",
    waterLevel: 0.88,
    flowRate: 0.08,
    rssi: -72,
    temp: 31.1,
    status: "NORMAL",
  },
  {
    id: "4",
    timestamp: "14:22:02.503",
    nodeName: "ESP32-Ω-002",
    waterLevel: 0.12,
    rssi: -94,
    temp: 35.8,
    status: "WARNING",
    message: "SIGNAL_LOSS_WARNING",
  },
  {
    id: "5",
    timestamp: "14:22:03.921",
    nodeName: "ESP32-Δ-490",
    waterLevel: 1.45,
    flowRate: 0.15,
    rssi: -58,
    temp: 33.2,
    status: "NORMAL",
  },
];

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "a1",
    station: "Sensor Station 04",
    message:
      "High Level Detected. Rate of change exceeds safety threshold by 15%.",
    timestamp: "Just now",
    severity: "critical",
    active: true,
  },
  {
    id: "a2",
    station: "Node 12 (Uplink)",
    message:
      "Intermittent connection lost. Attempting automated reboot sequence.",
    timestamp: "12m ago",
    severity: "warning",
    active: true,
  },
  {
    id: "a3",
    station: "System Auto-Scale",
    message:
      "Predictive model allocated additional compute resources for incoming storm cell data.",
    timestamp: "1h ago",
    severity: "info",
    active: true,
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  currentView: "landing",
  activeTheme: "dark",
  activeLayout: ThemeVariant.GLASSMORPHISM,
  sensorNodes: INITIAL_SENSORS,
  selectedNodeId: "SN-402",
  telemetryLogs: INITIAL_TELEM,
  alerts: INITIAL_ALERTS,
  systemStats: {
    totalSensors: 2481,
    activeNodes: 2476,
    offlineCount: 5,
    latencyMs: 14,
  },
  isSyncing: true,
  isBackendConnected: false,
  isLoadingBackend: false,
  floodZones: [],
  weatherCurrent: null,
  weatherForecast: null,
  routeResult: null,
  aiAnalyses: [],

  startPoint: "19.0330, 72.8438",
  destination: "",
  maxDepthTolerance: 0.5,
  optimizerParam: OptimizerParam.LOWEST_RISK,
  routeCalculated: false,
  isCalculatingRoute: false,
  routeViability: null,

  aiRiskLevel: 78,
  aiWaterIncrement: 12,
  aiDrainStatus: "blocked",
  isScanningAI: false,
  mobileSidebarOpen: false,
  activeToast: null,

  setView: (view) => set({ currentView: view, mobileSidebarOpen: false }),
  setTheme: (theme) => set({ activeTheme: theme }),
  setLayout: (layout) => set({ activeLayout: layout }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  toggleSync: () => set((state) => ({ isSyncing: !state.isSyncing })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  showToast: (message) => {
    set({ activeToast: message });
    if (message) {
      setTimeout(() => {
        if (get().activeToast === message) {
          set({ activeToast: null });
        }
      }, 5000);
    }
  },
  setBackendConnected: (connected) => set({ isBackendConnected: connected }),
  setRouteResult: (route) => set({ routeResult: route }),
  addAiAnalysis: (analysis) =>
    set((state) => ({
      aiAnalyses: [analysis, ...state.aiAnalyses].slice(0, 20),
    })),
  applySensorUpdate: (payload) => {
    set((state) => {
      const updatedSensors = state.sensorNodes.map((sensor) => {
        if (sensor.id !== payload.node_id) return sensor;
        const waterLevel = payload.water_level_cm ?? sensor.waterLevel;
        const status =
          waterLevel >= 100
            ? "critical"
            : waterLevel >= 60
              ? "warning"
              : "stable";
        return {
          ...sensor,
          waterLevel,
          status,
          lastSeen: payload.timestamp
            ? formatRelativeTime(payload.timestamp)
            : sensor.lastSeen,
        };
      });

      const node = state.sensorNodes.find((s) => s.id === payload.node_id);
      const log: TelemetryLog = {
        id: `telem-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        nodeName: node?.name || payload.node_id,
        waterLevel: payload.water_level_cm / 100,
        rssi: payload.rssi ?? -60,
        temp: payload.temperature ?? 0,
        status: "LIVE",
      };

      return {
        sensorNodes: updatedSensors,
        telemetryLogs: [log, ...state.telemetryLogs].slice(0, 30),
      };
    });
  },
  pushAlertFromSocket: (payload) => {
    const severity = (payload.severity as AlertItem["severity"]) || "warning";
    const station = payload.name || payload.node_id || "Sensor Alert";
    const message = payload.water_level_cm
      ? `${station} reports ${payload.water_level_cm}cm water level.`
      : `${station} triggered a flood alert.`;

    get().addAlert({
      station,
      message,
      severity,
    });
  },

  refreshBackend: async () => {
    set({ isLoadingBackend: true });
    try {
      const [sensors, alerts, stats, zones] = await Promise.all([
        fetchLatestReadings(),
        fetchAlerts(),
        fetchDashboardStats(),
        fetchFloodZones(),
      ]);

      set((state) => {
        const mappedSensors = sensors.map((sensor) =>
          mapApiSensorNode(
            sensor,
            state.sensorNodes.find((s) => s.id === sensor.node_id),
          ),
        );
        return {
          sensorNodes: mappedSensors,
          alerts,
          systemStats: {
            totalSensors: stats.totalSensors,
            activeNodes: stats.activeNodes,
            offlineCount: Math.max(0, stats.totalSensors - stats.activeNodes),
            latencyMs: state.systemStats.latencyMs,
          },
          floodZones: zones,
          isBackendConnected: true,
        };
      });
    } catch {
      set({ isBackendConnected: false });
    } finally {
      set({ isLoadingBackend: false });
    }
  },

  refreshSensorsFromApi: async () => {
    try {
      const sensors = await fetchLatestReadings();
      set((state) => ({
        sensorNodes: sensors.map((sensor) =>
          mapApiSensorNode(
            sensor,
            state.sensorNodes.find((s) => s.id === sensor.node_id),
          ),
        ),
        isBackendConnected: true,
      }));
    } catch {
      set({ isBackendConnected: false });
    }
  },

  refreshAlertsFromApi: async () => {
    try {
      const alerts = await fetchAlerts();
      set({ alerts, isBackendConnected: true });
    } catch {
      set({ isBackendConnected: false });
    }
  },

  refreshFloodZonesFromApi: async () => {
    try {
      const zones = await fetchFloodZones();
      set({ floodZones: zones, isBackendConnected: true });
    } catch {
      set({ isBackendConnected: false });
    }
  },

  fetchWeatherFromApi: async (lat, lng) => {
    try {
      const data = await fetchCurrentWeather(lat, lng);
      set({ weatherCurrent: data, isBackendConnected: true });
    } catch {
      set({ isBackendConnected: false });
    }
  },

  fetchForecastFromApi: async (lat, lng) => {
    try {
      const data = await fetchWeatherForecast(lat, lng);
      set({ weatherForecast: data, isBackendConnected: true });
    } catch {
      set({ isBackendConnected: false });
    }
  },

  addAlert: (alert) => {
    const newAlert: AlertItem = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: "Just now",
      active: true,
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts],
      systemStats: {
        ...state.systemStats,
        offlineCount:
          alert.severity === "critical"
            ? state.systemStats.offlineCount + 1
            : state.systemStats.offlineCount,
      },
    }));
  },

  dismissAlert: (id) => {
    set((state) => {
      const alert = state.alerts.find((a) => a.id === id);
      const isCritical = alert?.severity === "critical";
      return {
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, active: false } : a,
        ),
        systemStats: {
          ...state.systemStats,
          offlineCount: isCritical
            ? Math.max(0, state.systemStats.offlineCount - 1)
            : state.systemStats.offlineCount,
        },
      };
    });
  },

  dispatchMaintenance: (nodeId) => {
    const nodeName =
      get().sensorNodes.find((n) => n.id === nodeId)?.name || nodeId;
    const now = new Date();
    const ts = now.toLocaleTimeString();

    const newTelem: TelemetryLog = {
      id: `telem-${Date.now()}`,
      timestamp: ts,
      nodeName: nodeName,
      waterLevel: 0,
      rssi: -50,
      temp: 28.5,
      status: "MAINTENANCE",
      message: `AI DISPATCH: Maintenance unit dispatched to ${nodeName}`,
    };

    set((state) => ({
      telemetryLogs: [newTelem, ...state.telemetryLogs],
      sensorNodes: state.sensorNodes.map((sensor) =>
        sensor.id === nodeId
          ? { ...sensor, status: "info", rate: 0, trend: "stable" }
          : sensor,
      ),
    }));
  },

  setStartPoint: (point) => set({ startPoint: point }),
  setDestination: (point) => set({ destination: point }),
  setMaxDepthTolerance: (depth) => set({ maxDepthTolerance: depth }),
  setOptimizerParam: (param) => set({ optimizerParam: param }),

  calculateRoute: () => {
    set({ isCalculatingRoute: true, routeCalculated: false });

    const start = parseLatLng(get().startPoint);
    const end = parseLatLng(get().destination);

    if (start && end) {
      const optimization =
        get().optimizerParam === OptimizerParam.LOWEST_RISK
          ? "lowest_risk"
          : "shortest_path";
      optimizeRoute({
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: end.lat,
        end_lng: end.lng,
        optimization_param: optimization,
        max_depth_tolerance: get().maxDepthTolerance,
      })
        .then((route) => {
          const status = route.overall_status;
          set({
            isCalculatingRoute: false,
            routeCalculated: true,
            routeResult: route,
            routeViability: {
              duration: route.estimated_duration,
              distance: `${route.total_distance_km} km`,
              maxDepthExposure: `${route.max_flood_exposure} cm`,
              status,
            },
          });

          if (status !== "optimal") {
            get().addAlert({
              station: "Route Optimizer",
              message: `Route status is ${status}. Consider alternate paths if available.`,
              severity: status === "blocked" ? "critical" : "warning",
            });
          }
        })
        .catch(() => {
          set({ isCalculatingRoute: false });
        });
      return;
    }

    setTimeout(() => {
      const isLowestRisk = get().optimizerParam === OptimizerParam.LOWEST_RISK;
      set({
        isCalculatingRoute: false,
        routeCalculated: true,
        routeResult: null,
        routeViability: {
          duration: isLowestRisk ? "42 min" : "28 min",
          distance: isLowestRisk ? "18.4 km" : "15.1 km",
          maxDepthExposure: isLowestRisk ? "0.3m" : "0.8m",
          status: isLowestRisk ? "optimal" : "hazardous",
        },
      });

      if (!isLowestRisk) {
        get().addAlert({
          station: "Route Sim Warning",
          message:
            "Selected path exposes vehicle to 0.8m standing water level inside River delta.",
          severity: "warning",
        });
      }
    }, 1500);
  },

  rescanAI: () => {
    set({ isScanningAI: true });
    setTimeout(() => {
      const isNowStable = Math.random() > 0.6;
      set({
        isScanningAI: false,
        aiRiskLevel: isNowStable ? 42 : Math.floor(65 + Math.random() * 25),
        aiWaterIncrement: isNowStable ? 4 : Math.floor(8 + Math.random() * 8),
        aiDrainStatus: isNowStable ? "stable" : "blocked",
      });

      set((state) => ({
        sensorNodes: state.sensorNodes.map((s) =>
          s.id === "SN-402"
            ? {
                ...s,
                waterLevel: isNowStable ? 62 : 145,
                status: isNowStable ? "stable" : "critical",
                rate: isNowStable ? 0 : 5,
                trend: isNowStable ? "stable" : "rising",
              }
            : s,
        ),
      }));
    }, 1800);
  },

  setFocusArea: () => {
    set((state) => ({
      aiWaterIncrement: Math.max(2, state.aiWaterIncrement - 5),
    }));
  },

  tickSimulatedData: () => {
    if (!get().isSyncing || get().isBackendConnected) return;

    set((state) => {
      const updatedNodes = state.sensorNodes.map((sensor) => {
        if (sensor.status === "stable" && Math.random() > 0.8) {
          const change = Math.random() > 0.5 ? 1 : -1;
          return {
            ...sensor,
            waterLevel: Math.max(5, sensor.waterLevel + change),
          };
        }
        if (sensor.status === "critical") {
          const change = Math.random() > 0.6 ? 1 : 0;
          return { ...sensor, waterLevel: sensor.waterLevel + change };
        }
        if (sensor.status === "warning") {
          const change = Math.random() > 0.7 ? 1 : -1;
          return {
            ...sensor,
            waterLevel: Math.max(40, sensor.waterLevel + change),
          };
        }
        return sensor;
      });

      const randomNode =
        state.sensorNodes[Math.floor(Math.random() * state.sensorNodes.length)];
      const ts = new Date().toLocaleTimeString();
      const statusLabel = Math.random() > 0.85 ? "SYNC_OK" : "NORMAL";

      const newTelem: TelemetryLog = {
        id: `telem-${Date.now()}`,
        timestamp: ts,
        nodeName: randomNode.name,
        waterLevel: parseFloat((randomNode.waterLevel / 100).toFixed(2)),
        rssi: -50 - Math.floor(Math.random() * 30),
        temp: parseFloat((30 + Math.random() * 5).toFixed(1)),
        status: statusLabel,
        flowRate: randomNode.trend === "rising" ? 0.15 : 0.05,
      };

      const updatedLogs = [newTelem, ...state.telemetryLogs].slice(0, 30);

      return {
        sensorNodes: updatedNodes,
        telemetryLogs: updatedLogs,
        systemStats: {
          ...state.systemStats,
          latencyMs: 10 + Math.floor(Math.random() * 10),
        },
      };
    });
  },
}));
