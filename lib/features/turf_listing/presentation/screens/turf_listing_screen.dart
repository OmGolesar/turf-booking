import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/turfx_widgets.dart';
import '../../../home/domain/entities/turf_summary.dart';
import '../providers/turf_listing_provider.dart';

/// Search Results (Dark) — Figma spec, live-wired to Firestore.
class TurfListingScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  const TurfListingScreen({super.key, this.initialCategory});

  @override
  ConsumerState<TurfListingScreen> createState() => _TurfListingScreenState();
}

class _TurfListingScreenState extends ConsumerState<TurfListingScreen> {
  String _sport = 'Football';

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _sport = widget.initialCategory!;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(selectedSportFilterProvider.notifier).state = _sport;
    });
  }

  @override
  Widget build(BuildContext context) {
    final listing = ref.watch(turfListingProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            toolbarHeight: 64,
            backgroundColor: AppColors.bg,
            elevation: 0,
            centerTitle: true,
            title: Text(
              'TurfX',
              style: AppTypography.h1.copyWith(color: AppColors.accentGreen),
            ),
            leading: Padding(
              padding: const EdgeInsets.only(left: 20),
              child: GestureDetector(
                onTap: () => context.canPop()
                    ? context.pop()
                    : context.go(RouteNames.home),
                child: const Icon(Icons.arrow_back_rounded,
                    size: 16, color: AppColors.textSecondary),
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 20),
                child: GestureDetector(
                  onTap: () {},
                  child: const Icon(Icons.tune_rounded,
                      size: 20, color: AppColors.accentGreen),
                ),
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 96),
            sliver: SliverList.list(
              children: [
                Text(
                  '$_sport Turfs',
                  style:
                      AppTypography.h1.copyWith(color: AppColors.textPrimary),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 42,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: 3,
                    padding: EdgeInsets.zero,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      return [
                        TurfFilterChip(
                          label: _sport,
                          active: false,
                          dense: true,
                          trailingIcon: Icons.keyboard_arrow_down_rounded,
                          onTap: () => _showSportPicker(context),
                        ),
                        TurfFilterChip(
                          label: 'Today',
                          active: false,
                          dense: true,
                          trailingIcon: Icons.keyboard_arrow_down_rounded,
                          onTap: () {},
                        ),
                        TurfFilterChip(
                          label: 'More Filters',
                          active: false,
                          dense: true,
                          trailingIcon: Icons.tune_rounded,
                          onTap: () {},
                        ),
                      ][i];
                    },
                  ),
                ),
                const SizedBox(height: 24),
                ...listing.when(
                  data: (turfs) {
                    if (turfs.isEmpty) {
                      return [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 60),
                          child: Center(
                            child: Text(
                              'No $_sport turfs found.',
                              style: AppTypography.bodyMd.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      ];
                    }
                    return [
                      for (final t in turfs) ...[
                        _SearchResultCard(turf: t),
                        const SizedBox(height: 24),
                      ],
                    ];
                  },
                  loading: () => [
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 60),
                      child: Center(
                        child:
                            CircularProgressIndicator(color: AppColors.primary),
                      ),
                    ),
                  ],
                  error: (e, _) => [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 60),
                      child: Center(
                        child: Text(
                          'Could not load turfs.',
                          style: AppTypography.bodyMd.copyWith(
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
        ],
      ),
    );
  }

  void _showSportPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgDeep,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sport',
                style: AppTypography.h2.copyWith(color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            for (final s in ['Football', 'Cricket', 'Tennis', 'Basketball'])
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(s,
                    style: AppTypography.bodyMd
                        .copyWith(color: AppColors.textPrimary)),
                trailing: _sport == s
                    ? const Icon(Icons.check_rounded, color: AppColors.primary)
                    : null,
                onTap: () {
                  setState(() => _sport = s);
                  ref.read(selectedSportFilterProvider.notifier).state = s;
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _SearchResultCard extends StatelessWidget {
  const _SearchResultCard({required this.turf});
  final TurfSummary turf;

  @override
  Widget build(BuildContext context) {
    return TurfElevatedCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppRadius.md)),
                child: SizedBox(
                  height: 200,
                  width: double.infinity,
                  child: Image.network(
                    turf.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.primaryTint,
                      child: const Icon(Icons.sports_soccer_rounded,
                          size: 56, color: AppColors.primary),
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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Text(
                        turf.name,
                        style: AppTypography.h2
                            .copyWith(color: AppColors.textPrimary),
                      ),
                    ),
                    Text(
                      Formatters.price(turf.pricePerHour),
                      style: AppTypography.h2
                          .copyWith(color: AppColors.accentGreen),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2, left: 2),
                      child: Text(
                        '/hr',
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined,
                        size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        turf.location,
                        style: AppTypography.bodyXs
                            .copyWith(color: AppColors.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final s in turf.sports.take(2)) TurfFormatPill(s),
                    if (turf.reviewCount > 0)
                      TurfNextSlotPill('${turf.reviewCount}★'),
                  ],
                ),
                const SizedBox(height: 16),
                TurfPrimaryButton(
                  label: 'BOOK',
                  onPressed: () =>
                      context.push(RouteNames.turfDetailPath(turf.id)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
