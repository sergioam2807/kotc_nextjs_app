import { describe, it, expect } from 'vitest';
import { POST as proponerResultado, PATCH as patchResultado } from '@/app/api/partidos-rapidos/[id]/resultado/route';
import { setActiveClient } from './helpers/routeClient';
import { serviceClient, createUserClient, createCancha, createPartidoRapidoEmparejado } from './helpers/client';

function jsonRequest(body: unknown) {
  return new Request('http://test/api/partidos-rapidos/x/resultado', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown) {
  return new Request('http://test/api/partidos-rapidos/x/resultado', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('partidos-rapidos resultado — XP, Rey 3v3 y disputa', () => {
  it('otorga XP solo a jugadores registrados (no invitados) en ambos lados, con trío desparejo 3v1', async () => {
    const admin = serviceClient();
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const companeroA = await createUserClient();
    const capitanB = await createUserClient();

    const partidoId = await createPartidoRapidoEmparejado({ canchaId, capitanAId: capitanA.userId, capitanBId: capitanB.userId });
    // Lado A queda 3 (capitán + compañero registrado + invitado); lado B queda 1 (solo el capitán).
    await admin.from('partido_rapido_jugadores').insert([
      { partido_id: partidoId, lado: 'a', jugador_id: companeroA.userId, es_capitan: false },
      { partido_id: partidoId, lado: 'a', nombre_invitado: 'Pedro', es_capitan: false },
    ]);

    const xpDe = async (userId: string) => (await admin.from('profiles').select('xp').eq('id', userId).single()).data!.xp as number;
    const xpAntes = { a: await xpDe(capitanA.userId), companero: await xpDe(companeroA.userId), b: await xpDe(capitanB.userId) };

    setActiveClient(capitanA.client);
    const proposeRes = await proponerResultado(jsonRequest({ ganador_lado: 'a' }), params(partidoId));
    expect(proposeRes.status).toBe(201);

    setActiveClient(capitanB.client);
    const confirmRes = await patchResultado(patchRequest({ accion: 'confirmar' }), params(partidoId));
    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.confirmado).toBe(true);
    expect(confirmJson.ganador_lado).toBe('a');

    expect(await xpDe(capitanA.userId) - xpAntes.a).toBe(100);
    expect(await xpDe(companeroA.userId) - xpAntes.companero).toBe(100);
    expect(await xpDe(capitanB.userId) - xpAntes.b).toBe(35);

    // El Rey 3v3 se atribuye al CAPITÁN ganador (no a todo el trío).
    const { data: dominio } = await admin
      .from('cancha_dominio')
      .select('jugador_id, es_king, victorias, derrotas')
      .eq('cancha_id', canchaId)
      .eq('formato', '3v3')
      .eq('jugador_id', capitanA.userId)
      .maybeSingle();
    expect(dominio?.es_king).toBe(true);
    expect(dominio?.victorias).toBe(1);

    const { data: dominioCompanero } = await admin
      .from('cancha_dominio')
      .select('id')
      .eq('cancha_id', canchaId)
      .eq('formato', '3v3')
      .eq('jugador_id', companeroA.userId)
      .maybeSingle();
    expect(dominioCompanero).toBeNull(); // el compañero no es capitán → no genera fila de dominio
  });

  it('el proponente no puede confirmar su propio resultado', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();
    const partidoId = await createPartidoRapidoEmparejado({ canchaId, capitanAId: capitanA.userId, capitanBId: capitanB.userId });

    setActiveClient(capitanA.client);
    await proponerResultado(jsonRequest({ ganador_lado: 'a' }), params(partidoId));
    const selfConfirm = await patchResultado(patchRequest({ accion: 'confirmar' }), params(partidoId));
    expect(selfConfirm.status).toBe(400);
  });

  it('confirmar dos veces no otorga XP doble (idempotencia)', async () => {
    const admin = serviceClient();
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();
    const partidoId = await createPartidoRapidoEmparejado({ canchaId, capitanAId: capitanA.userId, capitanBId: capitanB.userId });

    setActiveClient(capitanA.client);
    await proponerResultado(jsonRequest({ ganador_lado: 'a' }), params(partidoId));

    setActiveClient(capitanB.client);
    const xpAntes = (await admin.from('profiles').select('xp').eq('id', capitanA.userId).single()).data!.xp;
    await patchResultado(patchRequest({ accion: 'confirmar' }), params(partidoId));
    const segundaConfirmacion = await patchResultado(patchRequest({ accion: 'confirmar' }), params(partidoId));
    expect(segundaConfirmacion.status).toBe(200);
    expect((await segundaConfirmacion.json()).yaConfirmado).toBe(true);

    const xpDespues = (await admin.from('profiles').select('xp').eq('id', capitanA.userId).single()).data!.xp;
    expect(xpDespues - xpAntes).toBe(100); // no 200
  });

  // Regresión del bug encontrado en esta misma migración: antes, `disputar`
  // movía partidos_rapidos.estado a 'disputado', un estado sin camino de
  // vuelta (a diferencia de resultados-1v1) — la rama de "actualizar
  // propuesta existente" del POST era inalcanzable porque el gate de estado
  // exigía 'emparejado'. Ahora `disputar` deja el partido en
  // 'resultado_pendiente' y se puede volver a proponer sin quedar trabado.
  it('disputar deja el partido en resultado_pendiente y permite volver a proponer', async () => {
    const admin = serviceClient();
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();
    const partidoId = await createPartidoRapidoEmparejado({ canchaId, capitanAId: capitanA.userId, capitanBId: capitanB.userId });

    setActiveClient(capitanA.client);
    const proposeRes = await proponerResultado(jsonRequest({ ganador_lado: 'a' }), params(partidoId));
    expect(proposeRes.status).toBe(201);

    setActiveClient(capitanB.client);
    const disputeRes = await patchResultado(patchRequest({ accion: 'disputar' }), params(partidoId));
    expect(disputeRes.status).toBe(200);
    expect((await disputeRes.json()).disputado).toBe(true);

    const { data: partidoTrasDisputa } = await admin.from('partidos_rapidos').select('estado').eq('id', partidoId).single();
    expect(partidoTrasDisputa?.estado).toBe('resultado_pendiente'); // NO 'disputado'

    // B (cualquiera de los dos capitanes puede) vuelve a proponer: ahora dice que ganó B.
    const reproposeRes = await proponerResultado(jsonRequest({ ganador_lado: 'b' }), params(partidoId));
    expect(reproposeRes.status).toBe(200); // rama "actualizado", no 201
    const reproposeJson = await reproposeRes.json();
    expect(reproposeJson.actualizado).toBe(true);

    // A (que ya no es el proponente) confirma el nuevo resultado.
    setActiveClient(capitanA.client);
    const confirmRes = await patchResultado(patchRequest({ accion: 'confirmar' }), params(partidoId));
    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.ganador_lado).toBe('b');
    expect(confirmJson.capitan_ganador_id).toBe(capitanB.userId);
  });
});
