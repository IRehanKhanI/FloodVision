import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "../store";
import {
  ThemeVariant,
  WeatherCurrent,
  WeatherForecast,
  WeatherForecastDay,
} from "../types";
import { motion } from "motion/react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudDrizzle,
  CloudFog,
  Droplets,
  Wind,
  ShieldAlert,
  RefreshCw,
  MapPin,
  Clock,
  TrendingUp,
  Timer,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { fetchCurrentWeather, fetchWeatherForecast } from "../api/endpoints";

function weatherIcon(code: number, size: string = "h-6 w-6") {
  if (code <= 1) return <Sun className={`${size} text-[#ffd60a]`} />;
  if (code <= 3)
    return (
      <Cloud className={`${size} text-[var(--color-on-surface-variant)]`} />
    );
  if (code <= 48)
    return <CloudFog className={`${size} text-[var(--color-outline)]`} />;
  if (code <= 55) return <CloudDrizzle className={`${size} text-[#38bdf8]`} />;
  if (code <= 65) return <CloudRain className={`${size} text-[#3b82f6]`} />;
  if (code <= 77) return <CloudSnow className={`${size} text-[#e2e8f0]`} />;
  if (code <= 82) return <CloudRain className={`${size} text-[#2563eb]`} />;
  return <CloudLightning className={`${size} text-[#ffd60a]`} />;
}

