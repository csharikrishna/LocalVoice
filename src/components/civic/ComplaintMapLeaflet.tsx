import { memo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface ComplaintMapLeafletProps {
  locationCoords: { lat: number; lng: number };
  setTempCoords: (coords: { lat: number; lng: number }) => void;
}

const ComplaintMapLeaflet = memo(function ComplaintMapLeaflet({
  locationCoords,
  setTempCoords,
}: ComplaintMapLeafletProps) {
  return (
    <MapContainer
      center={[locationCoords.lat, locationCoords.lng]}
      zoom={17}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[locationCoords.lat, locationCoords.lng]}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng();
            setTempCoords({ lat, lng });
          },
        }}
      />
    </MapContainer>
  );
});

export default ComplaintMapLeaflet;
