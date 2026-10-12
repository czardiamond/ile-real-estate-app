# Ilé Real Estate

Ilé is a real-estate marketplace for account-based listing management, public listings, listing media, buyer enquiries and AI-assisted listing drafts. The client is a Vite/React app; authenticated AI requests are handled by the Vercel Function in `api/ai.ts`.

## Implemented workflows

- Firebase Authentication and user profiles
- Public Firestore listings with owner-scoped create/update/delete permissions
- Firebase Storage uploads for listing photos, video, floor plans and private title-review documents
- Buyer enquiries routed to the listing owner’s Firestore inbox
- AI-assisted listing drafts through the authenticated server endpoint
- Internal Ilé document review, which is **not** a government registry search or legal opinion

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
```

The Firebase browser configuration is public client configuration, not an authorization secret. Keep its Firebase/Google API restrictions limited to the intended project and domains. Never put `GEMINI_API_KEY` in a `VITE_` variable or browser code.

## Firebase setup

1. Create or select the Firebase project and configure the web app values in `.env.local` (`VITE_FIREBASE_*`). Authentication providers used by the sign-in screen must be enabled, and the deployed website domains must be authorized.
2. Enable Firestore and Firebase Storage.
3. Select the intended project with the Firebase CLI (`firebase use --add`) and deploy the checked-in rules:

   ```bash
   firebase deploy --only firestore:rules,storage --project YOUR_FIREBASE_PROJECT_ID
   ```

4. Admin access is granted only by a trusted backend-set Firebase Auth custom claim (`admin: true`). Never let a browser-selected role grant admin access.
5. Audit existing Firestore documents before launch. Older public listing records may contain title/owner fields from the prototype; the new client no longer publishes or renders them, but existing data must be reviewed and scrubbed separately.
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
- Review and remove any legacy prototype records or assets that contain personal/title information or unsupported claims.
- Add a global AI rate limiter and monitor provider costs.
- Keep payments, escrow, KYC, registry verification and notification delivery disabled until their providers and server-side authorization flows are implemented and tested.

No production deployment is performed by this code change.
