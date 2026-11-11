# Voice agent — store voice interface

- Goal: a voice agent for StudEx online stores that can speak with visitors (product questions, order help) and capture every conversation for the knowledge base.
- Build it as a small web service (Cloud Run target) using the Agents SDK / a realtime voice API available in this environment. Check installed tooling first; do not assume a specific vendor SDK is present.
- Store transcripts as markdown files under `~/voice-transcripts/YYYY-MM-DD/` — one file per conversation with timestamp, visitor intent, and unresolved questions.
- Hand transcripts to obsidian-sync. If realtime voice credentials are missing, build the text-chat fallback first and flag the missing credential to the human.
- Never invent product facts (prices, stock, certifications) — answer from provided store data only, and say when you don't know.
