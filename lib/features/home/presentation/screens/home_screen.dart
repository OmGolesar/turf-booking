import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Home / Discover (Dark) — Figma spec.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _catIndex = 0;
  final _searchCtrl = TextEditingController();

  static const _categories = ['All', 'Football', 'Cricket', 'Tennis', 'Basketball'];

  static const _nearby = [
    _NearbyTurf(
      id: '1',
      name: 'Kicks Premium Arena',
      location: 'Downtown • 1.2 km',
      price: 45,
      rating: 4.9,
      image:
          'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=800&q=80',
    ),
    _NearbyTurf(
      id: '2',
      name: 'Urban Indoor Pitch',
      location: 'Westside • 3.5 km',
      price: 55,
      rating: 4.7,
      image:
          'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
    ),
    _NearbyTurf(
      id: '3',
      name: 'Central Arena',
      location: 'Downtown District • 2.5 km',
      price: 45,
      rating: 4.8,
      image:
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    ),
  ];

  static const _popular = [
    _PopularTurf(
      id: '4',
      name: 'Metro Cricket Nets',
      location: 'North Park • 4 Nets',
      price: 30,
      rating: 4.8,
      sport: 'CRICKET',
      badge: 'Available Now',
      image:
          'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
    ),
    _PopularTurf(
      id: '5',
      name: 'Blue Turf Futsal',
      location: 'East End • Indoor',
      price: 40,
      rating: 4.6,
      sport: 'FUTSAL',
      badge: 'Next: 6 PM',
      image:
          'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=800&q=80',
    ),
  ];

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDeep,
      body: RefreshIndicator(
        onRefresh: () => Future.delayed(const Duration(milliseconds: 400)),
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: CustomScrollView(
          slivers: [
            _buildAppBar(context),
            SliverToBoxAdapter(child: _buildSearchAndChips(context)),
            SliverToBoxAdapter(child: _buildNearYou(context)),
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Divider(color: AppColors.borderMuted, height: 40),
              ),
            ),
            SliverToBoxAdapter(child: _buildPopular(context)),
            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ),
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppColors.bg,
      elevation: 0,
      toolbarHeight: 64,
      leadingWidth: 56,
      leading: Padding(
        padding: EdgeInsets.only(left: 20, top: topPad > 0 ? 0 : 8),
        child: const Icon(Icons.menu_rounded,
            color: AppColors.textTertiary, size: 20),
      ),
      centerTitle: true,
      title: Text(
        'TurfX',
        style: AppTypography.displayXl.copyWith(color: AppColors.accentGreen),
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 20),
          child: GestureDetector(
            onTap: () => context.go(RouteNames.profile),
            child: const Icon(Icons.person_outline_rounded,
                color: AppColors.textTertiary, size: 22),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchAndChips(BuildContext context) {
    return Container(
      color: AppColors.overlayScrim,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TurfSearchField(
            controller: _searchCtrl,
            onFilterTap: () => context.go(RouteNames.turfListing),
            onSubmitted: (_) => context.go(RouteNames.turfListing),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 46,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              padding: EdgeInsets.zero,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) => TurfFilterChip(
                label: _categories[i],
                active: _catIndex == i,
                onTap: () {
                  setState(() => _catIndex = i);
                  if (i != 0) {
                    context.go(
                      '${RouteNames.turfListing}?category=${_categories[i]}',
                    );
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNearYou(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TurfSectionHeader(
            title: 'Near You',
            style: AppTypography.displayLg,
            actionLabel: 'See all',
            onActionTap: () => context.go(RouteNames.turfListing),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 271,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.zero,
              itemCount: _nearby.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, i) => _NearYouCard(turf: _nearby[i]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPopular(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TurfSectionHeader(
            title: 'Popular This Week',
            actionLabel: 'See all',
            onActionTap: () => context.go(RouteNames.turfListing),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: AppColors.bgDeep,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderMuted, width: 1),
            ),
            child: Column(
              children: List.generate(_popular.length, (i) {
                final isLast = i == _popular.length - 1;
                return _PopularRow(turf: _popular[i], showDivider: !isLast);
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class _NearbyTurf {
  final String id;
  final String name;
  final String location;
  final int price;
  final double rating;
  final String image;

  const _NearbyTurf({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.rating,
    required this.image,
  });
}

class _PopularTurf {
  final String id;
  final String name;
  final String location;
  final int price;
  final double rating;
  final String sport;
  final String badge;
  final String image;

  const _PopularTurf({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.rating,
    required this.sport,
    required this.badge,
    required this.image,
  });
}

class _NearYouCard extends StatelessWidget {
  const _NearYouCard({required this.turf});
  final _NearbyTurf turf;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(RouteNames.turfDetailPath(turf.id)),
      child: SizedBox(
        width: 288,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: SizedBox(
                    height: 216,
                    width: 288,
                    child: Image.network(
                      turf.image,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.primaryTint,
                        child: const Icon(Icons.sports_soccer_rounded,
                            size: 48, color: AppColors.primary),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: TurfRatingChip(rating: turf.rating),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        turf.name,
                        style: AppTypography.h3.copyWith(
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        turf.location,
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\$${turf.price}',
                      style: AppTypography.h2Alt.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(
                        '/hr',
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PopularRow extends StatelessWidget {
  const _PopularRow({required this.turf, required this.showDivider});
  final _PopularTurf turf;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(RouteNames.turfDetailPath(turf.id)),
      child: Container(
        decoration: BoxDecoration(
          border: showDivider
              ? const Border(
                  bottom: BorderSide(color: AppColors.borderFaint, width: 1))
              : null,
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: SizedBox(
                    width: 96,
                    height: 96,
                    child: Image.network(
                      turf.image,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.primaryTint,
                        child: const Icon(Icons.sports_cricket_rounded,
                            color: AppColors.primary),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 6,
                  bottom: 6,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.overlayScrim,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      child: Text(
                        turf.sport,
                        style: AppTypography.labelSmCaps.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    turf.name,
                    style: AppTypography.h3
                        .copyWith(color: AppColors.textPrimary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    turf.location,
                    style: AppTypography.bodySm
                        .copyWith(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded,
                          size: 12, color: AppColors.accentGreen),
                      const SizedBox(width: 4),
                      Text(
                        turf.rating.toStringAsFixed(1),
                        style: AppTypography.labelRating.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: AppColors.borderMuted,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          child: Text(
                            turf.badge,
                            style: AppTypography.labelRating.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '\$${turf.price}',
                  style: AppTypography.h2Alt
                      .copyWith(color: AppColors.textPrimary),
                ),
                Text(
                  '/hr',
                  style: AppTypography.bodySm
                      .copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
