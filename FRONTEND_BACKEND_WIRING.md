# TurfX — Frontend ↔ Backend Wiring Reference

**Last updated:** 2026-07-08
**Branch:** `feat/figma-design-integration`
**Scope of this document:** Everything that changed when we wired the Figma-designed dark-mode UI to the Firebase backend (Firestore + Auth), plus the architectural knowledge needed to make future decisions without re-deriving it.

This is *not* an onboarding readme — it's a reference for the person building the next feature.

---

## 1. High-level state of the app

- **Frontend:** Flutter (Material 3, dark theme only). All 9 primary screens rebuilt from Figma. Design tokens live in `lib/core/theme/`.
- **State management:** Riverpod (`flutter_riverpod`). One `FutureProvider` / `StreamProvider` per read query, one `StateNotifierProvider` for the booking flow's mutable state.
- **Routing:** GoRouter, single instance behind `appRouterProvider`. See `lib/core/router/app_router.dart` and `route_names.dart`.
- **Backend:** Firebase — Auth (phone OTP), Firestore (turfs, slots, bookings, users), no Cloud Functions yet.
- **Currency:** INR (₹). Formatter at `lib/core/utils/formatters.dart::Formatters.price(double)`. **Never hardcode `$` or `₹` in screens** — always call `Formatters.price(...)`.
- **Timezone / date format:** Everything on the wire is ISO `YYYY-MM-DD` + 24h `HH:mm`. UI converts to `"6:00 PM"` at display time via a local `_fmt12h` helper (duplicated in three screens — see §8 for cleanup notes).

---

## 2. Firestore data model (source of truth)

Written by `lib/seed_nashik_turfs.dart::seedNashikTurfsAndSlots()`. Every field the UI reads must exist in this seed — if you add a field, add it here too.

### `turfs/{turfId}` document

| Field | Type | Notes |
|---|---|---|
| `id` | string | Same as doc ID |
| `name` | string | |
| `description` | string | Multi-paragraph, shown on detail |
| `location` | string | Short area name, e.g. "Gangapur Road, Nashik" |
| `address` | string | Full postal address |
| `city` | string | **Used as a filter** — must be exact match (`"Nashik"`) |
| `latitude` / `longitude` | double | Reserved for map view (not used yet) |
| `images` | `List<String>` | First image = hero. Provide ≥1. |
| `rating` | double | Sorted client-side |
| `reviewCount` | int | |
| `pricePerHour` | double | INR. Default price used in the "starting from" ribbon |
| `priceWeekday` / `priceWeekend` | double | Reserved — not yet consumed by UI |
| `sports` | `List<String>` | Used with `arrayContains` filter on listing |
| `amenities` | `List<String>` | UI infers icon from label (`turf_detail_screen.dart::_amenityIcon`) |
| `ownerUid` / `ownerName` / `ownerPhone` | string | Owner metadata |
| `openTime` / `closeTime` | `"HH:mm"` | Slot generation range |
| `slotDurationMinutes` | int (60) | Only 60 is currently supported downstream |
| `numberOfGrounds` | int | Slot doc IDs suffix `_G1`, `_G2`, … |
| `sportPricing` | `Map<String, double>?` | Reserved — not consumed |
| `isVerified` | bool | Drives the "VERIFIED" chip on detail hero |
| `isActive` | bool | **All queries filter `isActive == true`** |
| `isPopular` | bool | Reserved — current "Popular This Week" sorts by rating, not this flag |
| `contactPhone` | string | |
| `distance` | double (km) | Currently hardcoded in seed. Should be computed from geo at read time — see §8. |

### `turfs/{turfId}/slots/{slotId}` subcollection

Slot doc ID format: `YYYY-MM-DD_HH:MM_G{n}` (e.g. `2026-07-08_18:00_G1`).

