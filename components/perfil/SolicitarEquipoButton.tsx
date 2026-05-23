'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  equipoId: string;
  equipoNombre: string;
}

export function SolicitarEquipoButton({ equipoId, equipoNombre }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnviar = async () => {
    setError(null);
    const res = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipo_id: equipoId, mensaje: mensaje.trim() || null }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Error al enviar solicitud');
      return;
    }

    setSent(true);
    setOpen(false);
    startTransition(() => router.refresh());
  };

  if (sent) {
    return (
      <div className="bg-status-libre/10 border border-status-libre/30 rounded-xl p-4 text-center">
        <div className="text-[15px] mb-1">✅</div>
        <p className="text-[13px] font-medium text-status-libre">Solicitud enviada</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          El equipo revisará tu solicitud y te notificará su decisión.
        </p>
      </div>
    );
  }

  if (open) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[13px] font-semibold text-on-surface mb-1">
          Solicitar unirse a {equipoNombre}
        </div>
        <p className="text-[11px] text-on-surface-variant mb-3">
          Escribe un mensaje opcional para presentarte al equipo.
        </p>
        <textarea
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Ej: Tengo experiencia en 5v5, juego de base..."
          className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-[13px] text-on-surface placeholder:text-outline resize-none focus:outline-none focus:border-outline transition-colors mb-3"
        />
        {error && (
          <p className="text-[11px] text-error mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleEnviar}
            disabled={isPending}
            className="flex-1 bg-accent text-on-accent font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Enviando...' : 'Enviar solicitud'}
          </button>
          <button
            onClick={() => { setOpen(false); setError(null); }}
            disabled={isPending}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant text-[13px] py-2.5 rounded-lg hover:border-outline transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full bg-accent text-on-accent font-semibold text-[14px] py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer min-h-[48px]"
    >
      Solicitar unirme a este equipo
    </button>
  );
}
