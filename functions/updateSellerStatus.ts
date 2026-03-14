import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Update seller status - handles status transitions and validation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seller_id, new_status } = await req.json();

    if (!seller_id || !new_status) {
      return Response.json({ error: 'seller_id and new_status required' }, { status: 400 });
    }

    // Valid status transitions
    const VALID_TRANSITIONS = {
      pending_verification: ['kyc_required'],
      kyc_required: ['kyc_pending'],
      kyc_pending: ['kyc_approved_training_required', 'kyc_required'], // Can reject back
      kyc_approved_training_required: ['active_seller'],
      active_seller: ['kyc_approved_training_required'], // For retraining
    };

    const seller = await base44.entities.Seller.filter({ id: seller_id });
    if (!seller.length) {
      return Response.json({ error: 'Seller not found' }, { status: 404 });
    }

    const currentStatus = seller[0].seller_status;

    // Check if transition is valid (only if not admin)
    if (user.role !== 'admin' && !VALID_TRANSITIONS[currentStatus]?.includes(new_status)) {
      return Response.json(
        { error: `Invalid transition from ${currentStatus} to ${new_status}` },
        { status: 400 }
      );
    }

    // Update seller status
    await base44.entities.Seller.update(seller_id, {
      seller_status: new_status,
    });

    return Response.json({ success: true, new_status });
  } catch (error) {
    console.error('Error updating seller status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});