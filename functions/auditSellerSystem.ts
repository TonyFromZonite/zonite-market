import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * FULL SYSTEM AUDIT - Seller/User Synchronization
 * Identifies and reports all inconsistencies
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
      total_sellers: 0,
      sellers_without_base44_user: [],
      sellers_with_issues: [],
      orphaned_base44_users: [],
      status_mismatches: [],
      kyc_inconsistencies: [],
      training_inconsistencies: [],
      errors: []
    };

    try {
      // Get all sellers from Seller entity
      const allSellers = await base44.asServiceRole.entities.Seller.list();
      report.total_sellers = allSellers.length;

      // Check each seller for Base44 user correspondence
      for (const seller of allSellers) {
        const issues = [];

        // Check if Base44 user exists
        try {
          const base44Users = await base44.asServiceRole.entities.User.filter({ email: seller.email });
          if (base44Users.length === 0) {
            issues.push('NO_BASE44_USER');
          } else {
            const base44User = base44Users[0];
            if (base44User.role !== 'user') {
              issues.push(`WRONG_ROLE: ${base44User.role}`);
            }
          }
        } catch (e) {
          issues.push(`USER_CHECK_FAILED: ${e.message}`);
        }

        // Check seller_status field
        if (!seller.seller_status) {
          issues.push('MISSING_SELLER_STATUS');
        }

        // Check KYC status transitions
        if (seller.seller_status === 'pending_verification' && seller.email_verified) {
          issues.push('STATUS_NOT_TRANSITIONED_TO_KYC_REQUIRED');
        }
        if (seller.seller_status === 'kyc_pending' && seller.statut_kyc === 'valide') {
          issues.push('STATUS_NOT_TRANSITIONED_TO_TRAINING');
        }
        if (seller.seller_status === 'kyc_approved_training_required' && seller.video_vue && seller.training_completed) {
          issues.push('STATUS_NOT_TRANSITIONED_TO_ACTIVE');
        }

        // Check training consistency
        if (seller.seller_status === 'active_seller' && !seller.training_completed && !seller.video_vue) {
          issues.push('ACTIVE_BUT_NO_TRAINING');
        }

        // Check catalog access consistency
        if (seller.seller_status !== 'active_seller' && seller.catalogue_debloque) {
          issues.push('EARLY_CATALOG_ACCESS');
        }

        if (issues.length > 0) {
          report.sellers_with_issues.push({
            id: seller.id,
            email: seller.email,
            nom_complet: seller.nom_complet,
            seller_status: seller.seller_status,
            statut_kyc: seller.statut_kyc,
            email_verified: seller.email_verified,
            training_completed: seller.training_completed,
            video_vue: seller.video_vue,
            issues
          });
        }

        // Track sellers without Base44 user
        if (issues.includes('NO_BASE44_USER')) {
          report.sellers_without_base44_user.push({
            id: seller.id,
            email: seller.email,
            nom_complet: seller.nom_complet
          });
        }
      }

      // Find orphaned Base44 users (users not matching any seller)
      const allBase44Users = await base44.asServiceRole.entities.User.filter({ role: 'user' });
      for (const base44User of allBase44Users) {
        const matchingSeller = allSellers.find(s => s.email === base44User.email);
        if (!matchingSeller) {
          report.orphaned_base44_users.push({
            email: base44User.email,
            id: base44User.id
          });
        }
      }

      return Response.json({
        success: true,
        audit_report: report,
        has_critical_issues: report.sellers_without_base44_user.length > 0 || report.orphaned_base44_users.length > 0
      });
    } catch (error) {
      report.errors.push(error.message);
      return Response.json({
        success: false,
        audit_report: report,
        error: error.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});