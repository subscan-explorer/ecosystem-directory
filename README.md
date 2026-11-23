# Subscan Ecosystem catalog

Independent source of https://gcs.subscan.io/ecosystem/catalog.json.
Node 24.22.1; no npm dependencies. Run `npm test` then `npm run build`.

## Submit and update data

Submit projects or corrections through GitHub Issue Forms. Maintainers check official
sources and supported networks, then create a data PR. `apps/<id>.json` contains
`{status, app, sources, reviewedAt, reviewRevision}`. Only approved records enter
the public catalog. Candidates remain separate; issues do not publish directly.
There is no connected AI reviewer. Required `catalog` CI must pass before merging;
mandatory approving reviews are disabled per repository policy.

## Automatic publication

Every merge to main validates and builds the catalog. When
`CATALOG_PUBLISH_ENABLED=true`, the separate publish job downloads that exact build
artifact, authenticates to GCS, and publishes it. PR jobs cannot access publication
credentials. Manual workflow dispatch on main can retry publication. A stale run
cannot publish after a newer main revision is detected.

Repository configuration:

- Actions secret `GOOGLE_CREDENTIALS`: the authorized GCS service account JSON,
  configured directly in GitHub, never committed or printed.
- Variable `CATALOG_GCS_PATH`: `gs://gcs.subscan.io/ecosystem`.
- Variable `CATALOG_PUBLISH_ENABLED`: enable only after configuring the identity.

The identity needs object read/create/update/delete permissions for the ecosystem
prefix, including setting public object ACLs. Existing Asset Info files and
bucket-wide access settings are not changed.

Publish immutable `releases/<revision>/catalog.json` first, then replace stable
`catalog.json` using a generation precondition. Both objects receive publicRead
ACLs, matching the existing bucket's fine-grained access model. Stable cache TTL
is 60 seconds; releases are immutable. Jobs are serialized, upload errors retain
the prior stable catalog, and concurrent generation conflicts fail safely.
Retries reuse byte-identical release objects. The final step checks the public CDN
against the build artifact, allowing cache propagation. A failed public check
marks the workflow failed; it does not roll back an already uploaded object.

To roll back, revert the data change through a PR, producing a new release.
`INITIAL_CATALOG_PUBLISH=true` is reserved for explicit first-time creation with
the CLI adapter; the workflow expects the existing stable object. Empty catalogs
are rejected unless explicitly authorized via `ALLOW_EMPTY_CATALOG=true`.

## Frontend

Configure `ECOSYSTEM_CATALOG_URL` once to the stable URL,
`ECOSYSTEM_SUBMISSION_REPOSITORY=subscan-explorer/ecosystem-directory`, and
`ECOSYSTEM_CACHE_DIRECTORY` to persistent storage. Data updates do not require a
frontend build or restart. The local www preview already uses this live feed;
production frontend deployment is separate.
