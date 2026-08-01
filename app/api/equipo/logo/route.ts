import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Storage } from '@google-cloud/storage';

// ── GCS client (lazy init so missing env vars fail at runtime, not build) ────

function getStorage() {
  const projectId   = process.env.GCS_PROJECT_ID;
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  const privateKey  = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const bucketName  = process.env.GCS_BUCKET_NAME;

  if (!projectId || !clientEmail || !privateKey || !bucketName) {
    throw new Error(
      'GCS env vars not configured: GCS_PROJECT_ID, GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY, GCS_BUCKET_NAME'
    );
  }

  const storage = new Storage({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });

  return { storage, bucketName };
}

// ── Allowed image MIME types ──────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// ── Magic-byte sniffing ────────────────────────────────────────────────────────
// The client-declared Content-Type (`File.type`) is fully attacker-controlled
// (a raw multipart POST can set it to anything). Verify the actual file bytes
// match a real image signature before trusting the declared type — otherwise
// arbitrary content (e.g. HTML/SVG with a script) could be uploaded as
// "image/png" and served publicly, cached for a year, from a trusted domain.
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 6 &&
      buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61) {
    return 'image/gif';
  }
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

// Best-effort delete of a previous logo object — non-fatal if it fails
// (missing env vars, already deleted, etc). Prevents orphaned objects from
// accumulating in the bucket on every logo change.
async function deleteOldLogo(logoUrl: string | null | undefined) {
  if (!logoUrl) return;
  try {
    const { storage, bucketName } = getStorage();
    const prefix = `https://storage.googleapis.com/${bucketName}/`;
    if (!logoUrl.startsWith(prefix)) return;
    const objectName = logoUrl.slice(prefix.length);
    await storage.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
  } catch (err) {
    console.error('[POST /api/equipo/logo] failed to delete previous logo:', err);
  }
}

// ── POST /api/equipo/logo ────────────────────────────────────────────────────
// Uploads a team logo to GCS and updates equipos.logo_url.
// Body: multipart/form-data with field "file".
// Returns: { logo_url: string }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Find the user's team and verify they are admin
    const { data: membresia } = await supabase
      .from('equipo_miembros')
      .select('equipo_id, rol')
      .eq('jugador_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membresia) {
      return NextResponse.json({ error: 'No perteneces a ningún equipo' }, { status: 403 });
    }
    if (membresia.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo el administrador puede cambiar el logo' }, { status: 403 });
    }

    const equipoId = membresia.equipo_id;

    // Parse multipart form
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida — se esperaba multipart/form-data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 });
    }

    const f = file as File;

    // Validate type
    if (!ALLOWED_TYPES.includes(f.type)) {
      return NextResponse.json(
        { error: `Tipo no permitido: ${f.type}. Usa JPG, PNG, WebP o GIF.` },
        { status: 400 }
      );
    }

    // Validate size
    if (f.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `El archivo supera el límite de 2 MB (${(f.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 400 }
      );
    }

    // Read file into buffer
    const buffer = Buffer.from(await f.arrayBuffer());

    // Validate the actual bytes match a real image signature — the
    // declared f.type is attacker-controlled and can't be trusted alone.
    const sniffedType = sniffImageType(buffer);
    if (!sniffedType || !ALLOWED_TYPES.includes(sniffedType)) {
      return NextResponse.json(
        { error: 'El archivo no es una imagen válida (JPG, PNG, WebP o GIF).' },
        { status: 400 }
      );
    }

    // Determine extension from the sniffed (trusted) type, not the client's
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png':  'png',
      'image/webp': 'webp',
      'image/gif':  'gif',
    };
    const ext = extMap[sniffedType] ?? 'bin';

    // Fetch current logo so it can be cleaned up after a successful upload
    const { data: equipoActual } = await supabase
      .from('equipos')
      .select('logo_url')
      .eq('id', equipoId)
      .maybeSingle();

    // Upload to GCS
    const { storage, bucketName } = getStorage();
    const objectName = `team-logos/${equipoId}/${Date.now()}.${ext}`;
    const gcsFile = storage.bucket(bucketName).file(objectName);

    await gcsFile.save(buffer, {
      contentType: sniffedType,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    // Make the object publicly readable
    await gcsFile.makePublic();

    const logo_url = `https://storage.googleapis.com/${bucketName}/${objectName}`;

    // Persist URL in Supabase
    const { error: dbErr } = await supabase
      .from('equipos')
      .update({ logo_url })
      .eq('id', equipoId);

    if (dbErr) {
      return NextResponse.json({ error: 'Error al guardar URL del logo' }, { status: 500 });
    }

    // Best-effort cleanup of the previous logo — never blocks the response
    await deleteOldLogo(equipoActual?.logo_url);

    return NextResponse.json({ logo_url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[POST /api/equipo/logo]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
