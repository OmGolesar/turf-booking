# Airbnb — UI/UX Analysis

> Source: Airbnb.com + Airbnb Mobile App
> Relevance to TurfX: **20%** (Secondary design influence — Search, Cards, Trust)
> Analyzed by: Antigravity
> Date: 2026-06-27

---

## Layout System

- **Structure**: Clean white canvas with modular card grid
- **Grid**: Responsive multi-column grid (1-4 columns based on viewport)
- **Density**: Medium — generous whitespace between sections
- **Hero Section**: Full-width search bar is the hero element
- **Content Flow**: Category bar → Card grid → Footer

### Key Takeaways for TurfX:
- Search bar should be the dominant UI element on Home
- Use generous whitespace between card sections
- Category filter should be horizontally scrollable with clear active states

---

## Typography

- **Primary Font**: Airbnb Cereal (proprietary) — TurfX equivalent: **Inter** ✓
- **Headline Treatment**: Semibold (600), modest sizing (22-28px)
- **Body Text**: Regular (400), 14-16px, generous line height
- **Philosophy**: Let photography speak — type is supportive, not dominant
- **Weight Strategy**: 500-600 for headings (not 700+), understated

### Type Scale:

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Page Title | 26-28px | 600 | Section headers |
| Card Title | 16-18px | 600 | Listing names |
| Body | 14-16px | 400 | Descriptions |
| Meta | 12-14px | 400 | Dates, prices |
| Caption | 12px | 400 | Reviews, badges |

### Key Insight:
Airbnb uses **lighter weights** than NRC. For TurfX, we should:
- Use Airbnb-weight (500-600) for card-level content
- Use NRC-weight (700-800) for hero/headline content
- This creates natural hierarchy between athletic energy and clean readability

---

## Search UX (Critical for TurfX)

### Airbnb's Search Pattern:
1. **Resting State**: Pill-shaped search bar with prompt text
2. **Expanded State**: Full-screen overlay with structured inputs
3. **Fields**: Where → When → Who (stepped disclosure)
4. **Results**: Instant filter with count update

### Recommendations for TurfX:
- **Search bar**: Pill-shaped, gradient accent on filter icon ✓ (already implemented)
- **Search flow**: Consider stepped disclosure (Sport → Location → Date)
- **Results count**: Show "X turfs found" below filter bar ✓ (already implemented)

---

## Card Design (Critical for TurfX)

### Airbnb Card Anatomy:
| Element | Spec | TurfX Status |
|---------|------|-------------|
| Corner Radius | 14px (rounded.lg) | 16px ✓ close |
| Image Ratio | 1:1 or 3:4 | Various — standardize |
| Image Carousel | Dot indicators, swipeable | PageView on detail ✓ |
| Favorite Heart | Top-right overlay | Not implemented |
| Price Display | Bold, bottom of card | Bottom of card ✓ |
| Rating | ★ 4.8 (inline with text) | Inline ✓ |
| Shadows | Subtle on light, none on dark | Good ✓ |

### Key Card Patterns:
1. **Image dominates**: At least 60% of card height
2. **Text is compact**: 2-3 lines max below image
3. **Badge overlay**: Category/distance on image
4. **Favorite action**: Heart icon, top-right of image

### TurfX Gaps:
- Add **favorite/bookmark** functionality on turf cards
- Standardize image aspect ratios across all cards
- Add swipeable image carousel on home cards (not just detail)

---

## Color Strategy

### Airbnb Palette:
| Token | Hex | Usage |
|-------|-----|-------|
| Rausch (Brand) | `#FF385C` | Primary CTA, search accent |
| Ink | `#222222` | Primary text |
| Body | `#3F3F3F` | Secondary text |
| Muted | `#6A6A6A` | Tertiary text |
| Canvas | `#FFFFFF` | Background |
| Light Surface | `#F7F7F7` | Card backgrounds |
| Border | `#DDDDDD` | Dividers |

### What TurfX Should Take (20%):
- Clean **white canvas for light mode** — `#F8F9FA` is close ✓
- Subtle grey (`#F7F7F7`) for card hover/active states
- Minimal color usage — let images provide color
- Single accent color for CTAs (TurfX green = equivalent of Rausch)

---

## Navigation

- **Desktop**: Top bar with search centered
- **Mobile**: Bottom tab bar + top search
- **Category Bar**: Horizontally scrollable icon + text pills
- **Active State**: Bold text + underline indicator

### TurfX Alignment:
- Category chips pattern ✓ (already implemented)
- Consider adding icon + text category pills like Airbnb
- Tab bar is simpler than Airbnb's — OK for MVP

---

## Trust Building Patterns (Unique to Airbnb)

### Elements:
1. **Review display**: Star + count + "Superhost" badge
2. **Amenity icons**: Semantic icons with labels
3. **Host badge**: Verified profile with checkmark
4. **Stats**: "500+ bookings" type social proof

### TurfX Application:
- Show **turf rating prominently** ✓
- Add **review count** next to rating
- Add **"Popular"** or **"Top Rated"** badges on cards
- Show **"X bookings today"** for social proof
- Amenity display ✓ (already implemented on detail)

---

## Filter System

### Airbnb Filter Pattern:
- **Top level**: Horizontal scrollable pills/chips
- **Chip Style**: Rounded-full (pill shape), icon + label
- **Active State**: Filled background, bold text
- **Advanced**: Bottom sheet with detailed filters

### TurfX Alignment:
- Category chips already implemented ✓
- Sport filter on listing already implemented ✓
- Consider adding **price range** and **rating** filters

---

## Motion Patterns

- **Card Hover**: Slight scale-up (1.02), shadow increase
- **Image Carousel**: Smooth horizontal swipe with dot transition
- **Search Expansion**: Animated height increase, backdrop blur
- **Skeleton Loading**: Grey pulse shimmer

---

## Reusable Learnings

### Components to Extract:
1. **Image Carousel Card**: Swipeable images with dot indicators
2. **Category Pill Bar**: Horizontal scroll, icon + label, active state
3. **Trust Badge**: Star rating + review count + optional badge
4. **Price Tag**: Bold price + per-unit label
5. **Search Bar**: Pill-shaped, icon prefix, filter button suffix
6. **Amenity Grid**: Icon + label chip in wrap layout
