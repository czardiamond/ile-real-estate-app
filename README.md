# Ilé Real Estate

Ilé is a real-estate marketplace for account-based listing management, public listings, listing media, buyer enquiries and AI-assisted listing drafts. The client is a Vite/React app; authenticated AI requests are handled by the Vercel Function in `api/ai.ts`.

## Implemented workflows

- Firebase Authentication and user profiles
- Anonymous listing browse through an allowlisted `public_listings` projection; exact addresses and owner-only fields remain in `properties`
- Marketplace search and filters, list/map browsing, browser-local saved listings, and side-by-side comparison for up to three properties
- Firebase Storage uploads for up to five listing photos, one floor plan and private title-review documents; listings support up to five approved feature labels
- Buyer enquiries routed to the listing owner’s Firestore inbox
- AI-assisted listing drafts through the authenticated server endpoint
- Internal Ilé document review, which is **not** a government registry search or legal opinion
- An in-product Field Guide and About page, linked from the site footer and account area, that explain current workflows and service limits

The About page states that no standalone open-source application license is published in this repository; third-party libraries and assets retain their own license terms. No legal notice here grants rights to reuse the product’s original branding or content.

## Not connected

The application does not currently provide rent or purchase payments, escrow, identity/KYC verification, automated email or push notifications, government title-registry lookups, independent neighborhood safety/amenity data, or verified valuations. Those actions are disabled or labelled accordingly; do not advertise them as available.

## Local development

Requirements: Node.js 22 or later and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Before building, check the source and production output:

```bash
npm run lint
npm run build
npm run preview
npm run test:rules
```

The Firebase browser configuration is public client configuration, not an authorization secret. Keep its Firebase/Google API restrictions limited to the intended project and domains. Never put `GEMINI_API_KEY` in a `VITE_` variable or browser code.

## Firebase setup

1. Create or select the Firebase project and configure the web app values in `.env.local` (`VITE_FIREBASE_*`). Authentication providers used by the sign-in screen must be enabled, and the deployed website domains must be authorized.
2. Enable Firestore. Firebase Storage uploads are a separate project capability; this privacy change does not deploy Storage rules or configure billing.
3. Before deploying the new client/rules, back up the target project and run the privacy migration in dry-run mode:

   ```bash
   npm run migrate:firestore-privacy -- --project YOUR_FIREBASE_PROJECT_ID
   ```

   Review the counts and confirm the selected Firebase project. The script is read-only unless explicitly run with `--apply`; applying it normalizes legacy private listing fields (while retaining exact addresses only in private records), builds sanitized public projections, removes orphan or unprojectable public listings, sanitizes public profiles, and removes reusable title-download URLs only when a matching owner-scoped Storage path can be verified or safely recovered from the Firebase Storage URL. Other legacy title links are counted for manual review and left in the private collection. The script does not upload files or change Storage rules. After a backup and explicit authorization, apply the migration **before** deploying the new rules; inspect `skippedProperties` and removal counts and resolve any unexpected records.
4. Only after the migration is applied and reviewed, deploy **Firestore only** (rules and indexes) to the selected project:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
   ```

   Do not include `storage` in that command. Storage rules and any Storage billing decision remain separate.
5. Admin access is granted only by a trusted backend-set Firebase Auth custom claim (`admin: true`). Never let a browser-selected role grant admin access.
6. Set a retention/deletion process for accounts, enquiries and private title-review uploads. Confirm that title-document reviewers are authorized and can access the private Storage objects.

## Vercel deployment

Import the repository into Vercel as a Vite project. The configuration builds with `npm run build` and serves `dist/`; `/api/ai` is a Vercel Function and must remain outside the SPA fallback.

Configure these **server-side** Vercel environment variables for Preview and Production as appropriate:

- `FIREBASE_PROJECT_ID` — the Firebase project ID used to verify Firebase ID tokens
- `GEMINI_API_KEY` — the provider key used only by the server-side AI module

Configure the `VITE_FIREBASE_*` public web-app variables for the Vite build as well. Test a Preview deployment first: sign up, sign in, publish a listing with media, submit a buyer enquiry, check owner-only status changes, and confirm an unauthenticated `/api/ai` request returns `401`.

The AI endpoint currently uses an in-memory per-function-instance rate limit. Before significant public traffic, replace it with a shared/distributed limiter and add monitoring and abuse controls.

## Before public launch

- Replace the in-app technical privacy summary with an owner-approved, jurisdiction-appropriate privacy notice and publish approved Terms of Service and a real support contact.
- Confirm Firebase quotas, domain restrictions, email/password reset delivery, backups, logging and data-retention procedures.
- Back up and review legacy Firestore records before applying `scripts/migrate-firestore-privacy.mjs`; verify that no sensitive data remains in public projections.
- Add a global AI rate limiter and monitor provider costs.
- Keep payments, escrow, KYC, registry verification and notification delivery disabled until their providers and server-side authorization flows are implemented and tested.

No production deployment is performed by this code change.
