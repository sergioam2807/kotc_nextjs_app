import type { StandingRow } from '@/lib/ligas/tabla';

interface TablaLigaProps {
  rows: StandingRow[];
  titulo?: string;
  equiposClasifican?: number; // highlight top N rows
}

export function TablaLiga({ rows, titulo, equiposClasifican }: TablaLigaProps) {
  return (
    <div>
      {titulo && (
        <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-2">
          {titulo}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container">
              <th className="text-left py-2 px-3 text-on-surface-variant font-medium w-8">#</th>
              <th className="text-left py-2 px-3 text-on-surface-variant font-medium">Equipo</th>
              <th className="text-center py-2 px-2 text-on-surface-variant font-medium w-9" title="Jugados">PJ</th>
              <th className="text-center py-2 px-2 text-on-surface-variant font-medium w-9" title="Ganados">PG</th>
              <th className="text-center py-2 px-2 text-on-surface-variant font-medium w-9" title="Empatados">PE</th>
              <th className="text-center py-2 px-2 text-on-surface-variant font-medium w-9" title="Perdidos">PP</th>
              <th className="text-center py-2 px-2 text-on-surface-variant font-medium w-12" title="Diferencia">DP</th>
              <th className="text-center py-2 px-3 text-on-surface-variant font-medium w-12" title="Puntos">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[12px] text-on-surface-variant">
                  No hay partidos completados aún
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const clasifica = equiposClasifican ? i < equiposClasifican : false;
              const iniciales = row.nombre.trim().split(/\s+/).slice(0, 2)
                .map(w => w[0]).join('').toUpperCase();
              return (
                <tr
                  key={row.equipo_id}
                  className={`border-b border-outline-variant/50 last:border-0 transition-colors ${
                    clasifica ? 'bg-status-libre/5' : ''
                  }`}
                >
                  {/* Pos */}
                  <td className="py-2.5 px-3 text-on-surface-variant">
                    <span className={clasifica ? 'text-status-libre font-semibold' : ''}>{i + 1}</span>
                  </td>

                  {/* Team */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: `${row.color}20`, color: row.color }}
                      >
                        {iniciales}
                      </div>
                      <span className="text-on-surface font-medium truncate max-w-[110px]">{row.nombre}</span>
                      {clasifica && (
                        <span className="text-[9px] text-status-libre font-bold">↑</span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-2 text-center text-on-surface-variant">{row.PJ}</td>
                  <td className="py-2.5 px-2 text-center text-status-libre font-medium">{row.PG}</td>
                  <td className="py-2.5 px-2 text-center text-on-surface-variant">{row.PE}</td>
                  <td className="py-2.5 px-2 text-center text-error">{row.PP}</td>
                  <td className={`py-2.5 px-2 text-center font-medium ${
                    row.GD > 0 ? 'text-status-libre' : row.GD < 0 ? 'text-error' : 'text-on-surface-variant'
                  }`}>
                    {row.GD > 0 ? '+' : ''}{row.GD}
                  </td>
                  <td className="py-2.5 px-3 text-center text-accent font-semibold">{row.Pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {equiposClasifican && rows.length > 0 && (
        <p className="text-[10px] text-on-surface-variant mt-1.5 px-1">
          ↑ Los {equiposClasifican} primeros clasifican a la siguiente fase
        </p>
      )}
    </div>
  );
}
