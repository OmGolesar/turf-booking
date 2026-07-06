# User Flow — Booking Flow Analysis

> Purpose: Document the optimal booking flow based on competitive research
> Sources: Playtomic, Airbnb, Nike (checkout patterns)
> Date: 2026-06-27

---

## Current TurfX Flow

```
Home → Turf Card → Turf Detail → Date Selection → Slot Selection → Booking Summary → Payment → Confirmation
```

**Steps**: 7 screens from discovery to confirmation

---

## Competitive Comparison

| App | Steps | Pattern |
|-----|-------|---------|
| Playtomic | 3-4 | Inline date/slot on same page |
| Airbnb | 3-4 | Detail → Dates → Confirm → Pay |
| Nike (shopping) | 4 | Product → Cart → Checkout → Confirm |
| **TurfX** | **7** | **Date → Slot → Summary → Pay → Confirm** |

### Analysis:
TurfX has **more steps** than competitors. While each step is simple, the flow could be streamlined.

---

## Recommended Flow Optimization

### Option A: Combine Date + Slot (Recommended)
```
Home → Detail → Date + Slot Selection (single screen) → Summary → Payment → Confirmation
```
**Reduces**: 7 → 5 screens

- **Date selection**: Inline horizontal date scrollbar (like Playtomic)
- **Slot selection**: Grid below date selector
- This is the most common sports booking pattern

### Option B: Keep Separate (Current, Simpler to Maintain)
```
Home → Detail → Date → Slots → Summary → Payment → Confirmation
```
**Keep if**: User testing shows no drop-off at date selection step

---

## Date Selection Enhancement

### Current:
- Full `CalendarDatePicker` widget
- Separate screen

### Recommended (from Playtomic):
- **Inline horizontal date scrollbar** at top of slot selection
- Shows next 7-14 days as tappable date chips
- Format: `Mon\n24` (day name above date number)
- Active date: Primary color background + white text
- Quick date switching without navigation

```
┌─────────────────────────────────────────┐
│  ← Thu  Fri  Sat  Sun  Mon  Tue  Wed → │
│        26   27   [28]  29   30   1      │
└─────────────────────────────────────────┘
```

---

## Slot Selection Enhancement

### Current:
- 4-column grid of time chips
- Available (green tint), Booked (grey), Selected (solid green)
- Price total at bottom

### Recommended Additions:
1. **Per-slot price**: Show "₹800" on each chip
2. **Popularity indicator**: "🔥" or orange dot on popular slots
3. **Multi-select summary**: Show selected slot count and total inline
4. **Quick deselect**: Tap selected to deselect

### Enhanced Chip Spec:
```
┌─────────┐
│ 6:00 PM │  ← Time text (primary font)
│  ₹800   │  ← Price (caption, muted)
└─────────┘
```

---

## Payment Flow Enhancement

### Current:
- 4 payment method cards (UPI, Card, NetBanking, Pay at Venue)
- Selected state with green border
- Simulated 2s payment

### Recommended:
- Keep current structure (good)
- Add **payment method icons** (UPI logo, Visa/MC icons) instead of generic 💳
- Add **secure checkout badge** (🔒 "Secured by Razorpay" type)
- Add **terms agreement checkbox** before pay

---

## Confirmation Enhancement

### Current:
- Success icon + receipt card + navigation buttons

### Recommended:
- Add **Lottie animation** (confetti/celebration) ← Already planned ✓
- Add **"Share with friends"** CTA
- Add **"Add to Calendar"** CTA
- Show **booking QR code** (future — for venue check-in)
