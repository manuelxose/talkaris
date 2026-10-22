# Original audit source and reproduction mapping

Located after repository-only discovery: `C:/Users/Admin/Documents/ChatGPT/talkaris/auditoria-2026-10-22/INFORME.md` (22 October 2026). SHA-256 `21e9a8c843ca37d171205e632ea37de8efc6152c0d22ce536cdec653e1161689`. Read the original locally; production snapshots, scripts and customer identifiers are not copied into this repository. Historical production observations are not current verification and were not rerun against production.

| Finding | Original reproduction retained in synthetic harness |
|---|---|
| F01 | Viewer of one tenant uses the other conversation UUID for handover GET/PUT and rating GET; foreign messages is the 404 control. A/B labels are interchangeable; all owners explicit. |
| F02 | Authorized TXT upload creates a `private` source; returned original URL is fetched without Cookie/Authorization and contains the marker. Existing-file fixture is additional coverage. |
| F03 | Viewer calls `projects/m0-nonexistent-project/crawl` with a controlled loopback URL; returned title and receiver request prove the fetch. Local DNS and redirect variants are additional coverage; website-integration is a separate sibling path. |
| F04 | Fake Notion token is stored without calling Notion, then listed as viewer. Authorization-header source is additional coverage. |
| F05 | Populated documents/conversations/leads/jobs/members/requests/recent tables and date values; browser records missing fixtures, rows, API data, `onDestroy`/`factory` errors and screenshots. Bot Studio is the working contrast described by audit. |
| F06 | Superadmin without membership attempts API key, invitation, webhook and notification writes. |
| F07 | Tenant admin invitation reaches exact missing partial-index constraint error. Acceptance/email remains M5 repair scope. |
| F08 | Existing conversation rating POST reaches exact missing-index constraint error. Separate first-rating success semantics remain to extend with M4; no index repair in M0. |
| F09 | Real canonical prepended satisfaction handler produces exact `distribution.data` GROUP BY error. |
| F10 | Pending/default, assigned and closed queue paths exercise missing `c.session_id`. |
| F11 | All three export paths retain exact obsolete column failures. |
| F12 | Admin creates `analytics:read` key through real API, then uses returned key for tenant analytics; stored conversations key is additional coverage. |
| F16 | Existing project test-chat fails specifically on `salesKeywords`; playground uses iframe and is tracked independently. |
| F17 | Direct/reload populated playground and conversation detail at all three viewports; explicit runtime iframe/message checks plus client navigation and workspace-switch scenario. |
| F18 | Actual one-shot worker reads controlled failing HTML source and records done with discovered 1, fetched/processed 0, failed URL. |

The audit's 27 authenticated route templates match current Angular configuration. No fabricated routes were added. Its 390×844 mobile capture matches the narrow viewport here; medium is 768×1024 and desktop 1440×900. Responsive evidence includes bounding boxes of headers/actions, because document scroll width alone misses clipped content (F25).

Additional SSRF unsupported-scheme, DNS-rebinding, timeout and response-size coverage is not claimed complete. The audit demonstrated loopback access; concrete shared timeout/size policy belongs to M1 and must not be invented as a performance threshold during M0. No real internal service, metadata endpoint or external provider is contacted by synthetic tests.
