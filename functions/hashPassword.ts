import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password || password.length < 6) {
      return Response.json({ error: 'Invalid password' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return Response.json({ hashedPassword });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});