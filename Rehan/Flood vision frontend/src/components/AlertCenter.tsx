import { useEffect } from "react";
import {
  Bell,
  ShieldAlert,
  ShieldCheck,
  X,
  Volume2,
  Clock,
} from "lucide-react";
import { useAppStore } from "../store";
import { ThemeVariant } from "../types";
import { useWebSocket } from "../hooks/useWebSocket";
import { dismissAlertApi } from "../api/endpoints";

const severityColor = (severity: string) => {
  if (severity === "critical") return "var(--color-danger)";
  if (severity === "warning") return "var(--color-warning)";
  return "var(--color-secondary)";
};

export default function AlertCenter() {
  const {
    alerts,
    dismissAlert,
    refreshAlertsFromApi,
    pushAlertFromSocket,
    activeLayout,
    showToast,
  } = useAppStore();

  const panelStyle =
    activeLayout === ThemeVariant.GLASSMORPHISM ? "glass-panel" : "neu-extrude";

  const { lastMessage } = useWebSocket<any>("/alerts/");

  useEffect(() => {
    refreshAlertsFromApi();
  }, [refreshAlertsFromApi]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === "new_alert") {
      pushAlertFromSocket(lastMessage.data || {});
    }
    if (lastMessage.type === "active_alerts") {
      refreshAlertsFromApi();
    }
  }, [lastMessage, pushAlertFromSocket, refreshAlertsFromApi]);

  const handleDismiss = async (id: string) => {
    try {
      await dismissAlertApi(id);
      dismissAlert(id);
    } catch {
      showToast("Failed to dismiss alert.");
    }
  };

  const requestNotification = async () => {
    if (!("Notification" in window)) {
      showToast("Browser notifications are not supported.");
      return;
    }
    const permission = await Notification.requestPermission();
    showToast(`Notification permission: ${permission}`);
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text flex items-center gap-3">
            <Bell
              className="h-7 w-7"
              style={{ color: "var(--color-primary)" }}
            />
            Alert Center
          </h1>
          <p className="text-sm theme-text-secondary mt-1">
            Real-time flood alerts from sensors and AI analysis.
          </p>
        </div>
        <button
          onClick={requestNotification}
          className="text-[10px] font-mono tracking-wider px-3 py-1.5 rounded-full border cursor-pointer"
          style={{
            borderColor: "var(--card-border)",
            color: "var(--text-secondary)",
            background: "var(--input-bg)",
          }}
        >
          Enable Notifications
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`${panelStyle} rounded-2xl p-4 flex items-center gap-3`}
        >
          <ShieldAlert
            className="h-6 w-6"
            style={{ color: "var(--color-danger)" }}
          />
          <div>
            <div className="text-xs theme-text-muted uppercase tracking-wider">
              Critical Alerts
            </div>
            <div className="text-lg font-bold theme-text">
              {
                alerts.filter((a) => a.active && a.severity === "critical")
                  .length
              }
            </div>
          </div>
        </div>
        <div
          className={`${panelStyle} rounded-2xl p-4 flex items-center gap-3`}
        >
          <ShieldAlert
            className="h-6 w-6"
            style={{ color: "var(--color-warning)" }}
          />
          <div>
            <div className="text-xs theme-text-muted uppercase tracking-wider">
              Warnings
            </div>
            <div className="text-lg font-bold theme-text">
              {
                alerts.filter((a) => a.active && a.severity === "warning")
                  .length
              }
            </div>
          </div>
        </div>
        <div
          className={`${panelStyle} rounded-2xl p-4 flex items-center gap-3`}
        >
          <ShieldCheck
            className="h-6 w-6"
            style={{ color: "var(--color-secondary)" }}
          />
          <div>
            <div className="text-xs theme-text-muted uppercase tracking-wider">
              Info Alerts
            </div>
            <div className="text-lg font-bold theme-text">
              {alerts.filter((a) => a.active && a.severity === "info").length}
            </div>
          </div>
        </div>
      </div>

      <div className={`${panelStyle} rounded-2xl p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold theme-text uppercase tracking-wider">
            Live Feed
          </h2>
          <Volume2 className="h-4 w-4 theme-text-muted" />
        </div>

        <div className="space-y-3">
          {alerts.length === 0 && (
            <div className="text-sm theme-text-muted">No alerts available.</div>
          )}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{
                borderColor: "var(--card-border)",
                background: "var(--card-bg)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-3 w-3 rounded-full mt-1"
                  style={{ background: severityColor(alert.severity) }}
                />
                <div>
                  <div
                    className="text-xs font-mono uppercase tracking-wider"
                    style={{ color: severityColor(alert.severity) }}
                  >
                    {alert.severity}
                  </div>
                  <div className="text-sm font-semibold theme-text">
                    {alert.station}
                  </div>
                  <div className="text-xs theme-text-secondary mt-1">
                    {alert.message}
                  </div>
                  <div className="text-[10px] theme-text-muted mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {alert.timestamp || alert.createdAt || "just now"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono px-3 py-1.5 rounded-lg border cursor-pointer"
                style={{
                  borderColor: "var(--card-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <X className="h-3 w-3" />
                Dismiss
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
