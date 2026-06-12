import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

const _mockTurfs = {
  '1': {
    'name': 'Green Arena',
    'location': 'Andheri West, Mumbai, Maharashtra',
    'rating': 4.8,
    'reviews': 124,
    'price': 800,
    'sport': 'Football',
    'description':
        'Green Arena is one of Mumbai\'s premier football turfs, featuring FIFA-standard synthetic grass, floodlights for evening games, and modern locker rooms. Perfect for friendly matches, tournaments, and practice sessions.',
    'images': [
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600',
      'https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=600',
    ],
    'amenities': [
      {'icon': '🚿', 'label': 'Changing Room'},
      {'icon': '🅿️', 'label': 'Parking'},
      {'icon': '💡', 'label': 'Flood Lights'},
      {'icon': '🥤', 'label': 'Refreshments'},
      {'icon': '📶', 'label': 'Free Wi-Fi'},
      {'icon': '🏆', 'label': 'Tournaments'},
    ],
    'slots': [
      '6:00 AM', '7:00 AM', '8:00 AM', '10:00 AM',
      '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM', '9:00 PM',
    ],
    'bookedSlots': ['8:00 AM', '4:00 PM', '8:00 PM'],
  },
};

// Default data for unknown IDs
const _defaultTurf = {
  'name': 'TurfX Arena',
  'location': 'Mumbai, Maharashtra',
  'rating': 4.7,
  'reviews': 89,
  'price': 1000,
  'sport': 'Football',
  'description': 'A premium sports facility with top-class amenities.',
  'images': [
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600',
  ],
  'amenities': [
    {'icon': '🚿', 'label': 'Changing Room'},
    {'icon': '🅿️', 'label': 'Parking'},
    {'icon': '💡', 'label': 'Flood Lights'},
  ],
  'slots': ['6:00 AM', '8:00 AM', '10:00 AM', '4:00 PM', '6:00 PM'],
  'bookedSlots': ['8:00 AM'],
};

class TurfDetailScreen extends StatefulWidget {
  final String turfId;
  const TurfDetailScreen({super.key, required this.turfId});

  @override
  State<TurfDetailScreen> createState() => _TurfDetailScreenState();
}

class _TurfDetailScreenState extends State<TurfDetailScreen> {
  int _imageIndex = 0;
  final _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final turf = (_mockTurfs[widget.turfId] ?? _defaultTurf)
        as Map<String, dynamic>;
    final images = (turf['images'] as List).cast<String>();
    final amenities =
        (turf['amenities'] as List).cast<Map<String, dynamic>>();
    final slots = (turf['slots'] as List).cast<String>();
    final booked = (turf['bookedSlots'] as List).cast<String>();

    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ── Image Carousel App Bar ─────────────────────────
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: Colors.black,
            leading: IconButton(
              onPressed: () => context.pop(),
              icon: const CircleAvatar(
                backgroundColor: Colors.black45,
                child: Icon(Icons.arrow_back, color: Colors.white),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: images.length,
                    onPageChanged: (i) => setState(() => _imageIndex = i),
                    itemBuilder: (_, i) => Image.network(
                      images[i],
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        child: const Icon(Icons.sports_soccer,
                            size: 72, color: AppColors.primary),
                      ),
                    ),
                  ),
                  // Dark overlay at bottom
                  const Align(
                    alignment: Alignment.bottomCenter,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.transparent, Colors.black54],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                      child: SizedBox(height: 80, width: double.infinity),
                    ),
                  ),
                  // Dot indicators
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        images.length,
                        (i) => AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: _imageIndex == i ? 20 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: _imageIndex == i
                                ? AppColors.primary
                                : Colors.white54,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Content ─────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name & Rating
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          turf['name'] as String,
                          style: textTheme.headlineMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.star_rounded,
                                color: Colors.amber, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              '${turf['rating']}',
                              style: textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: Colors.amber.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          turf['location'] as String,
                          style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 6),
                  Text(
                    '${turf['reviews']} reviews',
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),

                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 16),

                  // ── Price ──────────────────────────────────────
                  Row(
                    children: [
                      Text(
                        '₹${turf['price']}',
                        style: textTheme.headlineSmall?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        ' / hour',
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          turf['sport'] as String,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Description ────────────────────────────────
                  Text(
                    'About',
                    style: textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    turf['description'] as String,
                    style: textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.7),
                      height: 1.6,
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── Amenities ──────────────────────────────────
                  Text(
                    'Amenities',
                    style: textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: amenities
                        .map((a) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(a['icon'] as String,
                                      style: const TextStyle(fontSize: 16)),
                                  const SizedBox(width: 6),
                                  Text(
                                    a['label'] as String,
                                    style: textTheme.bodySmall?.copyWith(
                                        fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ))
                        .toList(),
                  ),

                  const SizedBox(height: 24),

                  // ── Available Slots ────────────────────────────
                  Text(
                    'Available Slots — Today',
                    style: textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: slots.map((slot) {
                      final isBooked = booked.contains(slot);
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isBooked
                              ? colorScheme.onSurface.withValues(alpha: 0.1)
                              : AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isBooked
                                ? Colors.transparent
                                : AppColors.primary.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          slot,
                          style: textTheme.bodySmall?.copyWith(
                            color: isBooked
                                ? colorScheme.onSurface.withValues(alpha: 0.3)
                                : AppColors.primary,
                            fontWeight: FontWeight.w700,
                            decoration: isBooked
                                ? TextDecoration.lineThrough
                                : null,
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 100), // Space for FAB
                ],
              ),
            ),
          ),
        ],
      ),

      // ── Book Now FAB ───────────────────────────────────────
      floatingActionButton: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: GestureDetector(
          onTap: () => context.go(
            '${RouteNames.dateSelection}?turfId=${widget.turfId}',
          ),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Center(
              child: Text(
                '📅  Book This Turf',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}
