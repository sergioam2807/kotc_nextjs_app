# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: amateur team-sport players (basketball first; fútbol, vóleibol, tenis and pádel exist in the schema/UI but basketball is the initial focus) who form teams and compete territorially for control of real courts in Chilean cities (Santiago, Viña del Mar, Valparaíso). They challenge other teams for a specific court, track XP/level progression, and check the map to see what they control.

Secondary: league organizers who run structured tournaments ("ligas") — not the primary product focus; see Product Principles on monetization.

## Product Purpose

KOTC gamifies casual pickup sports by turning real courts into contested territory: a team challenges another team at a specific court, and whoever wins becomes that court's "King" until defeated. Territorial control (a map of courts under a team's domain) plus progression (XP, levels, global/1v1 ranking) is the core loop.

## Positioning

Unlike a generic league/tournament management app, KOTC's mechanism is territorial: individual real-world courts are "owned" by whichever team currently holds the most wins there. Challenging, defending, and losing a specific court is the core social/competitive loop — not scheduling a season or tracking a standings table.

## Operating Context

Pre-launch / private beta — no real teams or players are using it in production yet; do not fabricate usage evidence. Next.js App Router + Supabase (Postgres + Auth with Google OAuth), deployed to Vercel. Initial court data is Chile-specific (OSM-sourced import for Santiago, Viña del Mar, Valparaíso; region/comuna filters use a static Chilean region list). Core user flows: create/join a team, browse the map, challenge a court, propose/confirm a match result, track XP/ranking.

## Capabilities and Constraints

Web only, no native app, but must work well installed as a PWA on a phone — mobile-first is a hard product requirement, not a responsive nicety, since the app is used on a phone at or near a court. The two flows that matter most are (1) seeing/starting a challenge fast and (2) creating a challenge fast; every redesign pass should protect and sharpen those first.

## Brand Commitments

Name: "King of the Court" (KOTC). Current visual identity (this redesign): near-black background, lime-green `#D5FF40` as the single accent/CTA color, Poppins typeface, dark-mode only — no light theme, no theme toggle.

## Evidence on Hand

No real users, teams, testimonials, or usage data yet (pre-launch/private beta). Do not invent any of these in future design or copy work.

## Product Principles

1. Mobile-first, PWA-minded: every surface must work great one-handed on a phone at a court, not just "be responsive" at a desktop breakpoint.
2. The core loop — see a challenge, start a challenge, create a challenge — must be the fastest, most obvious action on any screen, especially the dashboard/home.
3. Territory (courts owned/contested) and progression (XP, level, King status, streaks, rank) are the emotional core of the product; keep them viscerally visible, not buried in a stats sub-page.
4. Monetization is sponsorships — sponsored events and sponsored-court banners (e.g. "Cancha X patrocinada por Nike") — not player subscriptions. The existing `suscripciones`/"Organizador" league-plan paywall in code is not the target business model; design should leave room for tasteful future sponsor placements without treating them as a current priority.
5. Chile-first for now (comuna/región data, city imports), but the data model shouldn't assume it stays Chile-only forever.

## Accessibility & Inclusion

No formal standard mandated beyond what the token system already targets (WCAG AA contrast on dark surfaces). No other specific accessibility requirement established.
