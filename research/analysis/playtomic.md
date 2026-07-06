# Playtomic — UI/UX Analysis

> Source: Playtomic.io (Direct competitor — sports booking platform)
> Relevance to TurfX: **Primary functional reference** (booking flows, slot selection)
> Analyzed by: Antigravity (with browser screenshots)
> Date: 2026-06-27

---

## Layout System

- **Homepage**: Clean hero with centered search input ("Address, club, city...")
- **Search Results**: Vertical list of venue cards with basic info + "Book now" CTA
- **Club Detail**: Split layout —
  - **Left**: Sport selector + date picker + court booking timetable
  - **Right**: Sidebar with Google Map, address, amenities, hours
- **Mobile**: Sidebar folds below timetable, stacked vertically

### Key Takeaways for TurfX:
- TurfX should have a **more visually rich** card design than Playtomic
- The timetable grid concept is excellent — but TurfX should make it more mobile-friendly
- Consider a 2-column grid for mobile slot selection instead of Playtomic's timeline

---

## Search/Discovery UX

- Simple, prominent search in hero section
- Auto-suggest on type
- Results are clean vertical list — minimal but could be richer
- Sport filter above slot grid (tabs: Padel, Tennis, Pickleball, etc.)

### TurfX Comparison:
- TurfX's search is a tappable fake input → navigates to listing ✓
- TurfX should add **auto-suggest** for location/turf name
- Sport filter tabs on listing ✓ (already implemented)

---

## Booking Flow & Slot Selection (Critical Comparison)

### Playtomic's Approach:
| Element | Playtomic | TurfX Current |
|---------|-----------|---------------|
| Date Selection | Inline date nav (arrows + date text) | Full calendar picker |
| Slot Display | Grid: Courts (Y) × Hours (X) | 4-column grid of time slots |
| Slot States | Available / Not Available / Your Booking | Available / Booked / Selected |
| Selection | Click cell in grid | Tap chip in grid |
| Multi-court | Shows multiple courts simultaneously | Single turf focus |
| Legend | Explicit legend bar | Legend row ✓ |
| Price Display | Per-slot pricing in grid | Total at bottom bar |

### Playtomic Strengths:
1. **Court × Time grid** — see all availability at a glance
2. **Inline date switching** — no separate screen for date
3. **Clear visual states** — color-coded availability

### TurfX Strengths:
1. **Cleaner mobile UX** — 4-column chip grid is more thumb-friendly
2. **Full calendar** — better for advance booking
3. **Price total bar** — clear cost summary

### Recommendations:
- Keep TurfX's chip-based slot selection (better for mobile)
- Add **inline date navigation** (left/right arrows) above slot grid
- Show **per-slot price** on each chip, not just total
- Consider showing **popularity indicator** on slots (e.g., "filling fast" badge)

---

## Card Design

### Playtomic Venue Cards:
- **Minimal**: Club name + location info + "Book now" link
- **No images** on search result cards — plain text cards
- **No ratings** displayed on cards
- **Very sparse** — functional but not premium

### TurfX Advantage:
- TurfX's cards are **significantly richer** than Playtomic ✓
- Images, ratings, prices, sport badges — all present
- This is a major differentiator — maintain this quality

---

## Typography & Branding

- **Font**: Standard modern sans-serif (clean, readable)
- **Color Strategy**:
  | Token | Hex | Usage |
  |-------|-----|-------|
  | Background | `#FFFFFF` | White canvas |
  | Text Primary | `#1A1A1A` | Dark grey/black text |
  | Text Secondary | `#666666` | Muted text |
  | Border | `#E0E0E0` | Light borders |
  | Primary CTA | `#CCFF00` (#cf0) | Electric lime green |
  | CTA Text | `#000000` | Black text on lime CTA |

### Key Insight:
Playtomic's lime green (`#CCFF00`) is very distinctive but slightly harsh.
TurfX's green (`#00C853`) is more refined and premium-feeling.

---

## Navigation

- **Desktop**: Top nav bar with logo + search + login
- **Mobile**: Hamburger menu / simplified header
- **Sport Tabs**: Horizontal tabs above timetable (Padel, Tennis, etc.)
- **No bottom tab bar** on web — app-style tabs likely in native app

---

## Amenities Display

- Clean icon + text list
- Icons: Disabled access ♿, Parking 🅿️, Café ☕, Changing rooms
- Displayed in sidebar alongside map

### TurfX:
- Already has amenity chips with emojis ✓
- Consider structured icon + label rows instead of chips for more info

---

## Login/Auth Flow

- Redirect to subdomain (`app.playtomic.com/login`)
- Social login: Apple, Google, Facebook
- Email/Password form
- Clean container card layout

### TurfX Comparison:
- TurfX has Google sign-in UI + email form ✓
- OTP flow is an advantage TurfX has ✓

---

## Design Notes

### What Playtomic Does Well:
1. **Functional booking grid** — clear, efficient slot selection
2. **Sport-specific filtering** — easy sport switching
3. **Map integration** — location context
4. **Clean, no-nonsense UI** — gets out of the way

### What Playtomic Lacks (TurfX Opportunity):
1. **Visual richness** — no images on cards, sparse design
2. **Premium feel** — functional but not exciting
3. **Mobile optimization** — desktop-first approach
4. **Brand personality** — generic, no emotional design
5. **Social proof** — no ratings, reviews, or trust signals

---

## Reusable Learnings

### Patterns to Adopt:
1. **Inline date navigation**: Arrow-based date switching above slot grid
2. **Court × Time grid**: Consider for multi-court venues (future feature)
3. **Sport tab switcher**: Horizontal tabs for filtering by sport
4. **Map sidebar**: Location context alongside booking

### Patterns to Avoid:
1. Image-less venue cards — always show turf photos
2. Desktop-first layouts — always design mobile-first
3. Sparse CTAs — use rich, gradient or solid-color buttons
4. No social proof — always show ratings and review counts
