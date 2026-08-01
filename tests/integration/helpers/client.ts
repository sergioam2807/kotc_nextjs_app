import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';

if (!process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY not set — run `supabase start` locally ' +
    'and export the keys from `supabase status -o env` before running integration tests.',
  );
}
const ANON_KEY: string = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY;

// supabase-js always spins up a Realtime client, which needs a WebSocket
// constructor. Node 20 has no global WebSocket — Node 22+ does, but this repo
// targets 20, so `ws` is provided explicitly (tests never use realtime).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REALTIME_OPTS = { transport: WebSocket as any };

/** Service-role client — bypasses RLS. Only use for fixture setup, never to assert app behavior. */
export function serviceClient(): SupabaseClient {
  return createClient(URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: REALTIME_OPTS,
  });
}

let counter = 0;
/** Unique-ish suffix for fixture emails/names within a single test run. */
export function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/**
 * Creates a confirmed auth user and returns a supabase-js client scoped to
 * that user's session (a real JWT signed by GoTrue) — this exercises RLS
 * exactly like the app's `createClient()` does per-request, just without the
 * Next.js cookie plumbing.
 */
export async function createUserClient(): Promise<{ userId: string; email: string; client: SupabaseClient }> {
  const admin = serviceClient();
  const email = `${uniq('user')}@example.com`;
  const password = 'password-123!';

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);

  // profiles.id is the FK target for equipos/equipo_miembros/canchas — not
  // auto-created on signup in this schema, so fixtures must insert it.
  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    username: uniq('u'),
    ciudad: 'Santiago',
  });
  if (profileErr) throw new Error(`create profile failed: ${profileErr.message}`);

  const client = createClient(URL, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: REALTIME_OPTS,
  });
  const { data: signedIn, error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr || !signedIn.session) throw new Error(`signIn failed: ${signInErr?.message}`);

  return { userId: created.user.id, email, client };
}

/** Creates a team with a single admin member. Returns the team id + the admin's user client. */
export async function createTeamWithAdmin(deporte = 'basketball') {
  const admin = serviceClient();
  const { userId, client } = await createUserClient();

  const { data: equipo, error: equipoErr } = await admin
    .from('equipos')
    .insert({
      nombre: uniq('Equipo'),
      deporte,
      modalidad: '5v5',
      ciudad: 'Santiago',
      color: '#F5C344',
      creador_id: userId,
    })
    .select('id')
    .single();
  if (equipoErr || !equipo) throw new Error(`create equipo failed: ${equipoErr?.message}`);

  const { error: miembroErr } = await admin.from('equipo_miembros').insert({
    equipo_id: equipo.id,
    jugador_id: userId,
    rol: 'admin',
    posicion: 'titular',
    deporte,
  });
  if (miembroErr) throw new Error(`create equipo_miembro failed: ${miembroErr.message}`);

  return { equipoId: equipo.id as string, userId, client };
}

/** Creates a court fixture (desafios.cancha_id is required, NOT NULL). */
export async function createCancha() {
  const admin = serviceClient();
  // canchas.agregada_por is NOT NULL (FK -> profiles), so a fixture user
  // (with its profiles row) is required even though nobody in these tests
  // cares who "added" the court.
  const { userId } = await createUserClient();
  const { data, error } = await admin
    .from('canchas')
    .insert({
      nombre: uniq('Cancha'),
      direccion: 'Test 123',
      lat: -33.45,
      lng: -70.66,
      deporte: ['basketball'],
      agregada_por: userId,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`create cancha failed: ${error?.message}`);
  return data.id as string;
}

/** Creates a desafío between two teams in a given estado (default 'aceptado'). */
export async function createDesafio(opts: {
  retadorId: string;
  retadoId: string;
  canchaId: string;
  estado?: string;
  formato?: string;
}) {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('desafios')
    .insert({
      equipo_retador_id: opts.retadorId,
      equipo_retado_id: opts.retadoId,
      cancha_id: opts.canchaId,
      deporte: 'basketball',
      formato: opts.formato ?? '5v5',
      fecha: new Date().toISOString(),
      estado: opts.estado ?? 'aceptado',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`create desafio failed: ${error?.message}`);
  return data.id as string;
}

/** Creates a 1v1 desafío in resultado_pendiente, ready for PATCH /api/resultados-1v1. */
export async function createDesafio1v1(opts: { retadorId: string; retadoId: string }) {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('desafios_individual')
    .insert({
      retador_id: opts.retadorId,
      retado_id: opts.retadoId,
      estado: 'resultado_pendiente',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`create desafio_individual failed: ${error?.message}`);
  return data.id as string;
}

export async function getRanking1v1(jugadorId: string, temporadaId: string | null) {
  const admin = serviceClient();
  let q = admin.from('ranking_1v1').select('*').eq('jugador_id', jugadorId);
  q = temporadaId ? q.eq('temporada_id', temporadaId) : q.is('temporada_id', null);
  const { data } = await q.maybeSingle();
  return data;
}

export async function createLiga(opts: {
  organizadorId: string;
  formato?: string;
  estado?: string;
  maxEquipos?: number;
}) {
  const admin = serviceClient();
  const { data, error } = await admin
    .from('ligas')
    .insert({
      organizador_id: opts.organizadorId,
      nombre: uniq('Liga'),
      deporte: 'basketball',
      modalidad: '5v5',
      formato: opts.formato ?? 'round_robin',
      estado: opts.estado ?? 'borrador',
      max_equipos: opts.maxEquipos ?? 8,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`create liga failed: ${error?.message}`);
  return data.id as string;
}
