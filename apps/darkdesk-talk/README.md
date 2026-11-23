# Talk to DarkDesk — isolated browser voice integration preview

This is the Coms review component added to the user-selected `Linux-Studex-` repository. **Live talking-agent media is not connected.** This is the separate browser-media module. The parent review now integrates CRM/calling into the existing dashboard and hardens the server; see server/coms/README.md. This module starts no fleet, wallets, auto-push or deployment scripts.

## Run without installing dependencies

From the repository root, using existing Python3.12+ and Node for checks:

```sh
python3 apps/darkdesk-talk/server.py --port 0
python3 apps/darkdesk-talk/run_checks.py
```

The first command prints an OS-selected `http://127.0.0.1:<port>` review URL. It is local to that machine, not public/mobile hosting. Reuse a running preview instead of starting duplicates. `preview-running.json` records its exact owned PID; stop only that process, never another service/occupied port. Runtime state, session records and test output are ignored by Git.

## Implemented and tested

- Connect/demo status, End, optional local microphone meter/mute and optional browser-reported local speech playback. Mic starts only after explicit consent and a separate user click; no camera, recording or audio upload. No browser speech-recognition/cloud fallback.
- Origin-bound random session auth, two-minute expiry, request/start/concurrency/turn limits and fail-closed live media. Ephemeral tokens stay in memory; no API key or operator credential in frontend. Summary consent is separate/off by default; no lead, customer call or marketing signup.
- Optional **synthetic** completion summary passes through the existing Coms signed receiver. `bridge/hermes_receiver.py` is the same transport validator bundled for portability, not another CRM/business authority. Accepted fixture events remain pending_review. No Notion/Base44/cloud writer.
-11Python session/HTTP tests and4mocked media lifecycle tests; no real mic/provider involved. The original local browser preview additionally verified connect→synthetic text/reply→local speech start→End→signed fixture summary. Physical speaker output, actual microphone/duplex audio and staff live call remain unverified.

## Source/deployment mapping

At supplied base `cfd6313698775e54995d9f7ae38c0f631526872c`, the existing `dashboard.html` is titled Linux StudEx — Agent Operating System. Its full selected text has no DarkDesk name or matching Sovereign VM hero. No exact source link to `https://hgjcgc2esiki.space.minimax.io/` was established. This component therefore adds a reviewable isolated entry rather than overwrite that unrelated dashboard. The user already selected this repository; the remaining requirement is the **deployment mapping/editor route**, not another repository-selection question.

No main-branch modification, provider credential, public deploy, DNS/service change or VM launch is part of this component. Repo-visible workflow/config checks found no Actions workflow; external hosting/webhooks are not completely inspectable. Do not run `auto-push.sh` or the original server/VM scripts just to preview voice. The original Express backend has broad control routes and CORS/static serving; do not expose it as a visitor voice-auth boundary.

## Prepared live-media adapter

`live-webrtc.mjs` adapts the microphone/WebRTC/data-channel/cleanup pattern from `TumeloRamaphosa/studex-rileyjarvis` at `0e4f08dff724f1690ece20e8e7105109dbe0b4ca`. MIT notice retained in `UPSTREAM-LICENSE.txt`. It carries no Electron `window.ricky` tool/computer/file bridge and no provider key. Exact model/provider configuration is not selected or tested.

Current `/api/voice/sessions` accepts **demo only**, `/turn` returns an explicitly simulated reply, `/end` is idempotent, and `/sdp` returns423. The adapter is inactive and expects a verified scoped session with `transport:webrtc-proxy`, `provider_connected:true`, `audio_consent:true`, expiry and an authorized broker SDP answer. Never flip flags alone to claim working voice. Signaling proxying does not keep negotiated WebRTC media on the VM; document and approve the actual region/provider route.

HERMES's reported REST3106bridge and Jarvis text/SSE endpoint are not browser media protocols. Preserve existing Alibaba/GCP services. First inspect the actual approved voice endpoint/version/auth/codec/cancellation route and use fresh scoped credentials through secure runtime entry, not chat, source control or Cindy connector auth. Do not buy a second provider/number before inspecting existing service ownership.

## Finish the website connection

1. Confirm how the supplied repository maps to the MiniMax page or its editable project and mount the widget in that exact source on a review branch. No public release until reviewed.
2. Establish a real authenticated HTTPS media/session broker with tenant/task identity derived server-side, exact origin policy, abuse controls, scoped provider auth, independent duration/spend/stop enforcement and negotiated codec/ICE/TURN.
3. Load only approved source-grounded business context with version citations. Current synthetic rules make no price/stock/POPIA/all-local promises. Don't retain transcripts or create a lead without separate explicit choices.
4. Run a staff-owned microphone/listen/respond/interrupt/mute/end/expiry test, wrong-origin/auth/tenant denial, network/permission failure and signed-summary replay tests. Real agent audio roundtrip is a separate receipt from this demo.

Cindy/Coms retains instructions and approval; StudBud remains operations and existing canonical task/project IDs are retained. One permission-scoped vault/Drive/Notion system; no new competing control plane or customer data upload.
