---
name: King of the Court
description: Territorial sports-challenge app — blacktop-at-night visual identity
colors:
  neon-lime: "#d5ff40"
  neon-lime-container: "#9acd32"
  ink-black: "#0a0a0a"
  deepest-black: "#000000"
  card-black: "#141414"
  panel-black: "#1c1c1c"
  elevated-black: "#242424"
  paper-white: "#ffffff"
  moss-gray: "#c0c2b8"
  outline-gray: "#9c9c94"
  hairline-gray: "#2a2a2a"
  periwinkle-blue: "#b6c4ff"
  violet-accent: "#a78bfa"
  win-green: "#4ade80"
  loss-red: "#f87171"
  danger-red: "#ffb4ab"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  statsNumber:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "2px"
  md: "6px"
  lg: "10px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "24px"
  lg: "40px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.neon-lime}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.neon-lime}"
    textColor: "{colors.ink-black}"
  card:
    backgroundColor: "{colors.card-black}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  stat-tile:
    backgroundColor: "{colors.card-black}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "14px"
  badge:
    backgroundColor: "{colors.neon-lime}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: King of the Court

## Overview

**Creative North Star: "Blacktop Neon"**

Blacktop Neon is the outdoor court after dark: asphalt gone black, one lime floodlight cutting through it. The system is built for a phone in someone's hand at the edge of a real court, not a desktop marketing site — dense, legible, fast to scan, confident rather than decorative. The lime accent (`#d5ff40`) is the single loud voice in an otherwise near-silent black-and-gray room; everything else recedes so that voice reads as a signal (a call to action, a King's crown, a win) rather than noise.

The system rejects two defaults it could have fallen into: a soft, glassy "gamer neon" look (glows, gradients, drop shadows) and a cold enterprise-dashboard look (navy, muted blues, timid accents). Depth here comes from tonal steps of near-black, never from shadows or glow; confidence comes from hard-edged cards and unambiguous status color, never from decoration.

**Key Characteristics:**
- Pure near-black surfaces with tonal (not shadow-based) depth
- One accent color, spent deliberately: lime for the primary action and for "King" status, nothing else competes with it
- Poppins throughout — geometric, confident, works at both a 9px label and a 48px number
- Dense, mobile-first "Operate" layout: stat tiles, bordered cards, tight uppercase labels
- Flat corners kept soft (10–16px), never sharp, never fully rounded except pills/avatars

## Colors

The palette is Restrained: near-black neutrals carry the whole surface, and lime is the only saturated color allowed to lead. Two secondary hues (periwinkle-blue, violet) exist only for non-brand informational status (ranking, secondary badges) and never compete with lime for attention.

### Primary
- **Neon Lime** (`#d5ff40`): the one accent. Primary buttons, the "King" status color, the wordmark's "OF THE", focus rings, active nav state. **The One Voice Rule.** Lime never appears twice for two different meanings on one screen — if a court is King, lime means King there; if a button is a CTA, lime means "go" there. Don't tint lime across a whole card as ambient brand decoration.

### Secondary
- **Periwinkle Blue** (`#b6c4ff`): informational, non-urgent status — ranking numbers, the "primary" badge variant. Reads as data, not as a call to action.

### Tertiary
- **Violet Accent** (`#a78bfa`): a second informational hue for badges/chips that need to be visually distinct from both lime and blue (e.g. a "purple" team-level badge).

