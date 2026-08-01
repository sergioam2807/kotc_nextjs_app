import { describe, it, expect } from 'vitest';
import { serviceClient, createUserClient, getRanking1v1 } from './helpers/client';

// Migration 045 fix: `add_ranking_1v1_result` replaces a non-atomic
// read-modify-write in app/api/resultados-1v1/route.ts that was vulnerable
// to lost updates, and that also used `.is('temporada_id', temporadaId)`
// with a UUID (only ever matches NULL) — silently a no-op whenever a season
// was active.
describe('add_ranking_1v1_result — atomicity and temporada_id handling', () => {
  it('lands both increments when called concurrently for the same two players twice in a row', async () => {
    const admin = serviceClient();
    const p1 = await createUserClient();
    const p2 = await createUserClient();

    // Two confirmations landing at roughly the same time: p1 beats p2 twice.
    await Promise.all([
      admin.rpc('add_ranking_1v1_result', { p_ganador_id: p1.userId, p_perdedor_id: p2.userId, p_temporada_id: null }),
      admin.rpc('add_ranking_1v1_result', { p_ganador_id: p1.userId, p_perdedor_id: p2.userId, p_temporada_id: null }),
    ]);

    const winner = await getRanking1v1(p1.userId, null);
    const loser = await getRanking1v1(p2.userId, null);

    expect(winner?.victorias).toBe(2);
    expect(winner?.puntos).toBe(6);
    expect(winner?.racha_actual).toBe(2);
    expect(loser?.derrotas).toBe(2);
    expect(loser?.racha_actual).toBe(0);
  });

  it('correctly scopes rows by a non-null temporada_id (the exact case the old .is() bug broke)', async () => {
    const admin = serviceClient();
    const p1 = await createUserClient();
    const p2 = await createUserClient();

    const { data: temporada, error: tErr } = await admin
      .from('temporadas')
      .insert({ nombre: 'Test season', inicio: '2026-01-01', fin: '2026-12-31', activa: true })
      .select('id')
      .single();
    expect(tErr).toBeNull();
    const temporadaId = temporada!.id as string;

    const { error: rpcErr } = await admin.rpc('add_ranking_1v1_result', {
      p_ganador_id: p1.userId,
      p_perdedor_id: p2.userId,
      p_temporada_id: temporadaId,
    });
    expect(rpcErr).toBeNull();

    const winnerSeasonRow = await getRanking1v1(p1.userId, temporadaId);
    const winnerGlobalRow = await getRanking1v1(p1.userId, null);

    expect(winnerSeasonRow?.victorias).toBe(1);
    // The global (temporada_id IS NULL) row must be untouched — a season
    // result should never leak into the all-time ranking row.
    expect(winnerGlobalRow).toBeNull();
  });

  it('resets racha_actual to 0 on a loss and preserves racha_max', async () => {
    const admin = serviceClient();
    const p1 = await createUserClient();
    const p2 = await createUserClient();

    // p1 wins twice (racha 2), then loses once (racha resets to 0, racha_max stays 2)
    await admin.rpc('add_ranking_1v1_result', { p_ganador_id: p1.userId, p_perdedor_id: p2.userId, p_temporada_id: null });
    await admin.rpc('add_ranking_1v1_result', { p_ganador_id: p1.userId, p_perdedor_id: p2.userId, p_temporada_id: null });
    await admin.rpc('add_ranking_1v1_result', { p_ganador_id: p2.userId, p_perdedor_id: p1.userId, p_temporada_id: null });

    const p1Row = await getRanking1v1(p1.userId, null);
    expect(p1Row?.victorias).toBe(2);
    expect(p1Row?.derrotas).toBe(1);
    expect(p1Row?.racha_actual).toBe(0);
    expect(p1Row?.racha_max).toBe(2);
  });
});
