import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const _categories = [
  {'icon': '⚽', 'label': 'Football'},
  {'icon': '🏏', 'label': 'Cricket'},
  {'icon': '🏀', 'label': 'Basketball'},
  {'icon': '🎾', 'label': 'Tennis'},
  {'icon': '🏸', 'label': 'Badminton'},
  {'icon': '🏑', 'label': 'Hockey'},
];

const _nearbyTurfs = [
  {
    'id': '1',
    'name': 'Green Arena',
    'location': 'Andheri West, Mumbai',
    'rating': 4.8,
    'price': 800,
    'sport': 'Football',
    'image': 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=400',
    'distance': '1.2 km',
  },
  {
    'id': '2',
    'name': 'SportsPlex Central',
    'location': 'Bandra, Mumbai',
    'rating': 4.6,
    'price': 1200,
    'sport': 'Cricket',
    'image': 'https://images.unsplash.com/photo-1540747913346-19212a4b423d?w=400',
    'distance': '2.5 km',
  },
  {
    'id': '3',
    'name': 'Champions Ground',
    'location': 'Juhu, Mumbai',
    'rating': 4.9,
    'price': 1500,
    'sport': 'Football',
    'image': 'https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=400',
    'distance': '3.8 km',
  },
];

const _popularTurfs = [
  {
    'id': '4',
    'name': 'Elite Turf Zone',
    'location': 'Powai, Mumbai',
    'rating': 4.7,
    'price': 900,
    'sport': 'Football',
    'image': 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400',
    'bookings': '2.3K',
  },
  {
    'id': '5',
    'name': 'City Play Arena',
    'location': 'Goregaon, Mumbai',
    'rating': 4.5,
    'price': 700,
    'sport': 'Basketball',
    'image': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
    'bookings': '1.8K',
  },
  {
    'id': '6',
    'name': 'Prime Sports Hub',
    'location': 'Malad, Mumbai',
    'rating': 4.6,
    'price': 850,
    'sport': 'Cricket',
    'image': 'https://images.unsplash.com/photo-1562077772-3bd90403f7f0?w=400',
    'bookings': '3.1K',
  },
];

// ── Home Screen ───────────────────────────────────────────────────────────────

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedCategory = 0;
  bool _refreshing = false;

  Future<void> _onRefresh() async {
    setState(() => _refreshing = true);
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) setState(() => _refreshing = false);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            // ── App Bar ─────────────────────────────────────────
            SliverAppBar(
              pinned: true,
              expandedHeight: 120,
              backgroundColor: colorScheme.surface,
              elevation: 0,
              flexibleSpace: FlexibleSpaceBar(
                background: _buildHeader(context),
              ),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(60),
                child: _buildSearchBar(context),
              ),
            ),

            // ── Category Chips ───────────────────────────────────
            SliverToBoxAdapter(child: _buildCategories()),

            // ── Nearby Turfs ─────────────────────────────────────
            SliverToBoxAdapter(
              child: _buildSectionHeader(
                context,
                title: '📍 Nearby Turfs',
                onSeeAll: () => context.go(RouteNames.turfListing),
              ),
            ),
            SliverToBoxAdapter(child: _buildNearbyList()),

            // ── Popular Turfs ────────────────────────────────────
            SliverToBoxAdapter(
              child: _buildSectionHeader(
                context,
                title: '🔥 Popular This Week',
                onSeeAll: () => context.go(RouteNames.turfListing),
              ),
            ),
            SliverList.builder(
              itemCount: _popularTurfs.length,
              itemBuilder: (context, i) =>
                  _PopularTurfTile(turf: _popularTurfs[i]),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, MediaQuery.of(context).padding.top + 12, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Good Morning 👋',
                  style: textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.6),
                  ),
                ),
                Text(
                  'Find Your Turf',
                  style: textTheme.headlineMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            child: const Icon(Icons.notifications_outlined,
                color: AppColors.primary),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: GestureDetector(
        onTap: () => context.go(RouteNames.turfListing),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              const Icon(Icons.search, color: AppColors.primary, size: 20),
              const SizedBox(width: 10),
              Text(
                'Search turfs, sports, location...',
                style: TextStyle(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.5),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.tune, color: AppColors.primary, size: 16),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategories() {
    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final selected = _selectedCategory == i;
          return GestureDetector(
            onTap: () {
              setState(() => _selectedCategory = i);
              context.go('${RouteNames.turfListing}?category=${_categories[i]['label']}');
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: selected ? AppColors.primaryGradient : null,
                color: selected
                    ? null
                    : Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(14),
                boxShadow: selected
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        )
                      ]
                    : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_categories[i]['icon']!, style: const TextStyle(fontSize: 22)),
                  const SizedBox(height: 4),
                  Text(
                    _categories[i]['label']!,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: selected
                          ? Colors.white
                          : Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required String title,
    required VoidCallback onSeeAll,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          GestureDetector(
            onTap: onSeeAll,
            child: Text(
              'See All →',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNearbyList() {
    return SizedBox(
      height: 230,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _nearbyTurfs.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, i) => _NearbyTurfCard(turf: _nearbyTurfs[i]),
      ),
    );
  }
}

// ── Nearby Turf Card ──────────────────────────────────────────────────────────

class _NearbyTurfCard extends StatelessWidget {
  final Map<String, dynamic> turf;
  const _NearbyTurfCard({required this.turf});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return GestureDetector(
      onTap: () =>
          context.go(RouteNames.turfDetailPath(turf['id'] as String)),
      child: Container(
        width: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Theme.of(context).colorScheme.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            )
          ],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Stack(
              children: [
                Image.network(
                  turf['image'] as String,
                  height: 130,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 130,
                    color: AppColors.primary.withValues(alpha: 0.2),
                    child: const Icon(Icons.sports_soccer,
                        size: 48, color: AppColors.primary),
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      turf['distance'] as String,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    turf['name'] as String,
                    style: textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    turf['location'] as String,
                    style: textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.5)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          color: Colors.amber, size: 14),
                      const SizedBox(width: 2),
                      Text(
                        '${turf['rating']}',
                        style: textTheme.bodySmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      Text(
                        '₹${turf['price']}/hr',
                        style: textTheme.bodySmall?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Popular Turf List Tile ────────────────────────────────────────────────────

class _PopularTurfTile extends StatelessWidget {
  final Map<String, dynamic> turf;
  const _PopularTurfTile({required this.turf});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: () =>
          context.go(RouteNames.turfDetailPath(turf['id'] as String)),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, 3),
            )
          ],
        ),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
              child: Image.network(
                turf['image'] as String,
                width: 100,
                height: 100,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 100,
                  height: 100,
                  color: AppColors.primary.withValues(alpha: 0.15),
                  child: const Icon(Icons.sports_soccer,
                      color: AppColors.primary, size: 36),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      turf['name'] as String,
                      style: textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 12, color: Colors.grey),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            turf['location'] as String,
                            style: textTheme.bodySmall?.copyWith(
                              color:
                                  colorScheme.onSurface.withValues(alpha: 0.5),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            color: Colors.amber, size: 14),
                        const SizedBox(width: 2),
                        Text(
                          '${turf['rating']}',
                          style: textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            turf['sport'] as String,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${turf['price']}',
                    style: textTheme.titleSmall?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    '/hr',
                    style: textTheme.bodySmall
                        ?.copyWith(color: colorScheme.onSurface.withValues(alpha: 0.4)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
