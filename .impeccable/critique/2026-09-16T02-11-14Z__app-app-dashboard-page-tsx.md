---
target: dashboard
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\Drimo\\Documents\\KOTC\\kotc\\app\\(app)\\dashboard\\page.tsx"
target_fingerprint: "sha256:e106f66d540cc1bd88ffbf6e24bc5794a1a7a9845e33ee270394d0ddba157c37"
target_path: "C:\\Users\\Drimo\\Documents\\KOTC\\kotc\\app\\(app)\\dashboard\\page.tsx"
timestamp: 2026-09-16T02-11-14Z
slug: app-app-dashboard-page-tsx
---
Method: dual-agent (A: aa18305e89e4d3624 · B: a2a63452570bc2196)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Silent `?? []` fallbacks make a failed query indistinguishable from a legitimate empty state |
| 2 | Match System / Real World | 4 | Domain language ("King," "Racha," cancha) fits the audience precisely |
| 3 | User Control and Freedom | 2 | Invite "Rechazar" fires immediately, no confirm/undo, unlike the app's own `DisolverEquipoButton` double-confirmation pattern |
| 4 | Consistency and Standards | 2 | King badge/number colored by team color, contradicting DESIGN.md's own "King = Neon Lime" rule |
| 5 | Error Prevention | 2 | Reject-invite sits directly beside Aceptar/Ver equipo at equal size — one mis-tap loses the invite |
| 6 | Recognition Rather Than Recall | 3 | Color-coded team badges and consistent iconography aid scanning |
| 7 | Flexibility and Efficiency | 1 | No direct "challenge team X" affordance from the dashboard; nothing collapsible for a returning power user |
| 8 | Aesthetic and Minimalist Design | 1 | 10+ full-height, equally-weighted sections render simultaneously |
| 9 | Error Recovery | 1 | No visible error state anywhere on the page |
| 10 | Help and Documentation | 2 | One contextual tip exists, but a first-time teamless user gets no explanation of what "King"/territory means |
| **Total** | | **21/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: This reads as authored for KOTC, not a generic dashboard — the vocabulary (⚔️/🔥/👑, "Reclama territorio en el mapa," "Racha," "Reinando Xd") and the stat-tile component are specific and on-system. But the specificity is diluted by accretion: ~12 same-styled bordered cards stack in an undifferentiated scroll (season banner, events, invitations, hero, stats, CTA pair, courts, upcoming matches, disputes, rivals, a duplicate desafíos feed, new-kings feed, quick actions), so the authored flavor doesn't translate into a hierarchy that says which of these is actually the point of the screen.

**Deterministic scan**: `impeccable detect --json` on the target found 56 raw findings (exit 2): 1 `side-tab` warning and 3 `design-system-color` advisories, all on the same disputed-match alert card (line 666, hardcoded `rgba(239,68,68,*)` + a 3px left border), plus 52 `design-system-font-size` advisories for arbitrary `text-[Npx]` values.

Cross-checking those 52 font-size findings against DESIGN.md's own prose Typography Hierarchy (which documents ranges — Label 9–10px, Body 11–13px, Stats Number 22–30px — not single values) shows **42 of 52 are false positives**: the detector is checking against the narrower single px values baked into DESIGN.md's YAML frontmatter rather than the wider ranges stated in prose. The remaining **~11 are true positives** — genuine off-scale sizes (18px, 15px, 16px, 32px, 14px, 20px) that neither assessment had otherwise flagged individually.

The line-666 color/border findings corroborate each other across both assessments (LLM review and detector both independently flagged the same disputed-result card) — that's the strongest signal in this run: hardcoded `rgba(239,68,68,*)` where the token system defines `loss-red`/`danger-red` instead.

**Visual overlays**: not available this run — no browser/screenshot tool was exposed to Assessment B's environment, so no live-page overlay evidence exists. Routing was confirmed via `curl` instead: `/dashboard` correctly 307-redirects to `/login` (auth-gated, as expected — this run had no test credentials), and `/login` returns a clean 200.

## Overall Impression

The screen has real, specific personality and one genuinely strong piece of craft (the stat-tile pattern), but it has grown by addition rather than by editing: the actual core-loop action — start or create a challenge — is one of roughly a dozen equally-weighted blocks instead of the one thing this screen exists to make effortless. The single biggest opportunity is consolidation: the same challenge/desafío data currently renders in three different places with three different treatments, and collapsing that into one prioritized module would fix the CTA-visibility problem and the redundancy problem at the same time.

## What's Working

