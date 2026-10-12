import React from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PropertyDetailMapProps {
  latitude: number;
  longitude: number;
}

const PropertyDetailMap: React.FC<PropertyDetailMapProps> = ({ latitude, longitude }) => (
  <MapContainer center={[latitude, longitude]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Marker position={[latitude, longitude]} />
  </MapContainer>
);

export default PropertyDetailMap;
