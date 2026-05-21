import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#080809] flex items-center justify-center p-6">
      {/* Grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a1a2210 1px, transparent 1px), linear-gradient(90deg, #1a1a2210 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '400px',
          height: '250px',
          background: '#F5C34412',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }}
      />

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Crown */}
        <div className="text-[56px] mb-4">👑</div>

        <h1 className="text-[38px] font-medium text-white leading-[1.1] tracking-[-0.02em] mb-2">
          King of<br />
          <span className="text-[#F5C344]">the Court</span>
        </h1>

        <p className="text-[15px] text-[#555] mb-8 leading-relaxed max-w-[360px] mx-auto">
          Desafía equipos, conquista canchas y conviértete en el rey de tu ciudad.
        </p>

        <div className="flex justify-center mb-10">
          <Link
            href="/login"
            className="flex items-center gap-3 bg-white text-[#1a1a1a] no-underline px-8 py-3.5 rounded-[10px] text-[14px] font-medium hover:bg-[#f0f0f0] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar con Google
          </Link>
        </div>

        {/* Sport pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {['🏀 Basketball', '⚽ Fútbol', '🏐 Vóleibol', '🎾 Tenis', '🏓 Pádel'].map(sport => (
            <span
              key={sport}
              className="bg-[#111114] border border-[#1e1e24] rounded-full px-3.5 py-1.5 text-[12px] text-[#555]"
            >
              {sport}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-8 justify-center">
          {[
            { num: '2.4K', label: 'Jugadores' },
            { num: '318', label: 'Canchas' },
            { num: '1.1K', label: 'Partidos' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-[22px] font-medium text-[#F5C344]">{stat.num}</div>
              <div className="text-[11px] text-[#444] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
