'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';

interface Equipo { id: string; nombre: string; color: string; ciudad?: string | null }

interface LigaEquipo {
  id: string;
  equipo_id: string;
  estado: string;
  grupo?: string | null;
  seed?: number | null;
  equipos: Equipo;
}

interface AdminEquiposPanelProps {
  ligaId: string;
  ligaEquipos: LigaEquipo[];
  formato: string;
  estadoLiga: string;
  maxEquipos: number;
}

const GRUPOS_OPTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function AdminEquiposPanel({
  ligaId, ligaEquipos, formato, estadoLiga, maxEquipos,
}: AdminEquiposPanelProps) {
  const router = useRouter();
  const [invitarId,  setInvitarId]  = useState('');
  const [loading,    setLoading]    = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const aceptados = ligaEquipos.filter(le => le.estado === 'aceptado');
  const invitados = ligaEquipos.filter(le => le.estado === 'invitado');

  const puedeInvitar = ['borrador', 'inscripciones'].includes(estadoLiga);
  const puedeAsignarGrupo = formato === 'grupos_playoffs' && estadoLiga === 'inscripciones';

  // -------------------------------------------------------------------------
  async function callApi(path: string, method: string, body?: object) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'Error');
  }

  async function handleAceptar(equipoId: string) {
    setLoading(`accept-${equipoId}`);
    setError(null);
    try {
      await callApi(`/api/ligas/${ligaId}/equipos/${equipoId}`, 'PATCH', { estado: 'aceptado' });
      router.refresh();
    } catch (e) { setError((e as Error).message); }
    setLoading(null);
  }

  async function handleRechazar(equipoId: string) {
    setLoading(`reject-${equipoId}`);
    setError(null);
    try {
      await callApi(`/api/ligas/${ligaId}/equipos/${equipoId}`, 'PATCH', { estado: 'rechazado' });
      router.refresh();
    } catch (e) { setError((e as Error).message); }
    setLoading(null);
  }

  async function handleEliminar(equipoId: string) {
    setLoading(`del-${equipoId}`);
    setError(null);
    try {
      await callApi(`/api/ligas/${ligaId}/equipos/${equipoId}`, 'DELETE');
      router.refresh();
    } catch (e) { setError((e as Error).message); }
    setLoading(null);
  }

  async function handleGrupo(equipoId: string, grupo: string) {
    setLoading(`grupo-${equipoId}`);
    setError(null);
    try {
      await callApi(`/api/ligas/${ligaId}/equipos/${equipoId}`, 'PATCH', { grupo });
      router.refresh();
    } catch (e) { setError((e as Error).message); }
    setLoading(null);
  }

  async function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    if (!invitarId.trim()) return;
    setLoading('invite');
    setError(null);
    try {
      await callApi(`/api/ligas/${ligaId}/equipos`, 'POST', { equipo_id: invitarId.trim() });
      setInvitarId('');
      router.refresh();
    } catch (e) { setError((e as Error).message); }
    setLoading(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-on-surface">
            Equipos ({aceptados.length}/{maxEquipos})
          </div>
          {invitados.length > 0 && (
            <div className="text-[11px] text-on-surface-variant mt-0.5">
              {invitados.length} invitación{invitados.length !== 1 ? 'es' : ''} pendiente{invitados.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/25 rounded-lg px-3 py-2 text-[12px] text-error">
          {error}
        </div>
      )}

      {/* Pending invites */}
      {invitados.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium">
            Solicitudes / invitaciones pendientes
          </div>
          {invitados.map(le => {
            const ini = le.equipos.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            return (
              <div key={le.id} className="bg-surface-container border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: `${le.equipos.color}20`, color: le.equipos.color }}
                >{ini}</div>
                <span className="flex-1 text-[13px] text-on-surface font-medium truncate">{le.equipos.nombre}</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleAceptar(le.equipo_id)}
                    disabled={loading === `accept-${le.equipo_id}`}
                    className="bg-status-libre/15 text-status-libre border-none rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:bg-status-libre/25 transition-colors disabled:opacity-50"
                  >
                    {loading === `accept-${le.equipo_id}` ? '…' : 'Aceptar'}
                  </button>
                  <button
                    onClick={() => handleRechazar(le.equipo_id)}
                    disabled={loading === `reject-${le.equipo_id}`}
                    className="bg-surface-container-low text-outline border border-outline-variant rounded-md px-2.5 py-1 text-[11px] cursor-pointer hover:text-error hover:border-error/40 transition-colors disabled:opacity-50"
                  >
                    {loading === `reject-${le.equipo_id}` ? '…' : 'Rechazar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accepted teams */}
      {aceptados.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium">
            Equipos aceptados
          </div>
          {aceptados.map(le => {
            const ini = le.equipos.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
            return (
              <div key={le.id} className="bg-surface-container border border-outline-variant rounded-lg p-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: `${le.equipos.color}20`, color: le.equipos.color }}
                >{ini}</div>
                <span className="flex-1 text-[13px] text-on-surface font-medium truncate">{le.equipos.nombre}</span>

                {/* Grupo selector */}
                {puedeAsignarGrupo && (
                  <select
                    value={le.grupo ?? ''}
                    onChange={e => handleGrupo(le.equipo_id, e.target.value)}
                    disabled={loading === `grupo-${le.equipo_id}`}
                    className="bg-surface-container-low border border-outline-variant rounded-md px-2 py-1 text-[11px] text-on-surface outline-none focus:border-accent/60"
                  >
                    <option value="">Sin grupo</option>
                    {GRUPOS_OPTS.map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                )}

                {/* Grupo badge (read-only after en_curso) */}
                {!puedeAsignarGrupo && le.grupo && (
                  <Badge variant="neutral">Grupo {le.grupo}</Badge>
                )}

                <button
                  onClick={() => handleEliminar(le.equipo_id)}
                  disabled={!!loading}
                  className="text-outline border-none bg-transparent cursor-pointer hover:text-error transition-colors p-1 disabled:opacity-30"
                  title="Retirar equipo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite by equipo_id */}
      {puedeInvitar && (
        <form onSubmit={handleInvitar} className="flex gap-2">
          <input
            type="text"
            value={invitarId}
            onChange={e => setInvitarId(e.target.value)}
            placeholder="ID del equipo a invitar"
            className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={loading === 'invite' || !invitarId.trim()}
            className="bg-accent text-on-accent border-none rounded-lg px-4 py-2 text-[12px] font-semibold cursor-pointer hover:brightness-95 transition-all disabled:opacity-50"
          >
            {loading === 'invite' ? '…' : 'Invitar'}
          </button>
        </form>
      )}

      {aceptados.length === 0 && invitados.length === 0 && (
        <p className="text-[12px] text-on-surface-variant text-center py-4">
          Aún no hay equipos en esta liga. Invita o abre inscripciones públicas.
        </p>
      )}
    </div>
  );
}
