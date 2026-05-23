'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarSection {
  label: string;
  items: NavItem[];
}

function MapPinIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function DashboardIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function SwordIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/></svg>;
}
function TrophyIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 12 3 5 21 5 16 12"/><path d="M12 12v9"/><path d="M8 21h8"/></svg>;
}
function UsersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function MailIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function UserPlusIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
}
function CrownIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"/><path d="m4 20 4-12 4 6 4-6 4 12"/></svg>;
}

export function Sidebar() {
  const pathname = usePathname();

  const sections: SidebarSection[] = [
    {
      label: 'Principal',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { href: '/mapa', label: 'Mapa de canchas', icon: <MapPinIcon /> },
        { href: '/desafios', label: 'Desafíos', icon: <SwordIcon /> },
        { href: '/ligas', label: 'Ligas', icon: <TrophyIcon /> },
        { href: '/ranking', label: 'Ranking', icon: <CrownIcon /> },
      ],
    },
    {
      label: 'Mi equipo',
      items: [
        { href: '/equipo', label: 'Roster', icon: <UsersIcon /> },
        { href: '/equipo/invitaciones', label: 'Invitaciones', icon: <MailIcon /> },
        // [ROJO-02] badge removed — was hardcoded to 2 (always wrong).
        // Solicitudes count is shown correctly on /equipo page instead.
        { href: '/equipo/solicitudes', label: 'Solicitudes', icon: <UserPlusIcon /> },
      ],
    },
  ];

  return (
    <aside className="w-[200px] bg-surface-dim border-r border-outline-variant py-4 flex-shrink-0">
      {sections.map((section, si) => (
        <div key={si} className="mb-5">
          <div className="text-[10px] text-outline tracking-[0.1em] px-4 mb-1.5 font-semibold uppercase">
            {section.label}
          </div>
          {section.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2 text-[13px] no-underline border-l-2 transition-colors ${
                pathname === item.href || (item.href !== '/equipo' && pathname.startsWith(item.href))
                  ? 'text-accent border-l-accent bg-accent-dim'
                  : 'text-outline border-l-transparent hover:text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-primary text-on-primary text-[9px] rounded-full px-1.5 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
          {si < sections.length - 1 && (
            <div className="h-px bg-outline-variant my-2.5 mx-0" />
          )}
        </div>
      ))}
    </aside>
  );
}
