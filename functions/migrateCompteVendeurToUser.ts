import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let migrated = { vendeurs: 0, errors: [] };

    // Migrer CompteVendeur → User Base44 avec rôle "vendeur"
    const comptes = await base44.asServiceRole.entities.CompteVendeur.list('', 1000);
    for (const compte of comptes) {
      try {
        const existing = await base44.asServiceRole.entities.User.filter({ email: compte.user_email });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.User.create({
            email: compte.user_email,
            full_name: compte.nom_complet,
            role: 'vendeur'
          });
          migrated.vendeurs++;
        }
      } catch (e) {
        migrated.errors.push(`Vendeur ${compte.user_email}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      migrated,
      message: `Migration complétée. ${migrated.vendeurs} vendeurs migrés.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});