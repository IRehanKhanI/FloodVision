import { create } from 'zustand';
import { SensorNode, TelemetryLog, AlertItem, SystemStats, ThemeVariant, OptimizerParam } from './types';

interface AppState {
  currentView: 'landing' | 'dashboard' | 'route-sim' | 'sensors' | 'architect' | 'ai-analysis';
  activeTheme: 'dark' | 'light';
  activeLayout: ThemeVariant;
  sensorNodes: SensorNode[];
  selectedNodeId: string;
  telemetryLogs: TelemetryLog[];
  alerts: AlertItem[];
  systemStats: SystemStats;
  isSyncing: boolean;
  
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
    status: 'optimal' | 'hazardous' | 'blocked';
  } | null;

  // AI analysis state
  aiRiskLevel: number;
  aiWaterIncrement: number;
  aiDrainStatus: 'stable' | 'blocked';
  isScanningAI: boolean;
  mobileSidebarOpen: boolean;
  activeToast: string | null;

  // Actions
  setView: (view: 'landing' | 'dashboard' | 'route-sim' | 'sensors' | 'architect' | 'ai-analysis') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLayout: (layout: ThemeVariant) => void;
  setSelectedNodeId: (id: string) => void;
  toggleSync: () => void;
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp' | 'active'>) => void;
  dismissAlert: (id: string) => void;
  dispatchMaintenance: (nodeId: string) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  showToast: (message: string | null) => void;

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

// Initial Sensor Nodes Matching standard screenshots perfectly
const INITIAL_SENSORS: SensorNode[] = [
  {
    id: 'SN-402',
    name: 'ESP32-Δ-492',
    location: 'Main St. Underpass',
    waterLevel: 145, // cm
    trend: 'rising',
    rate: 5, // cm/hr
    status: 'critical',
    lastSeen: '0.4s ago',
    cpuTemp: 32.4,
    heapUsage: '82KB / 320KB',
    uptime: '14d 08h 12m',
    latitude: 48,
    longitude: 58,
  },
  {
    id: 'SN-219',
    name: 'ESP32-Δ-481',
    location: 'River Embankment',
    waterLevel: 82,
    trend: 'rising',
    rate: 2,
    status: 'warning',
    lastSeen: '2.1s ago',
    cpuTemp: 31.1,
    heapUsage: '94KB / 320KB',
    uptime: '28d 14h 45m',
    latitude: 65,
    longitude: 72,
  },
  {
    id: 'SN-105',
    name: 'ESP32-Ω-002',
    location: 'Westside Drain',
    waterLevel: 12,
    trend: 'stable',
    rate: 0,
    status: 'stable',
    lastSeen: '1.8s ago',
    cpuTemp: 35.8,
    heapUsage: '78KB / 320KB',
    uptime: '5d 02h 19m',
    latitude: 35,
    longitude: 42,
  },
  {
    id: 'SN-490',
    name: 'ESP32-Δ-490',
    location: 'North Sector Delta-9',
    waterLevel: 56,
    trend: 'falling',
    rate: -1,
    status: 'info',
    lastSeen: '0.8s ago',
    cpuTemp: 33.2,
    heapUsage: '81KB / 320KB',
    uptime: '42d 11h 06m',
    latitude: 22,
    longitude: 25,
  }
];

