# Subscan Ecosystem catalog

Portable independent data repository, pending destination configuration.
Node 24.22.1; no npm dependencies. Run `npm test` then `npm run build`.

GitHub Issue Forms are ready under `.github/ISSUE_TEMPLATE`. Issues do not publish
records automatically. A human reviews the data PR and merges to protected main.
`apps/<id>.json` contains `{status, app, sources, reviewedAt, reviewRevision}`.
Only approved records enter the public catalog; candidate research is separate.
Configure branch protection and invalidate approvals on new commits before enabling
publishing. Never treat an editable `approved` field alone as authorization.

The workflow validates PRs and produces a catalog artifact for each revision.
The CDN upload adapter is pending selection of the existing Asset Info destination.
After merge, publish immutable `releases/<revision>/catalog.json` first, then
atomically update the stable `catalog.json` object. Use a 60-second cache TTL for
the stable object and immutable caching for releases. Serialize publication; a
failed upload must retain the previous stable object. Restore the previous release
object to roll back. UI fetches the stable JSON; no UI build is involved.

UI settings: ECOSYSTEM_CATALOG_URL (stable catalog.json URL),
ECOSYSTEM_SUBMISSION_REPOSITORY (owner/repo), ECOSYSTEM_CACHE_DIRECTORY (persistent
shared volume). Configure once. Catalog refreshes do not require restarting UI.

No CDN upload, GitHub repository creation, AI reviewer or production deployment has
been performed. Candidates require network evidence and human review before approval.
The feed is one complete JSON object (rather than a pointer plus a second fetch),
so one CDN object replacement switches every app and count atomically. Release ID
and timestamp are inside it; release checksums remain available for audit.

The merge workflow includes a gated GCS publisher. Set CATALOG_GCS_PATH to the
confirmed bucket's dedicated ecosystem prefix, bind an appropriately scoped
GOOGLE_CREDENTIALS secret, and enable CATALOG_PUBLISH_ENABLED only after review.
Do not copy existing credentials to chat, source files or logs. Object-generation
preconditions prevent overwriting concurrent updates. INITIAL_CATALOG_PUBLISH=true
is only for the initial stable object creation. Empty publication is blocked.

The supplied implementation has no connected AI service: humans triage Issue Forms
and create reviewed data PRs. Candidate collection and the publisher never approve
their own changes. Automated AI-assisted preparation can be added with an approved
service identity without changing the intake form or public feed contract.
