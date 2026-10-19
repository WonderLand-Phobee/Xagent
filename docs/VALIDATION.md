# Validation status

Development date: 2026-10-19, Asia/Hong_Kong. Final scope: a fixed daily job page and English X copy; no login, review workflow, CSV export, or automatic posting.

## Current-instance checks

- 43 Python tests: eligibility (expired/unknown, Chinese/mixed JD, English with Cantonese, bad links, ID deduplication, cross-day reuse, missing facts, scope, shortfalls, stale checks), conservative parser, isolated DEMO, failure snapshots and reminder payload/error handling.
- 2 frontend unit tests: Hong Kong date boundary and canonical X weighted length behavior.
- 12 real Chromium browser tests across desktop and mobile: fixed table, date/category/search filtering, missing-current-date handling, actual clipboard write/read, failed clipboard feedback, no login/review/CSV actions, no viewport overflow, ordinary browser response observation, challenge stop, and wildcard robots denial before navigation.
- TypeScript typecheck and Vite production build.
- Dependency audit: 0 known npm vulnerabilities after upgrading the test/build dependencies; no TLS/signature/checksum verification disabled.
- Local DEMO generated into a separate non-production tree. Formal current snapshot contains **zero live verified jobs**, with blocked status. No old Airtable or invented job migrated.

The browser tests intercept JSON with labeled test fixtures; they test the UI and real clipboard, not live OfferToday data. Reminder tests simulate provider acceptance and do not send messages.

## Official source observations

- Initial official requests were rejected by the environment proxy (CONNECT 403).
- A later retry successfully retrieved `https://www.offertoday.com/robots.txt`. It disallows scan routes and applied-job recommendation URLs; it does not declare a sitemap.
- The www homepage is a JavaScript application shell with no job links or JobPosting JSON-LD in the fetched HTML. Its public app asset declares `/en/job/:jobId`-style routes and public-facing API paths. A normal search request to the declared path returned HTTP 400. This does not establish that credentials are missing or that the API may be used as an approved feed.
- The official app links terms to `m.offertoday.com/wap/policy/2?lang=en`; m and hk requests remain rejected by the proxy. Terms have not been reviewed.
- Standard Chromium navigation to the official site failed certificate-authority verification. Adding the existing environment proxy CA to Chromium's persistent NSS trust store was rejected by automatic approval review, citing the broad persistent HTTPS trust change and lack of specific user authorization. That change was not performed; no certificate verification bypass was used.
- GitHub Actions' ordinary Chromium, with normal TLS checks, subsequently rendered the real www Jobs page, actual padded-ID links, the public search input and original JD text. This is the supported source execution path; no private API integration or user-supplied interface is needed. Its observed ordinary detail response and explicit Apply action feed the collector. The initial JSON-LD-only adapter has been superseded by the normal browser collector.
- The published terms URL returned HTTP 200 but its rendered body was empty. Terms text remains an outstanding policy check; no legal certification is claimed.

## Pending deployment checks

These need actual external access/configuration; local tests cannot prove them:

- GitHub repository/workflow write access and successful pushes: verified on main. GitHub CI and the normal rendered public-source inspection have also passed.
- Pages is not enabled: the initial deployments failed with Get Pages site / Not Found. A readonly configuration check now skips deployment with an explicit setup notice; the revised workflow passed. This success is not a published website.
- Scheduled daily run in GitHub, state persistence and deployment of failure health.
- The first complete browser collection is running; do not claim 12 verified live jobs until its saved JSON and audit are inspected. 12 is a target, never a guaranteed eligible count.
- Reminders are intentionally disabled at the user’s request. No credentials are needed for that optional feature; no message has been sent.

The free GitHub schedule starts at 02:00 UTC (10:00 HKT), can be delayed, and the reminder follows generation/deployment. Exact 10:00 delivery is not promised.