- The stat-tile pattern (Canchas King / Record V-D / Racha) is a faithful, well-executed instance of DESIGN.md's own signature component — big font-black number over a tiny uppercase label, exactly as documented.
- Copy is specific and in-voice ("Reclama territorio en el mapa," "Domina canchas, desafía rivales y conviértete en el King") rather than generic SaaS phrasing.
- Domain language throughout (heuristic #2, scored 4/4) fits a Chilean amateur-sports audience precisely, with no unexplained jargon.

## Priority Issues

**[P0] Core-loop CTA is buried and competes with everything around it**
- **Why it matters**: PRODUCT.md's own Product Principle #2 requires "see a challenge, start a challenge, create a challenge" to be the fastest, most obvious action on the dashboard specifically. Right now the CTA pair is the 5th block down (after season banner, events, invitations, hero+stats), and there's no direct "challenge team X" action anywhere on the page — only a detour through `/mapa`.
- **Fix**: Move the CTA pair directly under the hero card, before the stats strip; add a direct challenge entry point, not just a map link.
- **Suggested command**: `/impeccable layout`

**[P1] One Voice Rule violated — lime carries at least six different meanings on this one screen**
- **Why it matters**: DESIGN.md is explicit that lime should mean one thing at a time. Here it's spent on the CTA, the nav-active state, the XP bar fill, a notification highlight, and roughly six separate "ver más/ver todos" text links simultaneously — which erodes the "this is THE action" signal the whole system is built around.
- **Fix**: Reserve lime strictly for the primary CTA and King status; recolor secondary links to moss-gray/periwinkle.
- **Suggested command**: `/impeccable colorize`

**[P1] King status renders in team color, not lime, contradicting DESIGN.md's own rule**
- **Why it matters**: DESIGN.md states "King = Neon Lime... territorial control IS the brand color, on purpose." As implemented, King badges/numbers use each team's custom `equipoColor`, so King status is inconsistent across teams and loses the intended universal recognizability.
- **Fix**: Force King badges/numbers to lime regardless of team color; keep `equipoColor` for non-King identity elements only.
- **Suggested command**: `/impeccable harden`

**[P2] Hardcoded colors on the disputed-result alert card (detector-confirmed)**
- **Why it matters**: Both assessments independently flagged the same line: `rgba(239,68,68,0.07/0.25/0.7)` and a matching 3px left border are hand-picked instead of drawn from the `loss-red`/`danger-red` tokens — the exact "never hardcode hex/rgba" violation DESIGN.md's Don'ts calls out.
- **Fix**: Replace with `var(--color-error)`/`var(--color-status-rival)`-based Tailwind classes.
- **Suggested command**: `/impeccable harden`

**[P2] Redundant challenge data across three sections**
- **Why it matters**: "Próximos partidos," "Acción requerida," and the right-column "Desafíos" feed all draw from overlapping subsets of the same `desafios` query with different visual treatments, forcing the user to reconcile duplicates instead of trusting one source of truth — and on mobile the right-column feed renders entirely after all of this, so it repeats data already shown above it.
- **Fix**: Merge into one prioritized "Mis desafíos" list (action-needed → upcoming → pending), single card style, single location.
- **Suggested command**: `/impeccable distill`

**[P3] Disputed-result moment offers no reassurance at a high-stakes point**
- **Why it matters**: "Acción requerida" is a bare red link ("Confirma el resultado del partido →") with no mention of the app's real 5-day auto-cancel deadline or what confirming/disputing actually does — exactly the kind of confrontational moment (a rival disputing your result) that needs context, not a bare directive.
- **Fix**: Add inline deadline/stakes copy and a calmer tone before sending the user into `/desafios`.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Casey (mobile, one-handed, distracted)**: Must scroll past 4 full sections to reach the CTA pair; the invite-reject button is unconfirmed and sits beside two same-size buttons — a fat-finger risk exactly when least attentive; nothing keeps "start a challenge" reachable while scrolling the rest of the page.

**Alex (power user)**: No way to challenge a specific known rival directly from the dashboard, only a detour through `/mapa`; three duplicate challenge-status sections force re-scanning instead of one dense list; nothing is collapsible, so a daily returning user re-sees the same chrome every visit.

**Jordan (first-timer, no team yet)**: The teamless CTA is clear, but everything that would explain the game (canchas bajo control, próximos, acción requerida, rivales) is hidden behind a "has a team" guard — Jordan's dashboard is mostly the hero card, a feed of achievements from teams they don't know, and a generic quick-actions grid, with no explanation of what "King" or territorial control even means before being expected to care.

## Minor Observations

- An entire commented-out "Temporada info card" block is left dead in the file — should be removed, not shipped as a comment.
- `TIPO_COLORS`/`TIPO_EMOJI` hardcode hex literals for event types outside the token system — acceptable as per-entity semantic data, but worth centralizing.
- `MobileBottomNav` still shows "Ranking" rather than "Ligas," which project docs say was replaced — likely branch drift worth reconciling.
- "Nuevos reyes" (a global, all-teams feed) sits directly beside personal action items with no visual separation between "about you" and "about everyone."
- Detector calibration gap: 42 of 52 flagged font-sizes are false positives against DESIGN.md's own documented ranges (it's checking single frontmatter values, not the prose ranges) — worth tightening the detector config or DESIGN.md's frontmatter so future scans aren't drowned in noise. The genuine ~11 true positives (18/15/16/32/14/20px) are real drift worth a pass regardless.

## Questions to Consider

1. If lime is supposed to mean one thing at a time, does "Desafiar cancha" actually still read as special once it's competing with a nav-active state, an XP fill, and six "ver más" links on the same screen?
2. DESIGN.md says King status IS the brand color on purpose — is the code wrong, or should that rule change to allow team-color Kings?
3. Given the product's own principle that creating a challenge must be the fastest, most obvious action, why is there no direct "challenge this team/court" affordance anywhere on this screen?
4. With three different modules all claiming to show "your active challenges," which one is a returning user actually supposed to trust — and would they notice if two of them disagreed?
