# TurfX Design Tokens — Typography

> Source: Competitive analysis (Nike NRC, Airbnb, Linear)
> Status: Proposed updates to existing `app_typography.dart`
> Date: 2026-06-27

---

## Proposed Updated Type Scale

| Token | Current | Proposed | Weight | Letter-spacing | Rationale |
|-------|---------|----------|--------|---------------|-----------|
| displayLarge | 32px | **34px** | 700 | **-0.5** | More dramatic hero impact (Nike) |
| displayMedium | 28px | 28px ✓ | 700 | **-0.25** | Add negative letter-spacing |
| displaySmall | 24px | 24px ✓ | 600 | 0 | Good |
| headlineLarge | 22px | **24px** | 600 | 0 | Bigger jump from title |
| headlineMedium | 20px | 20px ✓ | 600 | 0 | Good |
| headlineSmall | 18px | 18px ✓ | 600 | 0 | Good |
| titleLarge | 16px | **18px** | 600 | 0 | Needs more prominence |
| titleMedium | 14px | **16px** | **500** | 0 | Slightly lighter weight |
| titleSmall | 12px | **14px** | **500** | 0 | Current 12px too small for titles |
| bodyLarge | 16px | 16px ✓ | 400 | 0 | Good |
| bodyMedium | 14px | 14px ✓ | 400 | 0 | Good |
| bodySmall | 12px | 12px ✓ | 400 | 0 | Good |
| labelLarge | 14px | 14px ✓ | 500 | 0.1 | Good |
| labelMedium | 12px | 12px ✓ | 500 | 0.5 | Good |
| labelSmall | 10px | 10px ✓ | 500 | 0.5 | Good |

## Key Changes:
1. **displayLarge**: 32→34px + negative letter-spacing (Nike boldness)
2. **headlineLarge**: 22→24px (bigger gap from titles)
3. **titleLarge**: 16→18px (card titles need more presence)
4. **titleMedium**: 14→16px, weight 600→500 (differentiate from titleLarge)
5. **titleSmall**: 12→14px, weight 600→500 (12px was too small)

## Font: Inter ✓
Aligns with Strava's choice and is equivalent to:
- Nike's Helvetica Now (geometric sans-serif)
- Airbnb's Cereal (clean, readable)
- Linear's custom sans-serif

## Rules:
1. Headlines (display/headline) should use **negative letter-spacing** (-0.25 to -0.5)
2. Body text should have **generous line height** (1.5)
3. Data numbers (prices, stats) should use **w700-w800** regardless of text style
4. Never use font sizes outside the defined scale