| Field | Type | Notes |
|---|---|---|
| `date` | `"YYYY-MM-DD"` | Query filter |
| `startTime` / `endTime` | `"HH:mm"` | 24h |
| `sport` | string | Copied from turf's first sport |
| `groundNumber` | int | 1..N |
| `price` | double | Snapshotted from turf's `pricePerHour` at seed time |
| `status` | `"available" \| "booked" \| "blocked"` | Only `"available"` is bookable |
| `bookingId` | string? | Set when status flips to `"booked"` |

Seed writes **30 days × (closeHour − openHour) × numberOfGrounds** slots per turf. For a Nashik dataset that's several thousand slot docs — mind Firestore write cost when re-seeding.

### `bookings/{bookingId}` document

Booking ID format: `BKG-XXXXXXXX` (UUID prefix, uppercase). Written atomically inside a transaction (see §5). Full schema: `lib/features/booking/domain/entities/booking.dart::Booking.toFirestore()`.

### `users/{userUid}` document

Managed by `lib/features/auth/`. Not touched in this pass.

---

## 3. Firestore query patterns — DO NOT re-introduce composite indexes

The **entire reason** we hit "Could not load turfs" bugs in the first pass: Firestore requires a **composite index** whenever you combine a `where` filter with an `orderBy` on a different field, *or* combine two range/inequality filters. Rather than curate index config for every screen, we chose a simple rule:

> **Filter server-side, sort client-side.**

Applied consistently in:
- `lib/features/home/data/datasources/home_remote_datasource.dart::getPopularTurfs` — client sorts by `rating` desc, takes top 6.
- `lib/features/turf_listing/data/datasources/turf_listing_remote_datasource.dart::getTurfs` — client sorts by rating or price.
- `lib/features/turf_detail/data/datasources/turf_detail_remote_datasource.dart::getSlotsStream` — client sorts by `startTime`.

**When to break this rule:** only if a query returns >100 docs *and* pagination matters. At that point, add the required composite index in `firestore.indexes.json` (currently absent — create it when needed) AND add server `orderBy`. Until then, keep client sort — it's cheaper, faster to iterate on, and avoids "why does prod work but staging doesn't" index drift.

Every read query in the app right now returns ≤50 docs. Client sort is fine.

---

## 4. Feature module layout (Clean Architecture)

Each feature under `lib/features/<name>/` follows:

```
<feature>/
  data/
    datasources/   ← Firestore reads/writes (impl of the abstract interface)
    models/        ← Firestore DTO extending the domain entity
    repositories/  ← (present but thin — most features skip this layer)
  domain/
    entities/      ← Plain Dart, no Firebase types
    repositories/  ← Abstract interfaces (used for DI + testability)
    usecases/      ← (present but thin — most screens hit datasource directly via provider)
  presentation/
    providers/     ← Riverpod providers wiring datasource → UI
    screens/       ← ConsumerWidget / ConsumerStatefulWidget
    widgets/       ← Screen-local building blocks
```

**Reality check:** `repositories/` and `usecases/` layers exist for `turf_listing`, `profile`, `my_bookings`, but the Figma-rebuilt screens **bypass them** and go `provider → datasource` directly. This is fine for read-only providers. If you introduce complex orchestration (e.g. offline caching, retry policies), reactivate the repository layer for that feature — don't do a big-bang migration.

**Common shared code:** `lib/core/` (theme, router, formatters, widgets), `lib/shared/` (generic result types, pagination). Prefer `core/` for anything the whole app uses.

---

## 5. The booking flow — end-to-end

This is the highest-risk path in the app because it mutates Firestore and involves money. Understand it before changing anything.

### 5a. Sequence

