/**
 * SELLER STATUS ENGINE - DOCUMENTATION
 * 
 * Provides strict access control based on seller lifecycle status.
 * Each seller transitions through predefined statuses controlling access.
 * 
 * STATUS DEFINITIONS:
 * 
 * 1. pending_verification
 *    - Initial status when seller registers
 *    - Seller receives email verification code
 *    - Dashboard: ❌ Blocked
 *    - After email verification → kyc_required
 * 
 * 2. kyc_required
 *    - After email verification
 *    - Can: View dashboard, profile
 *    - Cannot: Access catalog, perform sales
 *    - Shows KYC submission modal
 *    - After KYC submission → kyc_pending
 * 
 * 3. kyc_pending
 *    - After KYC documents submitted
 *    - Can: View dashboard, profile
 *    - Cannot: Access catalog, sales, training
 *    - Shows "KYC under review" message
 *    - Admin validates → kyc_approved_training_required
 * 
 * 4. kyc_approved_training_required
 *    - KYC validated by admin
 *    - Must watch training video
 *    - Can: Dashboard, training video
 *    - Cannot: Catalog, sales, other features
 *    - After training completion → active_seller
 * 
 * 5. active_seller
 *    - Full access unlocked
 *    - Can access everything
 *    - Training remains accessible (permanent library)
 * 
 * ADMIN-CREATED SELLERS:
 * - Skip: pending_verification, kyc_required, kyc_pending
 * - Start at: kyc_approved_training_required
 * - Must watch training before catalog access
 * - Set created_by field to admin email
 * 
 * FEATURE ACCESS MATRIX:
 * 
 * Feature              | pending | kyc_req | kyc_pending | training_req | active
 * -------------------|---------|---------|-------------|-------------|--------
 * Dashboard           | ❌      | ✅      | ✅          | ✅          | ✅
 * Catalog             | ❌      | ❌      | ❌          | ❌          | ✅
 * Sales               | ❌      | ❌      | ❌          | ❌          | ✅
 * Profile             | ❌      | ✅      | ✅          | ✅          | ✅
 * Training            | ❌      | ❌      | ❌          | ✅          | ✅
 * 
 * USAGE:
 * 
 * import { canAccessFeature, getRestrictionMessage } from "@/components/SellerStatusEngine";
 * 
 * // Check access
 * if (canAccessFeature(seller.seller_status, "catalog")) {
 *   // Render catalog link
 * }
 * 
 * // Get user message
 * const msg = getRestrictionMessage(seller.seller_status, "sales");
 * 
 * IMPLEMENTATION FILES:
 * - components/SellerStatusEngine.js - Engine logic and utilities
 * - entities/Seller.json - Added seller_status field
 * - pages/EspaceVendeur - Dashboard with status control
 * - pages/VideoFormation - Sets active_seller on completion
 * - pages/InscriptionVendeur - Initial registration flow
 * - functions/updateSellerStatus.js - Status transition handler
 */

// This file is documentation only. Logic is in SellerStatusEngine.js
export const SELLER_STATUS_ENGINE_DOCS = true;