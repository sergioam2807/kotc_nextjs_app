import { describe, it, expect } from 'vitest';
import {
  createTeamWithAdmin,
  createCancha,
  createDesafio,
  createUserClient,
} from './helpers/client';

// Migration 045 fix: `resultados` INSERT/UPDATE policies used to be
// `auth.uid() IS NOT NULL` — any authenticated user could write to any
// desafío's resultado via a direct PostgREST call, bypassing the ownership
// check that only lived in app/api/resultados/route.ts. These policies now
// require the caller to be a member of one of the two teams in the desafío.
describe('resultados RLS — participant-only writes', () => {
  it('rejects an INSERT from a user who is not a participant of the desafío', async () => {
    const teamA = await createTeamWithAdmin();
    const teamB = await createTeamWithAdmin();
    const canchaId = await createCancha();
    const desafioId = await createDesafio({ retadorId: teamA.equipoId, retadoId: teamB.equipoId, canchaId });

    const outsider = await createUserClient();

    const { error } = await outsider.client.from('resultados').insert({
      desafio_id: desafioId,
      ganador_id: teamA.equipoId,
      propuesto_por: teamA.equipoId,
    });

    expect(error).not.toBeNull();
  });

  it('allows an INSERT from a participant of the desafío', async () => {
    const teamA = await createTeamWithAdmin();
    const teamB = await createTeamWithAdmin();
    const canchaId = await createCancha();
    const desafioId = await createDesafio({ retadorId: teamA.equipoId, retadoId: teamB.equipoId, canchaId });

    const { error } = await teamA.client.from('resultados').insert({
      desafio_id: desafioId,
      ganador_id: teamA.equipoId,
      propuesto_por: teamA.equipoId,
    });

    expect(error).toBeNull();
  });

  it('rejects an UPDATE on an existing resultado from a non-participant', async () => {
    const teamA = await createTeamWithAdmin();
    const teamB = await createTeamWithAdmin();
    const canchaId = await createCancha();
    const desafioId = await createDesafio({ retadorId: teamA.equipoId, retadoId: teamB.equipoId, canchaId });

    await teamA.client.from('resultados').insert({
      desafio_id: desafioId,
      ganador_id: teamA.equipoId,
      propuesto_por: teamA.equipoId,
    });

    const outsider = await createUserClient();
    const { data, error } = await outsider.client
      .from('resultados')
      .update({ ganador_id: teamB.equipoId })
      .eq('desafio_id', desafioId)
      .select();

    // RLS silently filters rows the policy denies rather than erroring —
    // assert no row was actually changed.
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
