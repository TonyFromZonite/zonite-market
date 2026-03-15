/**
 * ADMIN QUICK ACTION GUIDE
 * 
 * Step-by-step instructions for admin operations
 */

export const ADMIN_GUIDE = {
  "1. VERIFY SYSTEM HEALTH": {
    objective: "Check if all sellers and Base44 users are consistent",
    steps: [
      "1. Go to Dashboard → or open Developer Console",
      "2. Call function: auditSellerSystem",
      "3. Check the response:",
      "   - has_critical_issues: false = ✅ System is healthy",
      "   - has_critical_issues: true = ⚠️ Issues found",
      "4. If issues found, proceed to 'REPAIR SYSTEM'"
    ],
    expected_result: "has_critical_issues = false"
  },

  "2. REPAIR SYSTEM": {
    objective: "Automatically fix all inconsistencies",
    when_needed: "When auditSellerSystem shows has_critical_issues = true",
    steps: [
      "1. Go to Dashboard",
      "2. Call function: repairSellerConsistency",
      "3. Wait for completion (takes 5-30 seconds depending on seller count)",
      "4. Check the response:",
      "   - sellers_repaired: X",
      "   - base44_users_created: Y",
      "   - status_transitions_fixed: Z",
      "   - errors: 0 (should be empty)",
      "5. If errors > 0, note them for investigation"
    ],
    expected_result: "errors array is empty, all counts > 0 means issues were fixed"
  },

  "3. APPROVE KYC": {
    objective: "Validate seller KYC documents and unlock training",
    location: "Pages → Gestion KYC",
    steps: [
      "1. Click 'Gestion KYC' in sidebar",
      "2. Find seller with status = 'kyc_pending' (waiting for approval)",
      "3. Click seller row to view documents:",
      "   - Identity document (front side)",
      "   - Identity document (back side, if CNI)",
      "   - Selfie with ID",
      "4. Review documents for authenticity",
      "5. Click 'Approuver' button",
      "6. Seller status → 'kyc_approved_training_required'",
      "7. Seller receives email: 'Next: Watch training video'",
      "8. On seller's next login → Training modal auto-appears"
    ],
    note: "Training video is MANDATORY before catalog access"
  },

  "4. CREATE SELLER (No Auto-Validation)": {
    objective: "Create seller who must submit KYC manually",
    location: "Pages → Gestion Vendeurs → Create",
    steps: [
      "1. Click 'Créer vendeur' button",
      "2. Fill seller info:",
      "   - Email (must be unique)",
      "   - Full name",
      "   - Phone",
      "   - Address",
      "   - Mobile Money info",
      "3. UNCHECK 'Auto-valider KYC' checkbox",
      "4. Click 'Créer'",
      "5. Seller receives email with:",
      "   - Credentials (email, password)",
      "   - Instructions to submit KYC",
      "6. Seller then:",
      "   - Logs in",
      "   - Submits KYC docs",
      "   - Waits for admin approval (step 3: APPROVE KYC)",
      "   - Watches training video",
      "   - Gets catalog access"
    ],
    time_to_active: "24-48 hours (depends on KYC review speed)"
  },

  "5. CREATE SELLER (Auto-Validated)": {
    objective: "Create seller with pre-approved KYC (for trusted sellers)",
    location: "Pages → Gestion Vendeurs → Create",
    steps: [
      "1. Click 'Créer vendeur' button",
      "2. Fill seller info (same as above)",
      "3. CHECK 'Auto-valider KYC' checkbox",
      "4. Click 'Créer'",
      "5. Seller receives email with:",
      "   - Credentials (email, password)",
      "   - Instructions to watch training video (KYC pre-approved)",
      "6. On seller's next login:",
      "   - Training modal auto-appears",
      "   - Must watch and validate training",
      "   - Then gets full catalog access"
    ],
    time_to_active: "5 minutes (immediate after training)",
    use_case: "For sellers already KYC-verified or trusted partners"
  },

  "6. MONITOR DASHBOARD": {
    objective: "Track seller onboarding progress",
    location: "Dashboard → Summary",
    metrics_to_check: [
      "Pending Verifications: Sellers not yet email-verified",
      "Pending KYC: Sellers who submitted docs, awaiting approval",
      "Pending Training: Sellers approved but haven't watched training",
      "Active Sellers: Ready to sell"
    ],
    actions: [
      "Click 'Pending KYC' → Go to KYC approval (step 3)",
      "Click 'Pending Training' → Send reminder emails if needed",
      "Monitor 'Active Sellers' growth"
    ]
  },

  "7. HANDLE ISSUES": {
    objective: "Troubleshoot common problems",
    issues: [
      {
        problem: "Seller can't log in",
        cause: "Base44 user not created or password wrong",
        fix: [
          "1. Find seller in Gestion Vendeurs",
          "2. Use 'Réinitialiser mot de passe'",
          "3. Seller gets password reset email"
        ]
      },
      {
        problem: "KYC not appearing in dashboard",
        cause: "Seller_status not properly transitioned",
        fix: [
          "1. Run auditSellerSystem",
          "2. Run repairSellerConsistency",
          "3. KYC should appear after repair"
        ]
      },
      {
        problem: "Seller complains: 'Can't access catalog'",
        cause: "Training not completed or status not updated",
        fix: [
          "1. Check seller status in Gestion Vendeurs",
          "2. If status = 'kyc_approved_training_required':",
          "   → Remind seller to watch training",
          "3. If status = 'active_seller':",
          "   → Check browser cache, try incognito mode"
        ]
      },
      {
        problem: "100 sellers but only 50 Base44 users",
        cause: "Data inconsistency from migration or bug",
        fix: [
          "1. Run repairSellerConsistency",
          "2. All missing Base44 users will be created",
          "3. Verify with auditSellerSystem"
        ]
      }
    ]
  },

  "8. VERIFY AFTER FIXES": {
    objective: "Confirm all systems working correctly",
    steps: [
      "1. Test self-registration flow:",
      "   a) Go to Inscription",
      "   b) Create test account",
      "   c) Verify email works",
      "   d) Submit KYC",
      "   e) Check it appears in Gestion KYC",
      "",
      "2. Test admin-created seller:",
      "   a) Create seller from Gestion Vendeurs",
      "   b) Seller receives email",
      "   c) Seller logs in",
      "   d) See expected status & modals",
      "",
      "3. Test KYC approval → training flow:",
      "   a) Approve KYC",
      "   b) Seller logs in, training modal appears",
      "   c) After training → catalog accessible",
      "",
      "4. Run auditSellerSystem:",
      "   - has_critical_issues must be false"
    ],
    success_criteria: "All flows work, audit shows no issues"
  },

  "EMERGENCY PROCEDURES": {
    "System Broken - All Sellers Can't Access": {
      immediate_action: [
        "1. Run auditSellerSystem immediately",
        "2. Identify what's broken",
        "3. If sellers_without_base44_user > 0:",
        "   → Run repairSellerConsistency",
        "4. If status_mismatches > 0:",
        "   → Run repairSellerConsistency",
        "5. If still broken:",
        "   → Contact development team with audit report"
      ]
    },

    "100 Sellers Suddenly Blocked from Catalog": {
      immediate_action: [
        "1. Run auditSellerSystem",
        "2. Check status_transitions_fixed count",
        "3. If high: Data corruption detected",
        "4. Run repairSellerConsistency",
        "5. Notify affected sellers via bulk email:"
      ],
      email_template: "Bonjour,\n\nNous avons detecté et corrigé un problème système.\n\nVotre accès au catalogue a été restauré.\n\nVeuillez vous reconnecter.\n\nCordialement,\nÉquipe ZONITE"
    },

    "Payment Requests Not Processing": {
      immediate_action: [
        "1. Not part of seller/user audit",
        "2. Check DemandePaiement entity and functions",
        "3. Verify commission calculations are correct"
      ]
    }
  },

  "MONTHLY MAINTENANCE": {
    tasks: [
      "1st of each month:",
      "  ☐ Run auditSellerSystem",
      "  ☐ If issues found, run repairSellerConsistency",
      "  ☐ Check for orphaned sellers/users",
      "  ☐ Review JournalAudit for anomalies",
      "",
      "Weekly:",
      "  ☐ Review pending KYC submissions",
      "  ☐ Monitor active seller count growth",
      "  ☐ Check for registration errors in logs"
    ]
  },

  "QUICK REFERENCE - FUNCTION ENDPOINTS": {
    audit: "POST /functions/auditSellerSystem → Returns: audit_report with detailed issues",
    repair: "POST /functions/repairSellerConsistency → Returns: repair_report with actions taken",
    update_status: "POST /functions/updateSellerStatus → Manual status change (use with caution)"
  }
};

export default ADMIN_GUIDE;