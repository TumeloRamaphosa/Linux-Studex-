# StudEx-7 Learnings Log

Institutional memory for the StudEx-7 pod. Newest entries first.

---

## 2026-11-02 — Content Pipeline Run (Scout → Analyst → Writer)

**Status:** Partial completion. Scout/Analyst/Writer succeeded; Visual/Video/Publisher blocked by OpenRig infrastructure failure.

**Key learnings:**
- **Research degradation doesn't break brief quality.** Last30Days API failed (3/5 hit rate), but Analyst still delivered a clear, actionable brief with explicit LOW-confidence flag. Implication: positioning work is robust against research gaps; tone and audience targeting matter more than granular competitor data.
- **Multi-channel copy coherence is achievable at speed.** Writer delivered 4-channel suite (IG carousel + FB long-form + WA broadcast + video script) with consistent narrative in 10 minutes from brief, zero rework requests. Multi-channel coherence pattern validated.
- **Certification-first narrative resonates.** Copy structure (SANHA proof → zabiha sourcing → Ankole/Wagyu scarcity → "exclusively halaal") tested strong in brief review. Reusable template for premium halaal positioning.
- **Infrastructure blocker: OpenRig daemon failure.** Node.js string-width incompatibility prevented `rig send` coordination. Pipeline stalled at Visual/Video stage (11:12 SAST). Manual coordination fallback recommended for future runs; OpenRig repair needed.
- **Pipeline ETAs were realistic.** Scout (2h 17m), Analyst (2 min), Writer (10 min) all hit or beat projections. Publishing/Memory sequencing depends on asset delivery timing (Visual by 14:30, Video by 16:00 SAST).

---

## 2026-11-01 — Memory Seat Initialized

- Established memory system at `dark-factory-rig/memory/LEARNINGS.md`
- Role: Capture learnings after each run, maintain historical record, serve director queries
- Ready to receive tasking from studex7-director
