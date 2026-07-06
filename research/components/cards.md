# Component Extraction — Cards

> Extracted from: Nike Run Club, Airbnb, Playtomic, Strava
> Purpose: Define reusable card patterns for TurfX
> Date: 2026-06-27

---

## 1. Turf Discovery Card (Home — Nearby)

**Inspiration**: 70% Nike (dark, bold) + 20% Airbnb (trust, image)

### Specs:
| Property | Value |
|----------|-------|
| Width | 200px (horizontal scroll) |
| Height | ~240px total |
| Corner Radius | 16px |
| Image Height | 140px (58% of card) |
| Image Treatment | Full-bleed, dark gradient bottom overlay |
| Shadow (Light) | `0 4px 12px rgba(0,0,0,0.08)` |
| Shadow (Dark) | `0 2px 8px rgba(0,0,0,0.3)` |
| Content Padding | 12px |
| Background | Surface color (white/dark surface) |

### Content Hierarchy:
1. **Image** (140px) — full-bleed, network image with fallback
2. **Distance Badge** — top-right overlay, dark pill (`8px radius, 65% black bg`)
3. **Turf Name** — bodyMedium, fontWeight 700, 1 line max
4. **Location** — bodySmall, 50% opacity, 1 line max
5. **Rating + Price Row** — star icon + rating left, ₹price/hr right (primary color, w800)

### Interaction:
- **Tap**: Scale down to 0.97, navigate to detail
- **Duration**: 150ms ease-out

---

## 2. Turf Listing Card (Full Width)

**Inspiration**: 60% Nike + 30% Airbnb + 10% Playtomic

### Specs:
| Property | Value |
|----------|-------|
| Width | Full width (- 32px padding) |
| Height | ~300px total |
| Corner Radius | 16px |
| Image Height | 180px (60% of card) |
| Image Treatment | Full-bleed, gradient price badge overlay |
| Content Padding | 14px |
| Background | Surface color |

### Content Hierarchy:
1. **Image** (180px) — full-bleed with gradient overlay
2. **Price Badge** — bottom-right of image, pill shape, white on primary
3. **Favorite Icon** — top-right heart (future feature)
4. **Turf Name + Rating** — row: name (titleSmall, w700) + star badge
5. **Location + Sport** — row: pin icon + text + sport pill badge
6. **CTA Button** — full-width "View & Book" button

---

## 3. Popular Turf Tile (Horizontal List Item)

**Inspiration**: 50% Strava activity card + 50% Airbnb listing

### Specs:
| Property | Value |
|----------|-------|
| Width | Full width (- 32px margin) |
| Height | 100px |
| Corner Radius | 16px |
| Thumbnail | 100×100px, left-aligned, rounded left corners |
| Shadow | `0 3px 10px rgba(0,0,0,0.06)` |
| Content Padding | 14px vertical, 14px right |

### Content Hierarchy:
1. **Thumbnail** (100×100) — left side, clipped to card corners
2. **Turf Name** — titleSmall, w700
3. **Location Row** — pin icon + text, 50% opacity
4. **Rating + Sport Row** — star + rating + sport pill badge
5. **Price** — right-aligned, primary color, large bold

---

## 4. Booking History Card (My Bookings)

**Inspiration**: 70% Strava (self-contained activity card)

### Specs:
| Property | Value |
|----------|-------|
| Width | Full width (- 32px margin) |
| Corner Radius | 16px |
| Content Padding | 16px |
| Background | Surface color |

### Content Hierarchy:
1. **Sport Icon** — gradient background, left-aligned
2. **Status Badge** — top-right (Confirmed: green, Completed: grey)
3. **Turf Name** — titleSmall, w700
4. **Location** — bodySmall, muted
5. **Date + Slot Chips** — icon + text chips
6. **Booking ID + Amount** — footer row

### Interaction:
- **Upcoming**: Cancel button (outlined, red, destructive)
- **Completed**: Rate & Review button (outlined, primary)

---

## Design Token Mapping

All cards should use these consistent tokens:

```dart
// Corner Radius
const cardRadius = AppRadius.lg;        // 16px

// Shadows
const cardShadowLight = BoxShadow(
  color: Color(0x14000000),              // 8% black
  blurRadius: 12,
  offset: Offset(0, 4),
);
const cardShadowDark = BoxShadow(
  color: Color(0x4D000000),              // 30% black
  blurRadius: 8,
  offset: Offset(0, 2),
);

// Content Padding
const cardPadding = EdgeInsets.all(AppSpacing.cardPadding);  // 16px

// Image Height
const nearbyImageHeight = 140.0;
const listingImageHeight = 180.0;
const thumbnailSize = 100.0;
```
