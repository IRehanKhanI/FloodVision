import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useAppStore } from "../store";
import type { FloodZone, SensorNode, RouteResult } from "../types";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface FloodMapProps {
  floodZones?: FloodZone[];
  sensors?: SensorNode[];
  route?: RouteResult | null;
  onMapClick?: (lat: number, lng: number) => void;
  onZoneClick?: (zone: FloodZone) => void;
  onSensorClick?: (sensorId: string) => void;
  compact?: boolean;
}

const riskStyle = (riskCategory: FloodZone["risk_category"]) => {
  if (riskCategory === "red") {
    return { color: "#ff453a", fillColor: "#ff453a" };
  }
  if (riskCategory === "yellow") {
    return { color: "#ffd60a", fillColor: "#ffd60a" };
  }
  return { color: "#47e266", fillColor: "#47e266" };
};

function MapClickHandler({
  onClick,
}: {
  onClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onClick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function FloodMap({
  floodZones,
  sensors,
  route,
  onMapClick,
  onZoneClick,
  onSensorClick,
  compact = false,
}: FloodMapProps) {
  const { sensorNodes, floodZones: storeZones, routeResult } = useAppStore();
  const zones = floodZones || storeZones;
  const nodeList = sensors || sensorNodes;
  const activeRoute = route || routeResult;

  const center = useMemo<[number, number]>(() => {
    if (zones.length) {
      const avgLat = zones.reduce((sum, z) => sum + z.lat, 0) / zones.length;
      const avgLng = zones.reduce((sum, z) => sum + z.lng, 0) / zones.length;
      return [avgLat, avgLng];
    }
    if (nodeList.length) {
      return [nodeList[0].lat, nodeList[0].lng];
    }
    return [19.076, 72.8777];
  }, [zones, nodeList]);

  const polyline = useMemo(() => {
    if (!activeRoute?.waypoints?.length) return [];
    return activeRoute.waypoints.map((wp) => [wp.lat, wp.lng]) as [
      number,
      number,
    ][];
  }, [activeRoute]);

  return (
    <div
      className={`relative w-full h-full ${compact ? "rounded-xl" : "rounded-2xl"} overflow-hidden`}
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onClick={onMapClick} />

        {zones.map((zone) => (
          <Circle
            key={`zone-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={350}
            pathOptions={{
              ...riskStyle(zone.risk_category),
              fillOpacity: 0.2,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onZoneClick?.(zone),
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">
                  {zone.address || "Flood Zone"}
                </div>
                <div>Risk: {zone.risk_level}%</div>
                <div>Category: {zone.risk_category}</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {nodeList.map((node) => (
          <Marker
            key={`sensor-${node.id}`}
            position={[node.lat, node.lng]}
            eventHandlers={{
              click: () => onSensorClick?.(node.id),
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{node.name}</div>
                <div>{node.location}</div>
                <div>Water Level: {node.waterLevel} cm</div>
                <div>Status: {node.status}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {polyline.length > 1 && (
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#3e90ff", weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