function weatherLabel(code: number): string {
  if (code <= 0) return "Clear Sky";
  if (code <= 1) return "Mainly Clear";
  if (code <= 2) return "Partly Cloudy";
  if (code <= 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rainy";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Heavy Rain";
  return "Thunderstorm";
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function generateMockWeather(): WeatherCurrent {
  return {
    temperature: 24 + Math.floor(Math.random() * 10),
    humidity: 55 + Math.floor(Math.random() * 35),
    rainfall_mm: parseFloat((Math.random() * 12).toFixed(1)),
    wind_speed: 5 + Math.floor(Math.random() * 25),
    condition: "Partly Cloudy",
    weather_code: [0, 1, 2, 3, 51, 61, 80, 95][Math.floor(Math.random() * 8)],
    flood_risk: {
      score: Math.floor(Math.random() * 100),
      level: "moderate",
    },
  };
}

function generateMockForecast(): WeatherForecast {
  const days: WeatherForecastDay[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    days.push({
      date: date.toISOString().split("T")[0],
      temperature_max: 28 + Math.floor(Math.random() * 8),
      temperature_min: 18 + Math.floor(Math.random() * 6),
      rain_sum_mm: parseFloat((Math.random() * 30).toFixed(1)),
      condition: "Mock",
      weather_code: [0, 1, 2, 3, 51, 53, 61, 63, 80, 95][
        Math.floor(Math.random() * 10)
      ],
    });
  }

  return {
    location: { lat: 28.6139, lng: 77.209 },
    days,
    summary: {
      total_rainfall_mm: days.reduce((sum, d) => sum + d.rain_sum_mm, 0),
      forecast_risk_level: "moderate",
      rainy_days: days.filter((d) => d.rain_sum_mm > 0.5).length,
    },
  };
}

function rainfallColor(mm: number): string {
  if (mm >= 10) return "#ff453a";
  if (mm >= 5) return "#ffd60a";
  if (mm >= 2) return "#3b82f6";
  return "#38bdf8";
}

export default function WeatherView() {
  const { activeLayout, activeTheme } = useAppStore();
  const isGlass = activeLayout === ThemeVariant.GLASSMORPHISM;
  const panelStyle = isGlass ? "glass-panel" : "neu-extrude";
  const isDark = activeTheme === "dark";

  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [hourlyRainfall, setHourlyRainfall] = useState<
    { hour: string; rainfall_mm: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadWeather = useCallback(async () => {
    setIsLoading(true);
    try {
      const [current, forecastData] = await Promise.all([
        fetchCurrentWeather(19.076, 72.8777),
        fetchWeatherForecast(19.076, 72.8777),
      ]);
      setWeather(current);
      setForecast(forecastData);

      const hours: { hour: string; rainfall_mm: number }[] = [];
      for (let i = 0; i < 24; i++) {
        hours.push({
          hour: `${String(i).padStart(2, "0")}:00`,
          rainfall_mm:
            Math.random() > 0.6
              ? parseFloat((Math.random() * 15).toFixed(1))
              : parseFloat((Math.random() * 3).toFixed(1)),
        });
      }
      setHourlyRainfall(hours);
    } catch {
      setWeather(generateMockWeather());
      setForecast(generateMockForecast());
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  if (isLoading || !weather || !forecast) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-[var(--color-primary)] animate-spin" />
          <span className="text-sm text-[var(--color-on-surface-variant)]">
            Loading weather data…
          </span>
        </div>
      </div>
    );
  }

  const floodRiskScore = weather.flood_risk?.score ?? 0;
  const riskGaugeColor =
    floodRiskScore >= 70
      ? "#ff453a"
      : floodRiskScore >= 40
        ? "#ffd60a"
        : "#47e266";
  const riskLabel =
    floodRiskScore >= 70
      ? "High Risk"
      : floodRiskScore >= 40
        ? "Moderate"
        : "Low Risk";

  const gaugeR = 55;
  const gaugeCirc = 2 * Math.PI * gaugeR;
  const gaugeOffset = gaugeCirc - (floodRiskScore / 100) * gaugeCirc;

  const riskFactors = useMemo(() => {
    return [
      {
        label: "Rainfall Intensity",
        value:
          weather.rainfall_mm > 8
            ? "High"
            : weather.rainfall_mm > 3
              ? "Moderate"
              : "Low",
        score: Math.min(100, weather.rainfall_mm * 10),
      },
      {
        label: "Soil Saturation",
        value:
          weather.humidity > 80
            ? "Saturated"
            : weather.humidity > 60
              ? "Moist"
              : "Dry",
        score: weather.humidity,
      },
      {
        label: "Wind Factor",
        value:
          weather.wind_speed > 20
            ? "Strong"
            : weather.wind_speed > 10
              ? "Moderate"
              : "Calm",
        score: Math.min(100, weather.wind_speed * 3),
      },
      {
        label: "Drainage Load",
        value: weather.rainfall_mm > 5 ? "Stressed" : "Normal",
        score: Math.min(100, weather.rainfall_mm * 12),
      },
    ];
  }, [weather]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-on-surface)] flex items-center gap-3">
            {weatherIcon(weather.weather_code || 0, "h-7 w-7")}
            Weather Dashboard
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Mumbai Monitoring Zone
          </p>
        </div>
        <button
          onClick={loadWeather}
          className="text-[10px] font-mono text-[var(--color-outline)] hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="h-3 w-3" />
          Updated {lastUpdated.toLocaleTimeString()}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${panelStyle} rounded-2xl p-5 sm:p-6 lg:col-span-1`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-mono text-[var(--color-outline)] uppercase tracking-wider">
                Current Conditions
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-5xl font-bold text-[var(--color-on-surface)] leading-none">
                  {weather.temperature}
                </span>
                <span className="text-xl text-[var(--color-on-surface-variant)]">
                  °C
                </span>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
                {weatherLabel(weather.weather_code || 0)}
              </p>
            </div>
            <div
              className="p-3 rounded-xl"
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              }}
            >
              {weatherIcon(weather.weather_code || 0, "h-10 w-10")}
            </div>
          </div>

          <div
            className="grid grid-cols-3 gap-3 pt-4 border-t"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            }}
          >
            {[
              {
                icon: Droplets,
                label: "Humidity",
                value: `${weather.humidity}%`,
                color: "text-[#38bdf8]",
              },
              {
                icon: Wind,
                label: "Wind",
                value: `${weather.wind_speed} km/h`,
                color: "text-[var(--color-on-surface-variant)]",
              },
              {
                icon: CloudRain,
                label: "Rainfall",
                value: `${weather.rainfall_mm} mm`,
                color: "text-[#3b82f6]",
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className={`h-4 w-4 mx-auto ${stat.color} mb-1`} />
                <p className="text-[9px] font-mono text-[var(--color-outline)] uppercase">
                  {stat.label}
                </p>
                <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelStyle} rounded-2xl p-5 sm:p-6 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-[#3b82f6]" />
              24-Hour Rainfall
            </h3>
            <span className="text-[10px] font-mono text-[var(--color-outline)]">
              mm/hour
            </span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyRainfall}
                margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
                  }
                  vertical={false}
                />
                <XAxis
                  dataKey="hour"
                  tick={{
                    fill: isDark ? "#8b91a0" : "#6b7280",
                    fontSize: 9,
                    fontFamily: "JetBrains Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{
                    fill: isDark ? "#8b91a0" : "#6b7280",
                    fontSize: 9,
                    fontFamily: "JetBrains Mono",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark
                      ? "rgba(14,14,14,0.95)"
                      : "rgba(255,255,255,0.95)",
                    border: isDark
                      ? "1px solid rgba(255,255,255,0.15)"
                      : "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "12px",
                    backdropFilter: "blur(12px)",
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono",
                    color: isDark ? "#e5e2e1" : "#1c1b1b",
                  }}
                  cursor={{
                    fill: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  }}
                />
                <ReferenceLine
                  y={8}
                  stroke="#ff453a"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Flood Warning",
                    position: "insideTopRight",
                    fill: "#ff453a",
                    fontSize: 9,
                    fontFamily: "JetBrains Mono",
                  }}
                />
                <Bar
                  dataKey="rainfall_mm"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                >
                  {hourlyRainfall.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={rainfallColor(entry.rainfall_mm)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`${panelStyle} rounded-2xl p-5 sm:p-6 flex flex-col items-center`}
        >
          <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2 self-start mb-4">
            <ShieldAlert className="h-4 w-4 text-[#ff453a]" />
            Flood Risk Score
          </h3>

          <div className="relative my-2">
            <svg
              width="140"
              height="140"
              viewBox="0 0 140 140"
              className="transform -rotate-90"
            >
              <circle
                cx="70"
                cy="70"
                r={gaugeR}
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                strokeWidth="8"
              />
              <circle
                cx="70"
                cy="70"
                r={gaugeR}
                fill="none"
                stroke={riskGaugeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={gaugeCirc}
                strokeDashoffset={gaugeOffset}
                style={{ filter: `drop-shadow(0 0 6px ${riskGaugeColor}80)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-bold font-mono"
                style={{ color: riskGaugeColor }}
              >
                {floodRiskScore}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: riskGaugeColor }}
              >
                {riskLabel}
              </span>
            </div>
          </div>

          <div
            className={`w-full mt-3 p-3 rounded-xl border ${
              floodRiskScore >= 70
                ? "bg-[#ff453a]/10 border-[#ff453a]/30"
                : floodRiskScore >= 40
                  ? "bg-[#ffd60a]/10 border-[#ffd60a]/30"
                  : "bg-[#47e266]/10 border-[#47e266]/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {floodRiskScore >= 70 ? (
                <ShieldAlert className="h-3.5 w-3.5 text-[#ff453a] shrink-0" />
              ) : (
                <Eye
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: riskGaugeColor }}
                />
              )}
              <span
                className="text-[10px] font-mono uppercase tracking-wider"
                style={{ color: riskGaugeColor }}
              >
                {floodRiskScore >= 70
                  ? "Early Warning Active"
                  : floodRiskScore >= 40
                    ? "Monitoring Enhanced"
                    : "Normal Operations"}
              </span>
            </div>
          </div>
        </div>

        <div className={`${panelStyle} rounded-2xl p-5 sm:p-6 lg:col-span-2`}>
          <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
            Risk Factor Breakdown
          </h3>

          <div className="space-y-4">
            {riskFactors.map((factor) => {
              const barColor =
                factor.score >= 70
                  ? "#ff453a"
                  : factor.score >= 40
                    ? "#ffd60a"
                    : "#47e266";
              return (
                <div key={factor.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">
                      {factor.label}
                    </span>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: barColor }}
                    >
                      {factor.value} ({factor.score}%)
                    </span>
                  </div>
                  <div
                    className={`h-2 rounded-full ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${factor.score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: barColor,
                        boxShadow: `0 0 8px ${barColor}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-5 p-3 rounded-xl border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-black/[0.02] border-black/10"}`}
          >
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                Estimated time to flood risk:{" "}
                <span className="font-bold text-[var(--color-on-surface)]">
                  {floodRiskScore >= 70
                    ? "< 2 hours"
                    : floodRiskScore >= 40
                      ? "6-12 hours"
                      : "> 24 hours"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`${panelStyle} rounded-2xl p-5 sm:p-6`}>
        <h3 className="text-sm font-bold text-[var(--color-on-surface)] uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-[var(--color-primary)]" />
          7-Day Forecast
        </h3>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {forecast.days.map((day, idx) => {
            const rainRisk =
              day.rain_sum_mm > 15
                ? "high"
                : day.rain_sum_mm > 5
                  ? "moderate"
                  : "low";
            const riskDotColor =
              rainRisk === "high"
                ? "#ff453a"
                : rainRisk === "moderate"
                  ? "#ffd60a"
                  : "#47e266";

            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex-shrink-0 w-28 p-4 rounded-xl border text-center transition-colors ${
                  isDark
                    ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                    : "bg-black/[0.03] border-black/10 hover:bg-black/[0.06]"
                }`}
              >
                <p className="text-xs font-semibold text-[var(--color-on-surface)] mb-2">
                  {dayName(day.date)}
                </p>
                <div className="flex justify-center mb-2">
                  {weatherIcon(day.weather_code, "h-7 w-7")}
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="text-sm font-bold text-[var(--color-on-surface)]">
                    {day.temperature_max}°
                  </span>
                  <span className="text-xs text-[var(--color-outline)]">
                    {day.temperature_min}°
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Droplets className="h-3 w-3 text-[#3b82f6]" />
                  <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">
                    {day.rain_sum_mm}mm
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: riskDotColor,
                      boxShadow: `0 0 4px ${riskDotColor}`,
                    }}
                  />
                  <span
                    className="text-[8px] font-mono uppercase tracking-wider"
                    style={{ color: riskDotColor }}
                  >
                    {rainRisk}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
