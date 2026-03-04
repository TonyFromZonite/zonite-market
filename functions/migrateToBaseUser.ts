import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let migrated = { vendeurs: 0, sousAdmins: 0, errors: [] };

    // 1. Migrer CompteVendeur → User avec rôle "vendeur"
    const comptes = await base44.asServiceRole.entities.CompteVendeur.list('', 1000);
    for (const compte of comptes) {
      try {
        const existing = await base44.asServiceRole.entities.User.filter({ email: compte.user_email });
        if (existing.length === 0) {
          // Créer le user Base44
          const userData = {
            email: compte.user_email,
            full_name: compte.nom_complet,
            role: 'vendeur'
          };
          await base44.asServiceRole.entities.User.create(userData);
          migrated.vendeurs++;
        }
      } catch (e) {
        migrated.errors.push(`Vendeur ${compte.user_email}: ${e.message}`);
      }
    }

    // 2. Migrer SousAdmin → User avec rôle "sous_admin"
    const sousAdmins = await base44.asServiceRole.entities.SousAdmin.list('', 1000);
    for (const sousAdmin of sousAdmins) {
      try {
        const existing = await base44.asServiceRole.entities.User.filter({ email: sousAdmin.email });
        if (existing.length === 0) {
          const userData = {
            email: sousAdmin.email,
            full_name: sousAdmin.nom_complet,
            role: 'sous_admin',
            permissions: sousAdmin.permissions || []
          };
          await base44.asServiceRole.entities.User.create(userData);
          migrated.sousAdmins++;
        }
      } catch (e) {
        migrated.errors.push(`Sous-admin ${sousAdmin.email}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      migrated,
      message: `Migration complétée. ${migrated.vendeurs} vendeurs et ${migrated.sousAdmins} sous-admins migrés.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});