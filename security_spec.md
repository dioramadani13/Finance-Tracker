# Security Specification — Personal Finance Tracker Firestore Rules

## 1. Data Invariants

1. **Identity Isolation**: Every `/users/{userId}` document and `/users/{userId}/transactions/{transactionId}` document can ONLY be read or mutated by the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`).
2. **Parent Existence (Master Gate)**: A transaction record cannot be created unless its parent `/users/{userId}` document exists.
3. **Strict Schema & Zero Shadow Fields**: Every write must satisfy exact `hasAll` + `hasOnly` key allowlists, strict types, enum constraints (`type` in `['income', 'expense']`), and length/amount boundaries.
4. **Immutable Ownership, Type & Temporal Integrity**: `uid`, `userId`, `externalId`, `type`, and `createdAt` cannot change after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. **No Blanket List Scraping**: Listing `/users` is denied (`false`); listing `/users/{userId}/transactions` requires `isOwner(userId) && resource.data.userId == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)

1. **Unauthenticated Read**: `GET /users/userA/transactions/tx1` with `auth = null`.
2. **Cross-User Read**: `GET /users/userA/transactions/tx1` authenticated as `userB`.
3. **Unverified Email Write**: `CREATE /users/userA` with `email_verified = false`.
4. **Identity Spoofing on Create**: `CREATE /users/userA/transactions/tx1` by `userA` with `userId: "userB"`.
5. **Shadow Field Injection**: `CREATE /users/userA` with extra field `{ isAdmin: true }`.
6. **Negative or Zero Amount Poisoning**: `CREATE /users/userA/transactions/tx1` with `amount: -5000`.
7. **Invalid Date Format**: `CREATE /users/userA/transactions/tx1` with `date: "13-11-2026"`.
8. **Invalid Enum Category or Type**: `CREATE /users/userA/transactions/tx1` with `type: "transfer"` or `category: "UnknownCategory"`.
9. **Resource Exhaustion (Oversized String)**: `CREATE /users/userA/transactions/tx1` with `note` length > 300 or document ID > 128 chars.
10. **Client Timestamp Forgery**: `CREATE /users/userA/transactions/tx1` with forged `createdAt` != `request.time`.
11. **Immortal Field Mutation on Update**: `UPDATE /users/userA/transactions/tx1` modifying `type`, `externalId`, or `createdAt`.
12. **PII / Users Collection Scraping**: `LIST /users` by any authenticated user.
