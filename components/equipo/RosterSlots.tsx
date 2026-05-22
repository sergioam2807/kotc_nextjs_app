'use client';

interface RosterSlotsProps {
  modalidad: string;
  titulares: number;
  maxTitulares: number;
  suplentes: number;
  maxSuplentes: number;
}

export function RosterSlots({ modalidad, titulares, maxTitulares, suplentes, maxSuplentes }: RosterSlotsProps) {
  const maxTotal = maxTitulares + maxSuplentes;
  const total = titulares + suplentes;

  const slots = Array.from({ length: maxTotal }, (_, i) => {
    if (i < titulares) return 'titular';
    if (i < maxTitulares) return 'titular-empty';
    if (i < maxTitulares + suplentes) return 'suplente';
    return 'empty';
  });

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-2.5 px-3.5 mb-2.5 flex items-center gap-2.5">
      <div className="flex-1">
        <div className="text-[12px] font-semibold text-on-surface">{modalidad}</div>
        <div className="text-[11px] text-outline mt-0.5">
          Slots: <span className="text-accent">{total} de {maxTotal}</span> · {maxTitulares} titulares + {maxSuplentes} suplentes
        </div>
      </div>
      <div className="flex gap-1">
        {slots.map((type, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              type === 'titular'       ? 'bg-accent' :
              type === 'titular-empty' ? 'bg-surface-container-high' :
              type === 'suplente'      ? 'bg-on-surface-variant' :
                                         'bg-surface-container-high'
            }`}
            title={type === 'titular' ? 'Titular' : type === 'suplente' ? 'Suplente' : 'Libre'}
          />
        ))}
      </div>
    </div>
  );
}
