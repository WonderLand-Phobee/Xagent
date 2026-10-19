# Validation status

Development date: 2026-10-19, Asia/Hong_Kong. Final scope: a fixed daily job page and English X copy; no login, review workflow, CSV export, or automatic posting.

## Current-instance checks

- 38 Python tests: eligibility (expired/unknown, Chinese/mixed JD, English with Cantonese, bad links, ID deduplication, cross-day reuse, missing facts, scope, shortfalls, stale checks), conservative parser, isolated DEMO, failure snapshots and reminder payload/error handling.
- 2 frontend unit tests: Hong Kong date boundary and canonical X weighted length behavior.
- 6 real Chromium browser tests across desktop and mobile: fixed table, date/category/search filtering, missing-current-date handling, actual clipboard write/read, failed clipboard feedback, no login/review/CSV actions, no viewport overflow.
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
- Consequently no real detail-page fixture, authoritative active status, real English JD extraction or permitted automated source has passed production acceptance. The included JSON-LD contract fails closed and is **not a verified working adapter for the current JavaScript site**.

## Pending deployment checks

These need actual external access/configuration; local tests cannot prove them:

- GitHub repository/workflow write access and successful push.
- Pages enabled and an actual successful deployment URL/HTTPS request.
- Scheduled daily run in GitHub, state persistence and deployment of failure health.
- A permitted and validated live source; 12 is a target, never a guaranteed eligible count.
- Reminders are intentionally disabled at the user’s request. No credentials are needed for that optional feature; no message has been sent.

The free GitHub schedule starts at 02:00 UTC (10:00 HKT), can be delayed, and the reminder follows generation/deployment. Exact 10:00 delivery is not promised.