1. **Home / Turf Listing** — user picks a turf → `context.push('/turfs/:id')`.
2. **Turf Detail** — user taps "Select Date & Slot" → `context.push('/booking/slots?turfId=X&date=')`.
3. **Slot Selection** — on open, notifier stores `turfId` + `date` (today by default). Streams live slots via `turfSlotsStreamProvider((turfId, date))`. Tapping a slot toggles it into `bookingNotifier.state.selectedSlotIds`. → `context.push('/booking/summary')`.
4. **Booking Summary** — reads `bookingNotifier` state (turfId, date, selectedSlotIds), fetches turf details + slot prices via already-cached providers, computes `turfCharge + platformFee(20) + gst(18%)`. Shows receipt. → `context.push('/booking/payment')`.
5. **Payment** — same cost breakdown. On "Pay ₹X" tap, calls `bookingNotifier.createBooking(...)` which runs a Firestore transaction:
   - Read all selected slot docs.
   - Verify each is still `status == "available"` (fails loudly if not).
   - Write `bookings/{BKG-...}` doc.
   - Flip each slot's `status` to `"booked"` + set `bookingId`.
   - All-or-nothing. Concurrent bookers of the same slot: only one wins.
6. **Confirmation** — reads `bookingNotifier.state.latestBooking` and renders. No further Firestore reads.

### 5b. The `bookingNotifier` — shared state across 4 screens

Defined in `lib/features/booking/presentation/providers/booking_provider.dart`. State fields:

- `turfId` — set in `SlotSelectionScreen.initState` via `setTurf()`.
- `selectedDate` — ISO date string, updated on date-picker tap.
- `selectedSlotIds: Set<String>` — Firestore slot doc IDs, toggled via `toggleSlot()`.
- `selectedSport` — copied from the tapped slot's `sport` field (used later by `createBooking`).
- `selectedPaymentMethod` — from Payment screen.
- `latestBooking: Booking?` — populated after `createBooking()` succeeds.
- `isLoading`, `errorMessage` — for the pay button spinner + snackbar.

**Rule:** *All* booking-flow screens are `Consumer*Widget` and read state through this notifier. Do **not** re-plumb turfId/date via GoRouter query params between summary/payment/confirmation — the notifier owns it. (It's plumbed via query param only into `/booking/slots` because that's the entry.)

### 5c. Pricing formula — must stay in sync in three places

```
turfCharge = sum(selectedSlot.price)   // slot-level prices from Firestore
platformFee = 20.0                     // constant
gst = (turfCharge + platformFee) * 0.18
total = turfCharge + platformFee + gst
```

Duplicated in:
- `booking_summary_screen.dart::_buildReceiptCard` (display)
- `payment_screen.dart::build` (display + pay button)
- `booking_remote_datasource.dart::createBooking` (server-side calc that gets persisted)

**If you change the formula, change all three.** Better fix (see §8): pull it into a shared helper.

---

## 6. Navigation — how the back button actually works

GoRouter has two navigation verbs. They behave very differently:

- **`context.go(path)`** — *replaces* the current route entry. `context.canPop()` returns `false` afterward. Use only for top-level "reset navigation" flows: bottom-nav tab switches, "Back to Discover" after confirmation, redirect-to-home on error.
- **`context.push(path)`** — *pushes* onto the stack. `canPop()` is `true`. Use for **every forward navigation** into a detail/booking screen so users can back out.

Every back button uses the same guard so it can't dead-end:

```dart
onPressed: () => context.canPop()
    ? context.pop()
    : context.go(RouteNames.home),
```

Reference implementation: `slot_selection_screen.dart`, `turf_detail_screen.dart`, and the three booking screens all use this pattern. If you add a new screen, copy it.

**Why this matters going forward:** deep links (share a booking, notification tap) land users mid-flow with an empty history. Without the fallback, they hit a dead screen with a broken back arrow.

---

## 7. Provider inventory — what reads what

