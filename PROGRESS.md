# TurfX — Development Progress & Documentation

> **Project:** TurfX — Premium Turf Booking Application  
> **Repository:** https://github.com/OmGolesar/turf-booking  
> **Tech Stack:** Flutter · Riverpod · GoRouter · Dio · Material 3  
> **Last Updated:** June 12, 2026  
> **Status:** 🟢 MVP In Progress — All Screens Implemented

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Folder Structure](#3-folder-structure)
4. [Implementation Phases](#4-implementation-phases)
   - [Phase 1: Project Scaffold](#phase-1-project-scaffold)
   - [Phase 2: Dependencies & Wiring](#phase-2-dependencies--wiring)
   - [Phase 3: Design System](#phase-3-design-system)
   - [Phase 4: Screen Implementation](#phase-4-screen-implementation)
   - [Phase 5: UI Fixes & Polish](#phase-5-ui-fixes--polish)
5. [Screen Inventory](#5-screen-inventory)
6. [Design System Reference](#6-design-system-reference)
7. [Navigation Map](#7-navigation-map)
8. [Dependencies](#8-dependencies)
9. [Git History](#9-git-history)
10. [How to Run](#10-how-to-run)
11. [Known Issues & Next Steps](#11-known-issues--next-steps)

---

## 1. Project Overview

**TurfX** is a production-grade MVP turf booking application built with Flutter. It allows users to:

- Discover nearby and popular sports turfs
- Filter by sport category, sort by rating/price
- View detailed turf information (images, amenities, available slots)
- Complete a full booking flow: select date → select slot → review → pay → confirm
- Manage their bookings (upcoming & completed)
- Manage their profile and app settings

The app is designed mobile-first, targets **low-end Android devices**, and is built to maintain **60 FPS performance** through:
- `const` constructors wherever possible
- `RepaintBoundary` for isolated paint zones
- `CachedNetworkImage` for efficient image loading
- Mock data so the app is 100% functional without a backend

---

## 2. Tech Stack & Architecture

### Technology Choices

| Concern | Technology | Reason |
|---|---|---|
| UI Framework | Flutter (latest stable) | Cross-platform, 60fps, rich widget library |
| State Management | Riverpod (flutter_riverpod 2.x) | Compile-safe, testable, zero context needed |
| Navigation | GoRouter 14.x | Declarative, URL-based, deep-link ready |
| Networking | Dio 5.x | Interceptors, error handling, type-safe |
| Theming | Material 3 (M3) | Modern adaptive design language |
| Fonts | Google Fonts (Inter) | Clean, readable, professional |
| Images | cached_network_image | Memory-efficient network image loading |
| Local Storage | shared_preferences + flutter_secure_storage | Preferences + sensitive data (tokens) |
| Animations | flutter_animate | Declarative, chainable micro-animations |
| Code Gen | freezed + json_serializable + riverpod_generator | Type-safe models and providers |

### Architecture

The project uses a **Feature-First Clean Architecture** hybrid:

```
Presentation Layer  (Screens, Widgets, Providers)
       ↕
  Domain Layer      (Entities, Use Cases, Repository Interfaces)
       ↕
   Data Layer       (Repository Implementations, Data Sources, DTOs)
```

- **Presentation** → Riverpod `ConsumerWidget` screens, `StateNotifier` view models
- **Domain** → Pure Dart entities, abstract repository contracts, use case classes
- **Data** → Dio-based API clients, local caching, DTO ↔ Entity mapping

---

## 3. Folder Structure

```
d:/turf-booking app/
├── android/                        # Android platform files
├── ios/                            # iOS platform files
├── linux/                          # Linux desktop platform files
├── macos/                          # macOS desktop platform files
├── web/                            # Flutter Web build files
├── windows/                        # Windows desktop platform files
├── assets/
│   ├── images/
│   │   ├── onboarding/
│   │   └── placeholders/
│   ├── icons/
│   │   └── sports/
│   └── animations/                 # Lottie JSON files
├── test/
│   └── widget_test.dart
├── lib/
│   ├── main.dart                   # App entry point
│   ├── app.dart                    # MaterialApp.router root widget
│   │
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart  # All API URL constants
│   │   │   └── app_constants.dart  # Global app constants
│   │   ├── errors/
│   │   │   ├── exceptions.dart     # App-level exceptions
│   │   │   └── failures.dart       # Domain failure types (dartz)
│   │   ├── router/
│   │   │   ├── app_router.dart     # Full GoRouter tree with ShellRoute
│   │   │   └── route_names.dart    # Named path constants
│   │   ├── theme/
│   │   │   ├── app_colors.dart     # Brand palette, gradients, semantic colors
│   │   │   ├── app_radius.dart     # Border radius tokens
│   │   │   ├── app_spacing.dart    # Spacing scale tokens
│   │   │   ├── app_theme.dart      # Full M3 ThemeData (light + dark)
│   │   │   └── app_typography.dart # Type scale definitions
│   │   ├── utils/
│   │   │   └── (utility helpers)
│   │   └── widgets/
│   │       ├── buttons/            # Gradient button components
│   │       ├── inputs/             # Styled text fields
│   │       ├── loading/            # Shimmer skeleton loaders
│   │       └── shell/
│   │           └── main_shell.dart # Bottom NavigationBar shell (3 tabs)
│   │
│   └── features/
│       ├── auth/
│       │   ├── data/
│       │   │   ├── datasources/
│       │   │   ├── models/
│       │   │   └── repositories/
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   ├── repositories/
│       │   │   └── usecases/
│       │   └── presentation/
│       │       ├── providers/
│       │       └── screens/
│       │           ├── welcome_screen.dart
│       │           ├── login_screen.dart
│       │           ├── signup_screen.dart
│       │           └── otp_screen.dart
│       │
│       ├── home/
│       │   └── presentation/screens/
│       │       └── home_screen.dart
│       │
│       ├── turf_listing/
│       │   └── presentation/screens/
│       │       └── turf_listing_screen.dart
│       │
│       ├── turf_detail/
│       │   └── presentation/screens/
│       │       └── turf_detail_screen.dart
│       │
│       ├── booking/
│       │   └── presentation/screens/
│       │       ├── date_selection_screen.dart
│       │       ├── slot_selection_screen.dart
│       │       ├── booking_summary_screen.dart
│       │       ├── payment_screen.dart
│       │       └── booking_confirmation_screen.dart
│       │
│       ├── my_bookings/
│       │   └── presentation/screens/
│       │       └── my_bookings_screen.dart
│       │
│       └── profile/
│           └── presentation/screens/
│               ├── profile_screen.dart
│               └── settings_screen.dart
│
├── pubspec.yaml                    # All dependencies
├── pubspec.lock                    # Locked dependency versions
├── analysis_options.yaml           # Lint rules
├── .gitignore                      # Git exclusions
└── README.md                       # Project readme
```

---

## 4. Implementation Phases

---

### Phase 1: Project Scaffold

**Status:** ✅ Complete  
**Commit:** `feat: initial TurfX project scaffold with clean architecture structure`

#### What was done:
- Created the full feature-first folder hierarchy (150+ directories and placeholder Dart files)
- Established naming conventions for all layers (data, domain, presentation)
- Set up `assets/` directory with subdirectories for images, icons, and animations
- Created `.gitignore` tailored for Flutter projects
- Initialized Git repository and pushed to `https://github.com/OmGolesar/turf-booking`

#### Files Created:
- All feature module folders: auth, home, turf_listing, turf_detail, booking, my_bookings, profile
- Core module folders: constants, errors, router, theme, utils, widgets
- Placeholder files for all data/domain/presentation layer stubs

---

### Phase 2: Dependencies & Wiring

**Status:** ✅ Complete  
**Commit:** `feat(step2+3): add all deps, wire GoRouter, implement all screens with mock data`

#### What was done:

**`pubspec.yaml` updated** with all production dependencies:

- `flutter_riverpod: ^2.5.1` — State management
- `hooks_riverpod: ^2.5.1` — Hooks integration
- `flutter_hooks: ^0.20.5` — React-like lifecycle hooks
- `riverpod_annotation: ^2.3.5` — Code-gen annotations
- `go_router: ^14.2.7` — URL-based declarative navigation
- `dio: ^5.4.3+1` — HTTP client with interceptors
- `connectivity_plus: ^6.0.3` — Network connectivity status
- `shared_preferences: ^2.2.3` — Key-value local storage
- `flutter_secure_storage: ^9.0.0` — Encrypted storage for tokens
- `google_fonts: ^6.2.1` — Inter font from Google CDN
- `cached_network_image: ^3.3.1` — Efficient network images
- `flutter_animate: ^4.5.0` — Declarative animations
- `shimmer: ^3.0.0` — Skeleton loading placeholders
- `lottie: ^3.1.2` — Lottie animation support
- `smooth_page_indicator: ^1.1.0` — Dot page indicators
- `gap: ^3.0.1` — Clean spacing widget
- `intl: ^0.19.0` — Internationalization & date formatting
- `equatable: ^2.0.5` — Value equality for entities
- `dartz: ^0.10.1` — Functional programming (Either type)
- `freezed_annotation: ^2.4.1` — Immutable model annotations
- `json_annotation: ^4.9.0` — JSON serialization annotations
- `uuid: ^4.3.3` — Unique ID generation
- `logger: ^2.3.0` — Structured logging
- `build_runner: ^2.4.9` — Code generation runner (dev)
- `riverpod_generator: ^2.4.3` — Provider code gen (dev)
- `freezed: ^2.5.2` — Model code gen (dev)
- `json_serializable: ^6.8.0` — JSON code gen (dev)
- `mocktail: ^1.0.3` — Mock library for tests (dev)

**App wiring:**

- `main.dart` — `WidgetsFlutterBinding.ensureInitialized()`, portrait orientation lock, `ProviderScope` wrapper
- `app.dart` — `TurfXApp` as `ConsumerWidget`, `MaterialApp.router` with `AppTheme` and `appRouterProvider`

**GoRouter configured** in `app_router.dart`:
- `ShellRoute` wrapping the 3-tab main app (`/home`, `/my-bookings`, `/profile`)
- Auth routes outside shell: `/welcome`, `/login`, `/signup`, `/otp`
- Booking sub-routes: `/booking/date`, `/booking/slots`, `/booking/summary`, `/booking/payment`, `/booking/confirmation`
- Turf routes: `/turfs`, `/turfs/:id`

**`main_shell.dart`** implements the M3 `NavigationBar` with:
- 🏠 Home tab
- 📅 Bookings tab
- 👤 Profile tab
- Active indicator with primary color, icon+label layout

---

### Phase 3: Design System

**Status:** ✅ Complete

#### `app_colors.dart`
Defines the complete color palette:

```dart
// Brand
static const Color primary = Color(0xFF00C853);      // Vibrant green
static const Color primaryDark = Color(0xFF00A846);
static const Color primaryLight = Color(0xFF69F0AE);
static const Color accent = Color(0xFF00E5FF);        // Cyan accent

// Backgrounds
static const Color backgroundLight = Color(0xFFF8F9FE);
static const Color backgroundDark = Color(0xFF0D1117);
static const Color surfaceDark = Color(0xFF161B22);

// Semantic
static const Color success = Color(0xFF00C853);
static const Color warning = Color(0xFFFFB300);
static const Color error = Color(0xFFFF5252);

// Gradients
static const LinearGradient primaryGradient = LinearGradient(
  colors: [Color(0xFF00C853), Color(0xFF00BCD4)],
  begin: Alignment.centerLeft,
  end: Alignment.centerRight,
);
```

#### `app_theme.dart`
Full Material 3 `ThemeData` for both light and dark mode:
- `ColorScheme.fromSeed` based on `AppColors.primary`
- `GoogleFonts.interTextTheme()` applied globally
- `AppBarTheme` — transparent, no elevation, center title
- `ElevatedButtonTheme` — gradient-capable, rounded 14px corners
- `InputDecorationTheme` — rounded filled fields with focus border
- `CardTheme` — subtle shadow, 16px radius
- `BottomNavigationBarTheme` / `NavigationBarTheme` — M3 styled

#### `app_typography.dart`
Defines the complete type scale using Inter font:
- Display: Large (32), Medium (28), Small (24)
- Headline: Large (22), Medium (20), Small (18)
- Title: Large (16), Medium (14), Small (12)
- Body: Large (16), Medium (14), Small (12)
- Label: Large (14), Medium (12), Small (10)

---

### Phase 4: Screen Implementation

**Status:** ✅ Complete — All 15 screens implemented with mock data  
**Commit:** `feat(step2+3): add all deps, wire GoRouter, implement all screens with mock data`

---

#### 4.1 Auth Screens

##### `welcome_screen.dart`
- Dark gradient background (`#0D1117` → `#1A1A2E`)
- TurfX logo with rounded green icon
- Headline: "Find & Book Your Perfect Turf. ⚽"
- Subtext with app description
- Three stats badges: **500+ Turfs**, **50K+ Bookings**, **4.8★ Rating**
- **"Get Started"** → gradient green CTA button → navigates to `/signup`
- **"I already have an account"** → outlined button → navigates to `/login`

##### `login_screen.dart`
- Back button to Welcome
- "Welcome Back 👋" headline
- Email address text field with validation
- Password field with show/hide toggle
- Forgot Password link (UI only)
- Gradient "Sign In" button with loading state
- "Sign in with Google" button (UI only, no Firebase yet)
- Bottom link to Signup screen
- Simulated 1-second login delay → navigates to `/home`

##### `signup_screen.dart`
- "Create Account 🏟️" headline
- Four fields: Full Name, Email, Phone (+91 prefix), Password
- Full form validation (empty check, email format, phone length, password min 6 chars)
- Password show/hide toggle
- Gradient submit button with loading spinner
- Link to Login screen
- Simulated 1-second signup → navigates to `/home`

##### `otp_screen.dart`
- 6-box OTP input grid
- Auto-focus advances to next box on digit entry
- Backspace moves focus to previous box
- Dynamic fill color on entered boxes
- Animated dot indicator width for active input
- "Verify OTP" gradient button with loading state
- "Resend OTP" link (UI only)
- Simulated verify delay → navigates to `/home`

---

#### 4.2 Home Screen (`home_screen.dart`)

- `CustomScrollView` with `SliverAppBar` + `SliverList`
- `RefreshIndicator` for pull-to-refresh (simulated 1s delay)
- **Header row**: "Good Morning 👋" + "Find Your Turf" title + notification bell
- **Search bar**: Tappable fake search (routes to `/turfs`), filter icon
- **Category chips**: Horizontal scrollable pill chips
  - Football ⚽, Cricket 🏏, Basketball 🏀, Tennis 🎾, Badminton 🏸, Hockey 🏑
  - Active chip has gradient background + shadow
  - Tapping navigates to listing filtered by sport
- **Nearby Turfs section**: Horizontal `ListView` of cards (200px wide each)
  - Image (140px height), Distance badge, Name, Location, Rating, Price/hr
  - Taps to `/turfs/:id`
- **Popular This Week section**: Vertical list tiles
  - Thumbnail image, Name, Location, Rating, Sport badge, Price
  - Taps to `/turfs/:id`
- Section headers with "See All →" links

---

#### 4.3 Turf Listing Screen (`turf_listing_screen.dart`)

- AppBar with "Find Turfs" title and sort button (icon + current sort label)
- **Sport filter chips**: Horizontal chip row (All, Football, Cricket, Basketball, Tennis, Badminton)
  - Active chip highlighted with primary green
  - Filters the list in real-time
- **Results count**: "X turfs found" below filter bar
- **Sort bottom sheet**: Modal with Radio-style options (Rating, Price ↑, Price ↓) with checkmark
- **Turf cards** (full-width):
  - 180px network image with gradient price badge overlay
  - Name + star rating on same row
  - Location pin icon + city name + sport pill badge
  - Full-width "View & Book" elevated button → routes to detail
- **Empty state**: Emoji + "No turfs found for X" + "Clear Filter" text button
- Mock data: 6 turfs across Football, Cricket, Basketball

---

#### 4.4 Turf Detail Screen (`turf_detail_screen.dart`)

- `CustomScrollView` with `SliverAppBar` (pinned, 280px expanded height)
- **Image carousel** via `PageView`:
  - 3 network images per turf
  - Animated dot indicators (active dot expands to 20px width)
  - Dark gradient overlay at bottom of image
  - Back button (CircleAvatar style)
- **Turf header**: Name + star rating badge (amber tinted chip)
- **Location row**: Pin icon + full address
- Review count with primary color link styling
- **Price row**: Large price + "/hour" + sport pill badge (gradient)
- **About section**: Multi-line description (line height 1.6)
- **Amenities section**: `Wrap` of chips with emoji + label
  - Changing Room 🚿, Parking 🅿️, Flood Lights 💡, Refreshments 🥤, Free Wi-Fi 📶, Tournaments 🏆
- **Available Slots section**: `Wrap` of time badges
  - Available slots: green tint + green text
  - Booked slots: grey with strikethrough text
- **"📅 Book This Turf" bottom bar**: Sticky `bottomNavigationBar` with gradient button → routes to date selection

---

#### 4.5 Booking Flow

##### `date_selection_screen.dart`
- "Choose a Date" headline with subtitle
- Flutter's built-in `CalendarDatePicker`
  - Min date: today, Max date: +60 days
  - Tapping a date updates `_selected`
- Gradient "Continue to Slot Selection →" CTA
- Passes selected date as URL query param to `/booking/slots?turfId=X&date=YYYY-MM-DD`

##### `slot_selection_screen.dart`
- "Pick Your Time Slots" headline
- Date shown in primary green color
- **Legend row**: Available (light green), Booked (grey), Selected (solid green)
- **4-column grid** of 16 time slots (6:00 AM to 9:00 PM):
  - Available: light green background, green text
  - Booked: grey background, grey strikethrough text, non-tappable
  - Selected: solid primary green background + shadow
  - `AnimatedContainer` for smooth color transitions
- **Bottom bar** (fixed, with shadow separator):
  - Shows "X slot(s) selected • ₹XXX" when slots selected
  - "₹800/slot" price reference
  - Gradient "Continue to Summary →" button (grey + disabled when no slots)

##### `booking_summary_screen.dart`
- "Review Your Booking" headline
- **Turf card**: Network thumbnail + name + location + rating
- **Booking details card**: Date, Time Slots, Duration, Sport (all in row format with dividers)
- **Price breakdown card**:
  - Turf Charge (1 hr): ₹800
  - Booking Fee: ₹20
  - GST (18%): ₹147
  - **Total Amount** in gradient card: **₹967**
- "Proceed to Payment →" gradient CTA

##### `payment_screen.dart`
- "Choose Payment Method" headline
- **4 animated payment method cards**:
  - 💳 UPI / GPay — "Pay instantly via UPI"
  - 💳 Credit / Debit Card — "Visa, Mastercard, RuPay"
  - 🏦 Net Banking — "All major banks supported"
  - 💵 Pay at Venue — "Pay in cash when you arrive"
  - Selected card: primary green border + tinted background + check icon
  - `AnimatedContainer` for smooth selection transition
- **Amount row**: "Amount to Pay" + "₹967" in primary green
- Gradient "Pay ₹967" button with loading spinner
- 2-second simulated payment → navigates to confirmation

##### `booking_confirmation_screen.dart`
- **Success icon**: 120px gradient circle with white check mark + glow shadow
- "Booking Confirmed! 🎉" headline
- Subtitle with success message
- **Booking receipt card**:
  - Booking ID: `#TRF-20249812`
  - Turf: Green Arena
  - Date: Today, 12 Jun
  - Slot: 6:00 PM — 7:00 PM
  - Amount Paid: ₹967
- "Back to Home" gradient button → `/home`
- "View My Bookings" outlined button → `/my-bookings`

---

#### 4.6 My Bookings Screen (`my_bookings_screen.dart`)

- `DefaultTabController` with 2 tabs: **Upcoming** and **Completed**
- `TabBar` with primary green indicator and label color
- **Booking cards** (for each tab):
  - Sport icon with gradient background
  - Turf name + location
  - Status badge (Confirmed = green, Completed = grey)
  - Date chip + slot chip with icons
  - Booking ID (dimmed) + Amount (primary green)
  - **"Cancel Booking"** outlined red button (upcoming only)
- **Empty state**: Emoji + "No upcoming bookings" + "Book a Turf" button
- Mock data: 2 upcoming, 2 completed bookings

---

#### 4.7 Profile Screen (`profile_screen.dart`)

- Settings gear icon in AppBar
- **Dark profile header** (gradient `#0D1117` → `#1A1A2E`, rounded bottom corners):
  - CircleAvatar (88px diameter) with person icon + green tint
  - Camera edit badge on avatar (gradient circle)
  - Name: "Om Golesar"
  - Email: "om.golesar@gmail.com"
  - **Stats row**: 12 Bookings | 8 Turfs Played | 24 Hours (separated by dividers)
- **Grouped menu cards** (3 sections):
  - **Account**: Edit Profile, Change Phone, Change Password
  - **Activity**: My Bookings, Favourite Turfs, Transaction History
  - **Support**: Help & Support, Settings, Logout
  - Each item: colored icon + label + chevron
  - Logout is red (destructive)
  - Custom `InkWell` tiles with `Clip.hardEdge` container (no ListTile double-border)
- App version footer: "TurfX v1.0.0"

---

#### 4.8 Settings Screen (`settings_screen.dart`)

- **Appearance**: Dark Mode toggle (with icon)
- **Notifications**: Push Notifications, Booking Alerts, Promotions toggles (each with icon + subtitle)
- **About**: App Version (1.0.0), Privacy Policy (external link), Terms of Service (external link)
- Custom `_SwitchTile` widgets with consistent spacing and dividers
- Custom `_InfoTile` for static rows
- `Clip.hardEdge` on card containers
- "Made with ❤️ by TurfX" footer

---

### Phase 5: UI Fixes & Polish

**Status:** ✅ Complete  
**Commit:** `fix(ui): fix all screen layouts + add platform folders (android/ios/web/windows/linux/macos)`

After running the app in Chrome and performing a full visual audit of all 15 screens, the following issues were identified and fixed:

#### Bug 1: Turf Detail — FAB covering entire screen
**Root Cause:** `floatingActionButton` with a full-width `GestureDetector+Container` was rendering as a massive full-screen green overlay instead of a small FAB.  
**Fix:** Moved the Book button to `bottomNavigationBar` using `SafeArea + Padding + Container` for a proper sticky bottom bar.

#### Bug 2: Slot Selection — Giant slot tiles (3-col, wrong aspect ratio)
**Root Cause:** `SliverGridDelegateWithFixedCrossAxisCount` with `crossAxisCount: 3` and `childAspectRatio: 2.2` produced extremely tall tiles on desktop viewport.  
**Fix:** Changed to `crossAxisCount: 4` and `childAspectRatio: 2.6` for compact, readable time slot tiles.

#### Bug 3: Home Screen — Category chips vertically stacked, too tall
**Root Cause:** Category chips used a `Column(icon + label)` stacked layout inside a tall chip, wasting vertical space.  
**Fix:** Rebuilt as horizontal pill chips with `Row(icon, SizedBox, text)` — more compact, modern, and readable.

#### Bug 4: All screens — Image widgets without fixed height
**Root Cause:** `Image.network` without a containing `SizedBox` caused layout jumps and broken placeholder rendering.  
**Fix:** Wrapped all network images in explicit `SizedBox(height: N, width: double.infinity)` containers.

#### Bug 5: Profile & Settings — ListTile double-border artifacts
**Root Cause:** Using `ListTile` inside a `Container` with `BorderRadius` caused the tile's ink splash to render outside the clip boundary, and dividers were misaligned.  
**Fix:** Replaced all `ListTile` instances with custom `Material + InkWell + Padding + Row` widgets inside `Clip.hardEdge` containers.

#### Bug 6: Turf Listing — Basic sort bottom sheet UI
**Root Cause:** Simple `ListTile` sort options without visual feedback for selected state.  
**Fix:** Added radio-style check icons, close button header, results count bar, and clear filter for empty state.

#### Platform folders added
After `flutter create . --overwrite` regenerated all platform folders, they were committed to the repository so the app can be cloned and run on any OS:
- `android/` — Android (Kotlin/Gradle)
- `ios/` — iOS (Swift/Xcode)
- `web/` — Flutter Web (Chrome)
- `windows/` — Windows desktop (Win32)
- `linux/` — Linux desktop (GTK)
- `macos/` — macOS desktop (Swift/Xcode)

---

## 5. Screen Inventory

| # | Screen | Route | Status | Notes |
|---|---|---|---|---|
| 1 | Welcome | `/welcome` | ✅ Done | Dark gradient, stats, CTAs |
| 2 | Login | `/login` | ✅ Done | Form validation, Google sign-in UI |
| 3 | Signup | `/signup` | ✅ Done | 4 fields, validation |
| 4 | OTP Verify | `/otp` | ✅ Done | 6-box auto-focus grid |
| 5 | Home | `/home` | ✅ Done | Search, categories, nearby, popular |
| 6 | Turf Listing | `/turfs` | ✅ Done | Filters, sort, full card listing |
| 7 | Turf Detail | `/turfs/:id` | ✅ Done | Carousel, amenities, slots, sticky book bar |
| 8 | Date Selection | `/booking/date` | ✅ Done | Calendar picker |
| 9 | Slot Selection | `/booking/slots` | ✅ Done | 4-col grid, multi-select, price total |
| 10 | Booking Summary | `/booking/summary` | ✅ Done | Price breakdown, GST |
| 11 | Payment | `/booking/payment` | ✅ Done | 4 method cards, animated selection |
| 12 | Confirmation | `/booking/confirmation` | ✅ Done | Receipt card, success icon |
| 13 | My Bookings | `/my-bookings` | ✅ Done | Tabbed upcoming/completed |
| 14 | Profile | `/profile` | ✅ Done | Dark header, stats, grouped menus |
| 15 | Settings | `/settings` | ✅ Done | Toggle switches, about section |

---

## 6. Design System Reference

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#00C853` | Buttons, active states, badges, prices |
| `primaryDark` | `#00A846` | Pressed states |
| `primaryLight` | `#69F0AE` | Highlights |
| `accent` | `#00E5FF` | Secondary accents |
| `backgroundLight` | `#F8F9FE` | Light mode scaffold |
| `backgroundDark` | `#0D1117` | Dark mode scaffold |
| `surfaceDark` | `#161B22` | Dark mode cards |
| `success` | `#00C853` | Success states |
| `warning` | `#FFB300` | Warning states |
| `error` | `#FF5252` | Error states |

### Primary Gradient
```
LinearGradient: #00C853 → #00BCD4 (left to right)
```

### Spacing Scale (`app_spacing.dart`)
```
xs:  4px    sm: 8px    md: 16px
lg: 24px    xl: 32px   xxl: 48px
```

### Border Radius (`app_radius.dart`)
```
sm: 8px    md: 12px    lg: 16px    xl: 24px    round: 999px
```

---

## 7. Navigation Map

```
/welcome
  ├── → /signup    (Get Started)
  └── → /login     (I already have an account)

/login
  ├── → /home      (Sign In success)
  ├── → /signup    (Create account link)
  └── → /otp       (OTP login)

/signup
  ├── → /home      (Create Account success)
  └── → /login     (Already have account)

/otp
  └── → /home      (Verify success)

ShellRoute (bottom navigation bar):
  /home            (tab 1)
  /my-bookings     (tab 2)
  /profile         (tab 3)

/home
  ├── → /turfs     (Search bar tap / See All)
  └── → /turfs/:id (Turf card tap)

/turfs
  └── → /turfs/:id (Card tap)

/turfs/:id
  └── → /booking/date?turfId=:id   (Book This Turf)

/booking/date?turfId=X
  └── → /booking/slots?turfId=X&date=YYYY-MM-DD

/booking/slots?turfId=X&date=D
  └── → /booking/summary

/booking/summary
  └── → /booking/payment

/booking/payment
  └── → /booking/confirmation

/booking/confirmation
  ├── → /home
  └── → /my-bookings

/profile
  └── → /settings

/my-bookings
  └── → /home  (empty state CTA)
```

---

## 8. Dependencies

### Runtime Dependencies (from `pubspec.yaml`)

```yaml
dependencies:
  flutter_riverpod: ^2.5.1
  hooks_riverpod: ^2.5.1
  flutter_hooks: ^0.20.5
  riverpod_annotation: ^2.3.5
  go_router: ^14.2.7
  dio: ^5.4.3+1
  connectivity_plus: ^6.0.3
  shared_preferences: ^2.2.3
  flutter_secure_storage: ^9.0.0
  google_fonts: ^6.2.1
  cached_network_image: ^3.3.1
  flutter_animate: ^4.5.0
  shimmer: ^3.0.0
  lottie: ^3.1.2
  smooth_page_indicator: ^1.1.0
  flutter_rating_bar: ^4.0.1
  gap: ^3.0.1
  image_picker: ^1.0.7
  intl: ^0.19.0
  equatable: ^2.0.5
  dartz: ^0.10.1
  freezed_annotation: ^2.4.1
  json_annotation: ^4.9.0
  logger: ^2.3.0
  uuid: ^4.3.3
  url_launcher: ^6.2.6
  permission_handler: ^11.3.1

dev_dependencies:
  build_runner: ^2.4.9
  riverpod_generator: ^2.4.3
  freezed: ^2.5.2
  json_serializable: ^6.8.0
  mocktail: ^1.0.3
  fake_async: ^1.3.1
```

---

## 9. Git History

| Commit | Message | Changes |
|---|---|---|
| Initial | `Initial commit` | Empty scaffold |
| 2nd | `feat: initial TurfX project scaffold with clean architecture structure` | 150+ files, full folder structure |
| 3rd | `feat(step2+3): add all deps, wire GoRouter, implement all screens with mock data` | 22 files changed, 4085 insertions — all 15 screens, GoRouter, themes, main shell |
| 4th | `fix(ui): fix all screen layouts + add platform folders (android/ios/web/windows/linux/macos)` | 135 files changed, 6879 insertions — all platform folders + 6 screen fixes |

---

## 10. How to Run

### Prerequisites
- Flutter SDK (latest stable) — [flutter.dev](https://flutter.dev)
- Git
- Chrome (for web) or Android emulator/device

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/OmGolesar/turf-booking.git
cd turf-booking

# 2. Install dependencies
flutter pub get

# 3. Run on Chrome (web)
flutter run -d chrome

# 4. Run on Windows (desktop)
flutter run -d windows

# 5. Run on Android emulator (need Android Studio)
flutter run -d android

# 6. Run on iOS simulator (macOS only)
flutter run -d ios
```

### After cloning on a new machine:
No `flutter create` needed — all platform files are already committed. Just `flutter pub get` and `flutter run`.

### Troubleshooting
| Issue | Fix |
|---|---|
| `pubspec.yaml` overwritten | Restore from Git: `git checkout pubspec.yaml` |
| `main.dart` shows counter app | Restore: `git checkout lib/main.dart` |
| Package not found | Run `flutter pub get` again |
| Chrome not opening | Run `flutter run -d chrome` explicitly |

---

## 11. Known Issues & Next Steps

### 🔴 Not Yet Implemented (Backend)
- [ ] Real authentication (Firebase Auth / custom backend)
- [ ] Real turf data from API (Dio + repository pattern scaffolded)
- [ ] Real booking persistence
- [ ] Real payment gateway (Razorpay/Stripe SDK)
- [ ] Push notifications (FCM)

### 🟡 UI Enhancements Planned
- [ ] Add `flutter_animate` entry animations to all screens
- [ ] Shimmer skeleton loaders while network images load
- [ ] Lottie animation on booking confirmation screen
- [ ] Dark mode toggle (Settings screen switch already exists)
- [ ] Google Sign-In integration (button exists on Login screen)
- [ ] Map view for nearby turfs (Google Maps / MapBox)
- [ ] Review & rating submission UI

### 🟢 Completed in MVP
- [x] All 15 screens implemented with mock data
- [x] Full booking flow (date → slot → summary → payment → confirmation)
- [x] Complete navigation with GoRouter
- [x] Material 3 theming (light + dark theme data defined)
- [x] Responsive layouts (works on mobile viewport and Chrome)
- [x] All platform source files committed (Android, iOS, Web, Windows, Linux, macOS)
- [x] All critical UI bugs fixed (FAB, slot grid, category chips, profile menus)
- [x] Pushed to GitHub with full history

---

*Built with ❤️ by Om Golesar | TurfX v1.0.0*
