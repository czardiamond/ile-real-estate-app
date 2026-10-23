import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';

interface Props {
  position: [number, number];
  icon: L.DivIcon;
  title: string;
  selected: boolean;
  onActivate: () => void;
  children?: React.ReactNode;
}

/** Leaflet keeps the outer icon node stable when its visual DivIcon changes. */
export default function AccessiblePriceMarker({ position, icon, title, selected, onActivate, children }: Props) {
  const marker = useRef<L.Marker>(null);
  useEffect(() => {
    const element = marker.current?.getElement();
    if (!element) return;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', `${title} map location`);
    element.setAttribute('aria-pressed', String(selected));
    const activate = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      // Prevent Space scrolling and Leaflet/native duplicate activation, not arrow-key panning.
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onActivate();
    };
    element.addEventListener('keydown', activate);
    return () => element.removeEventListener('keydown', activate);
  }, [title, selected, icon, onActivate]);
  return <Marker ref={marker} position={position} icon={icon} title={title} keyboard
    eventHandlers={{ click: onActivate }}>{children}</Marker>;
}
