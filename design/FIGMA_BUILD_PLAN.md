# TurfX Figma Build Plan

> Purpose: Lock the product UI in Figma before further Flutter polish.
> Source: Exported ChatGPT planning thread, SKILL.MD, research analysis, and current WORKLOG.
> Status: Ready for Antigravity design execution.
> Date: 2026-06-27

---

## Decision

Move into a Figma-first design lock before continuing broad Flutter UI implementation.

This is not Phase 3 implementation yet. Treat this as:

**Phase 2.5 - Figma Design Lock**

Reason:

- Phase 1 visual polish appears partially implemented in code.
- The product still needs a single design source of truth.
- Further Flutter work should follow approved Figma components and flows.

---

## Important Clarification

The "100 screenshots" target came from the earlier planning chat as a research recommendation.

`SKILL.MD` does not require exactly 100 screenshots. It requires screenshots only when reference capture is being performed, with correct naming and storage.

Current state is acceptable to proceed because written research and component specs already exist. Reference screenshots can be added later if a design decision needs visual evidence.

---

## Product Feeling

TurfX must feel:

1. Athletic
2. Premium
3. Instant

Visual ratio:

- 70% Nike Run Club: dark, athletic, bold, performance-focused
- 20% Airbnb: trustworthy cards, clean booking confidence, strong imagery
- 10% Linear: restraint, precision, clean hierarchy

Avoid:

- Generic Material 3 visual language
- Random gradients
- Dashboard-like layouts
- Emoji sport icons
- Duplicate component styles
- Screen-specific one-off spacing

---

## Figma Work Order

### 1. Foundations

Create these Figma styles first:

- Color styles
- Typography styles
- Spacing reference frame
- Radius reference frame
- Shadow/elevation reference frame
- Dark-first canvas

Use the existing docs:

- `design/tokens/colors.md`
- `design/tokens/typography.md`
- `design/tokens/spacing.md`

### 2. Core Components

Build components before screens:

- Primary CTA
- Secondary CTA
- Tertiary CTA
- Icon button
- Turf discovery card
- Turf listing card
- Popular turf tile
- Booking history card
- Search bar
- Category chip
- Slot chip
- Payment method tile
- Bottom navigation
- AI command input

Each component should include:

- Default state
- Pressed state
- Disabled state where relevant
- Selected state where relevant
- Dark mode first

### 3. Primary Flows

Design flows, not isolated screens:

- Discovery flow: Home -> Search -> Results -> Turf Detail
- Booking flow: Turf Detail -> Date/Slot -> Summary -> Payment -> Confirmation
- AI booking flow: Prompt -> Parsed intent -> Turf suggestions -> Confirm booking
- Return flow: My Bookings -> Booking Detail -> Cancel/Rate

### 4. Final Screen Set

Minimum Figma screens before Flutter implementation:

- Welcome
- Login/OTP
- Home
- Turf listing/search results
- Turf detail
- Date and slot selection
- Booking summary
- Payment
- Confirmation
- My bookings
- Profile/settings

---

## Phase 1 Audit Items Before Closing

Claude Code should verify these after Figma lock:

- Default theme is dark.
- Regular CTAs use solid primary, not gradient.
- Gradients are reserved for welcome hero, confirmation success, and special promotional states.
- Typography scale matches the proposed hierarchy.
- Tap feedback uses consistent 0.97 scale behavior.
- Button heights are standardized at 52/48/40.
- Core card variants are reusable, not rebuilt inline.

---

## Handoff Rule

Antigravity owns Figma design decisions.

Claude Code should not broadly restyle Flutter screens until at least the foundation styles, core components, and discovery/booking flows are approved in Figma.

Claude Code may still do limited technical cleanup, validation, and component preparation if it does not change the visual direction.

