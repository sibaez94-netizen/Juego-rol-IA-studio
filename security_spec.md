# Security Specification — Crónicas del Abismo

## 1. Data Invariants
1. **Campaign Ownership**: Every `/campaigns/{campaignId}` document must have an immutable `ownerId` strictly equal to the authenticated user's `request.auth.uid`, and `request.auth.token.email_verified == true` must hold for all writes.
2. **Master Gate on Subcollections**: Every subcollection (`/heroes/{heroId}`, `/enemies/{enemyId}`, `/chronicles/{entryId}`) must verify via `get()` that the parent campaign `/campaigns/{campaignId}` exists and has `ownerId == request.auth.uid` AND `status != 'completed'` for mutations.
3. **Immutable Identity & Temporal Integrity**: `ownerId`, `campaignId`, and `createdAt` cannot be modified after creation. `createdAt` must equal `request.time` on create; `updatedAt` must equal `request.time` on create/update.
4. **Path Variable & Payload Size Hardening**: All document IDs (`campaignId`, `heroId`, `enemyId`, `entryId`) must match `^[a-zA-Z0-9_-]+$` and be `<= 128` chars. Every string field and array field enforces explicit `.size()` bounds.
5. **Terminal State Locking**: Once a campaign's `status` transitions to `'completed'`, no further updates are permitted on the campaign or its subcollections.
6. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` directly without `get()`/`exists()` calls.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Create**: Create `/campaigns/camp_1` with `request.auth == null`.
2. **Unverified Email Write**: Create `/campaigns/camp_1` with `email_verified: false`.
3. **Identity Spoofing**: Create `/campaigns/camp_1` setting `ownerId: "victim_uid"` while signed in as `"attacker_uid"`.
4. **Shadow Ghost Field Injection**: Create `/campaigns/camp_1` with valid fields plus `"isAdmin": true`.
5. **ID Poisoning**: Create `/campaigns/camp$invalid/..` or 200-char ID string.
6. **Denial-of-Wallet Oversized Narration**: Create `/campaigns/camp_1` with `currentNarration` > 4000 chars.
7. **Timestamp Forgery**: Create `/campaigns/camp_1` with a backdated `createdAt` not equal to `request.time`.
8. **Cross-Tenant Hero Write**: Authenticated user B attempts to create `/campaigns/camp_A/heroes/hero_1` where `camp_A.ownerId == user_A`.
9. **Immutable Owner Mutation**: Update `/campaigns/camp_1` attempting to change `ownerId` or `createdAt`.
10. **Terminal State Bypass**: Update `/campaigns/camp_completed` when existing `status == 'completed'`.
11. **Unfiltered Collection Scraping**: `list` query on `/campaigns` without `where('ownerId', '==', uid)`.
12. **Array Exhaustion**: Update `/campaigns/camp_1/heroes/hero_1` with `inventory` array containing > 20 items.
