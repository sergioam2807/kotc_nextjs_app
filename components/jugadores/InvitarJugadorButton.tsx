'use client';

import { useState, useTransition } from 'react';

interface Props {
  equipoId: string;
  equipoNombre: string;
  jugadorId: string;
  jugadorNombre: string;
}

export function InvitarJugadorButton({ equipoId, equipoNombre, jugadorId, jugadorNombre }: Props) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'idle' | 'loading' | 'done'>('idle');
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvitar = async () => {
    setError(null);
    setStep('loading');

    const res = await fetch('/api/invitaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipo_id: equipoId,
        metodo: 'directo',
        valor: '',
        jugador_id: jugadorId,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Error al generar invitación');
      setStep('idle');
      return;
    }

    const joinUrl = data.joinUrl ?? `${window.location.origin}/join/${equipoId}/${data.token}`;
    setLink(joinUrl);
    startTransition(() => setStep('done'));
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  };

  const handleWhatsApp = () => {
    if (!link) return;
    const texto = encodeURIComponent(
      `Hola ${jugadorNombre}! Te invito a unirte a *${equipoNombre}* en KOTC 🏀\n\n${link}`,
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  if (step === 'done' && link) {
    return (
      <div className="bg-status-libre/8 border border-status-libre/25 rounded-xl p-4">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-[16px] flex-shrink-0">✅</span>
          <div>
            <div className="text-[12px] font-semibold text-on-surface">
              Invitación enviada a {jugadorNombre}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Verá la invitación la próxima vez que abra la app.
              Si quieres avisarle ya, comparte el link por WhatsApp.
            </p>
          </div>
        </div>

        {/* Link colapsable */}
        <details className="mb-3">
          <summary className="text-[11px] text-accent cursor-pointer hover:underline select-none">
            Ver link de invitación
          </summary>
          <div className="mt-2 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[11px] text-on-surface-variant font-mono break-all select-all">
            {link}
          </div>
        </details>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface-variant font-semibold text-[12px] py-2 rounded-lg hover:border-outline transition-colors cursor-pointer"
          >
            {copied ? '✓ Copiado' : 'Copiar link'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 font-semibold text-[12px] py-2 rounded-lg hover:bg-[#25D366]/25 transition-colors cursor-pointer"
          >
            WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="text-[11px] text-error mb-2 text-center">{error}</p>
      )}
      <button
        onClick={handleInvitar}
        disabled={step === 'loading' || isPending}
        className="w-full bg-accent text-on-accent font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer min-h-[44px]"
      >
        {step === 'loading' ? 'Enviando invitación...' : `Invitar a ${jugadorNombre}`}
      </button>
    </div>
  );
}
