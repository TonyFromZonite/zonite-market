# Migration Guide - Seller System Refactor

## 🎯 Purpose
This guide helps you migrate existing Zonite sellers to the new architecture where **Base44 Users are the single source of truth**.

---

## ⚠️ Pre-Migration Checklist

### Backup Data
```bash
# Backup all sellers
GET /entities/Seller

# Backup all Base44 users
GET /entities/User

# Save both responses to files
```

### Verify Current State
1. Count total sellers: `SELECT COUNT(*) FROM Seller`
2. Count sellers with user_id: `SELECT COUNT(*) FROM Seller WHERE user_id IS NOT NULL`
3. Count sellers without user_id: `SELECT COUNT(*) FROM Seller WHERE user_id IS NULL`

---

## 🔧 Migration Steps

### Step 1: Run Synchronization Utility

This will automatically:
- Find sellers without `user_id`
- Create missing Base44 users
- Link sellers to users

```javascript
// As admin, call:
POST /functions/syncSellerUsers
{} // Empty payload

// Expected response:
{
  "success": true,
  "report": {
    "total_sellers": 50,
    "sellers_with_user_id": 30,
    "sellers_without_user_id": 20,
    "users_created": 15,
    "sellers_updated": 20,
    "errors": []
  }
}
```

### Step 2: Verify Synchronization

```javascript
// Check all sellers now have user_id
const sellers = await base44.entities.Seller.list();
const missingUserIds = sellers.filter(s => !s.user_id);

console.log(`Sellers without user_id: ${missingUserIds.length}`);

if (missingUserIds.length > 0) {
  console.log('Missing:', missingUserIds.map(s => s.email));
  // Re-run syncSellerUsers if needed
}
```

### Step 3: Update seller_status for All Sellers

```javascript
// Migrate old statut to new seller_status
const sellers = await base44.asServiceRole.entities.Seller.list();

for (const seller of sellers) {
  let newStatus = 'kyc_required'; // default
  
  // Determine correct status
  if (!seller.email_verified) {
    newStatus = 'pending_verification';
  } else if (seller.statut_kyc === 'en_attente') {
    newStatus = 'kyc_pending';
  } else if (seller.statut_kyc === 'valide' && !seller.training_completed) {
    newStatus = 'kyc_approved_training_required';
  } else if (seller.statut_kyc === 'valide' && seller.training_completed) {
    newStatus = 'active_seller';
  }
  
  // Update
  await base44.asServiceRole.entities.Seller.update(seller.id, {
    seller_status: newStatus
  });
}
```

### Step 4: Test New Workflows

#### Test Self-Registration
```javascript
// Register new seller
POST /functions/registerVendeur
{
  "email": "test@example.com",
  "nom_complet": "Test User",
  "telephone": "+237600000000",
  "mot_de_passe": "Test123!",
  "numero_mobile_money": "+237600000000",
  "operateur_mobile_money": "orange_money"
}

// Expected: Creates Base44 user + Seller with user_id
```

#### Test Admin Creation
```javascript
// Create seller as admin
POST /functions/createSellerComplete
{
  "email": "admin.test@example.com",
  "nom_complet": "Admin Test",
  "telephone": "+237600000001",
  "mot_de_passe": "Admin123!",
  "numero_mobile_money": "+237600000001",
  "operateur_mobile_money": "mtn_momo",
  "auto_valider_kyc": true
}

// Expected: Creates Base44 user + Seller, both linked
```

#### Test Training Completion
```javascript
// Complete training
POST /functions/completeTraining
{
  "email": "test@example.com"
}

// Expected: seller_status → active_seller, training_completed = true
```

#### Test Complete Deletion
```javascript
// Delete seller completely
POST /functions/deleteSellerComplete
{
  "seller_id": "xxx",
  "seller_email": "test@example.com"
}

// Expected: Deletes Seller + Base44 User + all related data
```

---

## 🔍 Post-Migration Verification

### 1. Verify All Sellers Have user_id
```javascript
const sellersWithoutUserId = await base44.asServiceRole.entities.Seller.filter({
  user_id: null
});

console.log(`Orphaned sellers: ${sellersWithoutUserId.length}`);
// Should be 0
```

### 2. Verify All Users Have Corresponding Sellers
```javascript
const users = await base44.asServiceRole.entities.User.filter({ role: 'user' });
const sellers = await base44.asServiceRole.entities.Seller.list();

const userEmails = users.map(u => u.email);
const sellerEmails = sellers.map(s => s.email);

const usersWithoutSeller = userEmails.filter(e => !sellerEmails.includes(e));
console.log('Users without seller:', usersWithoutSeller);
// Investigate any found
```

### 3. Verify Status Distribution
```javascript
const sellers = await base44.asServiceRole.entities.Seller.list();

const statusCounts = {
  pending_verification: 0,
  kyc_required: 0,
  kyc_pending: 0,
  kyc_approved_training_required: 0,
  active_seller: 0,
  unknown: 0
};

sellers.forEach(s => {
  if (statusCounts.hasOwnProperty(s.seller_status)) {
    statusCounts[s.seller_status]++;
  } else {
    statusCounts.unknown++;
  }
});

console.log('Status distribution:', statusCounts);
// Verify counts make sense
```

---

## 🛡️ Rollback Plan (If Needed)

If migration fails and you need to rollback:

### 1. Restore Seller Data
```javascript
// Restore from backup
const backupSellers = [...]; // Your backup

for (const seller of backupSellers) {
  await base44.asServiceRole.entities.Seller.update(seller.id, {
    // Restore old fields
    statut: seller.statut,
    statut_kyc: seller.statut_kyc,
    // Remove new fields
    seller_status: undefined,
    user_id: undefined
  });
}
```

### 2. Remove Created Users (if any)
```javascript
// Only remove users created during migration
// Be VERY careful with this
const createdUsers = [...]; // Users created during migration

for (const userId of createdUsers) {
  await base44.asServiceRole.entities.User.delete(userId);
}
```

---

## 📊 Migration Success Metrics

After migration, you should see:

✅ **100% of sellers** have `user_id`
✅ **100% of sellers** have valid `seller_status`
✅ **0 orphaned** Base44 users
✅ **0 orphaned** sellers
✅ **Self-registration** works without errors
✅ **Admin creation** works without errors
✅ **Training completion** works without errors
✅ **Deletion** removes data everywhere

---

## 🚨 Common Issues & Solutions

### Issue: Some sellers still missing user_id
**Solution:** Re-run `syncSellerUsers` function

### Issue: User exists but no seller
**Solution:** Manually create seller or delete orphaned user

### Issue: Seller has wrong seller_status
**Solution:** Manually update based on their current state:
```javascript
await base44.asServiceRole.entities.Seller.update(sellerId, {
  seller_status: 'correct_status_here'
});
```

### Issue: Training not unlocking catalog
**Solution:** Verify `training_completed = true` and `seller_status = 'active_seller'`

---

## 📞 Support

If you encounter issues during migration:
1. Check logs in `JournalAudit` entity
2. Run `syncSellerUsers` again
3. Verify data manually in dashboard
4. Contact Base44 support if issues persist

---

**Migration Completed:** ____/____/____
**Verified By:** __________________
**Success Rate:** ____%