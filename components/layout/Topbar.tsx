'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface TopbarProps {
  nivel?: number;
  xp?: number;
  iniciales?: string;
  avatarUrl?: string | null;
  username?: string;
}

const tabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mapa', href: '/mapa' },
  { label: 'Desafíos', href: '/desafios' },
  { label: 'Mi Equipo', href: '/equipo' },
];

export function Topbar({ nivel = 1, xp = 0, iniciales = 'TU', avatarUrl, username }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="bg-surface-container-low border-b border-outline-variant px-4 flex items-center h-[50px] gap-3 sticky top-0 z-50">
      <Link href="/dashboard" className="text-[13px] font-bold text-on-surface tracking-[0.06em] flex-shrink-0 mr-2">
        KING <span className="text-accent">OF THE</span> COURT
      </Link>
      <nav className="hidden md:flex gap-0.5 flex-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-md text-[12px] transition-colors no-underline ${
              pathname.startsWith(tab.href)
                ? 'bg-accent-dim text-accent'
                : 'text-outline hover:text-on-surface-variant'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <ThemeToggle />
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-[11px] text-accent font-semibold">Lv.{nivel}</span>
          <div className="w-14 h-1 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((xp % 100), 100)}%` }} />
          </div>
        </div>

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-accent/25 cursor-pointer focus:outline-none"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={username ?? iniciales} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent flex items-center justify-center text-[10px] text-on-accent font-semibold">
                {iniciales}
              </div>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-50 bg-surface-container border border-outline-variant rounded-xl py-1.5 min-w-[160px] shadow-xl">
                {username && (
                  <div className="px-3 py-2 border-b border-outline-variant mb-1">
                    <p className="text-[12px] text-on-surface font-semibold truncate">{username}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full text-left px-3 py-2 text-[12px] text-error hover:bg-error/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
