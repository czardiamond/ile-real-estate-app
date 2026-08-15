# Architecture & Security Guidelines

## Land Title Document Security
- **Mandatory Storage Pipeline**: Land title documents must always go through Firebase Storage upload (`titles/{userId}/...`), never a pasted URL field. This applies even when adding validation or regex — the underlying upload mechanism must stay unchanged.
- **Access Control & Path Scoping**: Files in `titles/{userId}/{fileName}` are scoped strictly to the authenticated user and authorized administrators.
- **Constraints**:
  - Size Limit: Maximum 15MB.
  - Content Types: Restricted to PDF documents (`application/pdf`) and image files (`image/*`).
  - Account Locking: Upon submission, `currentVerificationId` is linked to the user document in Firestore to prevent unauthorized concurrent modifications.
  - Nigerian Title Format Validation: Client-side and server-side format checking using `NIGERIAN_TITLE_REGEX` (`LA/CofO/YYYY/...`, `IKJ/GC/...`, `COFO-...`).
  - Cleanup Rollback: If Firestore record creation fails after Storage upload, the orphaned Storage file is automatically deleted.
