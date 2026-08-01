import { describe, it, expect } from 'vitest';
import { POST as proponerResultado, PATCH as patchResultado } from '@/app/api/resultados/route';
import { setActiveClient } from './helpers/routeClient';
import { serviceClient, createTeamWithAdmin, createCancha, createDesafio } from './helpers/client';

function jsonRequest(body: unknown) {
  return new Request('http://test/api/resultados', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Regression test for the bug where `aceptar_original` fell through the
// unconditional "CONFIRMAR (normal flow)" block first (which always marked
// the resultado confirmed + desafío completado), then its own guarded update
// always found confirmado_por_perdedor already true and returned 409 —
// silently corrupting state (desafío completado, but the caller saw an
// error and no XP was ever granted).
describe('resultados PATCH — aceptar_original after a dispute', () => {
  it('ends in completado with XP granted exactly once', async () => {
    const admin = serviceClient();
    const teamA = await createTeamWithAdmin(); // retador — will propose
    const teamB = await createTeamWithAdmin(); // retado — will dispute, then accept the original
    const canchaId = await createCancha();
    const desafioId = await createDesafio({ retadorId: teamA.equipoId, retadoId: teamB.equipoId, canchaId });

    // 1. Team A proposes a result where they win.
    setActiveClient(teamA.client);
    const proposeRes = await proponerResultado(
      jsonRequest({ desafio_id: desafioId, ganador_id: teamA.equipoId, puntos_retador: 50, puntos_retado: 40 }),
    );
    expect(proposeRes.status).toBe(201);
    const { resultado } = await proposeRes.json();

    const { data: xpBeforeA } = await admin.from('equipos').select('xp').eq('id', teamA.equipoId).single();
    const { data: xpBeforeB } = await admin.from('equipos').select('xp').eq('id', teamB.equipoId).single();
    const { data: profileBeforeA } = await admin.from('profiles').select('xp').eq('id', teamA.userId).single();
    const { data: profileBeforeB } = await admin.from('profiles').select('xp').eq('id', teamB.userId).single();

    // 2. Team B disputes it.
    setActiveClient(teamB.client);
    const disputeRes = await patchResultado(jsonRequest({ id: resultado.id, accion: 'disputar' }));
    expect(disputeRes.status).toBe(200);
    const disputeJson = await disputeRes.json();
    expect(disputeJson.estado).toBe('disputado');

    // 3. Team B accepts the original (pre-dispute) result.
    const acceptRes = await patchResultado(jsonRequest({ id: resultado.id, accion: 'aceptar_original' }));
    const acceptJson = await acceptRes.json();
    expect(acceptRes.status).toBe(200);
    expect(acceptJson.estado).toBe('completado');

    // Desafío is completado, not stuck in disputado or corrupted.
    const { data: desafioFinal } = await admin.from('desafios').select('estado').eq('id', desafioId).single();
    expect(desafioFinal?.estado).toBe('completado');

    // XP was granted exactly once (500/150 team, 100/35 personal — single member each).
    const { data: xpAfterA } = await admin.from('equipos').select('xp').eq('id', teamA.equipoId).single();
    const { data: xpAfterB } = await admin.from('equipos').select('xp').eq('id', teamB.equipoId).single();
    const { data: profileAfterA } = await admin.from('profiles').select('xp').eq('id', teamA.userId).single();
    const { data: profileAfterB } = await admin.from('profiles').select('xp').eq('id', teamB.userId).single();

    expect(xpAfterA!.xp - xpBeforeA!.xp).toBe(500);
    expect(xpAfterB!.xp - xpBeforeB!.xp).toBe(150);
    expect(profileAfterA!.xp - profileBeforeA!.xp).toBe(100);
    expect(profileAfterB!.xp - profileBeforeB!.xp).toBe(35);

    // Calling aceptar_original again must not double-grant XP (idempotency guard).
    const secondAccept = await patchResultado(jsonRequest({ id: resultado.id, accion: 'aceptar_original' }));
    expect(secondAccept.status).toBe(400); // desafio no longer in 'disputado'
  });
});
