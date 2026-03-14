import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const password = "ifela2021";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete old account if exists
    try {
      const existing = await base44.asServiceRole.entities.Seller.filter({ email: "snapife4@gmail.com" });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.Seller.delete(existing[0].id);
      }
    } catch (e) {
      console.log("No existing account to delete");
    }

    // Create new account with properly hashed password
    const seller = await base44.asServiceRole.entities.Seller.create({
      email: "snapife4@gmail.com",
      nom_complet: "ifela lonam",
      telephone: "698888324",
      mot_de_passe_hash: hashedPassword,
      email_verified: true,
      conditions_acceptees: true,
      statut_kyc: "valide",
      seller_status: "active_seller",
      training_completed: true
    });

    return Response.json({ success: true, seller, hashed: hashedPassword });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});