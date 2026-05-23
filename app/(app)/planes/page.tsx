import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

// Datos del plan — editar aquí para cambiar precios/features sin tocar HTML
const PLAN_ORGANIZADOR = {
  precio:       '$9.990',
  periodo:      '/mes',
  // Actualiza este enlace con tu número de WhatsApp o email de contacto
  ctaWhatsapp:  'https://wa.me/56912345678?text=Hola%2C%20me%20interesa%20el%20plan%20Organizador%20de%20KOTC',
  ctaEmail:     'mailto:contacto@kotc.cl?subject=Plan%20Organizador%20KOTC',
};

const FREE_FEATURES = [
  'Mapa de canchas deportivas',
  'Desafíos territoriales entre equipos',
  'Ranking de equipos y jugadores',
  'Perfil de jugador con estadísticas',
  'Historial de equipos',
  'Sistema de niveles y XP',
];

const ORG_FEATURES = [
  'Todo lo del plan gratuito',
  'Crear y gestionar ligas',
  'Múltiples formatos: liga, eliminación, grupos',
  'Calendario de partidos automático',
  'Tabla de posiciones en tiempo real',
  'Bracket de playoffs interactivo',
  'Panel de administración completo',
  'Hasta 32 equipos por liga',
  'Registro de resultados y estadísticas',
];

export default async function PlanesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verificar si el usuario ya tiene suscripción activa
  const { data: suscripcion } = user
    ? await supabase
        .from('suscripciones')
        .select('plan, fecha_fin')
        .eq('user_id', user.id)
        .eq('estado', 'activa')
        .gte('fecha_fin', new Date().toISOString().split('T')[0])
        .maybeSingle()
    : { data: null };

  const tieneOrganizador = !!suscripcion;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5">
        ← Inicio
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-[32px] mb-2">🏆</div>
        <h1 className="text-[22px] font-bold text-on-surface mb-2">Planes KOTC</h1>
        <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-sm mx-auto">
          La plataforma base es gratuita. El plan Organizador desbloquea la gestión completa de ligas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Plan Gratuito */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[16px] font-semibold text-on-surface">Gratuito</h2>
              {user && !tieneOrganizador && (
                <Badge variant="green">Tu plan</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[28px] font-bold text-on-surface">$0</span>
              <span className="text-[13px] text-on-surface-variant">siempre</span>
            </div>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Todas las funciones de desafíos territoriales, sin costo.
            </p>
          </div>

          <ul className="flex flex-col gap-2 flex-1 mb-5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-[12px] text-on-surface-variant">
                <span className="text-status-libre mt-0.5 flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {!user ? (
            <Link
              href="/login"
              className="w-full text-center bg-surface-container border border-outline-variant rounded-lg py-2.5 text-[13px] font-medium text-on-surface-variant hover:border-outline transition-colors"
            >
              Crear cuenta gratuita
            </Link>
          ) : (
            <div className="w-full text-center bg-surface-container border border-outline-variant rounded-lg py-2.5 text-[12px] text-on-surface-variant">
              Plan actual
            </div>
          )}
        </div>

        {/* Plan Organizador */}
        <div className={`relative bg-surface-container-low rounded-xl p-5 flex flex-col ${
          tieneOrganizador
            ? 'border-2 border-accent'
            : 'border border-outline-variant'
        }`}>
          {/* Popular badge */}
          {!tieneOrganizador && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent text-on-accent text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Para organizadores
              </span>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[16px] font-semibold text-on-surface">Organizador</h2>
              {tieneOrganizador && (
                <Badge variant="accent">Activo ✓</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[28px] font-bold text-accent">{PLAN_ORGANIZADOR.precio}</span>
              <span className="text-[13px] text-on-surface-variant">{PLAN_ORGANIZADOR.periodo}</span>
            </div>
            {tieneOrganizador && suscripcion?.fecha_fin && (
              <p className="text-[11px] text-on-surface-variant mb-1">
                Activo hasta{' '}
                <strong className="text-on-surface">
                  {new Date(suscripcion.fecha_fin).toLocaleDateString('es-CL', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </strong>
              </p>
            )}
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Gestiona ligas completas con estadísticas, brackets y calendarios.
            </p>
          </div>

          <ul className="flex flex-col gap-2 flex-1 mb-5">
            {ORG_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-[12px] text-on-surface-variant">
                <span className={`mt-0.5 flex-shrink-0 ${tieneOrganizador ? 'text-accent' : 'text-status-libre'}`}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          {tieneOrganizador ? (
            <Link
              href="/ligas"
              className="w-full text-center bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-semibold hover:brightness-95 transition-all"
            >
              Ir a mis ligas →
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={PLAN_ORGANIZADOR.ctaWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-accent text-on-accent rounded-lg py-2.5 text-[13px] font-semibold hover:brightness-95 transition-all flex items-center justify-center gap-2"
              >
                <span>💬</span> Solicitar acceso
              </a>
              <p className="text-[10px] text-on-surface-variant text-center">
                Activación manual · respuesta en &lt;24 h
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FAQ / nota */}
      <div className="mt-8 bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-3">Preguntas frecuentes</div>
        <div className="flex flex-col gap-4">
          {[
            {
              q: '¿Cómo activo el plan Organizador?',
              a: 'Contáctanos por WhatsApp o email con tu nombre de usuario. Activamos el acceso manualmente en menos de 24 horas.',
            },
            {
              q: '¿El plan se renueva automáticamente?',
              a: 'No. Hoy la renovación es manual. Te avisaremos antes de que venza para que puedas continuar.',
            },
            {
              q: '¿Cuántas ligas puedo crear?',
              a: 'Con el plan Organizador puedes crear ligas ilimitadas mientras tu suscripción esté activa.',
            },
          ].map(item => (
            <div key={item.q}>
              <div className="text-[12px] font-medium text-on-surface mb-1">{item.q}</div>
              <div className="text-[11px] text-on-surface-variant leading-relaxed">{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      {!user && (
        <p className="text-center text-[11px] text-on-surface-variant mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-accent hover:underline">Inicia sesión →</Link>
        </p>
      )}
    </div>
  );
}
