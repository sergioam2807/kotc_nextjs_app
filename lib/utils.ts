export function xpParaSiguienteNivel(nivel: number): number {
  const niveles = [0, 200, 500, 1000, 2000, 4000, 7000];
  return niveles[nivel] ?? 7000;
}

export function nombreNivel(nivel: number): string {
  const nombres = ['', 'Rookie', 'Contender', 'Challenger', 'Warrior', 'Elite', 'Legend', 'King'];
  return nombres[nivel] ?? 'King';
}

export function porcentajeXP(xp: number, nivel: number): number {
  const actual = xpParaSiguienteNivel(nivel - 1);
  const siguiente = xpParaSiguienteNivel(nivel);
  if (siguiente === actual) return 100;
  return Math.round(((xp - actual) / (siguiente - actual)) * 100);
}

export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
