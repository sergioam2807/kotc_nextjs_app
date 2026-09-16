'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { nombreNivel } from '@/lib/levels';

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
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab, var(--color-outline-variant) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--color-outline-variant) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="bg-surface rounded-[16px] p-8">
          {/* Progress bar + skip */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-1.5">
              {PASOS.map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-[3px] rounded-full transition-colors ${
                    i < paso ? 'bg-accent' : i === paso - 1 ? 'bg-accent/50' : 'bg-outline-variant'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="kotc-tap-target flex items-center justify-center text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Saltar
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-[11px] text-accent tracking-[0.1em] font-medium mb-2 uppercase">
              Paso {paso} de {PASOS.length}
            </div>
            <h2 className="text-[22px] font-medium text-on-surface mb-1.5">
              {paso === 1 && '¡Bienvenido al court!'}
              {paso === 2 && '¿En qué deportes quieres ser King?'}
              {paso === 3 && 'Crea o únete a un equipo'}
              {paso === 4 && 'Explora las canchas cercanas'}
            </h2>
            <p className="text-[14px] text-on-surface-variant">
              {paso === 1 && 'Tu cuenta está lista. Vamos a configurar tu perfil.'}
              {paso === 2 && 'Selecciona uno o más. Podrás agregar más después.'}
              {paso === 3 && 'En el siguiente paso podrás crear tu equipo o unirte a uno desde el inicio.'}
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
                    className={`bg-surface-container-low border rounded-[12px] py-4 px-2.5 text-center transition-all relative ${
                      selected
                        ? 'border-accent bg-accent-dim cursor-pointer'
                        : disabled
                        ? 'border-outline-variant opacity-40 cursor-not-allowed'
                        : 'border-outline-variant hover:border-outline cursor-pointer'
                    }`}
                  >
                    <div className="text-[26px] mb-2">{deporte.emoji}</div>
                    <div className={`text-[13px] font-medium ${selected ? 'text-accent' : 'text-on-surface-variant'}`}>
                      {deporte.nombre}
                    </div>
                    {disabled ? (
                      <div className="text-[9px] text-outline mt-1.5">Próximamente</div>
                    ) : (
                      <div
                        className={`w-4 h-4 rounded-full border mx-auto mt-1.5 flex items-center justify-center text-[10px] ${
                          selected ? 'bg-accent border-accent text-on-accent' : 'border-outline'
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
            <div className="flex flex-col items-center justify-center gap-3 h-32 text-outline text-[13px] mb-6">
              {paso === 1 && '🏀 Prepárate para conquistar canchas'}
              {paso === 3 && '👥 Crea tu equipo o recibe una invitación'}
              {paso === 4 && (
                <>
                  <span>🗺️ El mapa territorial te espera</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-dim text-accent">
                    Nivel 1 · {nombreNivel(1)}
                  </span>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleContinuar}
            disabled={(paso === 2 && deportesSeleccionados.length === 0) || guardando}
            className="w-full min-h-11 bg-accent text-on-accent border-none rounded-[8px] py-3.5 text-[14px] font-medium cursor-pointer hover:brightness-95 transition-all disabled:bg-surface-container disabled:text-outline disabled:cursor-not-allowed mb-2.5"
          >
            {guardando ? 'Guardando...' : paso === 4 ? 'Ir al mapa' : 'Continuar'}
          </button>

          {paso > 1 && (
            <button
              onClick={() => setPaso(p => p - 1)}
              className="kotc-tap-target w-full flex items-center justify-center bg-transparent text-on-surface-variant border-none text-[13px] cursor-pointer hover:text-on-surface transition-colors"
            >
              ← Volver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