const INITIAL_TELEM: TelemetryLog[] = [
  {
    id: '1',
    timestamp: '00:43:51.584',
    nodeName: 'ESP32-Δ-492',
    waterLevel: 1.44,
    rssi: -62,
    temp: 32.2,
    status: 'SYNC_OK',
    message: ''
  },
  {
    id: '2',
    timestamp: '14:22:01.442',
    nodeName: 'ESP32-Δ-492',
    waterLevel: 1.24,
    flowRate: 0.12,
    rssi: -64,
    temp: 32.4,
    status: 'NORMAL',
  },
  {
    id: '3',
    timestamp: '14:22:02.118',
    nodeName: 'ESP32-Δ-481',
    waterLevel: 0.88,
    flowRate: 0.08,
    rssi: -72,
    temp: 31.1,
    status: 'NORMAL'
  },
  {
    id: '4',
    timestamp: '14:22:02.503',
    nodeName: 'ESP32-Ω-002',
    waterLevel: 0.12,
    rssi: -94,
    temp: 35.8,
    status: 'WARNING',
    message: 'SIGNAL_LOSS_WARNING'
  },
  {
    id: '5',
    timestamp: '14:22:03.921',
    nodeName: 'ESP32-Δ-490',
    waterLevel: 1.45,
    flowRate: 0.15,
    rssi: -58,
    temp: 33.2,
    status: 'NORMAL'
  }
];

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'a1',
    station: 'Sensor Station 04',
    message: 'High Level Detected. Rate of change exceeds safety threshold by 15%.',
    timestamp: 'Just now',
    severity: 'critical',
    active: true
  },
  {
    id: 'a2',
    station: 'Node 12 (Uplink)',
    message: 'Intermittent connection lost. Attempting automated reboot sequence.',
    timestamp: '12m ago',
    severity: 'warning',
    active: true
  },
  {
    id: 'a3',
    station: 'System Auto-Scale',
    message: 'Predictive model allocated additional compute resources for incoming storm cell data.',
    timestamp: '1h ago',
    severity: 'info',
    active: true
  }
];

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'landing',
  activeTheme: 'dark',
  activeLayout: ThemeVariant.GLASSMORPHISM,
  sensorNodes: INITIAL_SENSORS,
  selectedNodeId: 'SN-402',
  telemetryLogs: INITIAL_TELEM,
  alerts: INITIAL_ALERTS,
  systemStats: {
    totalSensors: 2481,
    activeNodes: 2476,
    offlineCount: 5,
    latencyMs: 14
  },
  isSyncing: true,

  startPoint: 'Station ALPHA-01 (Current)',
  destination: '',
  maxDepthTolerance: 0.5,
  optimizerParam: OptimizerParam.LOWEST_RISK,
  routeCalculated: false,
  isCalculatingRoute: false,
  routeViability: null,

  aiRiskLevel: 78,
  aiWaterIncrement: 12,
  aiDrainStatus: 'blocked',
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

  addAlert: (alert) => {
    const newAlert: AlertItem = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: 'Just now',
      active: true
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts],
      systemStats: {
        ...state.systemStats,
        offlineCount: alert.severity === 'critical' ? state.systemStats.offlineCount + 1 : state.systemStats.offlineCount
      }
    }));
  },

  dismissAlert: (id) => {
    set((state) => {
      const alert = state.alerts.find(a => a.id === id);
      const isCritical = alert?.severity === 'critical';
      return {
        alerts: state.alerts.map((a) => a.id === id ? { ...a, active: false } : a),
        systemStats: {
          ...state.systemStats,
          offlineCount: isCritical ? Math.max(0, state.systemStats.offlineCount - 1) : state.systemStats.offlineCount
        }
      };
    });
  },

  dispatchMaintenance: (nodeId) => {
    const nodeName = get().sensorNodes.find(n => n.id === nodeId)?.name || nodeId;
    // Dispatch logs
    const now = new Date();
    const ts = now.toLocaleTimeString();
    
    const newTelem: TelemetryLog = {
      id: `telem-${Date.now()}`,
      timestamp: ts,
      nodeName: nodeName,
      waterLevel: 0,
      rssi: -50,
      temp: 28.5,
      status: 'MAINTENANCE',
      message: `AI DISPATCH: Maintenance unit dispatched to ${nodeName}`
    };

    set((state) => ({
      telemetryLogs: [newTelem, ...state.telemetryLogs],
      sensorNodes: state.sensorNodes.map((sensor) => 
        sensor.id === nodeId ? { ...sensor, status: 'info', rate: 0, trend: 'stable' } : sensor
      )
    }));
  },

  setStartPoint: (point) => set({ startPoint: point }),
  setDestination: (point) => set({ destination: point }),
  setMaxDepthTolerance: (depth) => set({ maxDepthTolerance: depth }),
  setOptimizerParam: (param) => set({ optimizerParam: param }),
  
  calculateRoute: () => {
    set({ isCalculatingRoute: true, routeCalculated: false });
    
    // Simulate smart heavy calculation with routing nodes
    setTimeout(() => {
      const isLowestRisk = get().optimizerParam === OptimizerParam.LOWEST_RISK;
      set({
        isCalculatingRoute: false,
        routeCalculated: true,
        routeViability: {
          duration: isLowestRisk ? '42 min' : '28 min',
          distance: isLowestRisk ? '18.4 km' : '15.1 km',
          maxDepthExposure: isLowestRisk ? '0.3m' : '0.8m',
          status: isLowestRisk ? 'optimal' : 'hazardous'
        }
      });
      
      // If we selected shortest path (hazardous), trigger alert
      if (!isLowestRisk) {
        get().addAlert({
          station: 'Route Sim Warning',
          message: 'Selected path exposes vehicle to 0.8m standing water level inside River delta.',
          severity: 'warning'
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
        aiDrainStatus: isNowStable ? 'stable' : 'blocked'
      });
      
      // Update SN-402 based on update
      set((state) => ({
        sensorNodes: state.sensorNodes.map(s => 
          s.id === 'SN-402' ? { 
            ...s, 
            waterLevel: isNowStable ? 62 : 145, 
            status: isNowStable ? 'stable' : 'critical',
            rate: isNowStable ? 0 : 5,
            trend: isNowStable ? 'stable' : 'rising'
          } : s
        )
      }));
    }, 1800);
  },

  setFocusArea: () => {
    set((state) => ({
      aiWaterIncrement: Math.max(2, state.aiWaterIncrement - 5)
    }));
  },

  tickSimulatedData: () => {
    if (!get().isSyncing) return;

    set((state) => {
      // Tick random sensor node values slightly to keep dashboard active
      const updatedNodes = state.sensorNodes.map((sensor) => {
        if (sensor.status === 'stable' && Math.random() > 0.8) {
          // Stable node fluctuates +/- 1
          const change = Math.random() > 0.5 ? 1 : -1;
          return { ...sensor, waterLevel: Math.max(5, sensor.waterLevel + change) };
        }
        if (sensor.status === 'critical') {
          // Critical node creeps up depending on rate or stays high
          const change = Math.random() > 0.6 ? 1 : 0;
          return { ...sensor, waterLevel: sensor.waterLevel + change };
        }
        if (sensor.status === 'warning') {
          // Warning node creeps slowly
          const change = Math.random() > 0.7 ? 1 : -1;
          return { ...sensor, waterLevel: Math.max(40, sensor.waterLevel + change) };
        }
        return sensor;
      });

      // Periodically append a simulation packet to the telemetry feed
      const randomNode = state.sensorNodes[Math.floor(Math.random() * state.sensorNodes.length)];
      const ts = new Date().toLocaleTimeString();
      const statusLabel = Math.random() > 0.85 ? 'SYNC_OK' : 'NORMAL';
      
      const newTelem: TelemetryLog = {
        id: `telem-${Date.now()}`,
        timestamp: ts,
        nodeName: randomNode.name,
        waterLevel: parseFloat((randomNode.waterLevel / 100).toFixed(2)),
        rssi: -50 - Math.floor(Math.random() * 30),
        temp: parseFloat((30 + Math.random() * 5).toFixed(1)),
        status: statusLabel,
        flowRate: randomNode.trend === 'rising' ? 0.15 : 0.05
      };

      const updatedLogs = [newTelem, ...state.telemetryLogs].slice(0, 30); // limit to 30 logs

      return {
        sensorNodes: updatedNodes,
        telemetryLogs: updatedLogs,
        systemStats: {
          ...state.systemStats,
          latencyMs: 10 + Math.floor(Math.random() * 10)
        }
      };
    });
  }
}));
