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
  libre: '#4ade80',
  king: '#ffe083',
  rival: '#f87171',
};

const ESTADO_LABELS = {
  libre: '🟢 LIBRE',
  king: '👑 KING',
  rival: '🔴 RIVAL',
};

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function buildMarkerSvg(cancha: CanchaConEstado): string {
  if (cancha.estado === 'libre') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50"><circle cx="20" cy="20" r="19" fill="#4ade80" /><circle cx="20" cy="20" r="14" fill="#14532d" /><text x="20" y="26" text-anchor="middle" fill="#4ade80" font-size="16" font-family="Arial, sans-serif">🏀</text><polygon points="14,37 20,50 26,37" fill="#4ade80" /></svg>`;
  }
  const ringColor = cancha.estado === 'king' ? '#ffe083' : '#f87171';
  const initials = getInitials(cancha.equipoNombre);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50"><circle cx="20" cy="20" r="19" fill="${ringColor}" /><circle cx="20" cy="20" r="14" fill="#111827" /><text x="20" y="25" text-anchor="middle" fill="${ringColor}" font-size="12" font-weight="bold" font-family="Arial, sans-serif">${initials}</text><polygon points="14,37 20,50 26,37" fill="${ringColor}" /></svg>`;
}

function buildMarkerHtml(cancha: CanchaConEstado): string {
  const svg = buildMarkerSvg(cancha);
  return `<div style="width:40px;height:50px;display:flex;align-items:center;justify-content:center">${svg}</div>`;
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

      const iconSize: [number, number] = [40, 50];
      const iconAnchor: [number, number] = [20, 50];

      const icon = L.divIcon({
        className: '',
        html: buildMarkerHtml(cancha),
        iconSize,
        iconAnchor,
        popupAnchor: [0, -50 - 4],
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
