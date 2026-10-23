import React, { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { isValidCoordinates, OSM_ATTRIBUTION, OSM_TILE_URL } from '../services/mapUtils';
import MapSupport from './MapSupport';
import { mapMarkerIcon } from './mapMarkerIcon';

interface PropertyDetailMapProps { latitude: number; longitude: number }
function Recenter({ latitude, longitude }: PropertyDetailMapProps) {
  const map = useMap();
  useEffect(() => { map.setView([latitude, longitude], 15); }, [latitude, longitude, map]);
  return null;
}
const PropertyDetailMap: React.FC<PropertyDetailMapProps> = ({ latitude, longitude }) => {
  if (!isValidCoordinates({ lat: latitude, lng: longitude })) {
    return <div role="status" className="flex h-full items-center justify-center p-4 text-center text-sm">A valid map location is not available for this property.</div>;
  }
  return <MapContainer center={[latitude, longitude]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
    <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
    <MapSupport />
    <Recenter latitude={latitude} longitude={longitude} />
    <Marker position={[latitude, longitude]} icon={mapMarkerIcon} title="Property location" alt="Property location" />
  </MapContainer>;
};
export default PropertyDetailMap;
