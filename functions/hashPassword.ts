import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

/**
 * Hash une chaîne de caractères avec bcrypt
 * Utilisé par le frontend pour éviter d'importer bcryptjs côté client
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return Response.json({ error: 'password requise' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    return Response.json({ success: true, hash });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});