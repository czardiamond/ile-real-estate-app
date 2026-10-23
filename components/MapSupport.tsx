import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/** Keep maps aligned after responsive layout changes and make tile failures actionable. */
export default function MapSupport() {
  const map = useMap();
  const [tileError, setTileError] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => map.invalidateSize({ pan: false });
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
    observer?.observe(map.getContainer());
    const frame = requestAnimationFrame(resize);
    const layers = new Set<L.TileLayer>();
    const failed = () => setTileError(true);
    const attach = (layer: L.Layer) => {
      if (layer instanceof L.TileLayer && !layers.has(layer)) {
        layers.add(layer);
        layer.on('tileerror', failed);
      }
    };
    map.eachLayer(attach);
    const added = (event: L.LayerEvent) => attach(event.layer);
    map.on('layeradd', added);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      map.off('layeradd', added);
      layers.forEach(layer => layer.off('tileerror', failed));
    };
  }, [map]);
  useEffect(() => {
    if (notice.current) {
      L.DomEvent.disableClickPropagation(notice.current);
      L.DomEvent.disableScrollPropagation(notice.current);
    }
  }, [tileError]);
  if (!tileError) return null;
  return <div ref={notice} role="status" className="absolute left-3 right-3 top-16 z-[1000] rounded-lg border border-amber-300 bg-white p-3 text-xs text-gray-800 shadow-md">
    Map tiles could not load. Check your connection; listing details remain available.
    <button type="button" className="ml-2 font-bold underline" onClick={() => {
      setTileError(false);
      map.eachLayer(layer => { if (layer instanceof L.TileLayer) layer.redraw(); });
    }}>Retry map</button>
  </div>;
}
