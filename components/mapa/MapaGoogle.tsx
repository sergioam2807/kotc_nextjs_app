'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import type { CanchaConEstado } from './MapaClientWrapper';

interface Props {
  canchas: CanchaConEstado[];
  onSelectCancha: (c: CanchaConEstado) => void;
  modoAgregar?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  panToCoords?: { lat: number; lng: number } | null;
}

const DEFAULT_CENTER = { lat: -33.46, lng: -70.645 };
const DEFAULT_ZOOM = 13;

// Pro League Asphalt — navy dark palette
const DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3a4a5e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#4a5a72' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d1f32' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#2a3a4e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#122438' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0a1830' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#3a4a5e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#162a42' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0d1c30' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#4a5a72' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#010f1f' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1a2a3e' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e2e42' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS = {
  styles: DARK_STYLES,
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  backgroundColor: '#0d1c2d',
  keyboardShortcuts: false,
};

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function buildMarkerSvg(cancha: CanchaConEstado): string {
  if (cancha.estado === 'libre') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
  <circle cx="20" cy="20" r="19" fill="#4ade80" />
  <circle cx="20" cy="20" r="14" fill="#14532d" />
  <text x="20" y="26" text-anchor="middle" fill="#4ade80" font-size="16" font-family="Arial, sans-serif">🏀</text>
  <polygon points="14,37 20,50 26,37" fill="#4ade80" />
</svg>`;
  }
  const ringColor = cancha.estado === 'king' ? '#ffe083' : '#f87171';
  const initials = getInitials(cancha.equipoNombre);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
  <circle cx="20" cy="20" r="19" fill="${ringColor}" />
  <circle cx="20" cy="20" r="14" fill="#111827" />
  <text x="20" y="25" text-anchor="middle" fill="${ringColor}" font-size="12" font-weight="bold" font-family="Arial, sans-serif">${initials}</text>
  <polygon points="14,37 20,50 26,37" fill="${ringColor}" />
</svg>`;
}

function buildIcon(cancha: CanchaConEstado): google.maps.Icon {
  const svg = buildMarkerSvg(cancha);
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 50),
    anchor: new google.maps.Point(20, 50),
  };
}

export default function MapaGoogle({ canchas, onSelectCancha, modoAgregar = false, onMapClick, panToCoords }: Props) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const tempMarkerRef = useRef<google.maps.Marker | null>(null);
  const onSelectCanchaRef = useRef(onSelectCancha);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => { onSelectCanchaRef.current = onSelectCancha; }, [onSelectCancha]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => m.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const onUnmount = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
    setMap(null);
  }, []);

  // Pan to coords when search selects a court
  useEffect(() => {
    if (!map || !panToCoords) return;
    map.panTo(panToCoords);
    map.setZoom(17);
  }, [map, panToCoords]);

  // Sync markers imperatively — handles add/remove on filter/search changes
  useEffect(() => {
    if (!map) return;

    const currentIds = new Set(canchas.map((c) => c.id));

    // Remove markers no longer in filtered list
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // Add new markers
    canchas.forEach((cancha) => {
      if (markersRef.current.has(cancha.id)) return;
      const marker = new google.maps.Marker({
        position: { lat: cancha.lat, lng: cancha.lng },
        map,
        icon: buildIcon(cancha),
        title: cancha.nombre,
      });
      marker.addListener('click', () => onSelectCanchaRef.current(cancha));
      markersRef.current.set(cancha.id, marker);
    });
  }, [map, canchas]);

  // Cursor + temp marker for modoAgregar
  useEffect(() => {
    if (!map) return;
    map.setOptions({ draggableCursor: modoAgregar ? 'crosshair' : '' });
    if (!modoAgregar && tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
  }, [map, modoAgregar]);

  // Map click handler
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!modoAgregar || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      if (tempMarkerRef.current) tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#ffe083',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 999,
      });

      onMapClickRef.current?.(lat, lng);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, modoAgregar]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
        <span className="text-outline text-[12px]">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Hide Google logo, attribution links and map controls */
        .gm-style-cc,
        .gm-style-cc + div,
        .gm-bundled-control,
        .gm-svpc,
        .gm-control-active,
        .gmnoprint {
          display: none !important;
        }
        /* Keep required copyright tiny and unobtrusive */
        .gm-style .gm-style-cc:last-child {
          display: block !important;
          opacity: 0.25;
          font-size: 9px !important;
          pointer-events: none;
        }
        .gm-style a[href^="https://maps.google"] {
          display: none !important;
        }
      `}</style>
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        options={MAP_OPTIONS}
        onLoad={onLoad}
        onUnmount={onUnmount}
      />
    </>
  );
}
