'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EquipoInvite {
  id: string;
  nombre: string;
  color: string;
  deporte: string;
  modalidad: string;
  ciudad: string;
}

interface InvitacionRow {
  id: string;
  equipo_id: string;
  token: string;
  created_at: string;
  equipos: EquipoInvite | EquipoInvite[] | null;
  profiles: { display_name: string | null; username: string } | null;
}

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol:     '⚽',
  voleibol:   '🏐',
  tenis:      '🎾',
  padel:      '🏓',
};

export function InvitacionesRecibidas() {
  const [invitaciones, setInvitaciones] = useState<InvitacionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/invitaciones?tipo=recibidas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setInvitaciones(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null; // no flash
  if (invitaciones.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Banner de notificación */}
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-error text-white text-[10px] font-bold flex-shrink-0">
          {invitaciones.length}
        </span>
        <span className="text-[13px] font-semibold text-on-surface">
          Invitación{invitaciones.length !== 1 ? 'es' : ''} pendiente{invitaciones.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {invitaciones.map(inv => {
          const equipo = Array.isArray(inv.equipos) ? inv.equipos[0] : inv.equipos;
          if (!equipo) return null;

          const invitadorNombre = inv.profiles?.display_name ?? inv.profiles?.username ?? 'Alguien';
          const emoji = DEPORTE_EMOJI[equipo.deporte] ?? '🏟️';
          const color = equipo.color ?? '#F5C344';
          const words = equipo.nombre.trim().split(/\s+/);
          const iniciales = words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : equipo.nombre.slice(0, 2).toUpperCase();

          return (
            <div
              key={inv.id}
              className="bg-surface-container-low border border-outline-variant rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar equipo */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0 border"
                  style={{ background: `${color}15`, color, borderColor: `${color}40` }}
                >
                  {iniciales}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate" style={{ color }}>
                    {equipo.nombre}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    {emoji} {equipo.deporte} · {equipo.modalidad}
                    {equipo.ciudad ? ` · 📍 ${equipo.ciudad}` : ''}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant mb-3">
                <span className="text-on-surface font-medium">{invitadorNombre}</span> te invitó a unirte a este equipo.
              </p>

              <div className="flex gap-2">
                <Link
                  href={`/join/${inv.equipo_id}/${inv.token}`}
                  className="flex-1 bg-accent text-on-accent text-center font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-90 transition-opacity min-h-[44px] flex items-center justify-center"
                >
                  Aceptar invitación
                </Link>
                <Link
                  href={`/equipos/${inv.equipo_id}`}
                  className="px-4 bg-surface-container border border-outline-variant text-on-surface-variant text-[12px] py-2.5 rounded-lg hover:border-outline transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Ver equipo
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
