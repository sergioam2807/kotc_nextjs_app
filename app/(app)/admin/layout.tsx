import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect('/dashboard');
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[18px]">⚙️</span>
        <h1 className="text-[18px] font-semibold text-on-surface">Panel de administración</h1>
        <span className="ml-2 px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-[10px] text-accent font-medium uppercase tracking-wider">
          Admin
        </span>
      </div>
      {children}
    </div>
  );
}
