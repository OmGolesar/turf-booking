# Component Extraction — Navigation

> Extracted from: Nike Run Club, Airbnb, Strava, Linear
> Purpose: Define navigation patterns for TurfX
> Date: 2026-06-27

---

## Bottom Tab Bar

### Current TurfX: 3 tabs
| Tab | Icon | Label |
|-----|------|-------|
| Home | 🏠 | Home |
| Bookings | 📅 | Bookings |
| Profile | 👤 | Profile |

### Recommended: Enhanced 3-tab + FAB

Keep 3 tabs but add a floating "Quick Book" FAB or elevated center element.

| Property | Value |
|----------|-------|
| Height | 64px (below safe area) |
| Background | Surface color with top border |
| Active Icon | Filled variant, primary color |
| Inactive Icon | Outlined variant, tertiary color |
| Label | Always visible, 10px |
| Border Top | 0.5px divider |
| Elevation | 0 (use border instead) |

### NRC Pattern:
- 4 tabs but "Record" is central and prominent
- No background indicator on active tab — just color change
- Clean, minimal, icon + label always visible

### Linear Pattern:
- Sidebar navigation (not applicable for mobile)
- But the "minimal border" aesthetic applies — use hairline borders

---

## AppBar / Header

### Current TurfX:
- Standard Material AppBar with background color
- Back button + title + action icon

### Recommended:
| Property | Value |
|----------|-------|
| Background | Transparent / surface color |
| Elevation | 0 |
| Scroll Effect | `scrolledUnderElevation: 0.5` only |
| Title | Left-aligned (not center) |
| Back Button | CircleAvatar style with surface background |
| Actions | Icon buttons in circular containers |

---

## Category Chip Bar (Home)

### Current TurfX:
- Horizontal scrollable chips
- Gradient background for active, surface for inactive
- Emoji icons + text

### Recommended Enhancement:
| Property | Current | Recommended |
|----------|---------|-------------|
| Active BG | Gradient | **Solid primary** |
| Active Text | White | White ✓ |
| Inactive BG | surfaceContainerHighest | Surface with border |
| Icon Type | Emoji | **Material/Custom SVG** |
| Height | ~44px | 40px |
| Padding | 18h, 8v | 16h, 8v |
| Radius | 14px | AppRadius.full (pill) |
| Shadow | On active | Remove (cleaner) |
