# TurfX Design Tokens — Colors

> Source: Competitive analysis (70% Nike + 20% Airbnb + 10% Linear)
> Status: Proposed updates to existing `app_colors.dart`
> Date: 2026-06-27

---

## Current Palette (Keep)

| Token | Hex | Usage | Source |
|-------|-----|-------|--------|
| primary | `#00C853` | CTAs, active states, accents | TurfX brand |
| primaryDark | `#009624` | Pressed states | TurfX brand |
| primaryLight | `#5EFC82` | Highlights, light tint | TurfX brand |
| secondary | `#1A1A2E` | Deep navy | Nike-inspired |
| accent | `#00BFA5` | Teal secondary | TurfX brand |

## Proposed Additions

| Token | Hex | Usage | Inspiration |
|-------|-----|-------|-------------|
| backgroundDarkPure | `#111111` | True dark canvas | Nike NRC |
| surfaceDarkElevated | `#1C1C1E` | Elevated dark surfaces | iOS Dark Mode |
| badgeGold | `#FFD700` | Top Rated badge | Sports industry |
| badgeHot | `#FF6B35` | Popular/Trending badge | Sports industry |
| textOnDarkPrimary | `#FFFFFF` | Primary text on dark | Nike NRC |
| textOnDarkSecondary | `#9CA3AF` | Secondary text on dark | Linear |
| textOnDarkTertiary | `#6B7280` | Muted text on dark | Linear |

## Gradient Updates

### Primary Gradient (Reserved for Hero Only)
```
LinearGradient: #00C853 → #00BFA5
Direction: topLeft → bottomRight
Usage: ONLY welcome screen CTA, confirmation, special emphasis
```

### Dark Overlay Gradient (For Image Cards)
```
LinearGradient: transparent → 80% black
Direction: topCenter → bottomCenter
Usage: All card images with text overlay
```

---

## Color Usage Rules

1. **Primary CTA**: Solid `#00C853`, NOT gradient
2. **Gradient**: Reserved for hero/special elements ONLY
3. **Dark backgrounds**: Use `#0D1117` (current) or `#111111` (pure dark)
4. **Cards on dark**: Use `#161B22` (current surfaceDark)
5. **Text hierarchy on dark**: White → `#9CA3AF` → `#6B7280`
6. **Badges**: Gold for quality, Hot Orange for trending, Green for available
