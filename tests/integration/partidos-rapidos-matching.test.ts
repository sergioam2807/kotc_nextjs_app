import { describe, it, expect } from 'vitest';
import { POST as crearPartido, GET as listarPartidos } from '@/app/api/partidos-rapidos/route';
import { setActiveClient } from './helpers/routeClient';
import { serviceClient, createUserClient, createCancha } from './helpers/client';

function jsonRequest(body: unknown) {
  return new Request('http://test/api/partidos-rapidos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function lobbyRequest(canchaId: string) {
  return new Request(`http://test/api/partidos-rapidos?cancha_id=${canchaId}&mode=lobby`);
}

describe('partidos-rapidos — matching ciego (mutuo opt-in) y join explícito', () => {
  it('dos tríos "buscando" en la misma cancha se emparejan automáticamente', async () => {
    const admin = serviceClient();
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    const resA = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [] }));
    const { partido: partidoA } = await resA.json();
    expect(partidoA.estado).toBe('buscando');

    setActiveClient(capitanB.client);
    const resB = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [] }));
    const { partido: partidoB } = await resB.json();

    // B se fusiona dentro de la fila de A (la más antigua) — mismo id.
    expect(partidoB.id).toBe(partidoA.id);
    expect(partidoB.estado).toBe('emparejado');
    expect(partidoB.capitan_a_id).toBe(capitanA.userId);
    expect(partidoB.capitan_b_id).toBe(capitanB.userId);

    // La fila efímera que B había creado para sí mismo queda cancelada.
    const { data: filasDeB } = await admin
      .from('partidos_rapidos')
      .select('id, estado')
      .eq('capitan_a_id', capitanB.userId);
    expect(filasDeB).toHaveLength(1);
    expect(filasDeB![0].estado).toBe('cancelado');
  });

  it('el lobby (?mode=lobby) lista tríos ajenos "buscando" en esa cancha, no los propios', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [] }));

    setActiveClient(capitanB.client);
    const lobbyRes = await listarPartidos(lobbyRequest(canchaId));
    expect(lobbyRes.status).toBe(200);
    const { lobby } = await lobbyRes.json();
    expect(lobby).toHaveLength(1);
    expect(lobby[0].capitan_a_id).toBe(capitanA.userId);

    // El propio capitán A no se ve a sí mismo en su propio lobby.
    setActiveClient(capitanA.client);
    const lobbyPropio = await listarPartidos(lobbyRequest(canchaId));
    expect((await lobbyPropio.json()).lobby).toHaveLength(0);
  });

  it('join_partido_id une directo al trío elegido de la lista (sin esperar el polling)', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    const resA = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [] }));
    const { partido: partidoA } = await resA.json();

    setActiveClient(capitanB.client);
    const resB = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], join_partido_id: partidoA.id }));
    expect(resB.status).toBe(201);
    const { partido: partidoB } = await resB.json();
    expect(partidoB.id).toBe(partidoA.id);
    expect(partidoB.estado).toBe('emparejado');
  });

  it('unirse dos veces al mismo lobby: la segunda vez recibe 409 (guard contra doble emparejamiento)', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();
    const capitanC = await createUserClient();

    setActiveClient(capitanA.client);
    const resA = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [] }));
    const { partido: partidoA } = await resA.json();

    setActiveClient(capitanB.client);
    const resB = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], join_partido_id: partidoA.id }));
    expect(resB.status).toBe(201);

    setActiveClient(capitanC.client);
    const resC = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], join_partido_id: partidoA.id }));
    expect(resC.status).toBe(409);
  });

  // La atomicidad real (varias búsquedas concurrentes en la misma cancha) vive
  // en emparejar_partido_rapido() (FOR UPDATE en la fila propia + FOR UPDATE
  // SKIP LOCKED en la búsqueda de rival) — se prueba contra la función SQL
  // directamente, como ya hace ranking-1v1-atomic.test.ts con
  // add_ranking_1v1_result, porque las rutas comparten un único cliente
  // Supabase "activo" global en este harness y no pueden simular dos requests
  // concurrentes de usuarios distintos de verdad.
  //
  // Regresión: con 3 filas "buscando" en la misma cancha (un lobby + dos
  // buscadores nuevos X e Y, cada uno candidato válido del otro además del
  // lobby), sin el `FOR UPDATE` en el SELECT de la fila propia era posible
  // que X se emparejara con el lobby MIENTRAS, en paralelo, Y reclamaba la
  // fila de X como su propio rival — dejando a X "emparejado" en dos filas
  // distintas a la vez. Con el fix, cada capitán termina en a lo sumo un
  // partido 'emparejado'; el que se queda sin rival esta vuelta sigue
  // 'buscando' (lo agarra el próximo poll o el próximo capitán que llegue).
  it('con varias búsquedas concurrentes en la misma cancha, nadie queda emparejado dos veces', async () => {
    const admin = serviceClient();
    const canchaId = await createCancha();
    const capitanLobby = await createUserClient();
    const capitanX = await createUserClient();
    const capitanY = await createUserClient();

    const { data: lobbyRow } = await admin
      .from('partidos_rapidos')
      .insert({ cancha_id: canchaId, deporte: 'basketball', formato: '3v3', capitan_a_id: capitanLobby.userId, estado: 'buscando' })
      .select('id')
      .single();
    const { data: rowX } = await admin
      .from('partidos_rapidos')
      .insert({ cancha_id: canchaId, deporte: 'basketball', formato: '3v3', capitan_a_id: capitanX.userId, estado: 'buscando' })
      .select('id')
      .single();
    const { data: rowY } = await admin
      .from('partidos_rapidos')
      .insert({ cancha_id: canchaId, deporte: 'basketball', formato: '3v3', capitan_a_id: capitanY.userId, estado: 'buscando' })
      .select('id')
      .single();

    await Promise.all([
      admin.rpc('emparejar_partido_rapido', { p_partido_id: rowX!.id }),
      admin.rpc('emparejar_partido_rapido', { p_partido_id: rowY!.id }),
    ]);

    const { data: filasFinales } = await admin
      .from('partidos_rapidos')
      .select('id, estado, capitan_a_id, capitan_b_id')
      .in('id', [lobbyRow!.id, rowX!.id, rowY!.id]);

    // Cada capitán aparece en a lo sumo un partido 'emparejado' — nunca dos.
    const emparejados = filasFinales!.filter(f => f.estado === 'emparejado');
    const capitanesEnEmparejados = emparejados.flatMap(f => [f.capitan_a_id, f.capitan_b_id]);
    expect(new Set(capitanesEnEmparejados).size).toBe(capitanesEnEmparejados.length); // sin duplicados

    // El lobby original terminó emparejado con exactamente uno de los dos (X o Y).
    const lobbyFinal = filasFinales!.find(f => f.id === lobbyRow!.id)!;
    expect(lobbyFinal.estado).toBe('emparejado');
    expect([capitanX.userId, capitanY.userId]).toContain(lobbyFinal.capitan_b_id);

    // Ninguna fila quedó en un estado que no sea 'buscando', 'emparejado' o 'cancelado'.
    for (const f of filasFinales!) {
      expect(['buscando', 'emparejado', 'cancelado']).toContain(f.estado);
    }
  });
});
