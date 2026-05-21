import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { equipo_id, metodo, valor } = await request.json();

  const { data: invitacion, error } = await supabase
    .from('invitaciones')
    .insert({
      equipo_id,
      invitado_por: user.id,
      email: metodo === 'email' ? valor : null,
      telefono: metodo === 'whatsapp' ? valor : null,
      metodo,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enviar email si el método es email
  if (metodo === 'email' && valor) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && resendKey !== 're_placeholder') {
      const [equipoRes, invitadorRes] = await Promise.all([
        supabase.from('equipos').select('nombre').eq('id', equipo_id).single(),
        supabase.from('profiles').select('display_name, username').eq('id', user.id).single(),
      ]);

      const equipoNombre = equipoRes.data?.nombre ?? 'un equipo';
      const invitadorNombre = invitadorRes.data?.display_name ?? invitadorRes.data?.username ?? 'Un jugador';
      const { origin } = new URL(request.url);
      const joinUrl = `${origin}/join/${equipo_id}/${invitacion.token}`;

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

  return NextResponse.json(invitacion, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const equipoId = searchParams.get('equipo_id');

  if (!equipoId) return NextResponse.json({ error: 'equipo_id requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('equipo_id', equipoId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
