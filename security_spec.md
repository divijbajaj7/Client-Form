# Security Specification & Dirty Dozen Audit

## 1. Data Invariants
1. **Survey Responses (`/survey_responses/{responseId}`)**:
   - Anyone with the shared survey link may `create` a single response document with a valid alphanumeric/hyphen/underscore `responseId` (`<= 128` chars), strict field allowlisting (`hasAll` + `hasOnly`), bounded string lengths, bounded array sizes (e.g., `q12Blockers.size() >= 1 && q12Blockers.size() <= 3`), `q8Confidence` integer in `[1..5]`, and server-enforced `createdAt == request.time`.
   - Reading (`get`, `list`), updating, or deleting survey responses is strictly denied to anonymous and non-admin users; only the verified admin (`divijbajaj5@gmail.com` with `email_verified == true` or explicit `/admins/{uid}`) may read, list, or delete.
2. **Consultation Requests (`/consultation_requests/{requestId}`)**:
   - Public `create` permitted only when passing strict schema, size, email format, and `createdAt == request.time` validation.
   - Only verified admins may read, list, or delete; updates are disabled.
3. **Spreadsheet Settings (`/settings/{settingId}`)**:
   - Contains Google Spreadsheet IDs and Drive links; strictly restricted to verified admins for all read and write operations.

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Shadow Field Injection**: Submitting `/survey_responses/abc123` with extra `"isAdmin": true`.
2. **Oversized Document ID**: Submitting `/survey_responses/<200-char-id>` with junk characters.
3. **Spoofed Timestamp**: Submitting `/survey_responses/abc123` with client-forged `createdAt` not equal to `request.time`.
4. **Blocker Limit Bypass (Q12)**: Submitting `q12Blockers` with 4 items (violates "Pick up to 3").
5. **Out-of-Range Confidence (Q8)**: Submitting `q8Confidence: 9` or `"5"` string instead of integer `1..5`.
6. **Denial-of-Wallet String Bomb**: Submitting a 100KB string in `q13RepetitiveTask` (`> 3000` chars).
7. **Unauthorized Response List Scraping**: Unauthenticated or non-admin user calling `list` on `/survey_responses`.
8. **Unauthorized Response Get**: Non-admin authenticated user attempting `get` on `/survey_responses/abc123`.
9. **Unverified Admin Email Spoof**: User with `email: 'divijbajaj5@gmail.com'` and `email_verified: false` attempting `list` on `/survey_responses`.
10. **Survey Tampering**: Attempting `update` on `/survey_responses/abc123` to alter answers post-submission.
11. **Settings Hijack**: Non-admin attempting `write` on `/settings/spreadsheet` to redirect Google Sheets sync URL.
12. **Consultation Inbox Scraping**: Non-admin attempting `list` or `get` on `/consultation_requests`.
