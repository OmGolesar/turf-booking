# Component Extraction — Buttons & CTAs

> Extracted from: Nike Run Club, Airbnb, Linear, Playtomic
> Purpose: Define CTA hierarchy for TurfX
> Date: 2026-06-27

---

## CTA Hierarchy

### Level 1: Primary CTA (Book, Pay, Continue)

**Inspiration**: Nike (bold, solid) + Linear (precise, clean)

| Property | Value |
|----------|-------|
| Height | 52px minimum |
| Corner Radius | 14px |
| Background | Solid `AppColors.primary` (#00C853) |
| Text Color | White |
| Font | Inter, 14px, w600, 0.5 letter-spacing |
| Padding | 24px horizontal, 14px vertical |
| Shadow | None (clean, flat) |
| Full Width | Yes (most contexts) |

**Active State**:
- Scale: 0.97
- Duration: 100ms

**Loading State**:
- White circular progress indicator (18px)
- Button disabled, opacity 0.7

**When to use gradient**:
- ONLY for hero sections (Welcome screen CTA)
- ONLY for special emphasis (Booking confirmation CTA)
- Regular CTAs should be **solid color**

---

### Level 2: Secondary CTA (View Details, See All)

| Property | Value |
|----------|-------|
| Height | 48px |
| Corner Radius | 14px |
| Background | Transparent |
| Border | 1.5px solid `AppColors.primary` |
| Text Color | `AppColors.primary` |
| Font | Inter, 14px, w600 |

---

### Level 3: Tertiary CTA (Cancel, Back, Skip)

| Property | Value |
|----------|-------|
| Height | 40px |
| Corner Radius | 8px |
| Background | Transparent |
| Border | None |
| Text Color | `AppColors.primary` |
| Font | Inter, 14px, w500 |

---

### Level 4: Destructive CTA (Cancel Booking)

| Property | Value |
|----------|-------|
| Height | 44px |
| Corner Radius | 12px |
| Background | Transparent |
| Border | 1.5px solid `AppColors.error` |
| Text Color | `AppColors.error` |
| Font | Inter, 14px, w600 |

---

### Level 5: Icon Button (Notification, Filter, Back)

| Property | Value |
|----------|-------|
| Size | 44×44px touch target |
| Corner Radius | AppRadius.full (circle) |
| Background | Primary at 12% opacity |
| Icon Size | 20px |
| Icon Color | `AppColors.primary` |

---

## Current TurfX Gaps

| Issue | Current | Recommended |
|-------|---------|-------------|
| Gradient overuse | Gradient on all CTAs | Solid color for most, gradient for hero only |
| Button height | Varies (implicit) | Standardize to 52px primary, 48px secondary |
| Touch target | Some buttons < 44px | Ensure all buttons ≥ 44px |
| Loading states | Implemented ✓ | Good |
| Scale feedback | Not implemented | Add 0.97 scale on press |
