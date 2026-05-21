'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  );
}

function SwordIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
      <line x1="13" y1="19" x2="19" y2="13"/>
      <line x1="16" y1="16" x2="20" y2="20"/>
      <line x1="19" y1="21" x2="21" y2="19"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 12 3 5 21 5 16 12"/>
      <path d="M12 12v9"/>
      <path d="M8 21h8"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: <HomeIcon /> },
  { href: '/mapa', label: 'Mapa', icon: <MapIcon /> },
  { href: '/desafios', label: 'Desafíos', icon: <SwordIcon /> },
  { href: '/ranking', label: 'Ranking', icon: <TrophyIcon /> },
  { href: '/equipo', label: 'Equipo', icon: <UsersIcon /> },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0c] border-t border-[#1a1a1f] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map(item => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/equipo' && pathname.startsWith(item.href + '/'));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors ${
              isActive ? 'text-[#F5C344]' : 'text-[#444] hover:text-[#888]'
            }`}
          >
            <div className="w-5 h-5">{item.icon}</div>
            <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
