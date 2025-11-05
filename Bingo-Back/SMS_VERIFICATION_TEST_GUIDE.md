# SMS Auto-Verification End-to-End Test Guide

## What Was Fixed

1. **Time Matching Bug**: Fixed datetime parsing in `matchSMS()` to correctly parse DD/MM/YYYY format (was failing before)
2. **Time Window Alignment**: Increased time matching window from 2 minutes to 15 minutes to match the search window
3. **Enhanced Logging**: Added comprehensive logging at each step:
   - 📨 SMS received (webhook)
   - 💾 SMS stored (parsed data)
   - 🔎 Auto-matching search results
   - 🔍 SMS matching details (amount, reference, time, verification result)

## How Automatic Verification Works

### Matching Criteria (All must be true):
1. **Amount Match**: Exact amount match (required)
2. **AND either**:
   - **Reference Match**: Same transaction number (e.g., CK45VJZ8JX)
   - **OR Time Match**: Transaction times within 15 minutes

### Flow:
1. **User SMS** → Bot → `/sms-forwarder/user-sms` → Stores SMS → Searches for receiver SMS
2. **Receiver SMS** → Webhook → `/sms-webhook/webhook` → Stores SMS → Searches for user SMS
3. **Match Found** → Creates `DepositVerification` with status:
   - `verified` (auto-verified) → Auto-approves and credits wallet
   - `pending_review` (manual review needed) → Admin gets Approve/Deny buttons

## Testing Steps

### 1. Check Logs for New Deposits

When a user sends SMS via bot, you should see:
```
💾 SMS Stored: { id: '...', source: 'user', amount: 50, reference: 'CK45VJZ8JX', ... }
🔎 Auto-matching: Found X potential matches...
🔍 SMS Matching Debug: { amountMatch: true, referenceMatch: true/false, timeMatch: true/false, isVerified: true/false }
```

When receiver SMS arrives via webhook:
```
📨 SMS Webhook received: { source: 'receiver', ... }
💾 SMS Stored: { id: '...', source: 'receiver', amount: 50, reference: 'CK45VJZ8JX', ... }
🔎 Webhook Auto-matching: Found X potential matches...
🔍 SMS Matching Debug: { ... }
```

### 2. Test with Matching SMS

**User SMS:**
```
Dear alisabet You have transferred ETB 50.00 to Mesert Tebabal (2519****1781) on 04/11/2025 13:18:47. Your transaction number is CK45VJZ8JX.
```

**Receiver SMS (must have SAME amount and SAME reference OR same time within 15 min):**
```
Dear Mesert You have received ETB 50.00 from alisabet mesifin(2519****8741) on 04/11/2025 13:18:47. Your transaction number is CK45VJZ8JX.
```

**Expected Result:**
- ✅ `amountMatch: true`
- ✅ `referenceMatch: true` (same transaction number)
- ✅ `isVerified: true`
- ✅ Auto-approved and wallet credited

### 3. Test with Different Transactions (No Match)

**User SMS:**
```
Dear alisabet You have transferred ETB 50.00 to Mesert Tebabal (2519****1781) on 04/11/2025 13:18:47. Your transaction number is CK45VJZ8JX.
```

**Receiver SMS (DIFFERENT transaction):**
```
Dear Mesert You have received ETB 50.00 from alisabet mesifin(2519****8741) on 04/11/2025 13:59:22. Your transaction number is CK42VL0WAI.
```

**Expected Result:**
- ✅ `amountMatch: true`
- ❌ `referenceMatch: false` (different transaction numbers)
- ❌ `timeMatch: false` (41 minutes apart - exceeds 15 min window)
- ❌ `isVerified: false`
- ⚠️ Creates `pending_review` verification → Admin gets Approve/Deny buttons

### 4. Check Database

```javascript
// Check SMS records
db.smsrecords.find({}).sort({createdAt:-1}).limit(5).pretty()

// Check verifications
db.depositverifications.find({}).sort({createdAt:-1}).limit(5).pretty()
```

### 5. Common Issues

**Issue: "Found 0 potential matches"**
- Check: Amount must match exactly
- Check: Timestamps must be within 15 minutes
- Check: Both SMS must have `status: 'pending'`
- Check: Sources must be different (`user` vs `receiver`)

**Issue: "amountMatch: false"**
- Check: Amounts are exactly the same (e.g., 50.00 vs 50.00)
- Check: Parsing extracted amount correctly (check logs)

**Issue: "timeMatch: false"**
- Check: Datetime strings are parsed correctly (check logs for `userDatetime` and `receiverDatetime`)
- Check: Times are within 15 minutes of each other
- Check: Date format is DD/MM/YYYY (not MM/DD/YYYY)

**Issue: "referenceMatch: false"**
- This is OK if time matches instead
- Verification requires: `amountMatch AND (referenceMatch OR timeMatch)`

## Next Steps

1. **Deploy the fixes** to your server
2. **Test with a real deposit** using matching SMS
3. **Monitor logs** to see the matching process
4. **Check database** to verify verifications are created correctly

## Files Changed

- `Bingo-Back/services/smsForwarderService.js` - Fixed time parsing, added logging
- `Bingo-Back/routes/smsForwarder.js` - Added logging, fixed source filter
- `Bingo-Back/routes/smsWebhook.js` - Added logging

