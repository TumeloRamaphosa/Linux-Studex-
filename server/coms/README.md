# Coms CRM + calling in the Linux StudEx OS

The OS dashboard now embeds `/coms/`: client projections, onboarding proposals, task/result history and correlated phone-call controls. StudBud remains authoritative for its Members/Consents/Courses; no private entity dump, canonical CRM migration, auto-matching, payment/access grant or member write is included. Synthetic clients are explicitly labelled. Operator mode shows no invented clients while the scoped StudBud projection connector is unavailable; the existing app is linked.

## Review without starting the old agent runtime

From `server/`, run `npm run preview:coms`. This uses Node built-ins only and prints a private loopback URL for the existing OS dashboard and embedded CRM. It never imports original agents, wallets, sandbox or model scanners. Click **Start synthetic preview**. Draft onboarding, create/connect/end/cancel a mock call, inspect persisted task IDs/history, and view blocked Jarvis/HERMES connections. No phone number is dialled and no microphone is started.

`npm run test:coms` runs deterministic Node tests without installing new packages. The separate `apps/darkdesk-talk` Python/JS test command verifies the browser media demo. Existing Express startup still uses the repo's declared dependencies; the review host avoids a dependency install.

## Auth, state and execution boundaries

- Default bind is loopback; no wildcard CORS or repository-root static serving. Only explicit dashboard/image and Coms assets are served. Do not expose a dev preview through a public tunnel.
- Operator mode requires a fresh configured secret of at least32characters. Enter it in the verified private UI, never chat or source control. Browser receives an opaque15minute HttpOnly/SameSiteStrict cookie and short CSRF token, not a provider/admin key. HTTPS mode sets Secure. Exact configured Host/Origin, CSRF, request-size/login/session limits protect mutations. Synthetic login works only on the explicitly enabled loopback preview and has no legacy tool authority.
- Server-derived tenant/client scope filters records and binds task/call IDs; browser body cannot select trusted tenant or source identity. Private atomic journal persists local review proposals and transport events, not a second canonical contact database. State and env files are Git-ignored. No transcript/audio recording or marketing enrolment.
- Idempotency binds request ID+scope+operation+body; changed replays conflict. Signed results bind exact raw bytes/HMAC/source/tenant/client/task/call, timestamp, sequence and approved source hashes. Completion stays needs_review/pending_review, never a business effect. Callback/submit races preserve verified results. Unknown submit/inference outcome is recorded once, not retried/redialled automatically.
- Existing broad operator APIs are disabled unless `COMS_ENABLE_LEGACY_OPERATOR=1` AND an authenticated operator role is established. Model probing additionally needs `COMS_ALLOW_MODEL_PROBE=1`; legacy telemetry is an explicit UI action. Preview sessions cannot use these controls.
- tmux now uses argv-based `execFile`, destination allowlist and truthful failure; no server-shell interpolation or fake queued success. Sandbox spawn/run fail closed without Docker and the host-execution fallback is removed. Path prefix checks require actual directory boundaries. Legacy Docker/MCP/orchestrator internals are not a full production security audit; keep disabled until reviewed for the intended operator deployment.

Configuration template is `.env.example`, containing no secret values. No dotenv auto-loader or paid model/provider default is installed. Configure via the operator's secure runtime workflow. Public deployment needs TLS, proper identity provider/client mapping, operational rate limits, backup/recovery and monitoring beyond this review.

## HERMES / Jarvis contract

`providers.mjs` is server-only, with explicit fixed origin/credential and a verified-contract gate. No scan/dispatch at startup. HERMES uses GET capabilities/task status and mock-only task submission; cancellation endpoint is not known and therefore fails closed. `POST /api/coms/tasks/:id/dispatch` requires operator role and a verified mock contract; ordinary demo controls never call it. Use the retained assignment and reconcile unknown effects; don't invent endpoint compatibility.

`POST /api/coms/callbacks/hermes` requires the scoped callback HMAC key, independently of browser cookies. Proposed header is `X-Studex-Signature: sha256=<lowercase hex>`, body fields source_id/tenant_id/client_id/task_id/call_id/event_id/seq/state/sent_at/result. Raw body is signed; delivery sent_at can refresh, immutable event digest remains stable. HERMES golden wire fixture/route must be verified before enablement. No callback key is shipped or returned to frontend.

Jarvis calls the already reviewed OpenAI-shaped `/v1/chat/completions` JSON contract only with a verified **read-only/tool-restricted** proxy, configured model and scoped server credential. A prompt saying no tools is not that verification. Draft response/results stay assigned to a task for review; no desktop/computer/shell tools, live meetings or send authority is provided. Endpoint/config/version/source mapping must be checked against the actual unpushed HERMES source; current defaults are blocked. Existing Cashclaw class is not assumed to be Moltlaunch0.1.0or the older1.7.0runtime; marketplace/wallet operations are not added.

## Phone versus browser voice

Phone buttons are a deterministic **mock** lifecycle, separate from the existing DarkDesk browser Talk package. Neither implies HERMES media is online. The REST3106task bridge and Jarvis text/SSE are not browser duplex audio. The existing `apps/darkdesk-talk` preview retains explicit mic/summary choice and an inactive WebRTC path; real media/provider route, codec/ICE, source-grounded context and independent live stop/caps remain pending. No real calls are enabled even if an environment variable says LIVE_DIAL.

The user-selected repo is the integration destination. Its mapping to the published MiniMax DarkDesk page is still unproven. This change is a review branch, not main merge or public deployment. Retain Cindy/Coms approvals, existing StudBud/Shopify/source authorities and one permission-scoped vault/Drive/Notion system. Do not upload private transcripts or contact lists into the publicly writable artifact folders.