| Provider | File | Type | Cache | Notes |
|---|---|---|---|---|
| `homeRemoteDataSourceProvider` | `home/presentation/providers/home_provider.dart` | Provider | forever | Singleton datasource |
| `nearbyTurfsProvider` | ↑ | FutureProvider.autoDispose | per-widget lifetime | Filter: `isActive=true`, `city="Nashik"`, limit 10 |
| `popularTurfsProvider` | ↑ | FutureProvider.autoDispose | ↑ | Same query + client sort by rating, take 6 |
| `selectedSportFilterProvider` | `turf_listing/presentation/providers/turf_listing_provider.dart` | StateProvider | forever | Drives the listing query |
| `selectedSortProvider` | ↑ | StateProvider | forever | `'rating'` \| `'priceAsc'` \| `'priceDesc'` |
| `turfListingProvider` | ↑ | FutureProvider.autoDispose | per-widget | Reactive to the two above |
| `turfDetailProvider(turfId)` | `turf_detail/presentation/providers/turf_detail_provider.dart` | FutureProvider.autoDispose.family | per-turfId | Keyed by turfId string |
| `turfSlotsStreamProvider({turfId, date})` | ↑ | StreamProvider.autoDispose.family | per (turfId, date) | **Real-time** — flips instantly if another user books |
| `bookingRemoteDataSourceProvider` | `booking/presentation/providers/booking_provider.dart` | Provider | forever | |
| `bookingNotifierProvider` | ↑ | StateNotifierProvider | forever (survives navigation) | Owns booking-flow state |
| `upcomingBookingsProvider` | ↑ | FutureProvider.autoDispose | | Filtered by userId + `date >= today` |
| `completedBookingsProvider` | ↑ | FutureProvider.autoDispose | | `date < today`, limit 30 |
| `authStateProvider` | `auth/presentation/providers/auth_provider.dart` | (unchanged this pass) | | Router redirect uses `.value != null` |

**When to invalidate:** pull-to-refresh on home calls `ref.invalidate(nearbyTurfsProvider)` + `popularTurfsProvider`. After a booking succeeds, invalidate `upcomingBookingsProvider` (currently missing — see §8).

**`autoDispose` gotcha:** the moment no widget listens, the value is thrown away. That's usually what we want, but if you add caching (e.g. keep turf detail warm across navigations), drop `autoDispose` or use `keepAlive`.

---

## 8. Known gaps + tech-debt worth naming

Not-yet-broken-but-brittle. Fix these before they cost real time:

1. **Cost formula duplication** — see §5c. Extract to `lib/features/booking/domain/pricing.dart` with `BookingPricing.compute(charge, fee, gstRate)` returning a record.
2. **`_fmt12h` / `_prettyDate` duplicated** in slot_selection, booking_summary, booking_confirmation, payment. Move to `Formatters` or a `TimeFormatters` extension.
3. **Payment is fake.** `bookingNotifier.createBooking` writes the booking + flips slot status directly. Razorpay is only visual. Before charging real money, add: (a) payment intent creation, (b) webhook confirmation, (c) `paymentStatus == "paid"` gate on booking finalization. Currently `paymentStatus` is unconditionally `"paid"` for `bookingSource == app` — a fraud vector.
4. **No `ref.invalidate(upcomingBookingsProvider)` after `createBooking`.** User completes a booking, navigates to My Bookings, doesn't see it until the tab is re-created. One line to fix.
5. **`distance` is a hardcoded seed field.** Should be computed from user geolocation vs. turf `latitude/longitude`. For now the UI displays whatever the seed said — misleading if user isn't in Nashik.
6. **`city` hardcoded to `"Nashik"`** in both home datasource queries. First city expansion requires plumbing user's city into the provider — introduce a `userCityProvider` at that point.
7. **Slot dedup by hour is lossy.** `slot_selection_screen.dart::_buildSlotSections` picks one slot per hour across grounds, favoring available over booked. Fine for single-ground turfs. For multi-ground turfs (SportZone has 3), users can't pick a specific ground. Design a "which ground?" step when multi-ground demand is real.
8. **Two `SlotStatus` enums** — one in `turf_detail/domain/entities/turf_detail.dart`, one in `time_slot.dart`. Identical. Delete one, import the other. Currently avoided by never referencing the name directly in screens.
9. **`FutureBuilder`-style empty/error strings are copy-pasted** ("Could not load turfs.") across four screens. If we add i18n or improve error UX, this becomes a real chore. Consider a shared `AsyncValueView` widget.
10. **Router redirect is user-only.** Admin flow (`/admin`) works but there's no "already-a-turf-owner → owner dashboard" branch. Wire in when partner onboarding starts.
11. **Test coverage.** `test/` exists but the Figma-rebuilt screens have no widget tests. Given how much cross-provider state the booking flow touches, at least one golden-path integration test (`slot select → summary → payment → confirmation`) is worth writing before adding features.

