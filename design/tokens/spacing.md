# TurfX Design Tokens — Spacing

> Source: Competitive analysis
> Status: Current values are GOOD — minor additions proposed
> Date: 2026-06-27

---

## Current Scale (Keep)

| Token | Value | Usage |
|-------|-------|-------|
| xxs | 2px | Micro spacing |
| xs | 4px | Inner spacing |
| sm | 8px | Compact spacing |
| md | 12px | Default gap |
| lg | 16px | Section padding |
| xl | 20px | Major gaps |
| xxl | 24px | Large sections |
| xxxl | 32px | Page sections |
| xxxxl | 40px | Major sections |
| section | 48px | Section dividers |
| pagePadding | 64px | Full-page margin |
| pageHorizontal | 16px | Side padding |
| pageVertical | 24px | Top/bottom padding |
| cardPadding | 16px | Card internal |
| listGap | 12px | Between list items |

## Proposed Additions

| Token | Value | Usage |
|-------|-------|-------|
| buttonHeightPrimary | 52px | Primary CTA height |
| buttonHeightSecondary | 48px | Secondary CTA height |
| buttonHeightTertiary | 40px | Tertiary CTA height |
| touchTarget | 44px | Minimum touch target |
| chipHeight | 40px | Category/filter chips |
| sectionHeaderGap | 20px | Between header and content |
| cardGap | 14px | Between cards in scroll |

---

# TurfX Design Tokens — Radius

> Status: Current values are GOOD — no changes needed
> Date: 2026-06-27

## Current Scale (Keep)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tags, tiny elements |
| sm | 8px | Buttons, inputs |
| md | 12px | Cards |
| lg | 16px | Bottom sheets, modals |
| xl | 20px | Featured cards |
| xxl | 24px | Image containers |
| full | 999px | Avatars, pills, chips |

## Validation Against References:
- **Nike NRC**: 12-16px card radius → our `md`/`lg` ✓
- **Airbnb**: 14px card radius → between our `md`/`lg` ✓
- **Linear**: Subtle, consistent → our system aligns ✓
- **Playtomic**: Standard → compatible ✓

No changes needed — current radius scale is well-designed.

---

# TurfX Design Tokens — Shadows

> Status: Proposed shadow system
> Date: 2026-06-27

## Shadow Levels

### Level 1 — Subtle (Cards at rest)
```dart
BoxShadow(
  color: Color(0x0A000000),  // 4% black
  blurRadius: 8,
  offset: Offset(0, 2),
)
```

### Level 2 — Default (Cards, elevated surfaces)
```dart
BoxShadow(
  color: Color(0x14000000),  // 8% black
  blurRadius: 12,
  offset: Offset(0, 4),
)
```

### Level 3 — Prominent (Modals, bottom sheets)
```dart
BoxShadow(
  color: Color(0x1F000000),  // 12% black
  blurRadius: 24,
  offset: Offset(0, 8),
)
```

### Level 4 — Glow (Active/selected elements)
```dart
BoxShadow(
  color: AppColors.primary.withOpacity(0.3),
  blurRadius: 16,
  offset: Offset(0, 4),
)
```

### Dark Mode Shadows:
In dark mode, reduce shadow opacity by 50% or rely on surface color differentiation instead of shadows. Nike NRC uses almost no shadows — just color contrast between surfaces.
