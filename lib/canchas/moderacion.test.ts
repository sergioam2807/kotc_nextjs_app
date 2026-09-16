import { describe, it, expect } from 'vitest';
import {
  cambiosDeModeracion,
  validarEntradaImport,
  superaLimiteDeImports,
  LIMITE_IMPORTS,
} from './moderacion';

describe('cambiosDeModeracion', () => {
  it('[7] aprobar deja la cancha VERIFIED y validada', () => {
    expect(cambiosDeModeracion('aprobar')).toEqual({ status: 'verified', validada: true });
  });

  it('[8] rechazar deja la cancha REJECTED y no validada', () => {
    expect(cambiosDeModeracion('rechazar')).toEqual({ status: 'rejected', validada: false });
  });

  it('cerrar marca la cancha como CLOSED', () => {
    expect(cambiosDeModeracion('cerrar')).toEqual({ status: 'closed', validada: false });
  });
});

describe('validarEntradaImport', () => {
  const valido = { latitude: -33.02, longitude: -71.55, radius: 2000 };

  it('acepta una entrada válida y normaliza el radio a entero', () => {
    const r = validarEntradaImport({ ...valido, radius: 1999.6, zona: '  Viña  ' });
    expect(r).toEqual({
      ok: true,
      valor: { lat: -33.02, lng: -71.55, radioM: 2000, zona: 'Viña' },
    });
  });

  it('[10] rechaza latitud fuera de rango', () => {
    expect(validarEntradaImport({ ...valido, latitude: 91 })).toMatchObject({ ok: false });
    expect(validarEntradaImport({ ...valido, latitude: -91 })).toMatchObject({ ok: false });
  });

  it('[10] rechaza longitud fuera de rango', () => {
    expect(validarEntradaImport({ ...valido, longitude: 181 })).toMatchObject({ ok: false });
  });

  it('[10] rechaza radio negativo, cero o desmedido', () => {
    expect(validarEntradaImport({ ...valido, radius: -1 })).toMatchObject({ ok: false });
    expect(validarEntradaImport({ ...valido, radius: 0 })).toMatchObject({ ok: false });
    // Google no acepta más de 50 km, y un radio enorme es justamente la forma
    // de disparar una importación masiva.
    expect(validarEntradaImport({ ...valido, radius: 500_000 })).toMatchObject({ ok: false });
  });

  it('[10] rechaza tipos que no son número', () => {
    expect(validarEntradaImport({ ...valido, latitude: '-33.02' })).toMatchObject({ ok: false });
    expect(validarEntradaImport({ ...valido, radius: NaN })).toMatchObject({ ok: false });
  });

  it('[10] rechaza un body que no es objeto', () => {
    expect(validarEntradaImport(null)).toMatchObject({ ok: false });
    expect(validarEntradaImport('hola')).toMatchObject({ ok: false });
  });

  it('acepta que no venga zona', () => {
    const r = validarEntradaImport(valido);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.zona).toBeNull();
  });

  it('rechaza una zona demasiado larga', () => {
    expect(validarEntradaImport({ ...valido, zona: 'x'.repeat(101) })).toMatchObject({ ok: false });
  });
});

describe('superaLimiteDeImports', () => {
  const ahora = new Date('2026-09-16T12:00:00Z');

  it('deja pasar cuando hay pocas corridas recientes', () => {
    const inicios = ['2026-09-16T11:59:00Z', '2026-09-16T11:58:00Z'];
    expect(superaLimiteDeImports(inicios, ahora)).toBe(false);
  });

  it('corta al llegar al límite dentro de la ventana', () => {
    const inicios = Array.from({ length: LIMITE_IMPORTS }, () => '2026-09-16T11:55:00Z');
    expect(superaLimiteDeImports(inicios, ahora)).toBe(true);
  });

  it('las corridas viejas no cuentan', () => {
    const inicios = Array.from({ length: LIMITE_IMPORTS }, () => '2026-09-16T11:00:00Z');
    expect(superaLimiteDeImports(inicios, ahora)).toBe(false);
  });
});
