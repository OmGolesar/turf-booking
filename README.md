# TurfX

> Premium Turf Booking Application — Built with Flutter

## Overview

TurfX is a production-grade mobile application for discovering and booking sports turfs. Built with Clean Architecture, Riverpod state management, and Material 3 design.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Flutter** | Cross-platform UI framework |
| **Riverpod** | State management & DI |
| **GoRouter** | Declarative navigation |
| **Dio** | HTTP client |
| **Material 3** | Design system |

## Architecture

```
lib/
├── core/          # Cross-cutting: theme, network, widgets, router, utils
├── features/      # Feature modules (auth, home, booking, etc.)
│   └── <feature>/
│       ├── domain/        # Entities, repositories (abstract), use cases
│       ├── data/          # Models, data sources, repository implementations
│       └── presentation/  # Screens, widgets, Riverpod providers
├── shared/        # Shared domain & data utilities
├── main.dart      # Entry point
└── app.dart       # MaterialApp.router setup
```

## Features (MVP)

- Authentication (Email, OTP, Google Sign-In)
- Home (Search, Nearby, Popular, Categories)
- Turf Listing (Infinite scroll, Filters, Sort)
- Turf Detail (Carousel, Amenities, Reviews, Slots)
- Booking Flow (Date → Slot → Summary → Payment → Confirmation)
- My Bookings (Upcoming, Completed, Cancel)
- Profile (User details, Settings)

## Getting Started

```bash
# Install dependencies
flutter pub get

# Run in debug mode
flutter run

# Build APK
flutter build apk --release
```

## Performance

Optimized for low-end Android devices:
- Const constructors & RepaintBoundary
- Lazy image loading with caching
- Shimmer skeletons for perceived performance
- Paginated lists with auto-dispose providers
- 60 FPS target

## License

Proprietary — All rights reserved.
