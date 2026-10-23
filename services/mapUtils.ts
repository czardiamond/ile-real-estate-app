export interface MapCoordinates { lat: number; lng: number }

/** Reject malformed data before it reaches Leaflet (including strings and NaN). */
export function isValidCoordinates(value: unknown): value is MapCoordinates {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { lat, lng } = value as MapCoordinates;
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export const DEFAULT_MAP_CENTER: [number, number] = [9.082, 8.675];
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
