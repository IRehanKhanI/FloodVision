import apiClient from "./client";
import type {
  FloodZone,
  WeatherCurrent,
  WeatherForecast,
  AIAnalysisResult,
  RouteOptimizeRequest,
  RouteResult,
  ApiSensorNode,
  ApiSensorReading,
  AlertItem,
} from "../types";

// ─── Flood Zones ──────────────────────────────────────────────
export async function fetchFloodZones(): Promise<FloodZone[]> {
  const { data } = await apiClient.get<FloodZone[]>("/flood-zones/");
  return data;
}

export async function analyzeLocation(
  lat: number,
  lng: number,
): Promise<FloodZone> {
  const { data } = await apiClient.post<{ zone?: FloodZone } | FloodZone>(
    "/flood-zones/analyze/",
    { lat, lng },
  );
  return "zone" in data ? (data.zone as FloodZone) : (data as FloodZone);
}

// ─── Sensors ──────────────────────────────────────────────────
export async function fetchSensors(): Promise<ApiSensorNode[]> {
  const { data } = await apiClient.get<ApiSensorNode[]>("/sensors/");
  return data;
}

export async function fetchSensorReadings(
  sensorId: string,
): Promise<ApiSensorReading[]> {
  const { data } = await apiClient.get<{ readings: ApiSensorReading[] }>(
    `/sensors/${sensorId}/readings/`,
  );
  return data.readings || [];
}

export async function fetchLatestReadings(): Promise<ApiSensorNode[]> {
  const { data } = await apiClient.get<ApiSensorNode[]>("/sensors/latest/");
  return data;
}

// ─── Weather ──────────────────────────────────────────────────
export async function fetchCurrentWeather(
  lat: number,
  lng: number,
): Promise<WeatherCurrent> {
  const { data } = await apiClient.get<WeatherCurrent>("/weather/current/", {
    params: { lat, lng },
  });
  return data;
}

export async function fetchWeatherForecast(
  lat: number,
  lng: number,
): Promise<WeatherForecast> {
  const { data } = await apiClient.get<WeatherForecast>("/weather/forecast/", {
    params: { lat, lng },
  });
  return data;
}

// ─── Alerts ───────────────────────────────────────────────────
export async function fetchAlerts(): Promise<AlertItem[]> {
  const { data } = await apiClient.get<any[]>("/alerts/");
  return (data || []).map((alert) => ({
    id: String(alert.id),
    station:
      alert.sensor_info?.name || alert.zone_info?.address || "System Alert",
    message: alert.message,
    timestamp: alert.created_at,
    severity: alert.severity,
    active: alert.is_active,
    createdAt: alert.created_at,
  }));
}

export async function dismissAlertApi(id: string): Promise<void> {
  await apiClient.post(`/alerts/${id}/dismiss/`);
}

// ─── Route Optimizer ──────────────────────────────────────────
export async function optimizeRoute(
  params: RouteOptimizeRequest,
): Promise<RouteResult> {
  const { data } = await apiClient.post<RouteResult>(
    "/route/optimize/",
    params,
  );
  return data;
}

// ─── AI Analysis ──────────────────────────────────────────────
export async function analyzeImage(
  formData: FormData,
): Promise<AIAnalysisResult> {
  const { data } = await apiClient.post<{
    analysis: AIAnalysisResult;
    recommendations?: string[];
  }>("/ai/analyze-image/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return {
    ...data.analysis,
    recommendations:
      data.recommendations || data.analysis.recommendations || [],
  };
}

export async function analyzeCoordinates(
  lat: number,
  lng: number,
): Promise<AIAnalysisResult> {
  const { data } = await apiClient.post<{
    analysis: AIAnalysisResult;
    recommendations?: string[];
  }>("/ai/analyze-coordinates/", { lat, lng });
  return {
    ...data.analysis,
    recommendations:
      data.recommendations || data.analysis.recommendations || [],
  };
}

export async function fetchAiAnalyses(
  limit: number = 20,
): Promise<AIAnalysisResult[]> {
  const { data } = await apiClient.get<AIAnalysisResult[]>("/ai/analyze/", {
    params: { limit },
  });
  return data;
}

// ─── Dashboard ────────────────────────────────────────────────
export interface DashboardStats {
  totalSensors: number;
  activeNodes: number;
  criticalAlerts: number;
  avgRiskScore: number;
  recentAnalyses: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<any>("/dashboard/stats/");
  return {
    totalSensors: data?.sensors?.total ?? 0,
    activeNodes: data?.sensors?.active ?? 0,
    criticalAlerts: data?.alerts?.critical ?? 0,
    avgRiskScore: data?.flood_zones?.average_risk ?? 0,
    recentAnalyses: data?.recent_activity?.readings_last_hour ?? 0,
  };
}
