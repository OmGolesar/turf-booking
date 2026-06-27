# Nike Run Club — UI/UX Analysis

> Source: Nike Run Club App + Nike.com
> Relevance to TurfX: **70%** (Primary design influence)
> Analyzed by: Antigravity
> Date: 2026-06-27

---

## Layout System

- **Structure**: Full-bleed dark canvas with card modules
- **Grid**: Bento-style grid for dashboards, single-column for feeds
- **Density**: High data density balanced with generous whitespace
- **Hero Sections**: Full-screen gradient overlays on photography
- **Scroll Pattern**: Vertical scroll with horizontal carousels for categories

### Key Takeaways for TurfX:
- Use full-bleed dark backgrounds for key screens (Home, Turf Detail)
- Implement bento-grid layout for stats/dashboard sections
- Cards should float above dark backgrounds with subtle shadows

---

## Typography

- **Primary Font**: Helvetica Now (custom) — TurfX equivalent: **Inter** ✓
- **Headline Treatment**: Bold (700-900), tight letter-spacing (-0.5 to -1.0)
- **Body Text**: Regular (400), generous line height (1.5-1.6)
- **Data Display**: Extra-bold numbers, large size for key metrics
- **Style**: Declarative and utilitarian — stats first, decoration second

### Type Scale Comparison:

| NRC Level | NRC Size | TurfX Current | Recommendation |
|-----------|----------|---------------|----------------|
| Display | 32-36px | 32px ✓ | Keep, add tighter letter-spacing |
| Headline | 24-28px | 20-22px ⚠️ | Increase to 24px minimum |
| Title | 18-20px | 14-16px ⚠️ | Increase to 18px |
| Body | 14-16px | 14px ✓ | Good |
| Caption | 11-12px | 10-12px ✓ | Good |

### Critical Gap:
- TurfX headlineSmall is 18px (good) but headlineMedium at 20px is too close
- Need more dramatic size jumps between hierarchy levels
- Letter-spacing in headings should be negative (-0.25 to -0.5)

---

## Color Strategy

### NRC Core Palette:
| Token | Hex | Usage |
|-------|-----|-------|
| Base Black | `#111111` | Primary background |
| Dark Surface | `#1A1A1A` | Card backgrounds |
| Volt Green/Yellow | `#CDFC02` | Primary CTA, active states |
| Volt Orange | `#FF6600` | Brand signature |
| White | `#FFFFFF` | Primary text on dark |
| Mercury Grey | `#E5E5E5` | Secondary text |
| Mid Grey | `#999999` | Tertiary text |

### TurfX Current vs NRC Target:

| Aspect | TurfX Current | NRC Reference | Gap |
|--------|--------------|---------------|-----|
| Background Dark | `#0D1117` ✓ | `#111111` | Similar, good |
| Surface Dark | `#161B22` ✓ | `#1A1A1A` | Very close |
| Primary | `#00C853` (green) | `#CDFC02` (volt) | Different hue but OK for brand |
| Primary CTA style | Gradient | Solid bold color | Consider bold solid CTAs |
| Text on dark | `#F0F6FC` | `#FFFFFF` | Slightly muted — OK for readability |

### Key Insight:
TurfX's green primary (`#00C853`) is good — it aligns with the "athletic/sports" feel.
However, NRC uses **one single bold accent** against a near-black canvas.
TurfX should reduce gradient usage and use **solid, bold green** for primary CTAs.

---

## Navigation

- **Bottom Tab Bar**: 4 tabs — Activity, Explore, Record (prominent), You
- **Record Button**: Center-position, oversized, high-contrast accent color
- **Tab Style**: Icon + label, minimal, no active indicator background
- **AppBar**: Transparent over content, minimal — just back arrow + title

### TurfX Gap:
- TurfX has 3 tabs (Home, Bookings, Profile) — **add a prominent "Book" CTA**
- Consider a floating booking action or elevated center tab
- AppBar should be more transparent, content should bleed under it

---

## Card Design

- **Corners**: 12-16px radius
- **Shadows**: Minimal on dark mode (rely on surface color contrast)
- **Image Treatment**: Full-bleed within card, no padding around images
- **Overlay**: Dark gradient from bottom for text legibility on images
- **Content Padding**: 16px internal padding
- **Spacing Between Cards**: 12-16px

### TurfX Gap:
- Current cards are good but could use more aggressive image-first layouts
- Distance/price badges should overlay on images (currently done ✓)
- Add gradient overlays on all card images for consistent text readability

---

## CTA Hierarchy

| Level | NRC Style | TurfX Style |
|-------|-----------|-------------|
| Primary | Solid bold color, full-width, rounded | Gradient, full-width ✓ |
| Secondary | Outlined, same corner radius | Outlined ✓ |
| Tertiary | Text-only, underlined | Text-only ✓ |

### Recommendation:
- Primary CTAs should be **solid color** (not gradient) for maximum impact
- Reserve gradient for hero sections and special elements only
- Increase button height to 52-56px for thumb-friendly targets

---

## Motion Patterns

- **Page Transitions**: Smooth horizontal slide
- **Data Loading**: Skeleton shimmer (already planned in TurfX ✓)
- **Micro-animations**: Subtle scale on tap (0.95-1.0), fade-in for content
- **Stats**: Animated counter roll-up for numbers
- **Pulse**: Active recording has a breathing/pulse animation

### TurfX Recommendations:
- Add scale-down feedback on card taps (0.97 scale, 150ms)
- Animate price/stats with counter roll-up effect
- Add subtle fade-in stagger for list items (100ms delay between items)

---

## Design Notes

### What Makes NRC Feel Premium:
1. **Restraint** — Very few colors, no unnecessary decoration
2. **Contrast** — Bold accent on deep black creates instant hierarchy
3. **Data First** — Numbers are heroes, not buried in UI
4. **Full-Bleed Photography** — Images are immersive, edge-to-edge
5. **Consistent Dark Canvas** — Everything lives on the same dark surface

### What TurfX Should Adopt:
1. Default to **dark mode** as the primary experience
2. Use the green primary as a **single bold accent**, not gradient everywhere
3. Make prices and ratings **visually prominent** (larger, bolder)
4. Reduce visual noise — fewer borders, shadows, decorative elements
5. Full-bleed turf images in cards and detail pages

---

## Reusable Learnings

### Components to Extract:
1. **Athletic Stats Card**: Large number + label below, minimal container
2. **Full-Bleed Image Card**: Image fills card top, text overlays bottom gradient
3. **Bold CTA Button**: 52px height, solid color, rounded corners, no gradient
4. **Minimal Tab Bar**: Icon + small label, no background indicator
5. **Data Counter Widget**: Animated number display with roll-up effect
6. **Achievement Badge**: Circular with icon, gradient ring, subtle glow
