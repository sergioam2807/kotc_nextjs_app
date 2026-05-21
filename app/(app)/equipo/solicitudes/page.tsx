export default function SolicitudesPage() {
  return (
    <div className="p-5 max-w-2xl">
      <h1 className="text-[18px] font-medium text-white mb-1">Solicitudes de ingreso</h1>
      <p className="text-[13px] text-[#555] mb-6">Jugadores que quieren unirse a tu equipo.</p>

      <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[12px] p-10 text-center">
        <div className="text-[13px] text-[#444] mb-1">
          Las solicitudes de ingreso estarán disponibles próximamente.
        </div>
        <div className="text-[11px] text-[#333]">
          Por ahora, invita jugadores desde la sección de invitaciones.
        </div>
      </div>
    </div>
  );
}
