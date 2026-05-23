import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CrearLigaForm } from '@/components/ligas/CrearLigaForm';
import Link from 'next/link';

export default async function NuevaLigaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify active subscription
  const { data: suscripcion } = await supabase
    .from('suscripciones')
    .select('id, plan, fecha_fin')
    .eq('user_id', user.id)
    .eq('estado', 'activa')
    .gte('fecha_fin', new Date().toISOString().split('T')[0])
    .maybeSingle();

  if (!suscripcion) {
    return (
      <div className="p-5 max-w-lg mx-auto">
        <Link
          href="/ligas"
          className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5"
        >
          ← Volver
        </Link>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
          <div className="text-[40px] mb-4">🔒</div>
          <h2 className="text-[16px] font-semibold text-on-surface mb-2">
            Suscripción requerida
          </h2>
          <p className="text-[13px] text-on-surface-variant leading-relaxed mb-4">
            Para crear ligas necesitas un plan Organizador activo.
          </p>
          <Link
            href="/planes"
            className="inline-block bg-accent text-on-accent rounded-lg px-5 py-2.5 text-[13px] font-semibold hover:brightness-95 transition-all mb-3"
          >
            Ver planes →
          </Link>
          <br />
          <Link
            href="/ligas"
            className="text-[12px] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            ← Ver ligas disponibles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-lg mx-auto">
      <Link
        href="/ligas"
        className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5"
      >
        ← Volver
      </Link>

      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-on-surface">Nueva liga</h1>
        <p className="text-[12px] text-on-surface-variant mt-1">
          Suscripción activa hasta{' '}
          <strong className="text-on-surface">
            {new Date(suscripcion.fecha_fin).toLocaleDateString('es-CL', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </strong>
        </p>
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
        <CrearLigaForm />
      </div>
    </div>
  );
}
