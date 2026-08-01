import { describe, it, expect } from 'vitest';
import { POST as proponerResultado } from '@/app/api/resultados/route';
import { setActiveClient } from './helpers/routeClient';
import { serviceClient, createTeamWithAdmin, createCancha, createDesafio } from './helpers/client';

function jsonRequest(body: unknown) {
  return new Request('http://test/api/resultados', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Migration 045 fix: resultados now has UNIQUE(desafio_id), mirroring
// resultados_individual. Two proposals racing for the same desafío (e.g.
// both teams hitting "proponer resultado" at the same time) must not both
// succeed. Fired concurrently via Promise.all so both requests genuinely
// race against Postgres — whichever loses may see either a 409 (unique
// violation) or a 400 (desafio already moved to resultado_pendiente),
// depending on exact timing, so the real invariant asserted is "exactly one
// resultados row ends up existing", not a specific status code.
describe('POST /api/resultados — duplicate proposal for the same desafío', () => {
  it('never lets two concurrent proposals both create a row', async () => {
    const teamA = await createTeamWithAdmin();
    const teamB = await createTeamWithAdmin();
    const canchaId = await createCancha();
    const desafioId = await createDesafio({ retadorId: teamA.equipoId, retadoId: teamB.equipoId, canchaId });

    setActiveClient(teamA.client);
    const p1 = proponerResultado(jsonRequest({ desafio_id: desafioId, ganador_id: teamA.equipoId }));
    setActiveClient(teamB.client);
    const p2 = proponerResultado(jsonRequest({ desafio_id: desafioId, ganador_id: teamB.equipoId }));

    const [r1, r2] = await Promise.all([p1, p2]);
    const statuses = [r1.status, r2.status];

    // Exactly one of the two succeeds.
    expect(statuses.filter(s => s === 201)).toHaveLength(1);

    const admin = serviceClient();
    const { data: rows } = await admin.from('resultados').select('id').eq('desafio_id', desafioId);
    expect(rows).toHaveLength(1);
  });
});
