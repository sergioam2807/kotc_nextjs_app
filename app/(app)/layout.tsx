import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, nivel, xp')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  }

  const fullName: string = user?.user_metadata?.full_name ?? profile?.username ?? '';
  const palabras = fullName.trim().split(/\s+/);
  const iniciales = palabras.length >= 2
    ? (palabras[0][0] + palabras[1][0]).toUpperCase()
    : fullName.slice(0, 2).toUpperCase() || 'TU';

  return (
    <div className="flex flex-col h-screen bg-[#080809]">
      <Topbar
        nivel={profile?.nivel ?? 1}
        xp={profile?.xp ?? 0}
        iniciales={iniciales}
        avatarUrl={profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null}
        username={user?.user_metadata?.full_name ?? profile?.username ?? ''}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
