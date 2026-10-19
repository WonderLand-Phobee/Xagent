# Official public-page source

## Source and access method

The user explicitly selected `www.offertoday.com` as the daily source and cannot provide another interface. The active collector uses ordinary Playwright Chromium navigation on that official website, without a user account, private API integration, hand-built request signatures, injected session cookies, stealth plugins, CAPTCHA solving, or disabled TLS validation. The program never clicks Apply or sends an application/contact message.

It fetches current robots first, uses a wildcard-aware parser and the site's crawl delay, and refuses disallowed routes, scan pages, applied-job recommendation URLs, non-official/cross-origin detail URLs, challenges and failed page loads. Default spacing is at least 2.5 seconds, with a maximum 60 candidate URLs (hard cap 80) and a 12-minute browser collection budget. History is reverified in a fresh browser context each day.

The normal rendered public Jobs page provides actual links; standard form filling/Enter performs searches for Software Engineer, Software Developer, UI UX Designer, Graphic Designer and Video Editor. These are public browser searches, not replayed private API calls. Candidate and historical URLs can supplement discovery but cannot bypass verification.

## Evidence observed on the actual site

GitHub Actions normal-browser checks have successfully rendered the official Jobs page, real detail links, the search placeholder `Search Job or Keyword`, and the displayed default job's original JD. See [source inspection](https://github.com/WonderLand-Phobee/Xagent/actions/workflows/source-check.yml).

Official URLs use padded opaque IDs, for example IDs ending `==`; encoded/unencoded padding is normalized. The official detail frontend marks `jobStatus !== 2` or source `Bot` as unavailable for its normal live-job flow. These semantics were observed in the site's published `JobDetail-kd21IKHd.js` and `referralOperationType-DDd8Z9xR.js` on 2026-10-19. This is version-specific evidence, not a promise that future structures remain identical.

The collector only observes the **normal browser page's own** official detail response, never calls that endpoint directly. It requires exactly one distinct job record; status 2, non-Bot source, an enabled visible Apply/Chat/Send application message action, and no explicit closed/expired notice. Ambiguous records remain Unverified. The API payload's stable Job ID deduplicates multiple paths/language variants; a validated direct detail URL is always retained.

Use the original `jobDesc`, never `translateJobDesc`, for English validation. Reject substantive Chinese/mixed JD, insufficient text and other detected languages. An English JD mentioning Cantonese/Mandarin is allowed.

## Terms and operating limits

The www robots retrieved on 2026-10-19 disallows scan routes and applied-job recommendation routes, but declares no sitemap. The official app links service terms to `m.offertoday.com/wap/policy/2?lang=en`. HTTP and ordinary-browser attempts retrieved an empty application shell/body, so the terms' substantive text has **not** been reviewed. This is recorded as an outstanding access-policy check, not proof of permission or prohibition. Do not represent the service as legally certified. If later terms, robots, or website responses restrict collection, pause the workflow and obtain appropriate permission rather than bypassing controls.

This development machine initially returned proxy 403. Its Chromium official-site navigation also failed CA verification; automatic approval rejected adding a proxy root to the persistent browser trust store. No trust-store change or TLS bypass was performed. A standard GitHub Actions runner successfully rendered the public site with its normal TLS checks, providing a safer execution path.

## Fact extraction

- Exact original title from the official page data.
- Salary requires an explicit amount/unit string; do not add a monthly unit or currency by assumption.
- Experience only from the official explicit `workExperienceDesc`.
- Work arrangement only from an explicit labeled JD statement or verified Freelance type; no remote geography inference. Missing values stay Not specified.
- Two original JD list items/paragraphs/sentences become factual highlights. No LLM API is used.
- X template uses weighted counts and a real direct URL. If required fields cannot fit 280 safely, keep the eligible job and flag its draft as requiring shortening. Prefer copy-ready eligible jobs when filling new slots.
- Same-day Job ID deduplication; cross-day reuse allowed only after current-run verification; recommendation counts track unique dates, not reruns.

## Switches

Daily GitHub execution is authorized by the user's explicit public-page collection request. The workflow attempts collection unless repository variable `OFFERTODAY_SOURCE_APPROVED=false` pauses it. This is an **attempt permission**, not a validation-success flag. Every job still passes the strict independent rules.

Local runs remain off unless `OFFERTODAY_SOURCE_APPROVED=true` is explicitly supplied. Local Chromium may need supported TLS trust configuration; never turn verification off. Install dependencies and Chromium using the documented verified installers.

The earlier JSON-LD parser remains covered by tests as a conservative auxiliary parser; the current JavaScript site's live workflow uses the browser collector, not a nonexistent sitemap/HTML feed.
