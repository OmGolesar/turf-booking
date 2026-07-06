# Component Extraction — Search

> Extracted from: Airbnb, Playtomic
> Purpose: Define search UX patterns for TurfX
> Date: 2026-06-27

---

## Search Bar (Home Screen)

### Current TurfX:
- Fake search input (tappable container)
- Routes to listing screen on tap
- Search icon + placeholder text + filter icon

### Recommended Enhancement:

| Property | Value |
|----------|-------|
| Shape | Pill (AppRadius.full) |
| Height | 52px |
| Background | surfaceContainerHighest |
| Border | 1px subtle divider when unfocused |
| Padding | 16px horizontal |
| Icon Left | Search icon, primary color, 20px |
| Placeholder | "Search turfs, sports, location..." |
| Icon Right | Filter icon in accent container |
| Tap Behavior | Navigate to search/listing screen |

### Airbnb Influence:
- Pill-shaped search bar is THE hero element
- Expandable on focus (full-screen search overlay)
- Three-step disclosure: Where → When → Sport

### Future Enhancement:
- Add real search with auto-suggest
- Add recent searches display
- Add popular searches/turfs
- Animated expansion on tap

---

## Filter System (Listing Screen)

### Current TurfX:
- Sport filter chips (horizontal scroll)
- Sort bottom sheet (Rating, Price ↑, Price ↓)
- Results count

### Recommended Additions:
1. **Price Range Filter**: Slider or preset chips (Under ₹500, ₹500-1000, etc.)
2. **Distance Filter**: Near me, 2km, 5km, 10km
3. **Rating Filter**: 4+ stars, 3+ stars
4. **Amenity Filter**: Parking, Changing Room, etc.
5. **Active Filter Count**: Badge on filter icon showing count
