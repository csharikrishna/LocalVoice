import { useEffect, useMemo, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Loader2, MapPin } from "lucide-react";
import { Complaint } from "../../types";

type LeafletDefaultIconPrototype = L.Icon.Default & { _getIconUrl?: unknown };
type LeafletWindow = Window & { L?: typeof L };

delete (L.Icon.Default.prototype as LeafletDefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    let heatLayer: L.Layer | undefined;
    let isMounted = true;

    const initHeatmap = async () => {
      (window as LeafletWindow).L = L;
      await import("leaflet.heat");

      if (!isMounted) return;

      heatLayer = (L as any)
        .heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
        })
        .addTo(map);
    };

    initHeatmap();

    return () => {
      isMounted = false;
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
      // Aggressive fallback cleanup for any orphaned heat layers
      map.eachLayer((layer: any) => {
        if (layer._heat) {
          map.removeLayer(layer);
        }
      });
    };
  }, [map, points]);
  return null;
}

interface AdminMapProps {
  complaints: Complaint[];
  focusedLocation: [number, number] | null;
  onImageClick: (url: string) => void;
  showHeatmap: boolean;
  adminLocation?: [number, number] | null;
  onLocateMe?: () => void;
  isLocating?: boolean;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

const AdminMap = memo(function AdminMap({
  complaints,
  focusedLocation,
  onImageClick,
  showHeatmap,
  adminLocation,
  onLocateMe,
  isLocating,
}: AdminMapProps) {
  const complaintsWithCoords = complaints.filter((c) => c.coordinates);
  const center =
    focusedLocation ||
    (complaintsWithCoords.length > 0
      ? ([complaintsWithCoords[0].coordinates!.lat, complaintsWithCoords[0].coordinates!.lng] as [
          number,
          number,
        ])
      : DEFAULT_CENTER);

  const heatPoints = useMemo(
    () =>
      complaintsWithCoords.map(
        (c) => [c.coordinates!.lat, c.coordinates!.lng, 1] as [number, number, number],
      ),
    [complaintsWithCoords],
  );

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-full absolute inset-0 z-0"
    >
      <MapFlyTo center={focusedLocation} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showHeatmap ? (
        <HeatmapLayer points={heatPoints} />
      ) : (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
          {complaintsWithCoords.map((c) => (
            <Marker key={c.id} position={[c.coordinates!.lat, c.coordinates!.lng]}>
              <Popup className="rounded-lg">
                <div className="p-1 min-w-[200px]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {c.category}
                    </span>
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {c.token || "N/A"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{c.location}</h3>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{c.description}</p>
                  {c.photoURL && (
                    <button
                      onClick={() => onImageClick(c.photoURL!)}
                      className="w-full h-24 mt-2 block p-0 border-0 bg-transparent cursor-zoom-in"
                    >
                      <img
                        src={c.photoURL}
                        alt="Issue"
                        className="w-full h-full object-cover rounded border border-gray-100"
                      />
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {adminLocation && (
        <CircleMarker
          center={adminLocation}
          radius={8}
          pathOptions={{ color: "white", fillColor: "#3b82f6", fillOpacity: 1, weight: 2 }}
        >
          <Popup>Your Location</Popup>
        </CircleMarker>
      )}

      {onLocateMe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLocateMe();
          }}
          disabled={isLocating}
          className="absolute bottom-4 right-4 z-[400] bg-white p-2.5 rounded-xl shadow-md border border-gray-100 text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-50"
          title="Find my location"
        >
          {isLocating ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
        </button>
      )}
    </MapContainer>
  );
});

export default AdminMap;
