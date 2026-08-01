import { describe, it, expect } from 'vitest';
import { serviceClient, createUserClient, createTeamWithAdmin, createLiga } from './helpers/client';

// Migration 045 fix: ligas.estado had no transition guard in RLS — only the
// API layer (app/api/ligas/[id]/route.ts) validated the FSM. A direct
// PostgREST UPDATE (or any future code path) could skip straight from
// 'borrador' to 'finalizada', or reopen a 'finalizada' liga. A DB trigger
// now enforces valid transitions regardless of how the UPDATE is issued.
describe('ligas.estado FSM trigger', () => {
  it('allows the documented valid transitions', async () => {
    const admin = serviceClient();
    const organizador = await createUserClient();
    const ligaId = await createLiga({ organizadorId: organizador.userId, estado: 'borrador' });

    const { error: e1 } = await admin.from('ligas').update({ estado: 'inscripciones' }).eq('id', ligaId);
    expect(e1).toBeNull();

    const { error: e2 } = await admin.from('ligas').update({ estado: 'en_curso' }).eq('id', ligaId);
    expect(e2).toBeNull();

    const { error: e3 } = await admin.from('ligas').update({ estado: 'finalizada' }).eq('id', ligaId);
    expect(e3).toBeNull();
  });

  it('rejects skipping straight from borrador to finalizada', async () => {
    const admin = serviceClient();
    const organizador = await createUserClient();
    const ligaId = await createLiga({ organizadorId: organizador.userId, estado: 'borrador' });

    const { error } = await admin.from('ligas').update({ estado: 'finalizada' }).eq('id', ligaId);
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/Transición de estado inválida/i);
  });

  it('rejects reopening a finalizada liga', async () => {
    const admin = serviceClient();
    const organizador = await createUserClient();
    const ligaId = await createLiga({ organizadorId: organizador.userId, estado: 'borrador' });

    await admin.from('ligas').update({ estado: 'inscripciones' }).eq('id', ligaId);
    await admin.from('ligas').update({ estado: 'en_curso' }).eq('id', ligaId);
    await admin.from('ligas').update({ estado: 'finalizada' }).eq('id', ligaId);

    const { error } = await admin.from('ligas').update({ estado: 'en_curso' }).eq('id', ligaId);
    expect(error).not.toBeNull();
  });

  it('allows a no-op update that does not change estado', async () => {
    const admin = serviceClient();
    const organizador = await createUserClient();
    const ligaId = await createLiga({ organizadorId: organizador.userId, estado: 'borrador' });

    const { error } = await admin.from('ligas').update({ estado: 'borrador', nombre: 'Renombrada' }).eq('id', ligaId);
    expect(error).toBeNull();
  });
});

// Migration 045 fix: liga_equipos_delete only blocked non-organizer
// retirement while en_curso at the API layer. RLS now replicates that same
// asymmetry — organizer can always remove a team; team admin/capitán cannot
// while the liga is en_curso.
describe('liga_equipos_delete RLS — organizer vs admin/capitán asymmetry', () => {
  it('blocks a team admin from retiring while the liga is en_curso', async () => {
    const admin = serviceClient();
    const organizador = await createUserClient();
    const team = await createTeamWithAdmin();
    const ligaId = await createLiga({ organizadorId: organizador.userId, estado: 'borrador' });

    await admin.from('liga_equipos').insert({ liga_id: ligaId, equipo_id: team.equipoId, estado: 'aceptado' });
    await admin.from('ligas').update({ estado: 'inscripciones' }).eq('id', ligaId);
    await admin.from('ligas').update({ estado: 'en_curso' }).eq('id', ligaId);

    const { data, error } = await team.client
      .from('liga_equipos')
      .delete()
      .eq('liga_id', ligaId)
      .eq('equipo_id', team.equipoId)
      .select();

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0); // RLS denies it — 0 rows affected, not an error

    const { data: stillThere } = await admin
      .from('liga_equipos')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('equipo_id', team.equipoId)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });

  it('still allows the organizer to remove a team while en_curso', async () => {
    const admin = serviceClient();
    const organizador = await createUserClient();
    const team = await createTeamWithAdmin();
    const ligaId = await createLiga({ organizadorId: organizador.userId, estado: 'borrador' });

    await admin.from('liga_equipos').insert({ liga_id: ligaId, equipo_id: team.equipoId, estado: 'aceptado' });
    await admin.from('ligas').update({ estado: 'inscripciones' }).eq('id', ligaId);
    await admin.from('ligas').update({ estado: 'en_curso' }).eq('id', ligaId);

    const { error } = await organizador.client
      .from('liga_equipos')
      .delete()
      .eq('liga_id', ligaId)
      .eq('equipo_id', team.equipoId);

    expect(error).toBeNull();
    const { data: stillThere } = await admin
      .from('liga_equipos')
      .select('id')
      .eq('liga_id', ligaId)
      .eq('equipo_id', team.equipoId)
      .maybeSingle();
    expect(stillThere).toBeNull();
  });
});
