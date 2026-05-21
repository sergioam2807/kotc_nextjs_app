'use client';

import { useEffect, useRef } from 'react';
import type { CanchaConEstado } from './MapaClientWrapper';

interface Props {
  canchas: CanchaConEstado[];
  onSelectCancha: (c: CanchaConEstado) => void;
  modoAgregar?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

const ESTADO_COLORS = {
  libre: '#5a9e5a',
  king: '#F5C344',
  rival: '#E24B4A',
};

const ESTADO_LABELS = {
  libre: '🟢 LIBRE',
  king: '👑 KING',
  rival: '🔴 RIVAL',
};

function buildMarkerHtml(estado: CanchaConEstado['estado']): string {
  if (estado === 'king') {
    return `<div style="width:24px;height:24px;border-radius:50%;background:#F5C344;border:2px solid #fff;box-shadow:0 0 10px #F5C34480;display:flex;align-items:center;justify-content:center;font-size:12px">👑</div>`;
  }
  if (estado === 'rival') {
    return `<div style="width:18px;height:18px;border-radius:50%;background:#E24B4A;border:2px solid #E24B4A88;box-shadow:0 0 6px #E24B4A60"></div>`;
  }
  // libre
  return `<div style="width:18px;height:18px;border-radius:50%;background:#5a9e5a;border:2px solid #5a9e5a88;box-shadow:0 0 6px #5a9e5a60"></div>`;
}

function buildPopupHtml(cancha: CanchaConEstado): string {
  const color = cancha.equipoColor ?? ESTADO_COLORS[cancha.estado];
  const estadoLabel = ESTADO_LABELS[cancha.estado];
  const record =
    cancha.victorias !== undefined && cancha.derrotas !== undefined
      ? `<div style="font-size:10px;color:#444;margin-top:2px">${cancha.victorias}V - ${cancha.derrotas}D</div>`
      : '';
  const equipo = cancha.equipoNombre
    ? `<div style="font-size:11px;color:#555;margin-top:2px">${cancha.equipoNombre}</div>`
    : '';

  return `<div style="background:#0f0f12;border:1px solid #2a2a2a;border-radius:10px;padding:12px;min-width:170px;font-family:system-ui,sans-serif">
    <div style="font-size:13px;font-weight:500;color:#ddd;margin-bottom:4px">${cancha.nombre}</div>
    <div style="font-size:11px;color:#555;margin-bottom:6px">${cancha.direccion}</div>
    <div style="font-size:11px;color:${color}">${estadoLabel}</div>
    ${equipo}
    ${record}
  </div>`;
}

export default function MapaLeaflet({ canchas, onSelectCancha, modoAgregar = false, onMapClick }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const markersRef = useRef<Map<string, import('leaflet').Marker>>(new Map());
  const tempMarkerRef = useRef<import('leaflet').Marker | null>(null);
  const mapClickHandlerRef = useRef<((e: import('leaflet').LeafletMouseEvent) => void) | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const L = require('leaflet') as typeof import('leaflet');

    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

    const map = L.map(mapContainerRef.current, {
      center: [-33.46, -70.645],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    leafletMapRef.current = map;

    // Fix tile rendering on first load
    const sizeTimer = setTimeout(() => {
      if (leafletMapRef.current) leafletMapRef.current.invalidateSize();
    }, 150);

    // Center on user's location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 14);
          }
        },
        () => {}
      );
    }

    return () => {
      clearTimeout(sizeTimer);
      markersRef.current.clear();
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Update markers when canchas changes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const L = require('leaflet') as typeof import('leaflet');
    const currentIds = new Set(canchas.map((c) => c.id));

    // Remove markers no longer in canchas
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    canchas.forEach((cancha) => {
      if (markersRef.current.has(cancha.id)) return;

      const iconSize: [number, number] = cancha.estado === 'king' ? [24, 24] : [18, 18];
      const iconAnchor: [number, number] = cancha.estado === 'king' ? [12, 12] : [9, 9];

      const icon = L.divIcon({
        className: '',
        html: buildMarkerHtml(cancha.estado),
        iconSize,
        iconAnchor,
        popupAnchor: [0, -iconAnchor[1] - 4],
      });

      const popup = L.popup({
        className: 'kotc-popup',
        closeButton: true,
        maxWidth: 220,
      }).setContent(buildPopupHtml(cancha));

      const marker = L.marker([cancha.lat, cancha.lng], { icon }).addTo(map);
      marker.bindPopup(popup);
      marker.on('click', () => {
        onSelectCancha(cancha);
        marker.openPopup();
      });

      markersRef.current.set(cancha.id, marker);
    });
  }, [canchas, onSelectCancha]);

  // Handle modoAgregar
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const L = require('leaflet') as typeof import('leaflet');

    if (modoAgregar) {
      map.getContainer().style.cursor = 'crosshair';

      const handler = (e: import('leaflet').LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        // Remove old temp marker
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove();
          tempMarkerRef.current = null;
        }

        // Add temp marker
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#F5C344;border:2px solid #fff;box-shadow:0 0 12px #F5C344;display:flex;align-items:center;justify-content:center;font-size:11px">+</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        tempMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map);

        if (onMapClick) onMapClick(lat, lng);
      };

      mapClickHandlerRef.current = handler;
      map.on('click', handler);
    } else {
      map.getContainer().style.cursor = '';

      if (mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
        mapClickHandlerRef.current = null;
      }

      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    }
  }, [modoAgregar, onMapClick]);

  return (
    <>
      <style>{`
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-container {
          background: #0d0e10;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </>
  );
}
