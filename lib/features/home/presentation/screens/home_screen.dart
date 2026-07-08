import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/turfx_widgets.dart';
import '../../domain/entities/turf_summary.dart';
import '../providers/home_provider.dart';

/// Home / Discover (Dark) — Figma spec, live-wired to Firestore.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _catIndex = 0;
  final _searchCtrl = TextEditingController();

  static const _categories = [
    'All',
    'Football',
    'Cricket',
    'Tennis',
    'Basketball',
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
        onRefresh: () async {
          ref.invalidate(nearbyTurfsProvider);
          ref.invalidate(popularTurfsProvider);
          await ref.read(nearbyTurfsProvider.future);
        },
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
    final nearby = ref.watch(nearbyTurfsProvider);
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
            child: nearby.when(
              data: (turfs) {
                if (turfs.isEmpty) return _emptyState('No turfs nearby yet.');
                return ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: EdgeInsets.zero,
                  itemCount: turfs.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 16),
                  itemBuilder: (context, i) => _NearYouCard(turf: turfs[i]),
                );
              },
              loading: _skeletonRow,
              error: (e, _) => _emptyState('Could not load turfs.'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPopular(BuildContext context) {
    final popular = ref.watch(popularTurfsProvider);
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
          popular.when(
            data: (turfs) {
              if (turfs.isEmpty) {
                return _emptyState('No popular turfs yet.');
              }
              return Container(
                decoration: BoxDecoration(
                  color: AppColors.bgDeep,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderMuted, width: 1),
                ),
                child: Column(
                  children: List.generate(turfs.length, (i) {
                    final isLast = i == turfs.length - 1;
                    return _PopularRow(turf: turfs[i], showDivider: !isLast);
                  }),
                ),
              );
            },
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
            error: (e, _) => _emptyState('Could not load turfs.'),
          ),
        ],
      ),
    );
  }

  Widget _skeletonRow() {
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: EdgeInsets.zero,
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(width: 16),
      itemBuilder: (_, __) => ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Container(width: 288, color: AppColors.surface),
      ),
    );
  }

  Widget _emptyState(String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Text(
          label,
          style: AppTypography.bodySm.copyWith(color: AppColors.textSecondary),
        ),
      ),
    );
  }
}

class _NearYouCard extends StatelessWidget {
  const _NearYouCard({required this.turf});
  final TurfSummary turf;

  @override
  Widget build(BuildContext context) {
    final subtitle = turf.distance > 0
        ? '${turf.location} • ${Formatters.distance(turf.distance * 1000)}'
        : turf.location;
    return GestureDetector(
      onTap: () => context.push(RouteNames.turfDetailPath(turf.id)),
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
                      turf.imageUrl,
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
                        subtitle,
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      Formatters.price(turf.pricePerHour),
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
  final TurfSummary turf;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final sport =
        turf.sports.isNotEmpty ? turf.sports.first.toUpperCase() : 'TURF';
    return GestureDetector(
      onTap: () => context.push(RouteNames.turfDetailPath(turf.id)),
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
                      turf.imageUrl,
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
                        sport,
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
                    style:
                        AppTypography.h3.copyWith(color: AppColors.textPrimary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    turf.location,
                    style: AppTypography.bodySm
                        .copyWith(color: AppColors.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
                            '${turf.reviewCount} reviews',
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
                  Formatters.price(turf.pricePerHour),
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
