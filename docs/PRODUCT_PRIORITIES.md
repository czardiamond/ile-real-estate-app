# Ilé AI: earn trust before expanding

## The executive decision

Make Ilé excellent at one complete journey first: **a real agent publishes an available property, a seeker finds it, and an enquiry reaches that agent.** Start in the Lagos–Ogun corridor, not all of Africa at once. Compete on fresh inventory, transparent costs and dependable responses—not an inflated feature count or unearned verification badges. Being number one is an ambition, not a current claim or guaranteed outcome.

The public site currently displays zero properties. Keep that honest empty marketplace until agencies consent to supply genuine, authorized inventory. Ilé currently uses Firebase Auth/Firestore and Firebase Storage for some assets, with unfinished R2 photo-storage integration in the working tree. It does not currently use Neon.

## Implemented in this working tree—not deployed

**Reliable publishing** is the first improvement. Manual and AI-review submissions now await completion, reject overlapping attempts within the same wizard, disable editing/cancellation while pending, warn before page exit, and show a persistent error while keeping form details and selected files in memory. Required manual selectors also have accessible names.

Media rollback after an upload failure now waits for every started photo upload, including slow uploads that finish after another fails. All registered cleanups are attempted; failures are counted in the displayed error. If saving has started and its response fails, media is deliberately kept: the listing may already exist, so the agent is warned to check their listings before retrying. UI feedback after a confirmed database commit also cannot cause successful listing photos to be deleted. Existing R2 work is preserved; there is no Firebase-photo fallback.

Photo presigning now avoids an empty-body CRC32 for later browser uploads and explicitly binds the normalized allowed Content-Type into the signature while retaining the declared byte length. Offline regressions use dummy credentials and independently recompute SigV4 to check MIME/length tampering; they are not proof of real R2/CORS readiness.

Validation passed for this fix: **9 publishing tests**, **7 photo tests** (four metadata/configuration/key tests plus three new signing regressions), TypeScript, production build and **17 Firestore emulator security tests**. An additional offline render with throwing AI/save stubs confirmed that `aiEnabled={false}` overrides an initial AI mode and removes AI/voice controls. The earlier local browser harness verified pending controls, retained title/price after a simulated failure, and successful retry; that browser interaction was not rerun for this fix. Its save callback is a stub, not a production publish; it now explicitly disables AI/voice paths. Firebase client initialization and map/icon requests are not network-isolated. AI generation and real storage uploads were not invoked. The AI-review UI uses the same publishing controller but was not exercised through Gemini.

Limits: this is not durable draft saving, cross-tab/device idempotency, or a distributed storage/database transaction. Closing/reloading can lose unsaved input. Failed cleanup or media retained after genuinely failed saves can require operator reconciliation. Unknown commit outcomes and server-side idempotency need a separate design before scale. Emulator negative cases emit denial/expression-limit diagnostics even though all assertions pass; positive cases pass, but rules complexity deserves review before a future release.

## What exists, what is still a prototype

| Status | What can honestly be said |
| --- | --- |
| Implemented in source; deployment/configuration dependent | Firebase login/profiles; private property records plus sanitized public listing projections; search/filter/map/compare; listing publishing; Firestore enquiries and agent status updates; authenticated AI draft endpoint. Local validation is not proof of production setup. |
| Limited but working | Saved listings live in this browser only. The contact screen sends an enquiry; it is not two-way live chat. Internal document review is not a government title-registry check. |
| Prototype or partial | Brokerage is primarily a directory/aggregation, not a managed team workspace. Agent contact-activity history is session-local. Legal/marketing/AI outputs are drafts; calculators are estimates, not guarantees. |
| Not connected / must not be advertised | Purchase/rent payments, escrow, KYC/identity providers, government registry searches, delivered email/push notifications, independent safety/amenity data and verified valuations. |
| Blocked for live pilot release | Authorized R2 account/bucket/public-domain/CORS/server-variable setup and verification; review of Firebase rules/index/migration readiness; preview end-to-end validation; owner-approved privacy/terms/support and data-retention process. Production setup was not inspected or changed in this task. |

## Prioritized next improvements—all proposed

