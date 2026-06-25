import { useEffect, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, ThumbsUp } from "lucide-react";
import { Complaint } from "@/types";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type LeafletDefaultIconPrototype = L.Icon.Default & { _getIconUrl?: unknown };

delete (L.Icon.Default.prototype as LeafletDefaultIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

interface PublicMapLeafletProps {
  mapCenter: [number, number];
  complaintsWithCoords: any[];
  statusConfig: Record<string, { label: string; color: string; icon: any }>;
  handleUpvote: (id: string) => void;
  setMarkerRef?: (id: string, marker: L.Marker | null) => void;
}

const PublicMapLeaflet = memo(function PublicMapLeaflet({
  mapCenter,
  complaintsWithCoords,
  statusConfig,
  handleUpvote,
  setMarkerRef,
}: PublicMapLeafletProps) {
  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
      className="z-0"
      zoomControl={false}
    >
      <MapUpdater center={mapCenter} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {complaintsWithCoords.map((c) => (
        <Marker
          key={c.id}
          position={[c.coordinates!.lat, c.coordinates!.lng]}
          ref={(m) => {
            if (setMarkerRef) {
              setMarkerRef(c.id, m);
            }
          }}
        >
          <Popup className="custom-popup">
            <div className="min-w-[240px]">
              {c.photoURL && (
                <div className="h-32 -mx-5 -mt-4 mb-3 overflow-hidden rounded-t-lg">
                  <img src={c.photoURL} className="w-full h-full object-cover" alt="Issue" />
                </div>
              )}
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                  {c.category}
                </span>
                {(() => {
                  const conf = statusConfig[c.status] || statusConfig.open;
                  const Icon = conf.icon;
                  return (
                    <span
                      className="flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: conf.color }}
                    >
                      <Icon size={12} /> {conf.label}
                    </span>
                  );
                })()}
              </div>
              <p className="text-sm text-slate-800 font-medium leading-snug mb-2 line-clamp-3">
                {c.description}
              </p>
              <p className="flex items-start gap-1 text-xs text-slate-500 mb-4 line-clamp-2">
                <MapPin size={12} className="shrink-0 mt-0.5" />
                {c.location}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpvote(c.id);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 transition-colors"
              >
                <ThumbsUp size={14} /> I have this issue too ({c.upvotes || 0})
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
});

export default PublicMapLeaflet;
