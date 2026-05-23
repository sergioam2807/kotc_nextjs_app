'use client';

import { useState, useTransition } from 'react';

interface Props {
  equipoId: string;
  equipoNombre: string;
  jugadorNombre: string;
}

export function InvitarJugadorButton({ equipoId, equipoNombre, jugadorNombre }: Props) {
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
      body: JSON.stringify({ equipo_id: equipoId, metodo: 'link', valor: '' }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Error al generar invitación');
      setStep('idle');
      return;
    }

    const joinUrl = `${window.location.origin}/join/${equipoId}/${data.token}`;
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
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[12px] font-semibold text-on-surface mb-1">
          ✅ Invitación generada para {jugadorNombre}
        </div>
        <p className="text-[11px] text-on-surface-variant mb-3">
          Comparte este link. Expira en 48 horas.
        </p>
        {/* Link display */}
        <div className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-[11px] text-on-surface-variant font-mono break-all mb-3 select-all">
          {link}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 bg-accent text-on-accent font-semibold text-[12px] py-2.5 rounded-lg hover:opacity-90 transition-opacity cursor-pointer min-h-[40px]"
          >
            {copied ? '✓ Copiado' : 'Copiar link'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 font-semibold text-[12px] py-2.5 rounded-lg hover:bg-[#25D366]/25 transition-colors cursor-pointer min-h-[40px]"
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
        disabled={step === 'loading'}
        className="w-full bg-accent text-on-accent font-semibold text-[13px] py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer min-h-[44px]"
      >
        {step === 'loading' ? 'Generando...' : `Invitar a ${equipoNombre}`}
      </button>
    </div>
  );
}
