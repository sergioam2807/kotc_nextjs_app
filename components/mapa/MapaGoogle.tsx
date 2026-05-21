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

const DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0d0e10' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0e10' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a4a5a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#5a5a6e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#111215' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a4a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a22' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f0f14' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a4e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#22222e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#14141c' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5a5a6e' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080810' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1a1a28' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e1e28' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS = {
  styles: DARK_STYLES,
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  backgroundColor: '#0d0e10',
  keyboardShortcuts: false,
};

function buildIcon(estado: CanchaConEstado['estado']): google.maps.Symbol {
  if (estado === 'king') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#F5C344',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  }
  if (estado === 'libre') {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: '#5a9e5a',
      fillOpacity: 1,
      strokeColor: '#5a9e5a',
      strokeWeight: 1.5,
    };
  }
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: '#E24B4A',
    fillOpacity: 1,
    strokeColor: '#E24B4A',
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
          fillColor: '#F5C344',
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
      <div className="w-full h-full flex items-center justify-center bg-[#0d0e10]">
        <span className="text-[#444] text-[12px]">Cargando mapa...</span>
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
