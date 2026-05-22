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

// Design token hex values — must be hardcoded for Google Maps API (no CSS vars)
const TOKEN = {
  king: '#ffe083',   // --accent
  libre: '#4ade80',  // --status-libre
  rival: '#f87171',  // --status-rival
  white: '#ffffff',
};

function buildIcon(estado: CanchaConEstado['estado']): google.maps.Symbol {
  if (estado === 'king') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: TOKEN.king,
      fillOpacity: 1,
      strokeColor: TOKEN.white,
      strokeWeight: 2,
    };
  }
  if (estado === 'libre') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: TOKEN.libre,
      fillOpacity: 1,
      strokeColor: TOKEN.libre,
      strokeWeight: 1.5,
    };
  }
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: TOKEN.rival,
    fillOpacity: 1,
    strokeColor: TOKEN.rival,
    strokeWeight: 1.5,
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
        icon: buildIcon(cancha.estado),
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
          fillColor: TOKEN.king,
          fillOpacity: 1,
          strokeColor: TOKEN.white,
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