---

## 9. File-by-file — what changed in the wire-up pass

For code archaeology later:

### New/edited data flow
- `lib/features/home/data/datasources/home_remote_datasource.dart` — client sort added to `getPopularTurfs`.
- `lib/features/turf_listing/data/datasources/turf_listing_remote_datasource.dart` — all `orderBy` moved client-side.
- `lib/features/turf_detail/data/datasources/turf_detail_remote_datasource.dart` — same for slots stream.
- `lib/features/booking/presentation/providers/booking_provider.dart` — added `turfId` field + `setTurf()`.

### Screens rewritten from mock to live
- `lib/features/home/presentation/screens/home_screen.dart` — `ConsumerStatefulWidget`, reads `nearbyTurfsProvider` + `popularTurfsProvider`.
- `lib/features/turf_listing/presentation/screens/turf_listing_screen.dart` — reads `turfListingProvider`, writes to `selectedSportFilterProvider`.
- `lib/features/turf_detail/presentation/screens/turf_detail_screen.dart` — reads `turfDetailProvider(turfId)`, amenity icons inferred from label.
- `lib/features/booking/presentation/screens/slot_selection_screen.dart` — real 7-day date window from `DateTime.now()`, live slot stream, mutates `bookingNotifier`.
- `lib/features/booking/presentation/screens/booking_summary_screen.dart` — computes cost from live slot prices.
- `lib/features/booking/presentation/screens/payment_screen.dart` — total from booking state, calls `createBooking(...)` on pay.
- `lib/features/booking/presentation/screens/booking_confirmation_screen.dart` — renders `latestBooking`.

### Navigation
- All forward navigation in the booking flow switched from `context.go` → `context.push`.
- All back buttons wrapped in `canPop() ? pop() : go(home)` fallback.

### Cosmetic
- `lib/core/theme/app_typography.dart:197` — doc comment `"$45"` → `"₹1,200"`.

---

## 10. If you're adding a new feature — checklist

Copy this into your PR description and tick as you go.

- [ ] New Firestore fields: added to seed script? Backfill written if data already exists?
- [ ] New query: filters only server-side; sort client-side (see §3). If pagination is required, budget for a composite index.
- [ ] New screen: `ConsumerStatefulWidget` if it has local UI state, `ConsumerWidget` otherwise.
- [ ] Navigation: forward = `push`, back = `canPop ? pop : go(home)`.
- [ ] Prices: `Formatters.price(double)`. No `$`, no manual `₹`.
- [ ] Times: 24h `HH:mm` on the wire, use existing `_fmt12h` for display (or extract it — see §8.2).
- [ ] After any write, `ref.invalidate(...)` any list provider that should now change.
- [ ] Empty / loading / error states — three separate `when` branches, not just `data`.
- [ ] If touching booking cost math: update all three places (§5c) OR extract to a shared helper first.
- [ ] `flutter analyze` clean (info-level lints from pre-existing code are acceptable, new errors/warnings are not).

---

**Owner of this doc:** whoever last shipped a feature that changed the wiring. Keep it current — a stale wiring doc is worse than none.
