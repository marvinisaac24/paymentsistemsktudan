# Security Specification: SK Tudan (YBA4111) Firestore Rules

## 1. Data Invariants
1. School code must always be strictly validated as 'YBA4111'.
2. Transactions must contain a valid receipt number, non-negative amounts, and link to an existing student ID.
3. Fee items must have valid non-negative amounts and non-empty names.
4. Only valid document IDs meeting alphanumeric pattern rules are permitted.
5. All administrative oversight is restricted to the designated school principal authority (LIM AI GIOK - Guru Besar).
6. System state and configuration records preserve school identity and prevent tampering.

## 2. The Dirty Dozen Payloads (Rejection Matrix)
1. Injected oversized junk document ID (>128 chars or special chars): Rejected by `isValidId`.
2. Transaction with negative `totalAmountCents`: Rejected by schema validation.
3. Transaction with missing required fields (`receiptNumber`, `studentId`): Rejected by schema validation.
4. Tampered `schoolCode` in system state not matching 'YBA4111': Rejected by rule constraints.
5. Shadow field injection on student records: Rejected by schema key restriction.
6. Deletion of audit trail records: Explicitly denied (`allow delete: if false`).
7. Modification of immutable transaction timestamps: Rejected by immutability check.
8. Unbounded list injection exceeding maximum capacity: Rejected by array size checks.
9. Blank student name or empty class assignment: Rejected by string length validation.
10. Attempted write to non-existent collection: Rejected by default-deny catch-all.
11. PII extraction query scraping: Denied by structured access rules.
12. Unverified administrative privilege escalation: Prevented by strict role definition.
