'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    <header className="bg-[#0f0f12] border-b border-[#1a1a1f] px-4 flex items-center h-[50px] gap-3 sticky top-0 z-50">
      <Link href="/dashboard" className="text-[13px] font-medium text-white tracking-[0.06em] flex-shrink-0 mr-2">
        KING <span className="text-[#F5C344]">OF THE</span> COURT
      </Link>
      <nav className="hidden md:flex gap-0.5 flex-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-[6px] text-[12px] transition-colors no-underline ${
              pathname.startsWith(tab.href)
                ? 'bg-[#18180f] text-[#F5C344]'
                : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-[11px] text-[#F5C344] font-medium">Lv.{nivel}</span>
          <div className="w-14 h-1 bg-[#1e1e24] rounded-full overflow-hidden">
            <div className="h-full bg-[#F5C344] rounded-full" style={{ width: `${Math.min((xp % 100), 100)}%` }} />
          </div>
        </div>

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-[#F5C34440] cursor-pointer focus:outline-none"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={username ?? iniciales} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#F5C34430] flex items-center justify-center text-[10px] text-[#F5C344] font-medium">
                {iniciales}
              </div>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-50 bg-[#111114] border border-[#1a1a1f] rounded-[10px] py-1.5 min-w-[160px] shadow-xl">
                {username && (
                  <div className="px-3 py-2 border-b border-[#1a1a1f] mb-1">
                    <p className="text-[12px] text-white font-medium truncate">{username}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full text-left px-3 py-2 text-[12px] text-[#E24B4A] hover:bg-[#E24B4A10] transition-colors disabled:opacity-50 cursor-pointer"
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
