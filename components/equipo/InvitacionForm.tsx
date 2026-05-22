'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

type MetodoInvitacion = 'email' | 'whatsapp' | 'link';

interface InvitacionFormProps {
  equipoId: string;
  linkToken?: string;
}

export function InvitacionForm({ equipoId, linkToken }: InvitacionFormProps) {
  const [metodo, setMetodo] = useState<MetodoInvitacion>('email');
  const [valor, setValor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const linkInvitacion = linkToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${equipoId}/${linkToken}`
    : '';

  const handleEnviar = async () => {
    if (!valor && metodo !== 'link') return;
    setEnviando(true);
    try {
      const res = await fetch('/api/invitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipo_id: equipoId, metodo, valor }),
      });
      if (res.ok) {
        setMensaje('Invitación enviada correctamente');
        setValor('');
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkInvitacion);
    setMensaje('Link copiado al portapapeles');
    setTimeout(() => setMensaje(''), 2000);
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
      <div className="flex gap-1 mb-3.5">
        {(['email', 'whatsapp', 'link'] as MetodoInvitacion[]).map(m => (
          <button
            key={m}
            onClick={() => setMetodo(m)}
            className={`px-3.5 py-1.5 rounded-md text-[12px] border-none cursor-pointer transition-colors capitalize font-medium ${
              metodo === m
                ? 'bg-accent-dim text-accent'
                : 'bg-surface-container text-outline hover:text-on-surface-variant'
            }`}
          >
            {m === 'email' ? 'Email' : m === 'whatsapp' ? 'WhatsApp' : 'Link'}
          </button>
        ))}
      </div>

      {metodo !== 'link' ? (
        <div className="flex gap-2">
          <input
            type={metodo === 'email' ? 'email' : 'tel'}
            placeholder={metodo === 'email' ? 'correo@ejemplo.com' : '+56 9 1234 5678'}
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface placeholder:text-outline/50 outline-none focus:border-accent/40 transition-colors"
          />
          <Button onClick={handleEnviar} disabled={!valor || enviando} size="md">
            {enviando ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[12px] text-outline truncate font-mono">
            {linkInvitacion || 'kotc.app/join/...'}
          </div>
          <Button onClick={handleCopiarLink} size="md">
            Copiar
          </Button>
        </div>
      )}

      {mensaje && (
        <p className="mt-2 text-[12px] text-status-libre">{mensaje}</p>
      )}
    </div>
  );
}
