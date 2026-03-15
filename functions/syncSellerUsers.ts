import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * SYNCHRONIZATION UTILITY (NEW ARCHITECTURE)
 * Ensures every Seller has a linked Base44 User
 * Run this to repair any broken synchronization
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin uniquement' }, { status: 403 });
    }

    console.log('🔄 Starting seller-user synchronization...');

    // Get all sellers
    const sellers = await base44.asServiceRole.entities.Seller.list();
    console.log(`📊 Found ${sellers.length} sellers`);

    const report = {
      total_sellers: sellers.length,
      sellers_with_user_id: 0,
      sellers_without_user_id: 0,
      users_created: 0,
      sellers_updated: 0,
      errors: []
    };

    for (const seller of sellers) {
      try {
        // Check if seller has user_id
        if (seller.user_id) {
          report.sellers_with_user_id++;
          
          // Verify user exists
          const users = await base44.asServiceRole.entities.User.filter({ id: seller.user_id });
          if (users.length === 0) {
            console.warn(`⚠️ Seller ${seller.email} has user_id ${seller.user_id} but user doesn't exist`);
            
            // Create missing user
            await base44.users.inviteUser(seller.email, 'user');
            const newUsers = await base44.asServiceRole.entities.User.filter({ email: seller.email });
            if (newUsers.length > 0) {
              await base44.asServiceRole.entities.Seller.update(seller.id, {
                user_id: newUsers[0].id
              });
              report.users_created++;
              report.sellers_updated++;
              console.log(`✅ Created and linked user for ${seller.email}`);
            }
          }
          continue;
        }

        // Seller doesn't have user_id
        report.sellers_without_user_id++;
        console.log(`🔍 Seller ${seller.email} missing user_id`);

        // Check if user exists
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: seller.email });
        
        if (existingUsers.length > 0) {
          // User exists, just link it
          await base44.asServiceRole.entities.Seller.update(seller.id, {
            user_id: existingUsers[0].id
          });
          report.sellers_updated++;
          console.log(`✅ Linked existing user to seller: ${seller.email}`);
        } else {
          // User doesn't exist, create it
          await base44.users.inviteUser(seller.email, 'user');
          const newUsers = await base44.asServiceRole.entities.User.filter({ email: seller.email });
          if (newUsers.length > 0) {
            await base44.asServiceRole.entities.Seller.update(seller.id, {
              user_id: newUsers[0].id
            });
            report.users_created++;
            report.sellers_updated++;
            console.log(`✅ Created and linked new user for: ${seller.email}`);
          }
        }

      } catch (err) {
        console.error(`❌ Error processing seller ${seller.email}:`, err.message);
        report.errors.push({
          seller_email: seller.email,
          error: err.message
        });
      }
    }

    // Audit log
    await base44.asServiceRole.entities.JournalAudit.create({
      action: 'Synchronisation Seller-User',
      module: 'systeme',
      details: `Synchronisation exécutée par ${user.email}`,
      utilisateur: user.email,
      donnees_apres: JSON.stringify(report)
    }).catch(() => {});

    console.log('✅ Synchronization complete:', report);

    return Response.json({
      success: true,
      message: 'Synchronisation terminée',
      report
    });

  } catch (error) {
    console.error('❌ Synchronization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});