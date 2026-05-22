export enum RiskLevel {
  CRITICAL = 'Critical',
  MODERATE = 'Moderate',
  LOW = 'Low Risk'
}

export enum OptimizerParam {
  LOWEST_RISK = 'Lowest Risk',
  SHORTEST_PATH = 'Shortest Path'
}

export enum ThemeVariant {
  GLASSMORPHISM = 'Glassmorphism',
  NEUMORPHISM = 'Neumorphism'
}

export interface SensorNode {
  id: string;
  name: string;
  location: string;
  waterLevel: number; // in cm or m
  trend: 'rising' | 'falling' | 'stable';
  rate: number; // e.g., +5cm/hr
  status: 'critical' | 'warning' | 'stable' | 'info';
  lastSeen: string;
  cpuTemp: number; // in Celsius
  heapUsage: string; // e.g. "82KB / 320KB"
  uptime: string;
  latitude: number; // decimal percent for UI map placement
  longitude: number; // decimal percent for UI map placement
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  nodeName: string;
  waterLevel: number;
  flowRate?: number;
  rssi: number;
  temp: number;
  status: string;
  message?: string;
}

export interface AlertItem {
  id: string;
  station: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  active: boolean;
}

export interface SystemStats {
  totalSensors: number;
  activeNodes: number;
  offlineCount: number;
  latencyMs: number;
}