### Neutral
- **Ink Black** (`#0a0a0a`): page background, and — inverted — the text color that sits on top of lime (a lime button's label is ink-black, not white; white-on-lime fails contrast and reads muddy).
- **Deepest Black** (`#000000`): the most recessed surface — input fields, the bottom of the tonal stack.
- **Card Black** (`#141414`): the default card/container surface — one clear step up from the page.
- **Panel Black** (`#1c1c1c`) / **Elevated Black** (`#242424`): further steps up, used for nested containers, hover states, and the sidebar.
- **Paper White** (`#ffffff`): primary text.
- **Moss Gray** (`#c0c2b8`): secondary/muted text — timestamps, helper copy, subtitle lines.
- **Outline Gray** (`#9c9c94`) / **Hairline Gray** (`#2a2a2a`): borders. Hairline is the default card border (barely visible on near-black by design); Outline is the hover/focus-adjacent border.

### Status (game-specific)
- **Win Green** (`#4ade80`): a team's win count, "libre" (uncontested) court state.
- **Loss Red** (`#f87171`): a team's loss count, "rival" (enemy-held) court state.
- **King = Neon Lime**: a court under a team's control uses the same lime as the brand accent — territorial control IS the brand color, on purpose.

## Typography

**Display Font:** Poppins (system-ui, sans-serif fallback)
**Body Font:** Poppins
**Label Font:** Poppins, uppercase, tracked

**Character:** One typeface, geometric and confident, doing every job from a 9px uppercase label to a 48px headline — there is no serif or mono anywhere in the system. Weight, size, and letter-spacing carry the entire hierarchy.

### Hierarchy
- **Display** (800, 48px, 1.15): landing-page hero headlines only.
- **Headline** (700, 24px, 1.3): section/card-group titles.
- **Stats Number** (800, 22–30px, 1): the signature numeric treatment — Win Rate, King count, record, XP. Always paired with a tiny uppercase label directly beneath it.
- **Body** (400, 11–13px, 1.5): the actual default text size across the dashboard/operate surfaces — this is a dense, mobile-first app, not a marketing site, so body text runs smaller than a typical web default.
- **Label** (600, 9–10px, 1.4, `letter-spacing: 0.08em`, uppercase): section eyebrows and stat-tile captions (`WIN RATE`, `CANCHAS KING`).

**The Density Rule.** Body copy on operate surfaces (dashboard, equipo, desafíos) runs 11–13px, not 16px — this app is read in short glances on a phone at a court, not sat down and read line by line.

## Layout

Mobile-first single-column stacks that open into a 2–3 column grid at `sm`/`lg` breakpoints (stat strips become 3–4 columns; the dashboard becomes a 2/3 + 1/3 split at `lg`). Spacing runs on an 8px-rooted scale (4 / 12 / 24 / 40 / 64px). Cards sit in `gap-3` (12px) grids; sections stack with `space-y-5` (24px, the "gutter" step) between them. On desktop, a fixed 200px left sidebar owns primary navigation; a slim 50px top bar carries brand + level/XP + account only (it does not duplicate the sidebar's nav). Mobile drops the sidebar for a fixed bottom nav bar and reserves safe-area padding for the iOS home indicator.

## Elevation & Depth

Flat by design — no `box-shadow` exists anywhere in the system. Depth is conveyed entirely by stepping through the tonal black scale (`ink-black` → `card-black` → `panel-black` → `elevated-black`): a "raised" element is simply one tone lighter than what's behind it, plus a 1px hairline border. **The Flat-By-Default Rule.** If something needs to look elevated, give it the next tone step and a hairline border — never a shadow, never a glow.

## Shapes

Corners are soft but not pill-shaped by default: 10px for buttons and inputs, 16px for cards/modals/containers, 2px for the smallest chips. Full pill radius (`9999px`) is reserved for circular avatars and compact status chips. Borders are 1px hairlines (`hairline-gray`) at rest, brightening to `outline-gray` on hover — there is no double border or inset-ring treatment anywhere.

## Components

### Buttons
- **Shape:** 10px radius (`--radius-lg`).
- **Primary:** solid `neon-lime` background, `ink-black` text, bold/semibold weight. This is the only solid-fill button color in the system.
- **Soft (tinted):** a 15%-opacity tint of a semantic color (green/red/lime/blue) as background, 25%-opacity border in the same color, solid-color text — used for confirm/dispute/accept/reject actions where a full solid fill would be too loud for a secondary action.
- **Hover / Focus:** brightness lift on solid buttons; background/border opacity steps up (15%→25%) on soft buttons; focus-visible gets a 2px lime outline ring.

### Chips (Badges)
- **Style:** pill-shaped (full radius), small (`text-[10px]`-scale), tinted background at the variant's color, solid-color text — never a solid-fill chip.
- **State:** no selected/unselected toggle state; chips here are read-only status indicators (accent/king/gold = lime, green/libre = win-green, error/rival/red = loss-red, primary/blue = periwinkle, purple = violet, neutral = gray).

### Cards / Containers
- **Corner Style:** 16px (`--radius-xl`).
- **Background:** `card-black`, one tone above the page.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 1px `hairline-gray`, brightens to `outline-gray` on hover for interactive cards.
- **Internal Padding:** 12–20px depending on density (a compact stat tile vs. a full section card).

### Stat Tile (signature component)
The system's most repeated custom pattern: a bordered card holding one large `stats-number` (26–30px, font-weight 800, colored by meaning — green if positive, red if negative, lime if it's the brand's own metric) directly above a tiny uppercase `label` (9px, tracked, muted gray). Used for Win Rate, Canchas King, Record V-D, Racha, PPG, Ranking, and every other at-a-glance metric in the app. Any new metric the product adds should default to this pattern before inventing a new one.

### Inputs / Fields
- **Style:** `deepest-black` background, `hairline-gray` border, `paper-white` text.
- **Focus:** border shifts to `neon-lime`.
- **Error / Disabled:** error border uses `danger-red`; disabled state drops to 50% opacity.

### Navigation
- **Sidebar (desktop, `md`+):** fixed 200px left rail, grouped into labeled sections (Principal / Mi equipo / Administración), each item an icon + label with a left-border accent (lime) and tinted background when active.
- **Bottom nav (mobile):** fixed bar, icon + 10px label per item, `aria-current` on the active route, safe-area-aware padding.
- **Top bar:** slim 50px header — brand wordmark, level/XP mini-bar, avatar menu. It does not repeat the sidebar's navigation links.

## Do's and Don'ts

### Do:
- **Do** spend lime deliberately — one primary action or one "King" status per view, never as ambient decoration across a whole card.
- **Do** use the stat-tile pattern (big number + tiny uppercase label) for any new at-a-glance metric.
- **Do** convey elevation with a tonal step + hairline border, never a shadow.
- **Do** default to 11–13px body text on operate surfaces; this is a dense, glance-first mobile app.
- **Do** use `ink-black` (not white) as the text color on a lime background.

### Don't:
- **Don't** add a light theme or a theme toggle — dark-only is a committed product decision.
- **Don't** hardcode hex colors in new components (`bg-[#0f0f12]`, `text-[#F5C344]`) — always use the CSS variable tokens (`bg-surface-container-low`, `text-accent`, etc.) so the palette stays swappable from one place.
- **Don't** add `box-shadow`, glow, or blur effects anywhere — depth is tonal only.
- **Don't** reuse lime for a second, unrelated meaning on the same screen (e.g. a decorative lime blob near a lime CTA button dilutes the "this is the action" signal).
