# Strava — UI/UX Analysis

> Source: Strava App (Web + Mobile)
> Relevance to TurfX: **Reference for athletic data display & community features**
> Analyzed by: Antigravity
> Date: 2026-06-27

---

## Layout System

- **Structure**: Card-based social feed (activity cards) + tab navigation
- **Grid**: Single-column feed with full-width cards
- **Dashboard**: Modular stat blocks for personal performance
- **Navigation**: Bottom tab bar — Feed, Explore, Record, You

### Key Takeaways for TurfX:
- Use modular stat blocks on Profile screen (bookings, turfs played, hours)
- Card-based layout for booking history ✓ (already done)

---

## Typography

- **Font**: Inter (matching TurfX ✓)
- **Hierarchy**: Optimized for quick scanning of performance metrics
- **Data Emphasis**: Critical numbers (pace, distance) are bold + large
- **Strategy**: Clean readability with clear visual hierarchy

### TurfX Application:
- Use large, bold numbers for stats (prices, ratings, booking counts)
- Ensure quick scannability in listing cards

---

## Color Strategy

- **Dark Mode**: Full native support (mid-2024 rollout)
- **Brand**: Orange-red accent on white/dark canvas
- **Data Colors**: Green → Yellow → Red for performance visualization
- **Strategy**: Minimal color usage, focused on data communication

---

## Card Design (Activity Cards)

- **Anatomy**: Map thumbnail + stats summary + social actions
- **Modular**: Each card is self-contained with all context
- **Actions**: Kudos (like), Comment, Share
- **Spacing**: Clean dividers between cards

### TurfX Parallel:
- Booking cards should be self-contained with all booking context
- Add social-like actions (share booking, invite friend to play)

---

## Navigation

- **4 Tabs**: Feed, Explore, Record (prominent), You
- **Record Button**: Elevated center position, high-contrast
- **Active Indicator**: Filled icon + label, subtle

### TurfX Recommendation:
- Consider elevating the "Book" action similar to Strava's Record button
- 3-tab layout is fine for MVP, but add prominent booking CTA

---

## Iconography

- **Style**: "Beefy" cohesive icons (1,400+ redesigned assets)
- **Direction**: Away from thin lines → robust, energetic
- **Brand Alignment**: Icons reflect athletic, energetic personality

### TurfX Action:
- Review icon usage — ensure consistent weight/style
- Consider custom sport icons (not just emojis) for a more polished look

---

## Reusable Learnings

### Patterns to Adopt:
1. **Stats Display**: Large number + small label, modular blocks
2. **Activity Feed Cards**: Self-contained, social-ready
3. **Record/Book CTA**: Elevated, prominent, always accessible
4. **Data Visualization Colors**: Green for available, red for booked
5. **Icon Consistency**: Beefy, cohesive icon set
