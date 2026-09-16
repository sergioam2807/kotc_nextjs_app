'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import type { CanchaConEstado } from './MapaClientWrapper';
import { crearCanchasOverlay, type CanchasOverlayInstance, type OrigenPin } from './canchasOverlay';

interface Props {
  canchas: CanchaConEstado[];
  onSelectCancha: (c: CanchaConEstado, origen?: OrigenPin | null) => void;
  modoAgregar?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  panToCoords?: { lat: number; lng: number } | null;
  /** Cancha abierta en el panel: se resalta en el mapa mientras esté abierta. */
  selectedId?: string | null;
}

const DEFAULT_CENTER = { lat: -33.46, lng: -70.645 };
const DEFAULT_ZOOM = 13;

// Blacktop Neon — near-black palette (matches app/globals.css tonal scale)
const DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a4a46' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#5c5c58' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#141410' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a36' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1c1c' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#141414' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4a4a46' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#242424' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#181818' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5c5c58' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS = {
  styles: DARK_STYLES,
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  backgroundColor: '#0a0a0a',
  keyboardShortcuts: false,
};

export default function MapaGoogle({ canchas, onSelectCancha, modoAgregar = false, onMapClick, panToCoords, selectedId = null }: Props) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hovering, setHovering] = useState(false);
  const overlayRef = useRef<CanchasOverlayInstance | null>(null);
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
    overlayRef.current?.setMap(null);
    overlayRef.current = null;
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

  // Una sola capa Canvas para todas las canchas (ver canchasOverlay.ts)
  useEffect(() => {
    if (!map) return;
    const overlay = crearCanchasOverlay({
      onSelectCancha: (c, origen) => onSelectCanchaRef.current(c, origen),
      onHoverChange: setHovering,
    });
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map]);

  // Datos y selección de la capa — sin recrear nada, solo redibujo.
  // `map` va en las deps: la capa recién existe cuando el mapa cargó, y sin
  // esto la primera tanda de canchas nunca llegaría a dibujarse.
  useEffect(() => { overlayRef.current?.setCanchas(canchas); }, [map, canchas]);
  useEffect(() => { overlayRef.current?.setSelected(selectedId); }, [map, selectedId]);

  // Cursor + temp marker for modoAgregar
  useEffect(() => {
    if (!map) return;
    // En modo agregar el mapa es un lienzo para ubicar: los pines no responden.
    overlayRef.current?.setInteractive(!modoAgregar);
    map.setOptions({ draggableCursor: modoAgregar ? 'crosshair' : hovering ? 'pointer' : '' });
    if (!modoAgregar && tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
  }, [map, modoAgregar, hovering]);

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
          fillColor: '#d5ff40',
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
