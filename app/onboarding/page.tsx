'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// MVP: Basketball activo. El resto "próximamente".
const DEPORTES = [
  { id: 'basketball', nombre: 'Basketball', emoji: '🏀', proximamente: false },
  { id: 'futbol',     nombre: 'Fútbol',     emoji: '⚽', proximamente: true  },
  { id: 'voleibol',   nombre: 'Vóleibol',   emoji: '🏐', proximamente: true  },
  { id: 'tenis',      nombre: 'Tenis',      emoji: '🎾', proximamente: true  },
  { id: 'padel',      nombre: 'Pádel',      emoji: '🏓', proximamente: true  },
];

const PASOS = ['Cuenta', 'Deportes', 'Equipo', 'Mapa'];

export default function OnboardingPage() {
  const [paso, setPaso] = useState(1);
  const [deportesSeleccionados, setDeportesSeleccionados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const router = useRouter();

  const toggleDeporte = (id: string) => {
    const d = DEPORTES.find(x => x.id === id);
    if (!d || d.proximamente) return;
    setDeportesSeleccionados(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleContinuar = async () => {
    if (paso === 1) {
      setPaso(2);
    } else if (paso === 2) {
      setGuardando(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ deportes_activos: deportesSeleccionados })
          .eq('id', user.id);
      }
      setGuardando(false);
      setPaso(3);
    } else if (paso === 3) {
      setPaso(4);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#080809] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a1a2210 1px, transparent 1px), linear-gradient(90deg, #1a1a2210 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="bg-[#080809] rounded-[16px] p-8">
          {/* Progress bar */}
          <div className="flex gap-1.5 justify-center mb-8">
            {PASOS.map((_, i) => (
              <div
                key={i}
                className={`w-6 h-[3px] rounded-full transition-colors ${
                  i < paso ? 'bg-[#F5C344]' : i === paso - 1 ? 'bg-[#F5C34480]' : 'bg-[#1e1e24]'
                }`}
              />
            ))}
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-[11px] text-[#F5C344] tracking-[0.1em] font-medium mb-2 uppercase">
              Paso {paso} de {PASOS.length}
            </div>
            <h2 className="text-[22px] font-medium text-white mb-1.5">
              {paso === 1 && '¡Bienvenido al court!'}
              {paso === 2 && '¿En qué deportes quieres ser King?'}
              {paso === 3 && 'Crea o únete a un equipo'}
              {paso === 4 && 'Explora las canchas cercanas'}
            </h2>
            <p className="text-[14px] text-[#555]">
              {paso === 1 && 'Tu cuenta está lista. Vamos a configurar tu perfil.'}
              {paso === 2 && 'Selecciona uno o más. Podrás agregar más después.'}
              {paso === 3 && 'Los equipos compiten juntos en las canchas.'}
              {paso === 4 && 'El mapa muestra las canchas públicas de tu ciudad.'}
            </p>
          </div>

          {/* Paso 2: Selección de deportes */}
          {paso === 2 && (
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {DEPORTES.map(deporte => {
                const selected = deportesSeleccionados.includes(deporte.id);
                const disabled = deporte.proximamente;
                return (
                  <button
                    key={deporte.id}
                    onClick={() => toggleDeporte(deporte.id)}
                    disabled={disabled}
                    className={`bg-[#111114] border rounded-[12px] py-4 px-2.5 text-center transition-all relative ${
                      selected
                        ? 'border-[#F5C344] bg-[#18180f] cursor-pointer'
                        : disabled
                        ? 'border-[#1e1e24] opacity-40 cursor-not-allowed'
                        : 'border-[#1e1e24] hover:border-[#333] cursor-pointer'
                    }`}
                  >
                    <div className="text-[26px] mb-2">{deporte.emoji}</div>
                    <div className={`text-[13px] font-medium ${selected ? 'text-[#F5C344]' : 'text-[#888]'}`}>
                      {deporte.nombre}
                    </div>
                    {disabled ? (
                      <div className="text-[9px] text-[#444] mt-1.5">Próximamente</div>
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full border mx-auto mt-1.5 flex items-center justify-center text-[10px] ${
                          selected ? 'bg-[#F5C344] border-[#F5C344] text-[#080809]' : 'border-[#333]'
                        }`}
                      >
                        {selected && '✓'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Otros pasos: placeholder */}
          {paso !== 2 && (
            <div className="h-32 flex items-center justify-center text-[#333] text-[13px] mb-6">
              {paso === 1 && '🏀 Prepárate para conquistar canchas'}
              {paso === 3 && '👥 Crea tu equipo o recibe una invitación'}
              {paso === 4 && '🗺️ El mapa territorial te espera'}
            </div>
          )}

          <button
            onClick={handleContinuar}
            disabled={(paso === 2 && deportesSeleccionados.length === 0) || guardando}
            className="w-full bg-[#F5C344] text-[#080809] border-none rounded-[8px] py-3.5 text-[14px] font-medium cursor-pointer hover:bg-[#e8b53d] transition-colors disabled:bg-[#2a2a2a] disabled:text-[#444] disabled:cursor-not-allowed mb-2.5"
          >
            {guardando ? 'Guardando...' : paso === 4 ? 'Ir al mapa' : 'Continuar'}
          </button>

          {paso > 1 && (
            <button
              onClick={() => setPaso(p => p - 1)}
              className="w-full bg-transparent text-[#444] border-none text-[13px] cursor-pointer py-1.5 hover:text-[#666] transition-colors"
            >
              ← Volver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
