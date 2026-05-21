import Link from 'next/link';
import { Lexend } from 'next/font/google';

const lexend = Lexend({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] });

const NAV_ITEMS = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Kings', href: '#reyes' },
  { label: 'Temporada', href: '#temporada' },
  { label: 'Ranking', href: '/ranking' },
];

const FOOTER_PLATFORM = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Mapa', href: '/mapa' },
  { label: 'Desafíos', href: '/desafios' },
  { label: 'Ranking', href: '/ranking' },
];

const FOOTER_ACCOUNT = [
  { label: 'Entrar', href: '/login' },
  { label: 'Crear equipo', href: '/equipo' },
];

const FOOTER_SUPPORT = [
  { label: 'FAQ', href: '#' },
  { label: 'Contacto', href: '#' },
];

export default function LandingPage() {
  return (
    <div className={lexend.className + ' bg-[#1a0f0c] text-white scroll-smooth'}>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 25s linear infinite; }
      `}</style>

      {/* ── FIXED HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a0f0c]/90 backdrop-blur border-b border-[#3d2a24]">
        <div className="max-w-7xl mx-auto px-5 lg:px-20 h-14 md:h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 no-underline shrink-0">
            <span className="text-lg">👑</span>
            <span className="font-extrabold italic uppercase text-xs sm:text-sm tracking-tight text-white">
              KING <span className="text-[#f45925]">OF THE</span> COURT
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors no-underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="bg-[#f45925] text-white rounded-lg px-4 py-1.5 md:px-5 md:py-2 font-bold text-xs md:text-sm hover:bg-[#e04820] transition-colors no-underline shrink-0"
          >
            Entrar →
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center text-center pt-14 md:pt-16 overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 50% -10%, #6b2a10 0%, #2d1208 30%, #1a0f0c 65%, #0d0806 100%)',
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] md:w-[600px] h-[200px] md:h-[300px] bg-[#f4592510] blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 px-5 sm:px-8 max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center">
          <span
            id="temporada"
            className="inline-block bg-[#f45925] text-white font-bold text-[10px] sm:text-xs rounded tracking-[0.2em] uppercase px-3 py-1 mb-5 md:mb-6"
          >
            TEMPORADA 4
          </span>

          <h1 className="text-[2.8rem] sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-white mb-4 md:mb-6 leading-[0.95]">
            REINA EN<br />
            <span className="text-[#f45925]">LAS CALLES</span>
          </h1>

          <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-8 md:mb-10 font-light px-2">
            Desafía equipos, conquista canchas y conviértete en el rey de tu ciudad.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center w-full sm:w-auto">
            <Link
              href="/login"
              className="w-full sm:w-auto text-center bg-[#f45925] text-white px-8 py-3.5 md:px-10 md:py-4 rounded-lg font-black text-base md:text-lg uppercase italic hover:scale-105 transition-transform no-underline shadow-[0_0_20px_rgba(244,89,37,0.4)]"
            >
              Únete a la temporada
            </Link>
            <Link
              href="/ranking"
              className="w-full sm:w-auto text-center bg-white/10 backdrop-blur border border-white/20 text-white px-8 py-3.5 md:px-10 md:py-4 rounded-lg font-bold text-base md:text-lg uppercase hover:bg-white/20 transition-all no-underline"
            >
              Ver el ranking
            </Link>
          </div>
        </div>

        {/* Stats ticker */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#f45925] py-2.5 overflow-hidden">
          <div className="marquee-track flex whitespace-nowrap">
            {[0, 1].map((i) => (
              <span key={i} className="font-black italic uppercase tracking-widest text-[11px] sm:text-sm text-white mr-12 shrink-0">
                1,240 PLAYERS &nbsp;·&nbsp; 312 EQUIPOS &nbsp;·&nbsp; 45 CANCHAS &nbsp;·&nbsp; 180 DESAFÍOS &nbsp;·&nbsp;&nbsp;
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="relative py-16 md:py-24 px-5 lg:px-20 bg-[#1a0f0c]">
        <div className="absolute top-0 right-0 w-1/3 h-64 bg-[#f45925]/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <p className="text-[#f45925] font-bold uppercase tracking-[0.3em] mb-2 md:mb-3 text-xs sm:text-sm">EL PROCESO</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
              3 PASOS AL ÉXITO
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            <Link href="/login" className="no-underline group p-6 md:p-8 rounded-xl bg-[#2a1a16] border border-[#3d2a24] hover:border-[#f45925] transition-all duration-300 block">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-[#f45925]/20 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#f45925] transition-colors">
                <span className="text-3xl md:text-4xl">🏀</span>
              </div>
              <h3 className="font-bold text-xl md:text-2xl uppercase italic mb-3 md:mb-4 text-white">1. FORMA TU EQUIPO</h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Recluta al mejor talento de tu zona. Construye un equipo con química, poder y voluntad de dominar.
              </p>
            </Link>

            <Link href="/mapa" className="no-underline group p-6 md:p-8 rounded-xl bg-[#2a1a16] border border-[#3d2a24] hover:border-[#f45925] transition-all duration-300 block">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-[#f45925]/20 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#f45925] transition-colors">
                <span className="text-3xl md:text-4xl">⚔️</span>
              </div>
              <h3 className="font-bold text-xl md:text-2xl uppercase italic mb-3 md:mb-4 text-white">2. DESAFÍA RIVALES</h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Reserva canchas en el mapa KOTC. Reta a los equipos locales a partidos oficiales.
              </p>
            </Link>

            <Link href="/ranking" className="no-underline group p-6 md:p-8 rounded-xl bg-[#2a1a16] border border-[#3d2a24] hover:border-[#f45925] transition-all duration-300 block">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-[#f45925]/20 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#f45925] transition-colors">
                <span className="text-3xl md:text-4xl">👑</span>
              </div>
              <h3 className="font-bold text-xl md:text-2xl uppercase italic mb-3 md:mb-4 text-white">3. CONQUISTA LA CANCHA</h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Gana partidos, sube en el ranking y lidera el leaderboard.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CURRENT KINGS ── */}
      <section id="reyes" className="py-16 md:py-24 px-5 lg:px-20 bg-[#2a1a16]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-[#f45925] font-bold uppercase tracking-[0.3em] mb-2 md:mb-3 text-xs sm:text-sm">ELITE TIER</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
              LOS REYES ACTUALES
            </h2>
          </div>

          <div className="max-w-2xl mx-auto mb-6 md:mb-8 space-y-2.5 md:space-y-3">
            {[
              { pos: 1, color: '#FFD700', teamColor: '#e04820', name: 'Street Kings', courts: 8, wl: '24W-3L', pts: 824 },
              { pos: 2, color: '#C0C0C0', teamColor: '#F5C344', name: 'Los Cóndores', courts: 5, wl: '18W-7L', pts: 545 },
              { pos: 3, color: '#CD7F32', teamColor: '#5a9e5a', name: 'Norte Básket', courts: 3, wl: '15W-9L', pts: 315 },
            ].map((row) => (
              <div key={row.pos} className="flex items-center gap-3 p-3.5 md:p-4 rounded-xl bg-[#1a0f0c] border border-[#3d2a24]">
                <span className="font-black text-lg md:text-xl w-6 text-center shrink-0" style={{ color: row.color }}>{row.pos}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.teamColor }} />
                <span className="font-bold text-white flex-1 text-sm md:text-base truncate">{row.name}</span>
                <span className="text-slate-400 text-xs md:text-sm shrink-0">{row.courts} 🏆</span>
                <span className="text-slate-400 text-xs md:text-sm shrink-0 hidden sm:block">{row.wl}</span>
                <span className="font-bold text-[#f45925] text-xs md:text-sm shrink-0">{row.pts} pts</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/ranking"
              className="inline-block border border-[#f45925] text-[#f45925] rounded-lg px-5 py-2.5 font-bold text-sm hover:bg-[#f45925] hover:text-white transition-all no-underline"
            >
              Ver ranking completo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1a0f0c] border-t border-[#3d2a24] py-12 md:py-16 px-5 lg:px-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 md:gap-12 justify-between">
          {/* Left column */}
          <div>
            <Link href="/" className="no-underline flex items-center gap-2 mb-3">
              <span className="text-xl">👑</span>
              <span className="font-extrabold italic uppercase text-sm tracking-tight text-white">KING OF THE COURT</span>
            </Link>
            <p className="text-slate-400 text-sm mb-3">Reina en las calles.</p>
            <p className="text-slate-500 text-xs">© 2025 KOTC</p>
          </div>

          {/* Link grid — 2 cols on mobile, 3 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="font-bold uppercase text-white mb-3 md:mb-4 tracking-wide text-xs">Plataforma</p>
              <ul className="space-y-2">
                {FOOTER_PLATFORM.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-slate-400 hover:text-white transition-colors no-underline text-sm">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold uppercase text-white mb-3 md:mb-4 tracking-wide text-xs">Mi Cuenta</p>
              <ul className="space-y-2">
                {FOOTER_ACCOUNT.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-slate-400 hover:text-white transition-colors no-underline text-sm">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold uppercase text-white mb-3 md:mb-4 tracking-wide text-xs">Soporte</p>
              <ul className="space-y-2">
                {FOOTER_SUPPORT.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-slate-400 hover:text-white transition-colors no-underline text-sm">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
