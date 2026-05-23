import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// POST /api/invitaciones — create an invitation
// Body:
//   { equipo_id, metodo: 'email'|'whatsapp'|'link', valor?: string, jugador_id?: string }
// When jugador_id is provided the invitation is linked to that player so they
// see it in-app (no need to share the link manually).
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { equipo_id, metodo, valor, jugador_id } = await request.json();

  const { data: invitacion, error } = await supabase
    .from('invitaciones')
    .insert({
      equipo_id,
      invitado_por: user.id,
      email:      metodo === 'email'    ? valor : null,
      telefono:   metodo === 'whatsapp' ? valor : null,
      metodo,
      jugador_id: jugador_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { origin } = new URL(request.url);
  const joinUrl = `${origin}/join/${equipo_id}/${invitacion.token}`;

  // Send email if metodo is 'email' and Resend is configured
  if (metodo === 'email' && valor) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey !== 're_placeholder') {
      const [equipoRes, invitadorRes] = await Promise.all([
        supabase.from('equipos').select('nombre').eq('id', equipo_id).single(),
        supabase.from('profiles').select('display_name, username').eq('id', user.id).single(),
      ]);

      const equipoNombre = equipoRes.data?.nombre ?? 'un equipo';
      const invitadorNombre = invitadorRes.data?.display_name ?? invitadorRes.data?.username ?? 'Un jugador';

      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'KOTC <onboarding@resend.dev>',
        to: valor,
        subject: `${invitadorNombre} te invita a unirte a ${equipoNombre}`,
        html: `
          <div style="font-family:sans-serif;background:#080809;color:#fff;padding:32px;max-width:480px;margin:0 auto;border-radius:12px">
            <div style="font-size:32px;text-align:center;margin-bottom:16px">👑</div>
            <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;text-align:center">King of the Court</h1>
            <p style="color:#888;font-size:13px;text-align:center;margin:0 0 24px">
              <strong style="color:#fff">${invitadorNombre}</strong> te invita a unirte a
              <strong style="color:#F5C344">${equipoNombre}</strong>
            </p>
            <a href="${joinUrl}"
               style="display:block;background:#F5C344;color:#080809;text-align:center;padding:14px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin-bottom:16px">
              Aceptar invitación
            </a>
            <p style="color:#444;font-size:11px;text-align:center;margin:0">
              Este link expira en 48 horas.
            </p>
          </div>
        `,
      });
    }
  }

  return NextResponse.json({ ...invitacion, joinUrl }, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET /api/invitaciones
//   ?equipo_id=xxx          → invitations sent for a team (admin view)
//   ?tipo=recibidas         → invitations received by the current user (in-app)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo     = searchParams.get('tipo');
  const equipoId = searchParams.get('equipo_id');

  // ---------- invitaciones recibidas por el jugador ----------
  if (tipo === 'recibidas') {
    const { data, error } = await supabase
      .from('invitaciones')
      .select('id, equipo_id, token, created_at, equipos(id, nombre, color, deporte, modalidad, ciudad), profiles!invitaciones_invitado_por_fkey(display_name, username)')
      .eq('jugador_id', user.id)
      .is('usado_at', null)                        // not yet accepted
      .gte('expires_at', new Date().toISOString()) // not expired (if column exists)
      .order('created_at', { ascending: false });

    if (error) {
      // If expires_at column doesn't exist yet, retry without the filter
      const { data: data2, error: error2 } = await supabase
        .from('invitaciones')
        .select('id, equipo_id, token, created_at, equipos(id, nombre, color, deporte, modalidad, ciudad), profiles!invitaciones_invitado_por_fkey(display_name, username)')
        .eq('jugador_id', user.id)
        .is('usado_at', null)
        .order('created_at', { ascending: false });

      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
      return NextResponse.json(data2 ?? []);
    }

    return NextResponse.json(data ?? []);
  }

  // ---------- invitaciones enviadas por un equipo (admin view) ----------
  if (!equipoId) return NextResponse.json({ error: 'equipo_id o tipo=recibidas requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('equipo_id', equipoId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
