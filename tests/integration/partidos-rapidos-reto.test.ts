import { describe, it, expect } from 'vitest';
import { POST as crearPartido } from '@/app/api/partidos-rapidos/route';
import { PATCH as patchPartido } from '@/app/api/partidos-rapidos/[id]/route';
import { setActiveClient } from './helpers/routeClient';
import { serviceClient, createUserClient, createCancha } from './helpers/client';

function jsonRequest(body: unknown) {
  return new Request('http://test/api/partidos-rapidos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRequest(id: string, body: unknown) {
  return new Request(`http://test/api/partidos-rapidos/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Reto directo (migración 048): un capitán reta a otro jugador específico —
// o al Rey — y ese jugador tiene que aceptar antes de que cuente como
// 'emparejado'. Reemplaza el auto-match ciego contra el Rey (que antes
// comprometía a un partido sin que hubiera aceptado nada).
describe('partidos-rapidos — reto directo (pendiente → aceptar/rechazar/cancelar)', () => {
  it('pendiente → aceptar sin compañeros → emparejado', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    const crearRes = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: capitanB.userId }));
    expect(crearRes.status).toBe(201);
    const { partido } = await crearRes.json();
    expect(partido.estado).toBe('pendiente');
    expect(partido.capitan_a_id).toBe(capitanA.userId);
    expect(partido.capitan_b_id).toBe(capitanB.userId);

    setActiveClient(capitanB.client);
    const acceptRes = await patchPartido(patchRequest(partido.id, { accion: 'aceptar' }), params(partido.id));
    expect(acceptRes.status).toBe(200);
    const acceptJson = await acceptRes.json();
    expect(acceptJson.estado).toBe('emparejado');
    const ladoB = acceptJson.partido.jugadores.filter((j: { lado: string }) => j.lado === 'b');
    expect(ladoB).toHaveLength(1);
    expect(ladoB[0].jugador_id).toBe(capitanB.userId);
    expect(ladoB[0].es_capitan).toBe(true);
  });

  it('aceptar con compañeros (registrado + invitado) suma las 3 filas del lado b', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();
    const companero = await createUserClient();

    setActiveClient(capitanA.client);
    const crearRes = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: capitanB.userId }));
    const { partido } = await crearRes.json();

    setActiveClient(capitanB.client);
    const acceptRes = await patchPartido(
      patchRequest(partido.id, { accion: 'aceptar', squad: [{ jugador_id: companero.userId }, { nombre_invitado: 'Pedro' }] }),
      params(partido.id),
    );
    expect(acceptRes.status).toBe(200);
    const acceptJson = await acceptRes.json();
    const ladoB = acceptJson.partido.jugadores.filter((j: { lado: string }) => j.lado === 'b');
    expect(ladoB).toHaveLength(3);
    expect(ladoB.filter((j: { nombre_invitado: string | null }) => j.nombre_invitado === 'Pedro')).toHaveLength(1);
  });

  it('rechazar deja el partido en estado rechazado', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    const crearRes = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: capitanB.userId }));
    const { partido } = await crearRes.json();

    setActiveClient(capitanB.client);
    const rechazarRes = await patchPartido(patchRequest(partido.id, { accion: 'rechazar' }), params(partido.id));
    expect(rechazarRes.status).toBe(200);
    expect((await rechazarRes.json()).estado).toBe('rechazado');

    // Ya no se puede aceptar un reto rechazado
    const segundoIntento = await patchPartido(patchRequest(partido.id, { accion: 'aceptar' }), params(partido.id));
    expect(segundoIntento.status).toBe(409);
  });

  it('el capitán que retó puede cancelar su propio reto pendiente', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    const crearRes = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: capitanB.userId }));
    const { partido } = await crearRes.json();

    const cancelarRes = await patchPartido(patchRequest(partido.id, { accion: 'cancelar' }), params(partido.id));
    expect(cancelarRes.status).toBe(200);
    expect((await cancelarRes.json()).estado).toBe('cancelado');
  });

  it('no se puede retar a uno mismo', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();

    setActiveClient(capitanA.client);
    const res = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: capitanA.userId }));
    expect(res.status).toBe(400);
  });

  it('solo el retado puede aceptar o rechazar — el retador recibe 403', async () => {
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const capitanB = await createUserClient();

    setActiveClient(capitanA.client);
    const crearRes = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: capitanB.userId }));
    const { partido } = await crearRes.json();

    // capitanA (el retador) intenta aceptar su propio reto
    const intento = await patchPartido(patchRequest(partido.id, { accion: 'aceptar' }), params(partido.id));
    expect(intento.status).toBe(403);
  });

  it('retar al jugador que es Rey 3v3 vigente marca es_vs_king en el partido', async () => {
    const admin = serviceClient();
    const canchaId = await createCancha();
    const capitanA = await createUserClient();
    const rey = await createUserClient();

    await admin.from('cancha_dominio').insert({
      cancha_id: canchaId,
      jugador_id: rey.userId,
      formato: '3v3',
      victorias: 3,
      derrotas: 0,
      es_king: true,
    });

    setActiveClient(capitanA.client);
    const res = await crearPartido(jsonRequest({ cancha_id: canchaId, squad: [], rival_jugador_id: rey.userId }));
    expect(res.status).toBe(201);
    const { partido } = await res.json();
    expect(partido.es_vs_king).toBe(true);
  });
});
