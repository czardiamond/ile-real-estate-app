# Ilé Real Estate

Ilé is a real-estate marketplace for account-based listing management, public listings, listing media, buyer enquiries and AI-assisted listing drafts. The client is a Vite/React app; authenticated AI requests are handled by the Vercel Function in `api/ai.ts`.

## Implemented workflows

- Firebase Authentication and user profiles
- Anonymous listing browse through an allowlisted `public_listings` projection; exact addresses and owner-only fields remain in `properties`
- Marketplace search and filters, list/map browsing, browser-local saved listings, and side-by-side comparison for up to three properties
- Cloudflare R2 uploads for up to five public listing photos and image floor plans when R2 is configured. Photos are decoded and re-encoded in the browser, then validated and re-encoded again on the server before storage. Private title-review documents and optional videos remain Firebase Storage-backed. Property photos do not fall back to Firebase Storage.
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
npm test
npm run build
npm run preview
npm run test:rules
```

### Listing publishing reliability

Both manual publishing and AI-draft review await the save result. The wizard blocks overlapping submissions and editing/cancellation while a publish is pending, warns before leaving the page, and keeps the entered details and selected files in memory after a failure. This is a same-wizard submission lock, not cross-device/server-side idempotency or saved drafts after a reload.

`services/listingPublish.ts` waits for every started photo upload to settle before rolling back an upload failure. Cleanup failures are surfaced to the agent. Once database saving starts, a rejected response is treated as an unconfirmed outcome: media is retained and the agent is told to check their listings before retrying. This conservative policy can leave orphaned media after a genuine save failure, but avoids deleting photos from a listing that actually committed. A trusted reconciliation/idempotency backend is still needed, including for server uploads whose response is lost. Successful commits also cannot trigger media deletion because of subsequent UI feedback errors. R2 remains required for photos and image floor plans; optional videos remain Firebase-backed.

For a browser smoke test, run `npm run dev` and open `/tests/fixtures/listing-publish.html` on that local server. Fill the manual required fields, publish, and use **Simulate failure** to check that details remain and controls unlock. Retry and use **Simulate success**. The harness stubs the save callback and explicitly disables AI/voice entry paths with `aiEnabled={false}`: this manual-only flow makes no listing writes, media uploads or Gemini requests and is not a production entry point. It is not a network-isolated browser: Firebase client initialization and third-party map/icon resources may still make network requests. Unit tests cover repeated submissions, retry unlocking, upload order, late-upload cleanup, optional-asset failures, save rejection, and cleanup failure counts.

The photo endpoint no longer returns a direct R2 upload URL. It accepts authenticated JSON containing a base64-encoded JPEG, validates actual image bytes with Sharp, rejects non-JPEG/corrupt/oversized inputs, re-encodes without EXIF/IPTC/XMP metadata, and stores only the resulting JPEG. The browser accepts JPEG, PNG and WebP inputs up to 10MB, but reprocessed upload bodies must fit the 3MB limit so JSON remains below the hosting request limit. AVIF, HEIC, GIF, SVG and CAD are explicitly rejected. Photos are processed sequentially and publication is blocked while processing. Metadata removal does not hide information visibly written into an image. Optional videos and private title documents are not covered by the photo sanitizer.

Local browser QA fixtures: `/tests/fixtures/photo-sanitizer.html` exercises real JPEG/PNG/WebP decoding and removal of synthetic GPS/EXIF metadata; `/tests/fixtures/maps.html` covers valid/invalid locations, keyboard pins, city switching, private location selection, empty data and tile failures. These fixtures are excluded from deployment uploads. Unit/server tests use synthetic images and mocked storage only; a separately authorized real R2 integration test is still required once the account is configured.

Public listings deliberately omit exact seller coordinates. The map keeps listings without public map locations available in the list rather than inventing property pins or reading private coordinates. No live inventory is seeded by these tests. The listing price-map component is not currently linked into production navigation. OpenStreetMap tiles include attribution and a retry notice, but the community tile service has no SLA; a suitable production map provider remains an owner decision.

The Firebase browser configuration is public client configuration, not an authorization secret. Keep its Firebase/Google API restrictions limited to the intended project and domains. Never put `GEMINI_API_KEY` in a `VITE_` variable or browser code.

## Firebase setup

1. Create or select the Firebase project and configure the web app values in `.env.local` (`VITE_FIREBASE_*`). Authentication providers used by the sign-in screen must be enabled, and the deployed website domains must be authorized.
2. Enable Firestore. Firebase Storage is used for optional videos and private title-review documents; its rules and billing are separate. Property photos and image floor plans use Cloudflare R2 and have no Firebase Storage fallback.
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
- `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` — the Cloudflare account, bucket, and bucket-scoped S3 API credentials used only by the authenticated server photo-upload endpoint
- `R2_JURISDICTION` — optional `default`, `eu`, `us`, or `fedramp`; defaults to `default` and must match the bucket's jurisdiction
- `R2_PUBLIC_BASE_URL` — the HTTPS base URL that serves uploaded listing photos to anonymous marketplace visitors

Configure the `VITE_FIREBASE_*` public web-app variables for the Vite build as well. Test a Preview deployment first: sign up, sign in, publish a listing with media, submit a buyer enquiry, check owner-only status changes, and confirm an unauthenticated `/api/ai` request returns `401`.

Before photo uploads can work, the account owner must authorize any required R2 billing activation, then create/configure a dedicated bucket for listing photos and a bucket-scoped `Object Read & Write` API token. Choose and configure an HTTPS public image-delivery domain, then set the required `R2_*` variables above in Vercel. Browser-to-bucket `PUT` CORS is not required by the server-proxy upload path; anonymous image delivery must permit `GET` for published photos. R2 public domains expose objects in that bucket, so it must contain only images intended for public listing display—not private title documents or other private files. Account, billing, bucket, public-access, credential and DNS changes require separate authorization. If R2 is unset, the authenticated API returns a clear `503` and listing photos are not sent to Firebase Storage.

The AI endpoint currently uses an in-memory per-function-instance rate limit. Before significant public traffic, replace it with a shared/distributed limiter and add monitoring and abuse controls.

## Before public launch

- Replace the in-app technical privacy summary with an owner-approved, jurisdiction-appropriate privacy notice and publish approved Terms of Service and a real support contact.
- Confirm Firebase quotas, domain restrictions, email/password reset delivery, backups, logging and data-retention procedures.
- Back up and review legacy Firestore records before applying `scripts/migrate-firestore-privacy.mjs`; verify that no sensitive data remains in public projections.
- Add a global AI rate limiter and monitor provider costs.
- Keep payments, escrow, KYC, registry verification and notification delivery disabled until their providers and server-side authorization flows are implemented and tested.

Code deployment does not activate missing storage services, change billing, deploy database rules/indexes, or apply migrations. Those remain separate operations requiring owner approval.
