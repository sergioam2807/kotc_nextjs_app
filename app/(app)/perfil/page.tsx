import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EditarPerfilForm } from '@/components/perfil/EditarPerfilForm';
import Link from 'next/link';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'bio, posicion_principal, posiciones_adicionales, especialidades, altura_cm, peso_kg, mano_habil, anos_experiencia, disponible_reclutamiento, deportes_activos, username, display_name',
    )
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="p-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[18px] font-semibold text-on-surface">Mi Perfil de Jugador</h1>
        <Link
          href={`/jugadores/${user.id}`}
          className="text-[12px] text-accent hover:underline"
        >
          Ver perfil público →
        </Link>
      </div>
      <EditarPerfilForm initialData={profile ?? {}} />
    </div>
  );
}