1. **P0: Prove the core loop in a controlled preview.** Verify auth, media upload, atomic private/public listing writes, seeker enquiry and owner-only inbox/status changes. Add a visible loading/offline/error distinction so a failed marketplace query cannot masquerade as “no properties.” Exit gate: all flows pass on mobile and no private address/title document leaks into public projections. Any rules/index/migration/deployment changes require separate approval.
2. **P0: Add an “Availability Receipt.”** Show when the agent last reconfirmed availability; prompt reconfirmation and clearly label stale listings. Add draft/pause/moderation states with owner/admin permissions. Exit gate: unavailable stock is not presented as currently available. This is freshness evidence, not title verification.
3. **P1: Build a Nigerian “Move-in Cost Passport.”** Separate rent or sale price from agent-declared service, legal, agency, caution-deposit and other charges; show unknown costs explicitly and calculate the stated upfront total. Add dated, attributed power/water claims rather than invented neighborhood scores. Exit gate: seekers understand the total and the source of every claim.
4. **P1: Make seeker and agency work durable.** Account-scoped saved listings/searches/enquiry history; persistent lead notes and response timestamps; then secure agency membership and lead assignment. Do not sell the current Brokerage page as team CRM. New collections and access rules need review and authorization.
5. **P1: Make field onboarding resilient.** Compress photos locally, make progress/retry understandable on poor networks, and add explicit opt-in local draft recovery on shared devices. Introduce stable listing links for agent sharing and server-side idempotency/reconciliation for ambiguous saves. Exit gate: a weak connection does not silently lose work or create duplicate listings.
6. **P2: Expand only after repeatable pilot results.** Shared AI rate limiting, monitoring and abuse controls; legally reviewed verification integrations with provider/scope/date labels; then city-by-city Nigeria expansion, followed by country-specific currency, address and legal support elsewhere in West Africa/Africa. No regional capability claims before testing locally.

## Agency pilot prospects—no outreach made

These are prospects, not partners. Public pages establish advertised services/location, not licensing, current inventory, willingness or endorsements. Fit assessments below are product judgments.

| Priority | Prospect and public evidence | Why test with them |
| --- | --- | --- |
| 1 | [Tabernacle Real Estates](https://www.tabernaclerealestates.com.ng/) lists an office at 64 Awolowo Street, Ikorodu, and advertises Lagos rentals, sales and property management. | A bounded Ikorodu-first test of onboarding, search and enquiry handling. |
| 2 | [Chaman Properties](https://chamanproperties.com/) advertises sales, letting, management and shortlets; its [contact page](https://chamanproperties.com/contact) lists Ikeja and Arepo offices. | Best Lagos–Ogun bridge and useful comparison of rent/sale onboarding. |
| 3 | **Adenugba and Sons Nigeria Limited**, listed in the [ERCAAN realtor directory](https://ercaannational.org.ng/find-a-realtor/) at Oke Ibukun, off Madojutimi junction, Aladesanmi, Abeokuta. | An Ogun-local prospect for testing manual onboarding beyond metropolitan Lagos; confirm directory details are current first. |
| 4 | **First Grade Homes and Properties**, listed in the [ERCAAN directory](https://ercaannational.org.ng/find-a-realtor/) at Selewu, Igbogbo, Ikorodu. | A second local agency could reveal whether workflows generalize beyond one operator; confirm current activity first. |

**Low-friction pilot proposal:** after product readiness and separate outreach authorization, recruit one Lagos and one Ogun agency for a proposed two-week, uncommitted test. Start with two staff per agency and five authorized, genuinely available properties each. Have agents supply their own photos and confirm price, public area, availability and enquiry routing. Use manual entry first; never scrape or fabricate stock. Test live publishing only after release approval; keep all synthetic testing in local/emulator fixtures. Test brokerage operations only as features become real, not as if the current directory already supports team permissions.

Use five consenting seekers for observed discovery/enquiry tasks. Proposed success gates: each agency can onboard without developer rescue; at least four of five seekers find a matching property; every valid enquiry reaches only the intended owner's inbox; agents aim to respond within one business day; zero private-data exposures or duplicate publishes. Track publishing time/errors, task completion, enquiry routing and stale-inventory reports with a simple consented pilot log. These are proposed targets, not measured results or agency commitments.

## Boundaries preserved

No billing changes, rules/index deployment, migration, Vercel access/SSO change, merge, commit, production deployment, Gemini inference, external form submission or agency contact. Existing uncommitted R2 changes remain in place. This task creates no unattended future work or ongoing outreach automation.
