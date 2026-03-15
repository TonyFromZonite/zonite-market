import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * REPAIR SELLER CONSISTENCY
 * Fixes all seller/Base44 user synchronization issues
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const report = {
      timestamp: new Date().toISOString(),
      sellers_repaired: [],
      base44_users_created: [],
      status_transitions_fixed: [],
      errors: []
    };

    try {
      // Get all sellers
      const allSellers = await base44.asServiceRole.entities.Seller.list();

      for (const seller of allSellers) {
        try {
          const updates = {};
          let needsUpdate = false;

          // 1. Create missing Base44 user
          try {
            const base44Users = await base44.asServiceRole.entities.User.filter({ email: seller.email });
            if (base44Users.length === 0) {
              try {
                await base44.users.inviteUser(seller.email, 'user');
                report.base44_users_created.push(seller.email);
              } catch (inviteErr) {
                if (!inviteErr.message.includes('already exists')) {
                  report.errors.push(`Failed to create Base44 user for ${seller.email}: ${inviteErr.message}`);
                }
              }
            }
          } catch (e) {
            report.errors.push(`Error checking Base44 user for ${seller.email}: ${e.message}`);
          }

          // 2. Fix missing seller_status field
          if (!seller.seller_status) {
            if (seller.statut === 'actif' && seller.statut_kyc === 'valide' && seller.video_vue) {
              updates.seller_status = 'active_seller';
            } else if (seller.statut_kyc === 'valide' && !seller.video_vue) {
              updates.seller_status = 'kyc_approved_training_required';
            } else if (seller.statut_kyc === 'en_attente' && seller.email_verified) {
              updates.seller_status = 'kyc_required';
            } else if (seller.email_verified && seller.statut_kyc === 'en_attente') {
              updates.seller_status = 'kyc_required';
            } else {
              updates.seller_status = 'pending_verification';
            }
            needsUpdate = true;
            report.status_transitions_fixed.push({
              seller_id: seller.id,
              email: seller.email,
              new_seller_status: updates.seller_status
            });
          }

          // 3. Add missing training_completed field
          if (!seller.training_completed && seller.video_vue) {
            updates.training_completed = true;
            needsUpdate = true;
          }

          // 4. Ensure active_seller transitions when all conditions met
          if (seller.seller_status === 'kyc_approved_training_required' && seller.video_vue && !seller.training_completed) {
            updates.training_completed = true;
            needsUpdate = true;
          }

          if (seller.seller_status === 'kyc_approved_training_required' && seller.training_completed && seller.video_vue) {
            updates.seller_status = 'active_seller';
            updates.catalogue_debloque = true;
            needsUpdate = true;
            report.status_transitions_fixed.push({
              seller_id: seller.id,
              email: seller.email,
              transition: 'training_completed → active_seller'
            });
          }

          // 5. Verify catalog access aligns with status
          if (seller.seller_status === 'active_seller' && !seller.catalogue_debloque) {
            updates.catalogue_debloque = true;
            needsUpdate = true;
          }

          if (seller.seller_status !== 'active_seller' && seller.catalogue_debloque) {
            updates.catalogue_debloque = false;
            needsUpdate = true;
          }

          // Apply updates if needed
          if (needsUpdate) {
            await base44.asServiceRole.entities.Seller.update(seller.id, updates);
            report.sellers_repaired.push({
              id: seller.id,
              email: seller.email,
              updates
            });
          }
        } catch (error) {
          report.errors.push(`Error processing seller ${seller.email}: ${error.message}`);
        }
      }

      // Create repair audit log
      await base44.asServiceRole.entities.JournalAudit.create({
        action: 'Réparation de la cohérence vendeur/utilisateur',
        module: 'systeme',
        details: `Réparation complète du système: ${report.sellers_repaired.length} vendeurs corrigés, ${report.base44_users_created.length} utilisateurs Base44 créés`,
        utilisateur: user.email
      }).catch(() => {});

      return Response.json({
        success: true,
        repair_report: report,
        summary: {
          sellers_repaired: report.sellers_repaired.length,
          base44_users_created: report.base44_users_created.length,
          status_transitions_fixed: report.status_transitions_fixed.length,
          errors: report.errors.length
        }
      });
    } catch (error) {
      report.errors.push(error.message);
      return Response.json({
        success: false,
        repair_report: report,
        error: error.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Repair error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});