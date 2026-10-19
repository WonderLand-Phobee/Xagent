# Source contract and go-live gate

## What has actually been observed

Initial requests received CONNECT 403 from the environment proxy. A later retry retrieved the www robots file and JavaScript homepage: the robots file has no declared sitemap; the HTML has no job links/JobPosting data. A normal request to a public-facing search path declared by the site's own app received HTTP 400. Official m/hk hosts (including the published terms link) remain inaccessible. No live detail record has been verified and terms have not been reviewed. See VALIDATION.md for the recorded access and browser trust limitations. No invented short URL or fabricated recruitment record is used.

The included JSON-LD parser is a conservative **unvalidated integration contract**, not a claim that the current website emits those fields. Source approval is off by default. To finish live ingestion, gain permitted official access, inspect actual pages and update this adapter with evidence and regression fixtures. If OfferToday does not publish sufficient state, obtain an official API/export with an authoritative open/closed field; do not substitute existence of a page for open status.

## Discovery

After operator approval, fetch official robots first. A robots fetch error fails closed. Read only sitemap locations actually declared in robots. Follow at most 8 sitemap documents and consider at most 80 URLs per run. Review these limits and the actual sitemap ordering during go-live: they are a conservative access budget, not a guarantee that all fresh positions are covered. Candidate URLs and historical recommendation URLs are also reverified. Search-engine snippets and old Airtable drafts never count as status evidence.

Only HTTPS official hostnames `offertoday.com`, `www.offertoday.com`, `hk.offertoday.com` and the job-detail path pattern are accepted. The path pattern itself needs confirming against actual official URLs. The stable ID is taken from the detail path, with query parameters ignored; alternate language URLs collapse to the same ID. Userinfo, nonstandard ports and outside hosts are refused. Cross-host redirects are refused for manual review.

## Current parser contract

- Exactly one schema.org `JobPosting`; malformed or ambiguous pages → Unverified.
- Canonical and JSON-LD URL, when present, must have the same stable ID.
- Explicit JobPosting `additionalProperty.jobStatus` of `Active/Open`, **plus** a timezone-qualified future `validThrough`. A future expiry date alone is insufficient. Missing or ambiguous timezone → Unverified.
- Explicit Closed/Expired/Inactive or past validThrough → Expired. Recognized closed notices also exclude. Actual production notices must be tested before go-live.
- Only `description` is language-tested, excluding navigation/footer text. Require sufficient English text; reject Han/Kana/Hangul content in JD. This intentionally errs on the side of exclusion and may reject English descriptions containing a small Chinese company/product name. Other-language or very short descriptions are quarantined rather than guessed English.
- Job title classification is conservative and scope-based; no inference from the presence of a technology word in unrelated sales JD.
- Salary only from structured currency + amount + unit. Experience only from explicit string `experienceRequirements`. Work arrangement only from explicit `workArrangement` property. TELECOMMUTE alone never becomes Work from Anywhere. Unavailable fields stay Not specified.
- Two JD list items/sentences become factual highlights. Template shortens only their quoted text, never replaces required fields with inferred values. If the template cannot fit 280 weighted characters or lacks two facts, leave the optional draft empty and keep the otherwise eligible job; display that a draft needs shortening.
- Every run fetches again. Reused jobs carry last recommended date and count; same-day reruns do not duplicate or inflate that count. Existing eligible same-day slots are preserved; invalidated slots are cleared.

## Safe manual seeding

Edit `data/candidates.json` to contain only actual official detail URLs. This helps discovery, not verification. User-supplied status/English flags or copied historical content cannot bypass fetching. An inaccessible link is quarantined. No fake share-link generation is present.

## Production acceptance

1. Read official access rules and obtain permission where needed. Respect robots and retain TLS checks.
2. Save redacted real-page fixtures for an active English JD, an expired JD, a mixed-language JD, canonical/language variants, and missing data.
3. Assert the adapter extracts correct fields against the rendered official page/authoritative export. Verify identity and explicit status semantics.
4. Run with permission and inspect at least several candidates manually. Check no unrelated mechanical/sales roles and no guessed arrangement/pay units.
5. Run twice on the same day, check stable IDs/slots/recommendation counts, then check cross-day reuse with fresh requests.
6. Confirm a failed run publishes failure health and removes unverified same-day candidates from the current queue.
7. Verify GitHub scheduled execution, the fixed page, real clipboard copy, and the chosen reminder channel from another device. Only then label live ingestion operational.

Never turn an unknown field into Active to increase the daily count. Meeting the 12-slot target is subordinate to truthful eligibility.
