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
    <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[12px] p-4">
      <div className="flex gap-1 mb-3.5">
        {(['email', 'whatsapp', 'link'] as MetodoInvitacion[]).map(m => (
          <button
            key={m}
            onClick={() => setMetodo(m)}
            className={`px-3.5 py-1.5 rounded-[6px] text-[12px] border-none cursor-pointer transition-colors capitalize ${
              metodo === m ? 'bg-[#18180f] text-[#F5C344]' : 'bg-[#1a1a1f] text-[#555] hover:text-[#888]'
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
            className="flex-1 bg-[#0a0a0c] border border-[#2a2a2a] rounded-[8px] px-3 py-2 text-[13px] text-[#ddd] placeholder-[#333] outline-none focus:border-[#F5C34460] transition-colors"
          />
          <Button onClick={handleEnviar} disabled={!valor || enviando} size="md">
            {enviando ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 bg-[#0a0a0c] border border-[#2a2a2a] rounded-[8px] px-3 py-2 text-[12px] text-[#555] truncate font-mono">
            {linkInvitacion || 'kotc.app/join/...'}
          </div>
          <Button onClick={handleCopiarLink} size="md">
            Copiar
          </Button>
        </div>
      )}

      {mensaje && (
        <p className="mt-2 text-[12px] text-[#5a9e5a]">{mensaje}</p>
      )}
    </div>
  );
}
