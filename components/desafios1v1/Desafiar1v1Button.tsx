'use client';

import { useState } from 'react';

interface Props {
  retadoId: string;
  retadoNombre: string;
  /** Pre-hydrated from server: is there already a pending 1v1 between these two? */
  desafioPendienteId?: string | null;
}

type Step = 'idle' | 'form' | 'loading' | 'pendiente' | 'enviado' | 'error';

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
};

export function Desafiar1v1Button({ retadoId, retadoNombre, desafioPendienteId }: Props) {
  const [step, setStep] = useState<Step>(desafioPendienteId ? 'pendiente' : 'idle');
  const [mensaje, setMensaje] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [desafioId, setDesafioId] = useState<string | null>(desafioPendienteId ?? null);

  // ── Enviar desafío ─────────────────────────────────────────────────────────
  const handleEnviar = async () => {
    setStep('loading');
    setErrorMsg(null);

    const res = await fetch('/api/desafios-1v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        retado_id: retadoId,
        deporte: 'basketball',
        formato: '1v1',
        mensaje: mensaje.trim() || null,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErrorMsg(data.error ?? 'Error al enviar el desafío');
      setStep('form');
      return;
    }

    setDesafioId(data.desafio?.id ?? null);
    setStep('enviado');
  };

  // ── Cancelar desafío pendiente ─────────────────────────────────────────────
  const handleCancelar = async () => {
    if (!desafioId) return;
    setCancelando(true);
    await fetch(`/api/desafios-1v1/${desafioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'cancelar' }),
    });
    setCancelando(false);
    setDesafioId(null);
    setStep('idle');
  };

  // ── Estados ─────────────────────────────────────────────────────────────────

  if (step === 'pendiente') {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px]">⏳</span>
            <div>
              <div className="text-[12px] font-semibold text-on-surface">Desafío 1v1 pendiente</div>
              <p className="text-[11px] text-on-surface-variant">Esperando respuesta de {retadoNombre}</p>
            </div>
          </div>
          <button
            onClick={handleCancelar}
            disabled={cancelando}
            className="text-[11px] text-error hover:underline cursor-pointer disabled:opacity-40 flex-shrink-0 ml-2"
          >
            {cancelando ? '…' : 'Cancelar'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'enviado') {
    return (
      <div className="bg-status-libre/8 border border-status-libre/25 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] flex-shrink-0">✅</span>
          <div>
            <div className="text-[12px] font-semibold text-on-surface">
              ¡Desafío 1v1 enviado a {retadoNombre}!
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {DEPORTE_EMOJI['basketball']} Basketball · Recibirá una notificación en la app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold text-on-surface">
            ⚔️ Desafiar 1v1 a {retadoNombre}
          </div>
          <button
            onClick={() => { setStep('idle'); setErrorMsg(null); setMensaje(''); }}
            className="text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="text-[11px] text-on-surface-variant mb-3">
          🏀 Basketball · Formato 1v1
        </div>

        <textarea
          placeholder={`Mensaje para ${retadoNombre} (opcional)`}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          maxLength={300}
          rows={2}
          className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder:text-outline resize-none focus:outline-none focus:border-outline mb-3"
        />

        {errorMsg && (
          <p className="text-[11px] text-error mb-2">{errorMsg}</p>
        )}

        <button
          onClick={handleEnviar}
          className="w-full bg-accent text-on-accent font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-90 transition-opacity cursor-pointer min-h-[44px]"
        >
          Enviar desafío
        </button>
      </div>
    );
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  return (
    <button
      onClick={() => setStep('form')}
      className="w-full border-2 border-accent/40 bg-accent/8 text-accent hover:bg-accent/15 font-semibold text-[13px] py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
    >
      <span>⚔️</span>
      <span>Desafiar 1v1</span>
    </button>
  );
}
