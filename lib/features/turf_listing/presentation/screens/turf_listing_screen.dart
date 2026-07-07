import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Search Results (Dark) — Figma spec.
class TurfListingScreen extends StatefulWidget {
  final String? initialCategory;
  const TurfListingScreen({super.key, this.initialCategory});

  @override
  State<TurfListingScreen> createState() => _TurfListingScreenState();
}

class _TurfListingScreenState extends State<TurfListingScreen> {
  String _sport = 'Football';

  static const _turfs = [
    _SearchTurf(
      id: '1',
      name: 'Central Arena',
      location: 'Downtown District',
      price: 45,
      rating: 4.8,
      formats: ['5v5', '7v7'],
      nextSlot: '18:00',
      image:
          'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    ),
    _SearchTurf(
      id: '2',
      name: 'Nexus Sports Hub',
      location: 'Westside Complex',
      price: 55,
      rating: 4.9,
      formats: ['11v11'],
      nextSlot: '19:30',
      image:
          'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80',
    ),
    _SearchTurf(
      id: '3',
      name: 'Urban Kick',
      location: 'Industrial Park',
      price: 40,
      rating: 4.6,
      formats: ['5v5'],
      nextSlot: '17:00',
      image:
          'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1200&q=80',
    ),
    _SearchTurf(
      id: '4',
      name: 'The Green Pitch',
      location: 'North Suburbs',
      price: 50,
      rating: 4.7,
      formats: ['7v7', '9v9'],
      nextSlot: '20:00',
      image:
          'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
    ),
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _sport = widget.initialCategory!;
    }
  }

  @override
  Widget build(BuildContext context) {
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
                onTap: () => context.pop(),
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
                  style: AppTypography.h1.copyWith(color: AppColors.textPrimary),
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
                for (final t in _turfs) ...[
                  _SearchResultCard(turf: t),
                  const SizedBox(height: 24),
                ],
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
                  Navigator.pop(context);
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _SearchTurf {
  final String id;
  final String name;
  final String location;
  final int price;
  final double rating;
  final List<String> formats;
  final String nextSlot;
  final String image;

  const _SearchTurf({
    required this.id,
    required this.name,
    required this.location,
    required this.price,
    required this.rating,
    required this.formats,
    required this.nextSlot,
    required this.image,
  });
}

class _SearchResultCard extends StatelessWidget {
  const _SearchResultCard({required this.turf});
  final _SearchTurf turf;

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
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.md)),
                child: SizedBox(
                  height: 200,
                  width: double.infinity,
                  child: Image.network(
                    turf.image,
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
                        style: AppTypography.h2.copyWith(color: AppColors.textPrimary),
                      ),
                    ),
                    Text(
                      '\$${turf.price}',
                      style: AppTypography.h2.copyWith(color: AppColors.accentGreen),
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
                    Text(
                      turf.location,
                      style: AppTypography.bodyXs
                          .copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final f in turf.formats) TurfFormatPill(f),
                    TurfNextSlotPill(turf.nextSlot),
                  ],
                ),
                const SizedBox(height: 16),
                TurfPrimaryButton(
                  label: 'BOOK',
                  onPressed: () =>
                      context.go(RouteNames.turfDetailPath(turf.id)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
