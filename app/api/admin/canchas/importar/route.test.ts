import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Autorización y validación de la route de importación.
 *
 * Google y Supabase están mockeados: estos casos se resuelven antes de tocar
 * la red o la base, así que el test no necesita ninguna de las dos.
 * `@/lib/google/places` además importa `server-only`, que revienta fuera de un
 * contexto de servidor — mockearlo evita cargarlo.
 */

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/google/places', () => ({
  buscarCanchasCercanas: vi.fn(),
  GooglePlacesError: class GooglePlacesError extends Error {},
  RADIO_MAX_M: 50_000,
  RADIO_MIN_M: 50,
}));

const { POST } = await import('./route');

const ADMIN = 'admin@kotc.cl';

function pedido(body: unknown) {
  return new Request('http://localhost/api/admin/canchas/importar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/canchas/importar — acceso', () => {
  const envOriginal = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = ADMIN;
    getUser.mockReset();
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = envOriginal;
  });

  it('[9] sin sesión responde 401', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(pedido({ latitude: -33, longitude: -71, radius: 1000 }));

    expect(res.status).toBe(401);
  });

  it('[9] con sesión pero sin ser admin responde 403', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'jugador@kotc.cl' } } });

    const res = await POST(pedido({ latitude: -33, longitude: -71, radius: 1000 }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it('[9] si ADMIN_EMAIL no está configurado, nadie es admin', async () => {
    delete process.env.ADMIN_EMAIL;
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: ADMIN } } });

    const res = await POST(pedido({ latitude: -33, longitude: -71, radius: 1000 }));

    expect(res.status).toBe(403);
  });

  it('[10] siendo admin, un cuerpo inválido responde 400 sin llegar a Google', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: ADMIN } } });

    const res = await POST(pedido({ latitude: 'no soy número', longitude: -71, radius: 1000 }));

    expect(res.status).toBe(400);
  });

  it('[10] un radio desmedido se rechaza antes de ejecutar nada', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: ADMIN } } });

    const res = await POST(pedido({ latitude: -33, longitude: -71, radius: 5_000_000 }));

    expect(res.status).toBe(400);
  });

  it('[10] un body que no es JSON responde 400', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: ADMIN } } });

    const res = await POST(
      new Request('http://localhost/api/admin/canchas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'no es json',
      }),
    );

    expect(res.status).toBe(400);
  });
});
