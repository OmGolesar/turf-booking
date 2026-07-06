# User Flow — Discovery Flow Analysis

> Purpose: Document the turf discovery and browsing flow
> Sources: Airbnb, Playtomic, Nike
> Date: 2026-06-27

---

## Current TurfX Discovery Flow

```
Home Screen
├── Search bar (tap) → Turf Listing
├── Category chips (tap) → Turf Listing (filtered by sport)
├── Nearby Turfs (tap card) → Turf Detail
├── Popular Turfs (tap tile) → Turf Detail
└── See All links → Turf Listing
```

### Evaluation:
- **Good**: Multiple discovery paths (search, category, browse)
- **Good**: Both horizontal and vertical card layouts
- **Gap**: No location-based discovery (map view)
- **Gap**: No personalized recommendations
- **Gap**: No recent/trending section

---

## Recommended Discovery Enhancements

### 1. Home Screen Section Order (Updated)
```
1. Greeting Header + Notification Bell
2. Search Bar (prominent, pill-shaped)
3. Category Chips (horizontal scroll)
4. 🔥 Featured/Promoted Turf (single large card — new)
5. 📍 Nearby Turfs (horizontal card scroll)
6. ⭐ Top Rated (horizontal card scroll — new)
7. 🔥 Popular This Week (vertical list)
8. 🕐 Recently Viewed (horizontal — new, future)
```

### 2. Featured Turf Card (New Component)
A large, attention-grabbing card at the top of the feed.
- Full-width with 240px height
- Background image with dark gradient overlay
- Turf name, location, rating in white text
- "Book Now" CTA overlaid
- Inspiration: Airbnb's Superhost featured listings

### 3. Top Rated Section (New)
- Separate from "Popular" to show quality-first results
- Same horizontal card format as Nearby
- Sorted by rating descending
- Badge: "⭐ Top Rated" on cards

---

## Turf Listing Discovery

### Current:
- Sport filter chips
- Sort bottom sheet
- Full-width turf cards

### Recommended:
- Add **list/grid toggle** (list view vs 2-column grid)
- Add **map view** (future, requires Google Maps integration)
- Add **"Trending near you"** banner at top
- Filter count badge on filter icon
