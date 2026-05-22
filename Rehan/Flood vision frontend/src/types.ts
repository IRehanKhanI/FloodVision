export enum RiskLevel {
  CRITICAL = "Critical",
  MODERATE = "Moderate",
  LOW = "Low Risk",
}

export enum OptimizerParam {
  LOWEST_RISK = "Lowest Risk",
  SHORTEST_PATH = "Shortest Path",
}

export enum ThemeVariant {
  GLASSMORPHISM = "Glassmorphism",
  NEUMORPHISM = "Neumorphism",
}

export interface SensorNode {
  id: string;
  name: string;
  location: string;
  waterLevel: number; // in cm or m
  trend: "rising" | "falling" | "stable";
  rate: number; // e.g., +5cm/hr
  status: "critical" | "warning" | "stable" | "info";
  lastSeen: string;
  cpuTemp: number; // in Celsius
  heapUsage: string; // e.g. "82KB / 320KB"
  uptime: string;
  lat: number;
  lng: number;
  latitude?: number; // legacy percent placement (deprecated)
  longitude?: number; // legacy percent placement (deprecated)
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
  severity: "critical" | "warning" | "info";
  active: boolean;
  createdAt?: string;
}

export interface SystemStats {
  totalSensors: number;
  activeNodes: number;
  offlineCount: number;
  latencyMs: number;
}

export interface FloodZone {
  id: number;
  lat: number;
  lng: number;
  risk_level: number;
  risk_category: "green" | "yellow" | "red";
  address: string;
  analysis_data: Record<string, unknown>;
  last_analyzed: string;
}

export interface ApiSensorReading {
  water_level_cm: number;
  temperature?: number | null;
  rssi?: number | null;
  flow_rate?: number | null;
  timestamp: string;
}

export interface ApiSensorNode {
  id: number;
  node_id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  is_active: boolean;
  last_seen?: string | null;
  latest_reading?: ApiSensorReading | null;
}

export interface WeatherCurrent {
  temperature: number;
  humidity: number;
  rainfall_mm: number;
  wind_speed: number;
  condition: string;
  weather_code?: number;
  flood_risk?: {
    score: number;
    level: string;
    factors?: Record<string, unknown>;
  };
  cached?: boolean;
  fetched_at?: string;
}

export interface WeatherForecastDay {
  date: string;
  temperature_max: number | null;
  temperature_min: number | null;
  rain_sum_mm: number;
  condition: string;
  weather_code: number;
}

export interface WeatherForecast {
  location: { lat: number; lng: number };
  days: WeatherForecastDay[];
  summary: {
    total_rainfall_mm: number;
    forecast_risk_level: string;
    rainy_days: number;
  };
}

export interface AIAnalysisResult {
  id?: number;
  risk_percentage: number;
  road_condition: string;
  drain_status: string;
  pothole_count: number;
  elevation_risk: string;
  analysis_text: string;
  recommendations: string[];
  created_at?: string;
}

export interface RouteOptimizeRequest {
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  optimization_param: "lowest_risk" | "shortest_path";
  max_depth_tolerance?: number;
}

export interface RouteResult {
  waypoints: Array<{ lat: number; lng: number; risk?: number; index?: number }>;
  total_distance_km: number;
  direct_distance_km: number;
  estimated_duration: string;
  duration_minutes: number;
  max_flood_exposure: number;
  average_risk: number;
  risk_segments: Array<{
    waypoint_index: number;
    lat: number;
    lng: number;
    risk_score: number;
    risk_level: string;
  }>;
  overall_status: "optimal" | "hazardous" | "blocked";
  optimization_used: "lowest_risk" | "shortest_path";
  flood_zones_considered: number;
  detour_ratio: number;
}
